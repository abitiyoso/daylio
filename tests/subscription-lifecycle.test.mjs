import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { service } from "../lib/service.mjs";
import { verifySaasPayment } from "../lib/commercial-workflows.mjs";
import {
  generateRecurringInvoice,
  currentBillingMonth,
} from "../lib/billing-workflows.mjs";
let db, admin;
before(async () => {
  db = new PGlite();
  for (const f of (await readdir("db/migrations")).sort())
    await db.exec(await readFile("db/migrations/" + f, "utf8"));
  admin = randomUUID();
  await db.query("insert into platform_admins(user_id) values($1)", [admin]);
});
after(async () => db?.close());
async function tenant() {
  const org = randomUUID(),
    owner = randomUUID(),
    manager = randomUUID();
  await db.query("insert into organizations(id,name) values($1,$2)", [
    org,
    "Lifecycle fixture",
  ]);
  for (const [u, role] of [
    [owner, "owner"],
    [manager, "manager"],
  ])
    await db.query(
      "insert into memberships(organization_id,user_id,role) values($1,$2,$3)",
      [org, u, role],
    );
  return { org, owner, manager };
}
async function scoped(t, u, fn) {
  return db.transaction(async (tx) => {
    await tx.query(
      "select set_config('app.user_id',$1,true),set_config('app.organization_id',$2,true)",
      [u, t.org],
    );
    await tx.exec("set local role daylio_app");
    return fn(tx);
  });
}
const call = (t, u, method, path, body = {}) =>
  scoped(t, u, (tx) =>
    service(
      tx,
      { userId: u, orgId: t.org, role: u === t.owner ? "owner" : "manager" },
      method,
      path,
      body,
    ),
  );
const request = (t, planId, cycle = "monthly") =>
  call(t, t.owner, "POST", "commercial/invoices", {
    planId,
    cycle,
    confirmed: true,
  });
const pay = (i, reference) =>
  db.transaction((tx) =>
    verifySaasPayment(tx, admin, i.id, {
      reference,
      amount: i.amount,
      confirmed: true,
    }),
  );
async function planAt(t, date) {
  return scoped(
    t,
    t.owner,
    async (tx) =>
      (await tx.query("select commercial_plan_at($1,$2) plan", [t.org, date]))
        .rows[0].plan,
  );
}

