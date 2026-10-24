import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { cookies } from "next/headers";
import { database, scoped, type DB } from "../../../../lib/db";
import { verifyIdentity } from "../../../../lib/identity.mjs";
import { identity, sameOrigin } from "../../../../lib/auth";
import { service, fail } from "../../../../lib/service.mjs";
import { acceptInvitation } from "../../../../lib/invitations.mjs";
import { sandboxPaths } from "../../../../lib/sandbox-paths.mjs";
import { authorizeReplay } from "../../../../lib/replay-authorization.mjs";
import { verifySaasPayment } from "../../../../lib/commercial-workflows.mjs";
import {
  verifyVideoWebhook,
  ingestVideoEvent,
} from "../../../../lib/video-metadata.mjs";
export const runtime = "nodejs";
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
async function limited(key: string, max: number) {
  const sql = database();
  const [row] =
    await sql`insert into rate_limits(key,count) values(${key},1) on conflict(key) do update set count=case when rate_limits.window_at<now()-interval '10 minutes' then 1 else rate_limits.count+1 end,window_at=case when rate_limits.window_at<now()-interval '10 minutes' then now() else rate_limits.window_at end returning count`;
  const allowance =
    process.env.DAYLIO_SANDBOX === "true" &&
    process.env.NODE_ENV !== "production"
      ? max * 100
      : max;
  if (row.count > allowance)
    fail(429, "RATE_LIMIT", "Terlalu banyak permintaan. Coba lagi nanti.");
}
async function handler(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const segments = (await params).path,
      path = segments.join("/"),
      method = request.method;
    if (path !== "integrations/elenio/events" || method !== "POST")
      sameOrigin(request);
    const url = new URL(request.url);
    if (Number(request.headers.get("content-length")) > 65536)
      fail(413, "PAYLOAD_TOO_LARGE");
    const raw = ["GET", "DELETE"].includes(method) ? "" : await request.text();
    if (raw.length > 65536) fail(413, "PAYLOAD_TOO_LARGE");
    let body: any = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      fail(422, "INVALID_JSON");
    }
    if (body === null || Array.isArray(body) || typeof body !== "object")
      fail(422, "INVALID_JSON_OBJECT");
    if (path === "integrations/elenio/events" && method === "POST") {
      const event = verifyVideoWebhook(raw, request.headers, {
        secret: process.env.ELENIO_METADATA_WEBHOOK_SECRET,
        enabled: process.env.ELENIO_METADATA_ENABLED === "true",
      });
      await limited("elenio-event:" + event.organizationId, 1200);
      const result = await database().begin(async (tx: DB) =>
        ingestVideoEvent(
          {
            query: async (text: string, values: any[] = []) => ({
              rows: await tx.unsafe(text, values),
            }),
          },
          event,
        ),
      );
      return NextResponse.json(
        { data: result },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (path === "health/ready") {
      const sql = database();
      const [schema] =
        await sql`select exists(select 1 from schema_migrations where version=20) as ready`;
      if (!schema.ready) fail(503, "MIGRATIONS_REQUIRED");
      return NextResponse.json(
        {
          ready: true,
          ...(process.env.DAYLIO_SANDBOX === "true" &&
          process.env.NODE_ENV !== "production"
            ? {
                sandbox: {
                  ...(({ purpose, runId }) => ({ purpose, runId }))(
                    sandboxPaths(),
                  ),
                  fingerprint: (
                    await sql`select md5(coalesce(string_agg(key||content,',' order by key),'')) fingerprint from (
                      select 'records:'||id::text key,to_jsonb(r)::text content from records r union all
                      select 'children:'||id::text,to_jsonb(r)::text from children r union all
                      select 'classes:'||id::text,to_jsonb(r)::text from classrooms r union all
                      select 'members:'||id::text,to_jsonb(r)::text from memberships r union all
                      select 'guardians:'||id::text,to_jsonb(r)::text from guardian_child_links r union all
                      select 'assignments:'||id::text,to_jsonb(r)::text from staff_assignments r union all
                      select 'bookings:'||id::text,to_jsonb(r)::text from schedule_bookings r union all
                      select 'shifts:'||id::text,to_jsonb(r)::text from schedule_shifts r union all
                      select 'subscription:'||organization_id::text,to_jsonb(r)::text from tenant_subscriptions r union all
                      select 'saas:'||id::text,to_jsonb(r)::text from saas_invoices r union all
                      select 'recurring:'||id::text,to_jsonb(r)::text from recurring_billing_rules r union all
                      select 'leo:'||id::text,to_jsonb(r)::text from leo_work_items r union all
                      select 'camera:'||id::text,to_jsonb(r)::text from camera_registry r union all
                      select 'video:'||id::text,to_jsonb(r)::text from video_events r
                    ) entries`
                  )[0].fingerprint,
                },
              }
            : {}),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (path === "payments/provider-webhook")
      fail(
        503,
        "PAYMENT_PROVIDER_UNCONFIGURED",
        "Provider pembayaran belum dikonfigurasi.",
      );
    if (path.startsWith("auth/")) {
      if (method !== "POST") fail(405, "METHOD_NOT_ALLOWED");
      await limited(
        "auth:" + digest(request.headers.get("x-real-ip") || "local"),
        100,
      );
      if (body.email)
        await limited(
          "auth-account:" + digest(String(body.email).toLowerCase()),
          20,
        );
      const base = process.env.SUPABASE_URL,
        key = process.env.SUPABASE_ANON_KEY;
      if (!base || !key)
        fail(503, "AUTH_UNAVAILABLE", "Identitas belum dikonfigurasi");
      const action = segments[1];
      const jar = await cookies();
      if (action === "password") {
        await identity(request);
        const password = z.string().min(12).max(128).parse(body.password);
        const token = jar.get("daylio_access")?.value;
        const response = await fetch(`${base}/auth/v1/user`, {
          method: "PUT",
          headers: {
            apikey: key!,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) fail(400, "PASSWORD_UPDATE_FAILED");
        return NextResponse.json({ ok: true });
      }
      if (action === "logout") {
        const token = jar.get("daylio_access")?.value;
        if (token)
          await fetch(`${base}/auth/v1/logout`, {
            method: "POST",
            headers: { apikey: key!, Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(5000),
          });
        jar.delete("daylio_access");
        jar.delete("daylio_refresh");
        return NextResponse.json({ loggedOut: true });
      }
      if (action === "session") {
        const access = z.string().min(16).max(8192).parse(body.access_token);
        const refresh = z.string().min(16).max(8192).parse(body.refresh_token);
        await verifyIdentity(access, { url: base, key });
        // Bind both tokens to the same verified identity through the provider.
        const refreshed = await fetch(
          `${base}/auth/v1/token?grant_type=refresh_token`,
          {
            method: "POST",
            headers: { apikey: key!, "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refresh }),
            signal: AbortSignal.timeout(8000),
            cache: "no-store",
          },
        );
        if (!refreshed.ok) fail(401, "SESSION_EXPIRED");
        const session = await refreshed.json();
        const first = await verifyIdentity(access, { url: base, key });
        const second = await verifyIdentity(session.access_token, {
          url: base,
          key,
        });
        if (first.id !== second.id) fail(403, "SESSION_MISMATCH");
        const options = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax" as const,
          path: "/",
        };
        jar.set("daylio_access", session.access_token, {
          ...options,
          maxAge: session.expires_in || 3600,
        });
        jar.set("daylio_refresh", session.refresh_token, {
          ...options,
          maxAge: 604800,
        });
        return NextResponse.json(
          { ok: true },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      let endpoint = "",
        payload: any;
      if (action === "refresh") {
        endpoint = "token?grant_type=refresh_token";
        payload = { refresh_token: jar.get("daylio_refresh")?.value };
      } else if (action === "recover") {
        endpoint = `recover?redirect_to=${encodeURIComponent(new URL("/auth/complete", process.env.APP_ORIGIN || request.url).href)}`;
        payload = { email: z.email().parse(body.email) };
      } else if (action === "signup" || action === "login") {
        endpoint =
          action === "signup"
            ? `signup?redirect_to=${encodeURIComponent(new URL("/auth/complete", process.env.APP_ORIGIN || request.url).href)}`
            : "token?grant_type=password";
        payload = {
          email: z.email().parse(body.email),
          password: z.string().min(12).max(128).parse(body.password),
        };
      } else fail(404, "ROUTE_NOT_FOUND");
      const result = await fetch(`${base}/auth/v1/${endpoint}`, {
        method: "POST",
        headers: { apikey: key!, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      const data = await result.json();
      if (!result.ok)
        fail(
          result.status === 429 ? 429 : 400,
          "AUTH_FAILED",
          "Permintaan identitas gagal. Periksa email dan kredensial.",
        );
      if (data.access_token) {
        await verifyIdentity(data.access_token, { url: base, key });
        const options = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax" as const,
          path: "/",
        };
        jar.set("daylio_access", data.access_token, {
          ...options,
          maxAge: data.expires_in || 3600,
        });
        jar.set("daylio_refresh", data.refresh_token, {
          ...options,
          maxAge: 604800,
        });
      }
      return NextResponse.json(
        { ok: true, verificationRequired: !data.access_token },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (path === "public/demo-requests" && method === "POST") {
      await limited(
        "demo:" + digest(request.headers.get("x-real-ip") || "local"),
        10,
      );
      const lead = z
        .object({
          name: z.string().trim().min(1).max(160),
          daycare: z.string().trim().min(1).max(160),
          contact: z.string().min(5).max(160),
          children: z.string().max(100),
          cctv: z.string().max(40),
          consent: z.literal(true),
          website: z.literal("").optional(),
        })
        .strict()
        .parse(body);
      const fingerprint = digest(JSON.stringify(lead));
      const sql = database();
      const [row] =
        await sql`insert into demo_leads(name,daycare,contact,data,fingerprint) values(${lead.name},${lead.daycare},${lead.contact},${sql.json(lead)},${fingerprint}) on conflict(fingerprint) do update set fingerprint=excluded.fingerprint returning id`;
      await sql`insert into platform_events(kind,resource_id) values('demo.received',${row.id}) on conflict do nothing`;
      return NextResponse.json(
        { id: row.id, status: "recorded", whatsappSent: false },
        { status: 201 },
      );
    }
    if (
      segments[0] === "public" &&
      ["inquiries", "tours"].includes(segments[1])
    ) {
      const tenant = z.uuid().parse(segments[2]);
      const sql = database();
      const [organization] =
        await sql`select id from organizations where id=${tenant} and not suspended`;
      if (!organization) fail(404, "NOT_FOUND");
      await limited(
        "prospect:" +
          tenant +
          ":" +
          digest(request.headers.get("x-real-ip") || "local"),
        20,
      );
      if (segments[1] === "inquiries" && method === "POST") {
        const prospect = z
          .object({
            name: z.string().trim().min(1).max(160),
            contact: z.string().min(5).max(160),
            consent: z.literal(true),
            website: z.literal("").optional(),
          })
          .strict()
          .parse(body);
        const token = randomBytes(32).toString("hex"),
          fingerprint = digest(tenant + prospect.contact.toLowerCase());
        const result = await sql.begin(async (tx) => {
          await tx`select pg_advisory_xact_lock(hashtext(${fingerprint}))`;
          const [existing] =
            await tx`select id from records where organization_id=${tenant} and kind='lead' and data->>'fingerprint'=${fingerprint}`;
          // Repeated contacts do not expose a previous prospect's token or data.
          if (existing) return { recorded: true, duplicate: true };
          const actor = "00000000-0000-4000-8000-000000000001";
          const [lead] =
            await tx`insert into records(organization_id,kind,data,state,created_by) values(${tenant},'lead',${tx.json({ ...prospect, source: "website", fingerprint, prospectTokenHash: digest(token) })},'new',${actor}) returning id`;
          await tx`insert into records(organization_id,kind,data,state,created_by) values(${tenant},'lead-event',${tx.json({ leadId: lead.id, status: "new" })},'recorded',${actor})`;
          await tx`insert into audit_logs(organization_id,actor_id,action,resource_id) values(${tenant},${actor},'public.inquiry',${lead.id})`;
          await tx`insert into notifications(organization_id,user_id,event_key,kind) select organization_id,user_id,${lead.id}||':inquiry','inquiry' from memberships where organization_id=${tenant} and role in ('owner','manager') and active on conflict do nothing`;
          return { id: lead.id, prospectToken: token, recorded: true };
        });
        return NextResponse.json({ data: result }, { status: 201 });
      }
      if (segments[1] === "tours" && method === "POST") {
        const booking = z
          .object({
            leadId: z.uuid(),
            prospectToken: z.string().regex(/^[a-f0-9]{64}$/),
            startsAt: z.iso.datetime({ offset: true }),
            endsAt: z.iso.datetime({ offset: true }),
          })
          .strict()
          .parse(body);
        if (
          Date.parse(booking.startsAt) <= Date.now() ||
          Date.parse(booking.endsAt) <= Date.parse(booking.startsAt) ||
          Date.parse(booking.endsAt) - Date.parse(booking.startsAt) >
            2 * 3600000
        )
          fail(422, "INVALID_INTERVAL");
        const [lead] =
          await sql`select id from records where id=${booking.leadId} and organization_id=${tenant} and kind='lead' and data->>'prospectTokenHash'=${digest(booking.prospectToken)} and created_at>now()-interval '7 days'`;
        if (!lead) fail(403, "PROSPECT_TOKEN_INVALID");
        const [tour] =
          await sql`insert into records(organization_id,kind,data,state,created_by) values(${tenant},'tour',${sql.json({ leadId: lead.id, startsAt: booking.startsAt, endsAt: booking.endsAt, timezone: "Asia/Jakarta" })},'requested','00000000-0000-4000-8000-000000000001') returning id,state`;
        return NextResponse.json({ data: tour }, { status: 201 });
      }
      fail(405, "METHOD_NOT_ALLOWED");
    }
    const user = await identity(request);
    await limited("user:" + user.id, 200);
    const sql = database();
    if (path === "me/memberships" && method === "GET") {
      const rows =
        await sql`select m.organization_id,m.role,o.name from memberships m join organizations o on o.id=m.organization_id where m.user_id=${user.id} and m.active and not o.suspended`;
      return NextResponse.json(
        { data: rows },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (path === "organizations" && method === "POST") {
      const name = z.string().trim().min(1).max(160).parse(body.name);
      const result = await sql.begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtext(${user.id}))`;
        const existing =
          await tx`select o.* from organizations o join memberships m on m.organization_id=o.id where m.user_id=${user.id} and m.role='owner' limit 1`;
        if (existing[0]) return existing[0];
        const [org] =
          await tx`insert into organizations(name) values(${name}) returning *`;
        await tx`insert into memberships(organization_id,user_id,role,display_name) values(${org.id},${user.id},'owner',${user.email.split("@")[0].slice(0, 160)})`;
        await tx`insert into branches(organization_id,name) values(${org.id},'Utama')`;
        await tx`insert into audit_logs(organization_id,actor_id,action) values(${org.id},${user.id},'organization.create')`;
        return org;
      });
      return NextResponse.json({ data: result }, { status: 201 });
    }
    if (
      segments[0] === "invitations" &&
      segments[2] === "accept" &&
      method === "POST"
    ) {
      const token = z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .parse(segments[1]);
      const result = await sql.begin(async (tx) =>
        acceptInvitation(
          {
            query: async (s: string, p: any[]) => ({
              rows: await tx.unsafe(s, p),
            }),
          },
          user,
          token,
        ),
      );
      return NextResponse.json({ data: result });
    }
    if (path.startsWith("platform/")) {
      const [admin] =
        await sql`select user_id from platform_admins where user_id=${user.id}`;
      if (!admin) fail(403, "FORBIDDEN");
      if (path === "platform/tenants" && method === "GET")
        return NextResponse.json({
          data: await sql`select id,name,suspended,created_at from organizations order by created_at desc limit 100`,
        });
      if (path === "platform/demo-requests" && method === "GET")
        return NextResponse.json({
          data: await sql`select id,name,daycare,contact,created_at from demo_leads order by created_at desc limit 100`,
        });
      if (path === "platform/support-access" && method === "POST") {
        const tenant = z.uuid().parse(body.organizationId),
          reason = z.string().min(10).max(1000).parse(body.reason);
        const result = await sql.begin(async (tx) => {
          const [row] =
            await tx`insert into records(organization_id,kind,data,state,created_by) values(${tenant},'support-access',${tx.json({ adminId: user.id, reason, scope: "health-only" })},'requested',${user.id}) returning id`;
          await tx`insert into audit_logs(organization_id,actor_id,action,resource_id) values(${tenant},${user.id},'support.request',${row.id})`;
          return row;
        });
        return NextResponse.json({ data: result });
      }
      if (path === "platform/saas-invoices" && method === "GET") {
        const rows =
          await sql`select i.*,o.name organization_name from saas_invoices i join organizations o on o.id=i.organization_id order by i.created_at desc limit 100`;
        return NextResponse.json({ data: rows });
      }
      if (
        segments[1] === "saas-invoices" &&
        segments[2] &&
        segments[3] === "verify" &&
        method === "POST"
      ) {
        const row = await sql.begin(async (tx) =>
          verifySaasPayment(
            {
              query: async (text: string, values: any[] = []) => ({
                rows: await tx.unsafe(text, values),
              }),
            },
            user.id,
            segments[2],
            body,
          ),
        );
        return NextResponse.json({ data: row });
      }
      if (path === "platform/subscriptions" && method === "POST") {
        const tenant = z.uuid().parse(body.organizationId),
          plan = z.enum(["trial", "active", "suspended"]).parse(body.plan),
          limit = z.number().int().min(1).max(100000).parse(body.limit);
        const row = await sql.begin(async (tx) => {
          const [record] =
            await tx`insert into records(organization_id,kind,data,state,created_by) values(${tenant},'subscription',${tx.json({ plan, limit })},'configured',${user.id}) returning id`;
          await tx`insert into audit_logs(organization_id,actor_id,action,resource_id) values(${tenant},${user.id},'subscription.configure',${record.id})`;
          return record;
        });
        return NextResponse.json({ data: row });
      }
      if (segments[1] === "tenants" && segments[2]) {
        const tenant = z.uuid().parse(segments[2]);
        if (segments[3] === "suspend" && method === "POST") {
          const reason = z.string().min(10).max(1000).parse(body.reason);
          const suspended = z.boolean().parse(body.suspended);
          await sql.begin(async (tx) => {
            await tx`update organizations set suspended=${suspended} where id=${tenant}`;
            await tx`insert into audit_logs(organization_id,actor_id,action) values(${tenant},${user.id},${suspended ? "tenant.suspend" : "tenant.restore"})`;
          });
          return NextResponse.json({ data: { suspended } });
        }
        if (segments[3] === "health" && method === "GET") {
          const [grant] =
            await sql`select id from records where organization_id=${tenant} and kind='support-access' and state='approved' and data->>'adminId'=${user.id} and (data->>'expiresAt')::timestamptz>now()`;
          if (!grant) fail(403, "OWNER_APPROVAL_REQUIRED");
          await sql`insert into audit_logs(organization_id,actor_id,action,resource_id) values(${tenant},${user.id},'support.health.read',${grant.id})`;
          const [health] =
            await sql`select id,suspended,created_at from organizations where id=${tenant}`;
          return NextResponse.json({ data: health });
        }
      }
      fail(
        503,
        "SUPPORT_ACCESS_DISABLED",
        "Dukungan memerlukan persetujuan pemilik dan audit.",
      );
    }
    const orgId = z.uuid().parse(request.headers.get("x-organization-id"));
    if (
      segments[0] === "invitations" &&
      segments[2] === "email" &&
      method === "POST"
    ) {
      await limited("invitation-email:" + user.id, 20);
      const token = z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .parse(body.token);
      const invitation = await scoped(user.id, orgId, async (tx: DB) => {
        const [{ role }] = await tx`select app_role() role`;
        if (!["owner", "manager"].includes(role)) fail(403, "FORBIDDEN");
        const [row] =
          await tx`select id,email,role from invitations where id=${z.uuid().parse(segments[1])} and organization_id=${orgId} and token_hash=${digest(token)} and revoked_at is null and accepted_by is null and expires_at>now()`;
        if (!row) fail(403, "INVITATION_INVALID");
        if (role === "manager" && row.role === "manager")
          fail(403, "FORBIDDEN");
        return row;
      });
      const base = process.env.SUPABASE_URL,
        key = process.env.SUPABASE_ANON_KEY;
      if (!base || !key || !process.env.APP_ORIGIN)
        fail(503, "AUTH_UNAVAILABLE");
      const redirect = new URL("/auth/complete", process.env.APP_ORIGIN);
      redirect.searchParams.set("invitation", token);
      const delivery = await fetch(
        `${base}/auth/v1/otp?redirect_to=${encodeURIComponent(redirect.href)}`,
        {
          method: "POST",
          headers: { apikey: key!, "Content-Type": "application/json" },
          body: JSON.stringify({ email: invitation.email, create_user: true }),
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
        },
      );
      if (!delivery.ok)
        fail(
          503,
          "EMAIL_DELIVERY_FAILED",
          "Email belum terkirim. Periksa konfigurasi email autentikasi lalu coba lagi.",
        );
      await sql`insert into audit_logs(organization_id,actor_id,action,resource_id) values(${orgId},${user.id},'invitation.email_requested',${invitation.id})`;
      return NextResponse.json(
        { data: { requested: true, invitationId: invitation.id } },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const result = await scoped(user.id, orgId, async (tx: DB) => {
      const [{ role }] = await tx`select app_role() role`;
      const [caps] =
        await tx`select app_capability('finance') finance,app_capability('crm') crm,care_policy() policy,app_plan() commercial_plan`;
      const authorizationContext = JSON.stringify({ role, ...caps });
      const db = {
        query: async (text: string, values: any[] = []) => ({
          rows: await tx.unsafe(text, values),
        }),
      };
      const idempotency = request.headers.get("idempotency-key");
      const requestHash = digest(`${method}:${path}:${raw}`);
      if (idempotency && method === "POST") {
        z.string().min(8).max(160).parse(idempotency);
        await tx`select pg_advisory_xact_lock(hashtext(${orgId + user.id + idempotency}))`;
        const [previous] =
          await tx`select response,request_hash,authorization_context from idempotency_keys where organization_id=${orgId} and user_id=${user.id} and key=${idempotency}`;
        if (previous) {
          if (previous.request_hash !== requestHash)
            fail(409, "IDEMPOTENCY_CONFLICT");
          await authorizeReplay(
            db,
            previous.authorization_context,
            authorizationContext,
            previous.response,
          );
          return previous.response;
        }
      }
      const value = await service(
        db,
        { userId: user.id, orgId, role },
        method,
        path,
        body,
        url.searchParams,
      );
      if (idempotency && method === "POST")
        await tx`insert into idempotency_keys(organization_id,user_id,key,request_hash,response,authorization_context) values(${orgId},${user.id},${idempotency},${requestHash},${tx.json(value)},${authorizationContext})`;
      return value;
    });
    return NextResponse.json(
      { data: result, requestId },
      {
        status: method === "POST" ? 201 : 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error: any) {
    const validation = error instanceof z.ZodError;
    const conflict = error.code === "23505",
      constrained = error.code === "23514",
      denied = error.code === "42501",
      relation = error.code === "23503";
    const status = validation
      ? 422
      : conflict || constrained
        ? 409
        : denied
          ? 403
          : relation
            ? 422
            : error.status || 503;
    return NextResponse.json(
      {
        error: {
          code: validation
            ? "VALIDATION_ERROR"
            : constrained
              ? "CAPACITY_OR_SCHEDULE_CONFLICT"
              : conflict
                ? "CONFLICT"
                : denied
                  ? "FORBIDDEN"
                  : relation
                    ? "INVALID_REFERENCE"
                    : error.code || "SERVICE_UNAVAILABLE",
          message:
            status === 503
              ? "Layanan belum tersedia. Silakan coba lagi."
              : constrained
                ? "Perubahan ditolak karena kapasitas, kuota, atau jadwal yang sudah dipesan. Perbarui data dan periksa alokasi terlebih dahulu."
                : validation
                  ? "Periksa isian formulir."
                  : error.status
                    ? error.message
                    : "Permintaan ditolak.",
          requestId,
        },
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
