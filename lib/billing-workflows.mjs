import { z } from "zod";
import { schemas } from "./schemas.mjs";
import { textPdf } from "./report.mjs";
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const currentBillingMonth = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
export async function generateRecurringInvoice(q, rule, period, actor) {
  month.parse(period);
  if (
    !rule.active ||
    period < rule.start_month ||
    period > currentBillingMonth()
  )
    throw Object.assign(new Error("INVALID_BILLING_PERIOD"), {
      status: 422,
      code: "INVALID_BILLING_PERIOD",
    });
  await q("select pg_advisory_xact_lock(hashtext($1))", [rule.organization_id]);
  const [eligible] = await q(
    "select c.id from children c join memberships m on m.organization_id=c.organization_id and m.user_id=$3 join tenant_subscriptions s on s.organization_id=c.organization_id join plan_catalog p on p.id=case when s.state in ('trial','active') and s.period_end<=now() or s.state='expired' then 'essential' else s.plan_id end where c.organization_id=$1 and c.id=$2 and c.archived_at is null and m.active and (m.role='owner' or (m.role='manager' and coalesce((select (data->>'managerFinance')::boolean from records where organization_id=$1 and kind='settings' order by updated_at desc limit 1),false))) and p.features ? 'finance'",
    [rule.organization_id, rule.child_id, actor],
  );
  if (!eligible)
    throw Object.assign(new Error("BILLING_AUTHORIZATION_CHANGED"), {
      status: 403,
      code: "BILLING_AUTHORIZATION_CHANGED",
    });
  const dueAt = `${period}-${String(rule.due_day).padStart(2, "0")}T23:59:59+07:00`,
    data = {
      lines: rule.lines,
      dueAt,
      recurringRuleId: rule.id,
      period,
      generatedFromApprovedRule: true,
    };
  const [created] = await q(
    "insert into records(organization_id,child_id,kind,data,state,created_by) values($1,$2,'invoice',$3,'draft',$4) on conflict do nothing returning *",
    [rule.organization_id, rule.child_id, JSON.stringify(data), actor],
  );
  if (created) {
    await q(
      "insert into audit_logs(organization_id,actor_id,action,resource_id) values($1,$2,'invoice.recurring.generate',$3)",
      [rule.organization_id, actor, created.id],
    );
    return { ...created, generatedNow: true };
  }
  const [existing] = await q(
    "select * from records where organization_id=$1 and kind='invoice' and data->>'recurringRuleId'=$2 and data->>'period'=$3",
    [rule.organization_id, rule.id, period],
  );
  return { ...existing, generatedNow: false };
}
export async function billingWorkflows(h, ctx, method, path, body, params) {
  if (
    !path.startsWith("billing/") &&
    !path.startsWith("family/receipts/") &&
    path !== "family/billing"
  )
    return { handled: false };
  const { q, one, allow, fail, audit, record, child } = h,
    { orgId, userId, role } = ctx;
  const result = async () => {
    const family = path.startsWith("family/");
    if (family) allow(["parent"]);
    else {
      allow();
      const [c] = await q("select app_capability('finance') allowed");
      if (!c.allowed) fail(403, "CAPABILITY_REQUIRED");
    }
    if (
      method === "GET" &&
      (path === "family/billing" || path === "billing/overview")
    ) {
      const offset = z.coerce
          .number()
          .int()
          .min(0)
          .max(10000)
          .parse(params.get("offset") || 0),
        childId = params.get("childId");
      if (childId) await child(childId);
      const invoices = await q(
        "select r.*,c.name child_name from records r join children c on c.organization_id=r.organization_id and c.id=r.child_id where r.organization_id=$1 and r.kind='invoice' and ($2::uuid is null or r.child_id=$2) order by r.created_at desc,r.id desc limit 50 offset $3",
        [orgId, childId || null, offset],
      );
      const [totals] = await q(
        "select count(*)::int count,coalesce(sum(t.amount) filter(where state='paid'),0)::bigint paid,coalesce(sum(t.amount) filter(where state<>'paid'),0)::bigint outstanding,count(*) filter(where state<>'paid' and (data->>'dueAt')::timestamptz<now())::int overdue from records r cross join lateral(select sum((line->>'amount')::bigint) amount from jsonb_array_elements(r.data->'lines') line)t where r.organization_id=$1 and r.kind='invoice' and ($2::uuid is null or r.child_id=$2)",
        [orgId, childId || null],
      );
      return {
        invoices,
        totals,
        offset,
        nextOffset: offset + 50 < totals.count ? offset + 50 : null,
        rules: family
          ? []
          : await q(
              "select r.*,c.name child_name from recurring_billing_rules r join children c on c.organization_id=r.organization_id and c.id=r.child_id where r.organization_id=$1 order by r.created_at desc limit 100",
              [orgId],
            ),
        packages: family
          ? await q(
              "select r.*,c.name child_name from records r join children c on c.id=r.child_id and c.organization_id=r.organization_id where r.organization_id=$1 and r.kind='enrollment' and ($2::uuid is null or r.child_id=$2) order by r.created_at desc limit 100",
              [orgId, childId || null],
            )
          : [],
        paymentProvider: "not-configured",
      };
    }
    const [_, resource, id, action] = path.split("/");
    if (resource === "receipts" && method === "GET") {
      const invoice = await record(id, "invoice");
      if (invoice.state !== "paid") fail(409, "PAYMENT_NOT_VERIFIED");
      const payments = await q(
        "select * from records where organization_id=$1 and child_id=$2 and kind='payment' and state='verified-manual' and data->>'invoiceId'=$3 order by created_at desc limit 1",
        [orgId, invoice.child_id, invoice.id],
      );
      if (!payments[0]) fail(409, "PAYMENT_EVIDENCE_REQUIRED");
      const c = await child(invoice.child_id);
      const pdf = textPdf("Daylio - Bukti Pembayaran", [
        `Anak: ${c.name}`,
        `Invoice: ${invoice.id}`,
        `Referensi: ${payments[0].data.reference}`,
        `Total IDR: ${payments[0].data.amount}`,
        `Diverifikasi manual pada ${new Date(payments[0].created_at).toISOString()}`,
        ...invoice.data.lines.map((l) => `${l.description}: IDR ${l.amount}`),
        "Bukti pencatatan daycare. Bukan bukti settlement gateway.",
      ]);
      await audit("invoice.receipt.download", invoice.id);
      return {
        mime: "application/pdf",
        filename: "daylio-receipt.pdf",
        base64: pdf.toString("base64"),
      };
    }
    if (resource === "recurring") {
      if (method === "POST" && !id) {
        const data = z
          .object({
            childId: z.uuid(),
            lines: schemas.invoice.shape.lines,
            dueDay: z.number().int().min(1).max(28),
            startMonth: month,
            confirmed: z.literal(true),
          })
          .strict()
          .parse(body);
        await child(data.childId);
        const row = await one(
          "insert into recurring_billing_rules(organization_id,child_id,lines,due_day,start_month,created_by) values($1,$2,$3,$4,$5,$6) returning *",
          [
            orgId,
            data.childId,
            JSON.stringify(data.lines),
            data.dueDay,
            data.startMonth,
            userId,
          ],
        );
        await audit("billing.recurring.approve", row.id);
        return row;
      }
      const rule = await one(
        "select * from recurring_billing_rules where organization_id=$1 and id=$2 for update",
        [orgId, z.uuid().parse(id)],
      );
      if (method === "POST" && action === "generate")
        return generateRecurringInvoice(
          q,
          rule,
          month.parse(body.period),
          userId,
        );
      if (method === "POST" && action === "stop") {
        const row = await one(
          "update recurring_billing_rules set active=false where organization_id=$1 and id=$2 returning *",
          [orgId, rule.id],
        );
        await audit("billing.recurring.stop", row.id);
        return row;
      }
    }
    fail(405, "METHOD_NOT_ALLOWED");
  };
  return { handled: true, value: await result() };
}
