import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import {
  schemas,
  uuidSchema,
  authorizeCreate,
  childKinds,
  factsAnswer,
} from "./schemas.mjs";
import { elenio } from "./elenio.mjs";
import { mediaGrant } from "./media.mjs";
import { operationsPdf } from "./report.mjs";
export const fail = (status, code, message = code) => {
  throw Object.assign(new Error(message), { status, code });
};
const uuid = (v) => uuidSchema.parse(v);
const hash = (v) => createHash("sha256").update(v).digest("hex");
const managers = ["owner", "manager"];
const parse = (schema, value) => schema.parse(value);
const str = z.string().trim().min(1).max(2000);
export async function service(
  db,
  ctx,
  method,
  path,
  body = {},
  params = new URLSearchParams(),
) {
  const q = async (s, p = []) => {
    const result = await db.query(s, p);
    return result.rows ?? result;
  };
  const one = async (s, p) => {
    const rows = await q(s, p);
    if (!rows[0]) fail(404, "NOT_FOUND");
    return rows[0];
  };
  const { userId, orgId, role } = ctx;
  const allow = (roles = managers) => {
    if (!roles.includes(role)) fail(403, "FORBIDDEN");
  };
  const audit = async (action, id = null) =>
    q(
      "insert into audit_logs(organization_id,actor_id,action,resource_id) values($1,$2,$3,$4)",
      [orgId, userId, action, id],
    );
  const child = async (id) =>
    one("select * from children where id=$1 and organization_id=$2", [
      uuid(id),
      orgId,
    ]);
  const record = async (id, kind) => {
    const row = await one(
      "select * from records where id=$1 and organization_id=$2",
      [uuid(id), orgId],
    );
    if (kind && row.kind !== kind) fail(404, "NOT_FOUND");
    return row;
  };
  const notify = async (event, kind, childId = null, management = false) =>
    q("select enqueue_event($1,$2,$3,$4)", [event, kind, childId, management]);
  const add = async (kind, data, childId = null, state = "draft") => {
    if (!schemas[kind] || !authorizeCreate(role, kind)) fail(403, "FORBIDDEN");
    data = parse(schemas[kind], data);
    if (childKinds.has(kind) && !childId) fail(422, "CHILD_REQUIRED");
    if (kind === "consent" && role !== "parent")
      fail(403, "GUARDIAN_CONSENT_REQUIRED");
    if (childId) {
      const c = await child(childId);
      if (c.archived_at) fail(409, "CHILD_ARCHIVED");
    }
    if (["tour", "trial", "followup"].includes(kind))
      await record(data.leadId, "lead");
    if (kind === "shift" || kind === "handoff")
      await one(
        "select id from memberships where organization_id=$1 and user_id=$2 and active",
        [orgId, data.userId || data.recipientId],
      );
    if (kind === "tour" || kind === "shift")
      if (Date.parse(data.endsAt) <= Date.parse(data.startsAt))
        fail(422, "INVALID_INTERVAL");
    if (kind === "attendance" && data.corrects) {
      allow();
      await record(data.corrects, "attendance");
      if (!data.reason) fail(422, "CORRECTION_REASON_REQUIRED");
    }
    if (
      kind === "pickup-authorization" &&
      Date.parse(data.expiresAt) <= Date.now()
    )
      fail(422, "EXPIRY_REQUIRED");
    if (kind === "media") {
      const activity = await record(data.activityId, "activity");
      if (activity.child_id !== childId) fail(422, "CHILD_MISMATCH");
    }
    if (kind === "camera-link" || kind === "camera-policy")
      fail(503, "ELENIO_UNVERIFIED");
    if (kind === "incident-update") {
      const incident = await record(data.incidentId, "incident");
      if (incident.child_id !== childId) fail(422, "CHILD_MISMATCH");
    }
    if (kind === "incident-update" && data.parentVisible) allow();
    if (kind === "message" && role !== "parent") {
      if (data.recipientId) {
        const [{ allowed }] = await q(
          "select is_linked_guardian($1,$2) allowed",
          [data.recipientId, childId],
        );
        if (!allowed) fail(422, "RECIPIENT_NOT_LINKED");
      } else data = { ...data, audience: "guardians" };
    }
    if (kind === "message" && role === "parent" && data.recipientId)
      fail(422, "USE_DAYCARE_FEEDBACK_CHANNEL");
    const row = await one(
      "insert into records(organization_id,child_id,kind,data,state,created_by) values($1,$2,$3,$4,$5,$6) returning *",
      [orgId, childId, kind, JSON.stringify(data), state, userId],
    );
    await audit(`${kind}.create`, row.id);
    if (kind === "incident") await notify(row.id, "incident", childId, true);
    if (kind === "message")
      await notify(row.id, "message", childId, role === "parent");
    if (kind === "incident-update" && data.parentVisible)
      await notify(row.id, "incident-update", childId);
    return row;
  };
  const update = async (row, data, state = row.state) => {
    const r = await one(
      "update records set data=$1,state=$2,updated_at=now() where id=$3 and organization_id=$4 returning *",
      [JSON.stringify(data), state, row.id, orgId],
    );
    await audit(`${row.kind}.${state}`, row.id);
    return r;
  };
  const [resource, id, action] = path.split("/");
  const readOnly = new Set([
    "me",
    "owner/overview",
    "owner/enrollment-funnel",
    "reports/operations",
    "parent/home",
    "audit",
    "subscription",
  ]);
  if (readOnly.has(path) && method !== "GET") fail(405, "METHOD_NOT_ALLOWED");
  if (path.startsWith("leo/") && method !== "POST")
    fail(405, "METHOD_NOT_ALLOWED");
  if (
    action &&
    !["history", "timeline", "guardians", "access", "download"].includes(
      action,
    ) &&
    method !== "POST" &&
    resource !== "leo"
  )
    fail(405, "METHOD_NOT_ALLOWED");
  if (method === "GET" && path === "me")
    return { userId, organizationId: orgId, role };
  if (resource === "organizations" && id === "current") {
    if (method === "GET")
      return one("select * from organizations where id=$1", [orgId]);
    if (method === "PATCH") {
      allow(["owner"]);
      const name = parse(str.max(160), body.name);
      await q("update organizations set name=$1 where id=$2", [name, orgId]);
      await audit("organization.update", orgId);
      return { id: orgId, name };
    }
  }
  if (resource === "branches" || resource === "classrooms") {
    if (method === "GET")
      return id
        ? one(`select * from ${resource} where organization_id=$1 and id=$2`, [
            orgId,
            uuid(id),
          ])
        : q(
            `select * from ${resource} where organization_id=$1 order by name`,
            [orgId],
          );
    allow(resource === "branches" ? ["owner"] : managers);
    const name = parse(str.max(160), body.name);
    if (method === "POST") {
      const row =
        resource === "branches"
          ? await one(
              "insert into branches(organization_id,name) values($1,$2) returning *",
              [orgId, name],
            )
          : await one(
              "insert into classrooms(organization_id,branch_id,name) values($1,$2,$3) returning *",
              [orgId, uuid(body.branchId), name],
            );
      await audit(`${resource}.create`, row.id);
      return row;
    }
    if (method === "PATCH") {
      const row = await one(
        `update ${resource} set name=$1 where organization_id=$2 and id=$3 returning *`,
        [name, orgId, uuid(id)],
      );
      await audit(`${resource}.update`, row.id);
      return row;
    }
  }
  if (resource === "children") {
    if (!id && method === "GET")
      return q(
        "select * from children where organization_id=$1 order by name limit $2 offset $3",
        [
          orgId,
          Math.min(100, Math.max(1, Number(params.get("limit")) || 50)),
          Math.max(0, Number(params.get("offset")) || 0),
        ],
      );
    if (!id && method === "POST") {
      allow();
      await q("select pg_advisory_xact_lock(hashtext($1))", [orgId]);
      const plans = await q(
        "select data from records where organization_id=$1 and kind='subscription' order by created_at desc limit 1",
        [orgId],
      );
      if (plans[0]) {
        if (plans[0].data.plan === "suspended")
          fail(409, "SUBSCRIPTION_INACTIVE");
        const [{ count }] = await q(
          "select count(*)::integer count from children where organization_id=$1 and archived_at is null",
          [orgId],
        );
        if (count >= plans[0].data.limit) fail(409, "PLAN_CHILD_LIMIT");
      }
      const name = parse(str.max(160), body.name),
        classroom = uuid(body.classroomId);
      await one(
        "select id from classrooms where id=$1 and organization_id=$2",
        [classroom, orgId],
      );
      const row = await one(
        "insert into children(organization_id,classroom_id,name,birth_date) values($1,$2,$3,$4) returning *",
        [
          orgId,
          classroom,
          name,
          body.birthDate ? parse(z.iso.date(), body.birthDate) : null,
        ],
      );
      await audit("child.create", row.id);
      return row;
    }
    const c = await child(id);
    if (action === "timeline" && method === "GET")
      return q(
        "select * from records where organization_id=$1 and child_id=$2 and kind in ('activity','attendance','media','incident-update') order by created_at desc limit 100",
        [orgId, c.id],
      );
    if (action === "guardians") {
      allow();
      if (method === "GET")
        return q(
          "select * from guardian_child_links where organization_id=$1 and child_id=$2",
          [orgId, c.id],
        );
      const target = uuid(body.userId);
      await one(
        "select id from memberships where organization_id=$1 and user_id=$2 and role='parent' and active",
        [orgId, target],
      );
      const row = await one(
        "insert into guardian_child_links(organization_id,child_id,user_id) values($1,$2,$3) on conflict(organization_id,child_id,user_id) do update set revoked_at=null returning *",
        [orgId, c.id, target],
      );
      await audit("guardian.link", row.id);
      return row;
    }
    if (action === "archive" && method === "POST") {
      allow();
      await q(
        "update children set archived_at=now() where id=$1 and organization_id=$2",
        [c.id, orgId],
      );
      await audit("child.archive", c.id);
      return { id: c.id, archived: true };
    }
    if (method === "GET") return c;
    if (method === "PATCH") {
      allow();
      const name = parse(str.max(160), body.name);
      const row = await one(
        "update children set name=$1 where id=$2 and organization_id=$3 returning *",
        [name, c.id, orgId],
      );
      await audit("child.update", c.id);
      return row;
    }
  }
  if (resource === "guardians" && method === "DELETE") {
    allow();
    const link = await one(
      "update guardian_child_links set revoked_at=now() where id=$1 and organization_id=$2 returning *",
      [uuid(id), orgId],
    );
    await audit("guardian.revoke", link.id);
    return { revoked: true };
  }
  if (resource === "staff-assignments") {
    allow();
    if (method === "GET")
      return q("select * from staff_assignments where organization_id=$1", [
        orgId,
      ]);
    if (method === "DELETE") {
      const row = await one(
        "update staff_assignments set revoked_at=now() where id=$1 and organization_id=$2 returning *",
        [uuid(id), orgId],
      );
      await audit("assignment.revoke", row.id);
      return row;
    }
    const c = await child(body.childId),
      target = uuid(body.userId);
    await one(
      "select id from memberships where organization_id=$1 and user_id=$2 and active and role='caregiver'",
      [orgId, target],
    );
    const row = await one(
      "insert into staff_assignments(organization_id,child_id,user_id) values($1,$2,$3) on conflict(organization_id,child_id,user_id) do update set revoked_at=null returning *",
      [orgId, c.id, target],
    );
    await audit("assignment.create", row.id);
    return row;
  }
  if (resource === "staff") {
    if (id === "directory" && method === "GET") {
      allow(["owner", "manager", "caregiver"]);
      return q(
        "select id,user_id,role,display_name from memberships where organization_id=$1 and active and role in ('owner','manager','caregiver')",
        [orgId],
      );
    }
    allow();
    if (method === "GET")
      return q(
        "select id,user_id,role,active,display_name from memberships where organization_id=$1",
        [orgId],
      );
    allow(["owner"]);
    const target = uuid(id);
    if (target === userId) fail(409, "CANNOT_REMOVE_SELF");
    const memberRole = parse(
      z.enum(["manager", "caregiver", "parent"]),
      body.role,
    );
    const active = parse(z.boolean(), body.active);
    const row = await one(
      "update memberships set role=$1,active=$2 where organization_id=$3 and user_id=$4 returning id,user_id,role,active",
      [memberRole, active, orgId, target],
    );
    await audit("membership.update", row.id);
    return row;
  }
  if (resource === "invitations") {
    allow();
    if (method === "GET")
      return q(
        "select id,email,role,child_id,expires_at,revoked_at,accepted_by from invitations where organization_id=$1",
        [orgId],
      );
    if (action === "revoke") {
      const row = await one(
        "update invitations set revoked_at=now() where id=$1 and organization_id=$2 returning id",
        [uuid(id), orgId],
      );
      await audit("invitation.revoke", row.id);
      return row;
    }
    if (action === "resend") {
      const previous = await one(
        "select * from invitations where id=$1 and organization_id=$2",
        [uuid(id), orgId],
      );
      if (previous.accepted_by) fail(409, "ALREADY_ACCEPTED");
      await q("update invitations set revoked_at=now() where id=$1", [
        previous.id,
      ]);
      return service(db, ctx, "POST", "invitations", {
        email: previous.email,
        role: previous.role,
        childId: previous.child_id,
      });
    }
    const email = parse(z.email(), body.email).toLowerCase(),
      inviteRole = parse(z.enum(["manager", "caregiver", "parent"]), body.role);
    if (role === "manager" && inviteRole === "manager") fail(403, "FORBIDDEN");
    const c = body.childId ? (await child(body.childId)).id : null;
    if (inviteRole === "parent" && !c) fail(422, "CHILD_REQUIRED");
    const token = randomBytes(32).toString("hex");
    const row = await one(
      "insert into invitations(organization_id,email,role,child_id,token_hash,expires_at) values($1,$2,$3,$4,$5,now()+interval '48 hours') returning id,email,role,expires_at",
      [orgId, email, inviteRole, c, hash(token)],
    );
    await audit("invitation.create", row.id);
    return {
      ...row,
      acceptUrl: `/workspace?invitation=${token}`,
      delivery: "share-link",
    };
  }
  if (resource === "activities" && id === "batch" && method === "POST") {
    allow(["owner", "manager", "caregiver"]);
    const ids = parse(z.array(uuidSchema).min(1).max(50), body.childIds);
    if (new Set(ids).size !== ids.length) fail(422, "DUPLICATE_CHILD");
    for (const target of ids) await child(target);
    const rows = [];
    for (const target of ids)
      rows.push(
        await add(
          "activity",
          { ...body.data, ...body.exceptions?.[target] },
          target,
        ),
      );
    return rows;
  }
  const mapping = {
    activities: "activity",
    attendance: "attendance",
    "pickup-authorizations": "pickup-authorization",
    shifts: "shift",
    handoffs: "handoff",
    incidents: "incident",
    announcements: "announcement",
    messages: "message",
    leads: "lead",
    tours: "tour",
    trials: "trial",
    "follow-up-tasks": "followup",
    consents: "consent",
    "data-requests": "data-request",
    "fee-plans": "fee-plan",
    invoices: "invoice",
    settings: "settings",
    "care-instructions": "care-instruction",
  };
  if (mapping[resource]) {
    const kind = mapping[resource];
    if (!id) {
      if (method === "GET") {
        const where = params.get("childId");
        if (where) await child(where);
        return q(
          "select * from records where organization_id=$1 and kind=$2 and ($3::uuid is null or child_id=$3) order by created_at desc limit 100",
          [orgId, kind, where || null],
        );
      }
      if (method === "POST")
        return add(kind, body.data || body, body.childId || null);
    }
    const row = await record(id, kind);
    if (action === "history" && method === "GET" && kind === "activity") {
      allow();
      return q(
        "select * from record_history where organization_id=$1 and record_id=$2 order by created_at",
        [orgId, row.id],
      );
    }
    if (method === "GET" && !action) return row;
    if (method === "PATCH" && !action) {
      if (kind === "activity") {
        allow(["owner", "manager", "caregiver"]);
        if (role === "caregiver" && row.created_by !== userId)
          fail(403, "FORBIDDEN");
      } else allow();
      if (
        ![
          "activity",
          "lead",
          "settings",
          "followup",
          "tour",
          "shift",
          "care-instruction",
        ].includes(kind)
      )
        fail(405, "APPEND_ONLY_WORKFLOW");
      return update(row, parse(schemas[kind], body.data || body));
    }
    if (
      action === "publish" &&
      ["activity", "announcement"].includes(kind) &&
      method === "POST"
    ) {
      allow(["owner", "manager", "caregiver"]);
      if (
        role === "caregiver" &&
        (kind !== "activity" || row.created_by !== userId)
      )
        fail(403, "FORBIDDEN");
      const published = await update(row, row.data, "published");
      if (kind === "activity")
        await q(
          "update records set state='published' where organization_id=$1 and kind='media' and data->>'activityId'=$2 and data->>'uploaded'='true'",
          [orgId, row.id],
        );
      await notify(`${row.id}:published`, kind, row.child_id);
      return published;
    }
    if (kind === "attendance" && action === "correct")
      return add("attendance", { ...body, corrects: row.id }, row.child_id);
    if (
      kind === "incident" &&
      ["acknowledge", "resolve", "updates"].includes(action)
    ) {
      if (action === "updates") {
        allow(["owner", "manager", "caregiver"]);
        return add(
          "incident-update",
          {
            incidentId: row.id,
            note: body.note,
            parentVisible: body.parentVisible ?? false,
          },
          row.child_id,
          "published",
        );
      }
      allow();
      if (row.state === "resolved") fail(409, "ALREADY_RESOLVED");
      const note = parse(str, body.note);
      await add(
        "incident-update",
        { incidentId: row.id, note, parentVisible: false },
        row.child_id,
        "published",
      );
      return update(
        row,
        row.data,
        action === "resolve" ? "resolved" : "acknowledged",
      );
    }
    if (kind === "handoff" && action === "acknowledge") {
      allow(["owner", "manager", "caregiver"]);
      if (!managers.includes(role) && row.data.recipientId !== userId)
        fail(403, "WRONG_RECIPIENT");
      return update(
        row,
        { ...row.data, acknowledgedBy: userId },
        "acknowledged",
      );
    }
    if (kind === "pickup-authorization" && action === "approve") {
      allow();
      return update(row, row.data, "approved");
    }
    if (kind === "consent" && action === "revoke") {
      if (row.created_by !== userId) fail(403, "FORBIDDEN");
      return update(
        row,
        { ...row.data, revokedAt: new Date().toISOString() },
        "revoked",
      );
    }
    if (kind === "tour" && action === "confirm") {
      allow();
      if (row.state === "confirmed") return row;
      await q("select pg_advisory_xact_lock(hashtext($1))", [orgId]);
      const clash = await q(
        "select id from records where organization_id=$1 and kind='tour' and state='confirmed' and id<>$2 and (data->>'startsAt')::timestamptz < $3::timestamptz and (data->>'endsAt')::timestamptz > $4::timestamptz",
        [orgId, row.id, row.data.endsAt, row.data.startsAt],
      );
      if (clash.length) fail(409, "TOUR_CONFLICT");
      return update(row, row.data, "confirmed");
    }
    if (kind === "lead" && action === "status") {
      allow();
      const status = parse(
        z.enum(["contacted", "tour-booked", "trial", "lost"]),
        body.status,
      );
      await q(
        "insert into records(organization_id,kind,data,state,created_by) values($1,'lead-event',$2,'recorded',$3)",
        [orgId, JSON.stringify({ leadId: row.id, status }), userId],
      );
      return update(row, row.data, status);
    }
    if (kind === "lead" && action === "history") {
      allow();
      return q(
        "select * from records where organization_id=$1 and kind='lead-event' and data->>'leadId'=$2 order by created_at",
        [orgId, row.id],
      );
    }
    if (kind === "lead" && action === "enroll") {
      allow();
      await q("select pg_advisory_xact_lock(hashtext($1))", [row.id]);
      const previous = await q(
        "select * from records where organization_id=$1 and kind='enrollment' and data->>'leadId'=$2",
        [orgId, row.id],
      );
      if (previous.length) return previous[0];
      const c = await service(db, ctx, "POST", "children", {
        name: body.name,
        classroomId: body.classroomId,
      });
      const invite = await service(db, ctx, "POST", "invitations", {
        email: body.email,
        role: "parent",
        childId: c.id,
      });
      const enrollment = await one(
        "insert into records(organization_id,child_id,kind,data,state,created_by) values($1,$2,'enrollment',$3,'enrolled',$4) returning *",
        [
          orgId,
          c.id,
          JSON.stringify({ leadId: row.id, invitationId: invite.id }),
          userId,
        ],
      );
      await update(row, row.data, "enrolled");
      return { ...enrollment, invitation: invite };
    }
    if (kind === "invoice" && action === "record-manual-payment") {
      allow();
      if (row.state === "paid") return row;
      const reference = parse(str.max(160), body.reference);
      if (body.confirmed !== true) fail(422, "CONFIRMATION_REQUIRED");
      await q(
        "insert into records(organization_id,child_id,kind,data,state,created_by) values($1,$2,'payment',$3,'verified-manual',$4)",
        [
          orgId,
          row.child_id,
          JSON.stringify({
            invoiceId: row.id,
            reference,
            amount: row.data.lines.reduce((sum, l) => sum + l.amount, 0),
          }),
          userId,
        ],
      );
      return update(row, row.data, "paid");
    }
    if (kind === "invoice" && action === "remind") {
      allow();
      await notify(
        `${row.id}:remind:${new Date().toISOString().slice(0, 10)}`,
        "invoice-reminder",
        row.child_id,
      );
      return { queued: true };
    }
    if (kind === "data-request" && action === "approve-export") {
      allow(["owner"]);
      if (row.data.type !== "export")
        fail(409, "HUMAN_PRIVACY_REVIEW_REQUIRED");
      return update(row, row.data, "ready");
    }
    if (kind === "data-request" && action === "download") {
      if (row.state !== "ready" || row.data.type !== "export")
        fail(409, "EXPORT_NOT_APPROVED");
      const c = await child(row.child_id);
      const data = await q(
        "select id,kind,data,state,created_at from records where organization_id=$1 and child_id=$2 and ((kind='activity' and state='published') or kind='attendance' or (kind='consent' and created_by=$3)) order by created_at",
        [orgId, c.id, row.created_by],
      );
      await audit("privacy.export", row.id);
      return {
        format: "json",
        content: JSON.stringify({ child: c, records: data }, null, 2),
      };
    }
  }
  if (resource === "pickups" && action === "verify-handover") {
    allow(["owner", "manager", "caregiver"]);
    const auth = await record(id, "pickup-authorization");
    if (
      auth.state !== "approved" ||
      Date.parse(auth.data.expiresAt) <= Date.now() ||
      body.identityVerified !== true
    )
      fail(409, "PICKUP_NOT_AUTHORIZED");
    await q("select pg_advisory_xact_lock(hashtext($1))", [auth.id]);
    const previous = await q(
      "select * from records where organization_id=$1 and kind='pickup' and data->>'authorizationId'=$2",
      [orgId, auth.id],
    );
    if (previous.length) return previous[0];
    const row = await one(
      "insert into records(organization_id,child_id,kind,data,state,created_by) values($1,$2,'pickup',$3,'verified',$4) returning *",
      [
        orgId,
        auth.child_id,
        JSON.stringify({
          authorizationId: auth.id,
          verifiedAt: new Date().toISOString(),
        }),
        userId,
      ],
    );
    await audit("pickup.verify", row.id);
    await notify(row.id, "pickup", row.child_id);
    return row;
  }
  if (
    path === "owner/overview" ||
    path === "owner/enrollment-funnel" ||
    path === "reports/operations"
  ) {
    allow();
    const rows = await q("select * from records where organization_id=$1", [
      orgId,
    ]);
    const date =
      params.get("date") ||
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
        new Date(),
      );
    parse(z.iso.date(), date);
    const branchId = params.get("branchId");
    if (branchId)
      await one("select id from branches where organization_id=$1 and id=$2", [
        orgId,
        uuid(branchId),
      ]);
    const children = await q(
      "select c.* from children c join classrooms cl on cl.id=c.classroom_id and cl.organization_id=c.organization_id where c.organization_id=$1 and c.archived_at is null and ($2::uuid is null or cl.branch_id=$2)",
      [orgId, branchId],
    );
    const childSet = new Set(children.map((c) => c.id));
    const from = params.get("from") || date,
      to = params.get("to") || date;
    parse(z.iso.date(), from);
    parse(z.iso.date(), to);
    if (from > to || Date.parse(to) - Date.parse(from) > 31 * 86400000)
      fail(422, "INVALID_DATE_RANGE");
    const daily = rows.filter((r) => {
      const d = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
      }).format(new Date(r.created_at));
      return (
        d >= from &&
        d <= to &&
        (!branchId || !r.child_id || childSet.has(r.child_id))
      );
    });
    const latest = new Map();
    for (const r of daily
      .filter((r) => r.kind === "attendance")
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
      latest.set(r.child_id, r.data.type);
    const counts = {
      date,
      children: children.length,
      present: [...latest.values()].filter((v) => v === "in").length,
      activities: daily.filter((r) => r.kind === "activity").length,
      openIncidents: rows.filter(
        (r) => r.kind === "incident" && r.state !== "resolved",
      ).length,
      leads: rows.filter((r) => r.kind === "lead").length,
      enrolled: rows.filter((r) => r.kind === "enrollment").length,
      tours: rows.filter((r) => r.kind === "tour" && r.state === "confirmed")
        .length,
    };
    if (path === "owner/enrollment-funnel") {
      const stages = {};
      for (const event of daily.filter((r) => r.kind === "lead-event"))
        stages[event.data.status] = (stages[event.data.status] || 0) + 1;
      return {
        from,
        to,
        stageEvents: stages,
        newInquiries: daily.filter((r) => r.kind === "lead").length,
        enrollments: daily.filter((r) => r.kind === "enrollment").length,
      };
    }
    if (path === "reports/operations") {
      await audit("report.export");
      if (params.get("format") === "pdf")
        return {
          format: "pdf",
          encoding: "base64",
          content: operationsPdf(counts).toString("base64"),
        };
      return {
        format: "csv",
        content:
          Object.keys(counts).join(",") +
          "\n" +
          Object.values(counts).join(",") +
          "\n",
      };
    }
    return counts;
  }
  if (path === "parent/home") {
    allow(["parent"]);
    const children = await q(
      "select * from children where organization_id=$1 and archived_at is null order by name",
      [orgId],
    );
    const target = params.get("childId") || children[0]?.id;
    if (!target) return { children, timeline: [] };
    await child(target);
    const timeline = await service(
      db,
      ctx,
      "GET",
      `children/${target}/timeline`,
    );
    return { children, childId: target, timeline };
  }
  if (resource === "notifications") {
    if (method === "GET")
      return q(
        "select * from notifications where organization_id=$1 order by created_at desc limit 100",
        [orgId],
      );
    const row = await one(
      "update notifications set read_at=now() where organization_id=$1 and id=$2 and user_id=$3 returning *",
      [orgId, uuid(id), userId],
    );
    return row;
  }
  if (path === "leo/parent/query") {
    allow(["parent"]);
    await child(body.childId);
    const question = parse(str, body.question);
    const day = new Date(
      Date.now() - (/kemarin/i.test(question) ? 86400000 : 0),
    );
    const date =
      question.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ||
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
        day,
      );
    parse(z.iso.date(), date);
    await q("select record_ai_usage($1)", [body.childId]);
    const rows = await q(
      "select * from records where organization_id=$1 and child_id=$2 and kind='activity' and state='published' and ((data->>'occurredAt')::timestamptz at time zone 'Asia/Jakarta')::date=$3::date order by created_at desc limit 50",
      [orgId, uuid(body.childId), date],
    );
    await audit("leo.parent.query");
    return { ...factsAnswer(question, rows), date };
  }
  if (path === "leo/owner/query") {
    allow();
    parse(str, body.question);
    await q("select record_ai_usage($1)", [null]);
    await audit("leo.owner.query");
    return {
      mode: "verified-records",
      metrics: await service(db, ctx, "GET", "owner/overview"),
      provider: "not-connected",
    };
  }
  if (path === "leo/caregiver/draft-summary") {
    allow(["caregiver", "manager", "owner"]);
    await child(body.childId);
    const rows = await q(
      "select * from records where organization_id=$1 and child_id=$2 and kind='activity' order by created_at limit 100",
      [orgId, uuid(body.childId)],
    );
    const summary = factsAnswer("", rows);
    return add(
      "ai-draft",
      { note: summary.answer, sources: summary.sources.map((s) => s.id) },
      body.childId,
    );
  }
  if (resource === "leo" && id === "drafts" && path.endsWith("/approve")) {
    allow(["caregiver", "manager", "owner"]);
    const draft = await record(path.split("/")[2], "ai-draft");
    if (draft.state === "approved") fail(409, "ALREADY_APPROVED");
    const note = parse(str, body.note);
    const activity = await add(
      "activity",
      { type: "note", note, occurredAt: new Date().toISOString() },
      draft.child_id,
      "draft",
    );
    await update(draft, { ...draft.data, activityId: activity.id }, "approved");
    return activity;
  }
  if (path === "audit") {
    allow();
    return q(
      "select * from audit_logs where organization_id=$1 order by created_at desc limit 100",
      [orgId],
    );
  }
  if (resource === "support-access") {
    allow(["owner"]);
    if (method === "GET")
      return q(
        "select * from records where organization_id=$1 and kind='support-access' order by created_at desc",
        [orgId],
      );
    const row = await record(id, "support-access");
    if (action === "approve")
      return update(
        row,
        {
          ...row.data,
          approvedBy: userId,
          expiresAt: new Date(Date.now() + 1800000).toISOString(),
        },
        "approved",
      );
    if (action === "revoke") return update(row, row.data, "revoked");
  }
  if (resource === "retention-jobs") {
    allow(["owner"]);
    if (method === "GET")
      return q(
        "select * from records where organization_id=$1 and kind='retention-job' order by created_at desc limit 100",
        [orgId],
      );
    return add("retention-job", body.data || body);
  }
  if (path === "subscription") {
    allow(["owner"]);
    const rows = await q(
      "select * from records where organization_id=$1 and kind='subscription' order by created_at desc limit 1",
      [orgId],
    );
    return {
      ...(rows[0] || { state: "unconfigured" }),
      safeguardingAvailable: true,
    };
  }
  if (
    resource === "cameras" ||
    resource === "camera-sessions" ||
    path === "owner/analytics-events"
  ) {
    if (role === "parent") {
      await child(body.childId || params.get("childId"));
    } else allow(["owner"]);
    throw await elenio.listAuthorizedCameras();
  }
  if (resource === "media") {
    if (!id && method === "GET")
      return q(
        "select id,organization_id,child_id,kind,state,data,created_at from records where organization_id=$1 and kind='media' order by created_at desc limit 100",
        [orgId],
      );
    if (id === "upload-intent" && method === "POST")
      return add("media", body.data, body.childId);
    const media = await record(id, "media");
    if (action === "access" && method === "GET") {
      if (media.data.uploaded !== true) fail(409, "UPLOAD_INCOMPLETE");
      await audit("media.access", media.id);
      return {
        url: mediaGrant(media.id, orgId, userId),
        expiresIn: 60,
        authenticated: true,
      };
    }
    if (action === "attach" && method === "POST") {
      allow(["owner", "manager", "caregiver"]);
      if (media.data.uploaded !== true) fail(409, "UPLOAD_INCOMPLETE");
      const activity = await record(media.data.activityId, "activity");
      return update(
        media,
        media.data,
        activity.state === "published" ? "published" : "draft",
      );
    }
  }
  fail(404, "ROUTE_NOT_FOUND");
}
