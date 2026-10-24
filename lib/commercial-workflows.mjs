import { z } from "zod";
const plan = z.enum(["essential", "growth", "intelligence"]);
export function requiredFeature(path, method) {
  const root = path.split("/")[0];
  if (["crm", "leads", "tours", "trials", "follow-up-tasks"].includes(root))
    return "crm";
  if (["invoices", "fee-plans", "billing"].includes(root)) return "finance";
  if (root === "leo") return "leo";
  if (
    [
      "owner/overview",
      "owner/enrollment-funnel",
      "reports/operations",
    ].includes(path)
  )
    return "business-reporting";
  if (path.startsWith("planner/bookings") && method !== "GET")
    return "scheduling";
  return null;
}
export async function enforceEntitlements(q, fail, path, method, role) {
  if (
    role === "parent" &&
    method === "GET" &&
    path.split("/")[0] === "invoices"
  )
    return;
  const feature = requiredFeature(path, method);
  if (!feature) return;
  const [row] = await q("select app_has_feature($1) allowed", [feature]);
  if (!row?.allowed)
    fail(
      403,
      "ENTITLEMENT_REQUIRED",
      "Fitur ini memerlukan paket yang sesuai. Catatan perawatan dan keselamatan tetap tersedia.",
    );
}
export async function commercialWorkflows(h, ctx, method, path, body) {
  if (!path.startsWith("commercial/")) return { handled: false };
  const { q, one, allow, fail, audit } = h,
    { orgId, userId, role } = ctx;
  const result = async () => {
    if (path === "commercial/context" && method === "GET") {
      let subscription = await one(
        "select s.*,app_plan() effective_plan,now() evaluated_at from tenant_subscriptions s where organization_id=$1",
        [orgId],
      );
      const catalog = await q(
        "select * from plan_catalog order by monthly_idr",
      );
      const terms = await q(
        "select t.* from saas_paid_terms t where organization_id=$1 order by starts_at",
        [orgId],
      );
      const evaluatedAt = new Date(subscription.evaluated_at);
      const currentTerm =
        subscription.state !== "expired" &&
        terms.find(
          (t) =>
            new Date(t.starts_at) <= evaluatedAt &&
            new Date(t.ends_at) > evaluatedAt,
        );
      if (currentTerm)
        subscription = {
          ...subscription,
          plan_id: currentTerm.plan_id,
          state: "active",
          period_end: currentTerm.ends_at,
        };
      else if (
        ["active", "trial"].includes(subscription.state) &&
        new Date(subscription.period_end) <= evaluatedAt
      )
        subscription = { ...subscription, state: "expired" };
      const [next] = await q(
        "select greatest(now(),coalesce((select max(ends_at) from saas_paid_terms where organization_id=$1),now()),coalesce((select period_end from tenant_subscriptions where organization_id=$1 and state='active' and period_end>now()),now())) starts_at",
        [orgId],
      );
      const [{ used }] = await q(
        "select count(*)::int used from children where organization_id=$1 and archived_at is null",
        [orgId],
      );
      return {
        subscription,
        scheduledTerms:
          role === "owner"
            ? terms.filter((t) => new Date(t.starts_at) > evaluatedAt)
            : [],
        nextPaidTermStartsAt: role === "owner" ? next.starts_at : null,
        catalog,
        used: role === "owner" ? used : null,
        invoices:
          role === "owner"
            ? await q(
                "select i.*,t.starts_at,t.ends_at from saas_invoices i left join saas_paid_terms t on t.invoice_id=i.id and t.organization_id=i.organization_id where i.organization_id=$1 order by i.created_at desc limit 100",
                [orgId],
              )
            : [],
        addons:
          role === "owner"
            ? await q(
                "select r.*,c.name,c.draft_unit_idr from addon_requests r join addon_catalog c on c.id=r.addon_id where organization_id=$1 order by created_at desc limit 100",
                [orgId],
              )
            : [],
        addonCatalog: await q("select * from addon_catalog order by id"),
        paymentProvider: "not-configured",
        externalVideo: "not-configured",
        safeguardingAvailable: true,
      };
    }
    allow(["owner"]);
    await q("select pg_advisory_xact_lock(hashtext($1))", [orgId]);
    const cancel = path.match(/^commercial\/invoices\/([^/]+)\/cancel$/);
    if (cancel && method === "POST") {
      const input = z
        .object({
          confirmed: z.literal(true),
          reason: z.string().trim().min(6).max(500),
        })
        .strict()
        .parse(body);
      const invoice = await one(
        "select * from saas_invoices where organization_id=$1 and id=$2",
        [orgId, z.uuid().parse(cancel[1])],
      );
      if (
        invoice.state !== "pending" &&
        !(
          invoice.state === "cancelled" &&
          invoice.cancel_reason === input.reason
        )
      )
        fail(409, "INVOICE_NOT_PENDING");
      return one("select * from cancel_pending_saas_invoice($1,$2)", [
        invoice.id,
        input.reason,
      ]);
    }
    if (path === "commercial/invoices" && method === "POST") {
      const input = z
        .object({
          planId: plan,
          cycle: z.enum(["monthly", "yearly"]),
          confirmed: z.literal(true),
        })
        .strict()
        .parse(body);
      const selected = await one("select * from plan_catalog where id=$1", [
        input.planId,
      ]);
      const [{ used }] = await q(
        "select count(*)::int used from children where organization_id=$1 and archived_at is null",
        [orgId],
      );
      if (used > selected.child_limit)
        fail(
          409,
          "PLAN_OVER_CAPACITY",
          "Kuota paket lebih kecil daripada anak aktif. Tidak ada data yang dihapus.",
        );
      const invoice = await one(
        "insert into saas_invoices(organization_id,plan_id,cycle,amount,created_by) values($1,$2,$3,$4,$5) returning *",
        [orgId, input.planId, input.cycle, selected.monthly_idr, userId],
      );
      await audit("saas.invoice.request", invoice.id);
      return {
        ...invoice,
        paymentProvider: "not-configured",
        activation:
          "Requires independent platform verification of an actual payment; no gateway checkout configured.",
      };
    }
    if (path === "commercial/addons" && method === "POST") {
      const input = z
        .object({
          addonId: z.enum(["cctv", "analytics"]),
          quantity: z.number().int().min(0).max(1000),
        })
        .strict()
        .parse(body);
      const row = await one(
        "insert into addon_requests(organization_id,addon_id,quantity,created_by) values($1,$2,$3,$4) returning *",
        [orgId, input.addonId, input.quantity, userId],
      );
      await audit("addon.request", row.id);
      return { ...row, connected: false };
    }
    fail(405, "METHOD_NOT_ALLOWED");
  };
  return { handled: true, value: await result() };
}
// Only the privileged, authenticated platform-admin route calls this function.
// A customer cannot activate a plan or claim settlement with a browser callback.
export async function verifySaasPayment(db, actor, invoiceId, body) {
  const q = async (s, p = []) => {
    const result = await db.query(s, p);
    return result.rows ?? result;
  };
  const reject = (status, code) => {
    throw Object.assign(new Error(code), { status, code });
  };
  const input = z
    .object({
      reference: z.string().trim().min(6).max(160),
      amount: z.number().int().positive(),
      confirmed: z.literal(true),
    })
    .strict()
    .parse(body);
  const [admin] = await q(
    "select user_id from platform_admins where user_id=$1",
    [actor],
  );
  if (!admin) reject(403, "PLATFORM_ADMIN_REQUIRED");
  const [initial] = await q(
    "select organization_id from saas_invoices where id=$1",
    [z.uuid().parse(invoiceId)],
  );
  if (!initial) reject(404, "NOT_FOUND");
  await q("select pg_advisory_xact_lock(hashtext($1))", [
    initial.organization_id,
  ]);
  const [invoice] = await q(
    "select * from saas_invoices where id=$1 for update",
    [invoiceId],
  );
  if (invoice.amount !== input.amount) reject(409, "PAYMENT_AMOUNT_MISMATCH");
  if (invoice.state === "verified") {
    if (invoice.reference !== input.reference)
      reject(409, "PAYMENT_REFERENCE_MISMATCH");
    const [term] = await q(
      "select starts_at,ends_at from saas_paid_terms where invoice_id=$1",
      [invoice.id],
    );
    return { ...invoice, term: term || null };
  }
  if (invoice.state !== "pending") reject(409, "INVOICE_NOT_PENDING");
  const [subscription] = await q(
    "select * from tenant_subscriptions where organization_id=$1 for update",
    [invoice.organization_id],
  );
  const [selected] = await q("select * from plan_catalog where id=$1", [
    invoice.plan_id,
  ]);
  const [{ used }] = await q(
    "select count(*)::int used from children where organization_id=$1 and archived_at is null",
    [invoice.organization_id],
  );
  if (used > selected.child_limit) reject(409, "PLAN_OVER_CAPACITY");
  const [tail] = await q(
    "select max(ends_at) ends_at from saas_paid_terms where organization_id=$1",
    [invoice.organization_id],
  );
  if (
    subscription.state === "expired" &&
    tail.ends_at &&
    new Date(tail.ends_at) > new Date()
  )
    reject(409, "SUBSCRIPTION_OVERRIDE_REQUIRES_REVIEW");
  const [start] = await q(
    "select greatest(now(),coalesce($1::timestamptz,now()),coalesce($2::timestamptz,now())) starts_at",
    [
      tail.ends_at,
      subscription.state === "active" ? subscription.period_end : null,
    ],
  );
  const period = invoice.cycle === "yearly" ? "1 year" : "1 month";
  const [paid] = await q(
    "update saas_invoices set state='verified',reference=$2,verified_by=$3,verified_at=now() where id=$1 returning *",
    [invoice.id, input.reference, actor],
  );
  const [term] = await q(
    "insert into saas_paid_terms(organization_id,invoice_id,plan_id,starts_at,ends_at) values($1,$2,$3,$4,$4::timestamptz+$5::interval) returning starts_at,ends_at",
    [
      invoice.organization_id,
      invoice.id,
      invoice.plan_id,
      start.starts_at,
      period,
    ],
  );
  // Keep legacy subscription fields as a compatibility snapshot of an immediate
  // activation. Future terms are resolved by app_plan(), without a worker race.
  await q(
    "update tenant_subscriptions set plan_id=$2,state='active',period_end=$3,updated_at=now() where organization_id=$1 and $4::timestamptz<=now()",
    [invoice.organization_id, invoice.plan_id, term.ends_at, term.starts_at],
  );
  await q(
    "insert into audit_logs(organization_id,actor_id,action,resource_id) values($1,$2,'saas.payment.verified-manual',$3)",
    [invoice.organization_id, actor, invoice.id],
  );
  await q(
    "insert into audit_logs(organization_id,actor_id,action,resource_id) values($1,$2,'saas.term.recorded',$3)",
    [invoice.organization_id, actor, invoice.id],
  );
  return { ...paid, term };
}