test("Paid renewal and plan changes append nonoverlapping terms, preserve purchased time and resolve entitlements at the exact boundary", async () => {
  const t = await tenant(),
    first = await pay(await request(t, "growth"), "QA-GROWTH-INITIAL");
  const renewed = await pay(await request(t, "growth"), "QA-GROWTH-RENEWAL");
  const upgraded = await pay(
    await request(t, "intelligence", "yearly"),
    "QA-INTELLIGENCE-YEAR",
  );
  const downInvoice = await request(t, "essential"),
    down = await pay(downInvoice, "QA-ESSENTIAL-NEXT");
  assert.equal(String(renewed.term.starts_at), String(first.term.ends_at));
  assert.equal(String(upgraded.term.starts_at), String(renewed.term.ends_at));
  assert.equal(String(down.term.starts_at), String(upgraded.term.ends_at));
  const ctx = await call(t, t.owner, "GET", "commercial/context");
  assert.equal(ctx.subscription.effective_plan, "growth");
  assert.equal(ctx.scheduledTerms.length, 3);
  assert.equal(
    await planAt(
      t,
      new Date(new Date(upgraded.term.starts_at) - 1).toISOString(),
    ),
    "growth",
  );
  assert.equal(await planAt(t, upgraded.term.starts_at), "intelligence");
  assert.equal(await planAt(t, down.term.starts_at), "essential");
  assert.equal(await planAt(t, down.term.ends_at), "essential");
  const replay = await pay(downInvoice, "QA-ESSENTIAL-NEXT");
  assert.deepEqual(replay.term, down.term);
  assert.equal(
    (
      await db.query("select * from saas_paid_terms where organization_id=$1", [
        t.org,
      ])
    ).rows.length,
    4,
  );
  assert.equal(
    (
      await db.query(
        "select * from audit_logs where organization_id=$1 and action='saas.term.recorded'",
        [t.org],
      )
    ).rows.length,
    4,
  );
  await assert.rejects(
    scoped(t, t.owner, (tx) =>
      tx.query(
        "update saas_paid_terms set plan_id='intelligence' where organization_id=$1",
        [t.org],
      ),
    ),
    /permission denied/,
  );
  await assert.rejects(
    scoped(t, t.owner, (tx) =>
      tx.query("delete from saas_paid_terms where organization_id=$1", [t.org]),
    ),
    /permission denied/,
  );
  const other = await tenant();
  assert.equal(
    await scoped(
      t,
      t.owner,
      async (tx) =>
        (
          await tx.query("select commercial_plan_at($1,now()) plan", [
            other.org,
          ])
        ).rows[0].plan,
    ),
    null,
  );
  // The DB, independently of the HTTP service, rejects an overlapping paid term.
  const invalid = await request(t, "growth");
  await assert.rejects(
    db.query(
      "insert into saas_paid_terms(organization_id,invoice_id,plan_id,starts_at,ends_at) values($1,$2,'growth',now()+interval '1 day',now()+interval '2 days')",
      [t.org, invalid.id],
    ),
    /VERIFIED_MATCHING_INVOICE_REQUIRED/,
  );
  await db.query(
    "update saas_invoices set state='verified',reference='QA-INVALID-OVERLAP',verified_at=now(),verified_by=$2 where id=$1",
    [invalid.id, admin],
  );
  await assert.rejects(
    db.query(
      "insert into saas_paid_terms(organization_id,invoice_id,plan_id,starts_at,ends_at) values($1,$2,'growth',now()+interval '1 day',now()+interval '2 days')",
      [t.org, invalid.id],
    ),
    /PAID_TERM_OVERLAP/,
  );
  // Pre-migration active subscriptions may have no paid-term row. Their
  // existing purchased end date remains the scheduling boundary.
  const legacy = await tenant();
  const old = (
    await db.query(
      "update tenant_subscriptions set plan_id='growth',state='active',period_end=now()+interval '10 days' where organization_id=$1 returning period_end",
      [legacy.org],
    )
  ).rows[0];
  const next = await pay(
    await request(legacy, "essential"),
    "QA-LEGACY-NEXT-PERIOD",
  );
  assert.equal(String(next.term.starts_at), String(old.period_end));
  assert.equal(
    (await call(legacy, legacy.owner, "GET", "commercial/context")).subscription
      .effective_plan,
    "growth",
  );
});

test("Only the owning tenant can cancel a pending invoice; cancellation is audited, stable on retry and cannot cancel or forge payment", async () => {
  const t = await tenant(),
    other = await tenant(),
    i = await request(t, "growth"),
    input = { reason: "Selected a different billing cycle", confirmed: true };
  await assert.rejects(
    scoped(t, t.owner, (tx) =>
      tx.query("select cancel_pending_saas_invoice($1,null)", [i.id]),
    ),
    /CANCEL_REASON_REQUIRED/,
  );
  await assert.rejects(
    call(t, t.manager, "POST", `commercial/invoices/${i.id}/cancel`, input),
    (e) => e.status === 403,
  );
  await assert.rejects(
    call(
      other,
      other.owner,
      "POST",
      `commercial/invoices/${i.id}/cancel`,
      input,
    ),
    (e) => e.status === 404,
  );
  await assert.rejects(
    call(t, t.owner, "POST", `commercial/invoices/${i.id}/cancel`, {
      ...input,
      confirmed: false,
    }),
    (e) => e.name === "ZodError",
  );
  const cancelled = await call(
    t,
    t.owner,
    "POST",
    `commercial/invoices/${i.id}/cancel`,
    input,
  );
  assert.equal(cancelled.state, "cancelled");
  assert.equal(cancelled.cancelled_by, t.owner);
  assert.equal(
    (
      await call(
        t,
        t.owner,
        "POST",
        `commercial/invoices/${i.id}/cancel`,
        input,
      )
    ).id,
    i.id,
  );
  assert.equal(
    (
      await db.query(
        "select * from audit_logs where resource_id=$1 and action='saas.invoice.cancel'",
        [i.id],
      )
    ).rows.length,
    1,
  );
  await assert.rejects(
    pay(i, "QA-CANCELLED-PAYMENT"),
    (e) => e.code === "INVOICE_NOT_PENDING",
  );
  const fresh = await request(t, "essential");
  assert.equal(fresh.state, "pending");
  await pay(fresh, "QA-REPLACEMENT-PAID");
  await assert.rejects(
    call(t, t.owner, "POST", `commercial/invoices/${fresh.id}/cancel`, input),
    (e) => e.code === "INVOICE_NOT_PENDING",
  );
  await assert.rejects(
    scoped(t, t.owner, (tx) =>
      tx.query("update saas_invoices set state='verified' where id=$1", [i.id]),
    ),
    /permission denied/,
  );
});

test("Due paid terms apply without a worker: renewal can bill, downgrade preserves an over-limit roster and blocks new admissions/finance", async () => {
  for (const nextPlan of ["growth", "essential"]) {
    const t = await tenant(),
      branch = randomUUID(),
      room = randomUUID();
    await db.query(
      "insert into branches(id,organization_id,name) values($1,$2,$3)",
      [branch, t.org, "Historical fixture"],
    );
    await db.query(
      "insert into classrooms(id,organization_id,branch_id,name,capacity) values($1,$2,$3,$4,100)",
      [room, t.org, branch, "Fixture classroom"],
    );
    let child;
    for (let i = 0; i < 28; i++) {
      const r = await db.query(
        "insert into children(organization_id,classroom_id,name) values($1,$2,$3) returning id",
        [t.org, room, "Historical child " + i],
      );
      child = r.rows[0].id;
    }
    const start = (await db.query("select now()-interval '40 days' as moment"))
      .rows[0].moment;
    let prior;
    for (const [index, planId] of ["growth", nextPlan].entries()) {
      const begins = index ? prior.ends_at : start;
      const inv = (
        await db.query(
          "insert into saas_invoices(organization_id,plan_id,cycle,amount,state,reference,verified_by,verified_at,created_by,created_at) values($1,$2,'monthly',1,'verified',$3,$4,$5,$6,$5) returning id",
          [t.org, planId, "QA-HISTORY-" + randomUUID(), admin, begins, t.owner],
        )
      ).rows[0];
      const term = (
        await db.query(
          "insert into saas_paid_terms(organization_id,invoice_id,plan_id,starts_at,ends_at) values($1,$2,$3,$4,$4::timestamptz+interval '1 month') returning *",
          [t.org, inv.id, planId, begins],
        )
      ).rows[0];
      if (!index) {
        prior = term;
        await db.query(
          "update tenant_subscriptions set plan_id='growth',state='active',period_end=$2 where organization_id=$1",
          [t.org, term.ends_at],
        );
      }
    }
    const context = await call(t, t.owner, "GET", "commercial/context");
    assert.equal(context.subscription.effective_plan, nextPlan);
    assert.equal(context.subscription.state, "active");
    assert.equal(context.used, 28);
    assert.equal((await call(t, t.owner, "GET", "children")).length, 28);
    const rule = (
      await db.query(
        "insert into recurring_billing_rules(organization_id,child_id,lines,due_day,start_month,created_by,created_at) values($1,$2,$3,1,$4,$5,$6) returning *",
        [
          t.org,
          child,
          JSON.stringify([
            { description: "Approved historical package", amount: 1500000 },
          ]),
          currentBillingMonth(),
          t.owner,
          start,
        ],
      )
    ).rows[0];
    const generate = () =>
      db.transaction((tx) =>
        generateRecurringInvoice(
          async (sql, args = []) => (await tx.query(sql, args)).rows,
          rule,
          currentBillingMonth(),
          t.owner,
        ),
      );
    if (nextPlan === "growth") assert.equal((await generate()).state, "draft");
    else {
      await assert.rejects(
        generate(),
        (e) => e.code === "BILLING_AUTHORIZATION_CHANGED",
      );
      await assert.rejects(
        call(t, t.owner, "POST", "children", {
          classroomId: room,
          name: "Over limit admission",
        }),
        (e) => e.code === "PLAN_CHILD_LIMIT",
      );
      await assert.rejects(
        call(t, t.owner, "GET", "crm/overview"),
        (e) => e.code === "ENTITLEMENT_REQUIRED",
      );
    }
  }
});
