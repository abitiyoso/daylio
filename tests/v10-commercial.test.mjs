import { createHmac } from "node:crypto";
import {
  verifyVideoWebhook,
  ingestVideoEvent,
} from "../lib/video-metadata.mjs";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { service } from "../lib/service.mjs";
import { verifySaasPayment } from "../lib/commercial-workflows.mjs";
let db, org, other, owner, manager, parent, admin, room, kid, invoice;
const roles = new Map();
async function scoped(u, fn, o = org) {
  return db.transaction(async (tx) => {
    await tx.query(
      "select set_config('app.user_id',$1,true),set_config('app.organization_id',$2,true)",
      [u, o],
    );
    await tx.exec("set local role daylio_app");
    return fn(tx);
  });
}
const call = (u, m, p, b = {}) =>
  scoped(u, (tx) =>
    service(tx, { userId: u, orgId: org, role: roles.get(u) }, m, p, b),
  );
before(async () => {
  db = new PGlite();
  for (const f of (await readdir("db/migrations")).sort())
    await db.exec(await readFile("db/migrations/" + f, "utf8"));
  [org, other, owner, manager, parent, admin, room, kid] = Array.from(
    { length: 8 },
    randomUUID,
  );
  for (const o of [org, other])
    await db.query("insert into organizations(id,name) values($1,$2)", [
      o,
      "Commercial QA",
    ]);
  for (const [u, r] of [
    [owner, "owner"],
    [manager, "manager"],
    [parent, "parent"],
  ]) {
    roles.set(u, r);
    await db.query(
      "insert into memberships(organization_id,user_id,role) values($1,$2,$3)",
      [org, u, r],
    );
  }
  await db.query("insert into platform_admins(user_id) values($1)", [admin]);
  const branch = randomUUID();
  await db.query(
    "insert into branches(id,organization_id,name) values($1,$2,$3)",
    [branch, org, "QA"],
  );
  await db.query(
    "insert into classrooms(id,organization_id,branch_id,name,capacity) values($1,$2,$3,$4,200)",
    [room, org, branch, "QA"],
  );
  await db.query(
    "insert into children(id,organization_id,classroom_id,name) values($1,$2,$3,$4)",
    [kid, org, room, "Child"],
  );
  await db.query(
    "insert into guardian_child_links(organization_id,child_id,user_id) values($1,$2,$3)",
    [org, kid, parent],
  );
});
after(async () => db?.close());
test("V10 SaaS invoice uses catalog pricing, independent verification and audit; no tenant can pay itself", async () => {
  const context = await call(owner, "GET", "commercial/context");
  assert.deepEqual(
    context.catalog.map((x) => [x.id, x.monthly_idr, x.child_limit]),
    [
      ["essential", 299000, 25],
      ["growth", 699000, 60],
      ["intelligence", 1490000, 120],
    ],
  );
  assert.equal(context.subscription.state, "trial");
  assert.equal(context.paymentProvider, "not-configured");
  await assert.rejects(
    call(manager, "POST", "commercial/invoices", {
      planId: "growth",
      cycle: "monthly",
      confirmed: true,
    }),
    (e) => e.status === 403,
  );
  await assert.rejects(
    call(owner, "POST", "commercial/invoices", {
      planId: "growth",
      cycle: "monthly",
      confirmed: true,
      state: "verified",
    }),
    (e) => e.name === "ZodError",
  );
  invoice = await call(owner, "POST", "commercial/invoices", {
    planId: "growth",
    cycle: "monthly",
    confirmed: true,
  });
  assert.equal(invoice.amount, 699000);
  assert.equal(invoice.state, "pending");
  assert.equal(
    (await call(owner, "GET", "commercial/context")).subscription.state,
    "trial",
  );
  await assert.rejects(
    scoped(owner, (tx) =>
      tx.query("update saas_invoices set state='verified' where id=$1", [
        invoice.id,
      ]),
    ),
    /permission denied/,
  );
  await assert.rejects(
    db.transaction((tx) =>
      verifySaasPayment(tx, owner, invoice.id, {
        reference: "BANK-REAL-001",
        amount: 699000,
        confirmed: true,
      }),
    ),
    (e) => e.status === 403,
  );
  await assert.rejects(
    db.transaction((tx) =>
      verifySaasPayment(tx, admin, invoice.id, {
        reference: "BANK-REAL-001",
        amount: 1,
        confirmed: true,
      }),
    ),
    (e) => e.code === "PAYMENT_AMOUNT_MISMATCH",
  );
  const paid = await db.transaction((tx) =>
    verifySaasPayment(tx, admin, invoice.id, {
      reference: "QA-BANK-001",
      amount: 699000,
      confirmed: true,
    }),
  );
  assert.equal(paid.state, "verified");
  assert.equal(
    (await call(owner, "GET", "commercial/context")).subscription
      .effective_plan,
    "growth",
  );
  await db.transaction((tx) =>
    verifySaasPayment(tx, admin, invoice.id, {
      reference: "QA-BANK-001",
      amount: 699000,
      confirmed: true,
    }),
  );
  assert.equal(
    (
      await db.query(
        "select * from audit_logs where action='saas.payment.verified-manual'",
      )
    ).rows.length,
    1,
  );
  await assert.rejects(
    scoped(owner, (tx) =>
      tx.query(
        "update tenant_subscriptions set plan_id='intelligence' where organization_id=$1",
        [org],
      ),
    ),
    /permission denied/,
  );
  assert.equal(
    (
      await scoped(
        owner,
        (tx) => tx.query("select * from saas_invoices"),
        other,
      )
    ).rows.length,
    0,
  );
});
test("V10 Essential restrictions cover API and RLS; expired terms preserve child care, historical parent invoices and bounded quota", async () => {
  const oldInvoice = await call(owner, "POST", "invoices", {
    childId: kid,
    data: {
      dueAt: new Date().toISOString(),
      lines: [{ description: "Family fee", amount: 1500000 }],
    },
  });
  await db.query(
    "update tenant_subscriptions set state='expired' where organization_id=$1",
    [org],
  );
  for (const [method, path, body] of [
    ["GET", "leads", {}],
    ["GET", "crm/overview", {}],
    ["POST", "leo/parent/query", { childId: kid, question: "meal" }],
    ["GET", "invoices", {}],
  ])
    await assert.rejects(
      call(owner, method, path, body),
      (e) => e.code === "ENTITLEMENT_REQUIRED",
    );
  assert.equal(
    (
      await scoped(owner, (tx) =>
        tx.query("select * from records where kind='invoice'"),
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (await call(parent, "GET", "invoices")).some((x) => x.id === oldInvoice.id),
    true,
  );
  assert.equal((await call(owner, "GET", "children")).length, 1);
  assert.equal(
    (await call(owner, "GET", "workspace/context")).capabilities.crm,
    false,
  );
  assert.equal(
    (await call(owner, "GET", "commercial/context")).subscription
      .effective_plan,
    "essential",
  );
  for (let i = 1; i < 25; i++)
    await db.query(
      "insert into children(organization_id,classroom_id,name) values($1,$2,$3)",
      [org, room, "Child " + i],
    );
  await assert.rejects(
    call(owner, "POST", "children", { classroomId: room, name: "Over quota" }),
    (e) => e.code === "PLAN_CHILD_LIMIT",
  );
  await assert.rejects(
    scoped(owner, (tx) =>
      tx.query(
        "insert into children(organization_id,classroom_id,name) values($1,$2,$3)",
        [org, room, "Bypass"],
      ),
    ),
    /PLAN_CHILD_LIMIT/,
  );
  assert.equal((await call(owner, "GET", "children")).length, 25);
  const addon = await call(owner, "POST", "commercial/addons", {
    addonId: "analytics",
    quantity: 4,
  });
  assert.equal(addon.connected, false);
  assert.equal(addon.state, "requested");
  assert.equal(
    (await call(parent, "GET", "commercial/context")).invoices.length,
    0,
  );
});

test("V10 recurring family billing generates one invoice per approved month, manual evidence and guardian receipt remain separate from SaaS", async () => {
  await db.query(
    "update tenant_subscriptions set plan_id='growth',state='active',period_end=now()+interval '30 days' where organization_id=$1",
    [org],
  );
  const period = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const rule = await call(owner, "POST", "billing/recurring", {
    childId: kid,
    lines: [{ description: "Monthly care", amount: 2000000 }],
    dueDay: 1,
    startMonth: period,
    confirmed: true,
  });
  const generated = await Promise.all([
    call(owner, "POST", `billing/recurring/${rule.id}/generate`, { period }),
    call(owner, "POST", `billing/recurring/${rule.id}/generate`, { period }),
  ]);
  assert.equal(generated[0].id, generated[1].id);
  assert.equal(generated[0].state, "draft");
  assert.equal(generated.filter((row) => row.generatedNow).length, 1);
  const family = await call(parent, "GET", "family/billing");
  assert.ok(family.invoices.some((i) => i.id === generated[0].id));
  assert.equal(family.rules.length, 0);
  await assert.rejects(
    call(owner, "GET", "billing/receipts/" + generated[0].id),
    (e) => e.code === "PAYMENT_NOT_VERIFIED",
  );
  await Promise.all([
    call(owner, "POST", `invoices/${generated[0].id}/record-manual-payment`, {
      reference: "QA-FAMILY-BANK-01",
      confirmed: true,
    }),
    call(owner, "POST", `invoices/${generated[0].id}/record-manual-payment`, {
      reference: "QA-FAMILY-BANK-02",
      confirmed: true,
    }),
  ]);
  assert.equal(
    (
      await db.query(
        "select * from records where kind='payment' and data->>'invoiceId'=$1",
        [generated[0].id],
      )
    ).rows.length,
    1,
  );
  const receipt = await call(
    parent,
    "GET",
    "family/receipts/" + generated[0].id,
  );
  assert.equal(
    Buffer.from(receipt.base64, "base64").subarray(0, 5).toString(),
    "%PDF-",
  );
  assert.equal(
    (await call(owner, "GET", "commercial/context")).invoices.length,
    1,
  );
  await call(owner, "POST", `billing/recurring/${rule.id}/stop`);
  await assert.rejects(
    call(owner, "POST", `billing/recurring/${rule.id}/generate`, { period }),
    (e) => e.code === "INVALID_BILLING_PERIOD",
  );
});

test("V10 video metadata fails closed, verifies signatures/replay, scopes registry and records human review without issuing streams", async () => {
  const camera = await call(owner, "POST", "integrations/registry", {
    classroomId: room,
    name: "Lobby integration QA",
    externalId: "QA-CAM-01",
    area: "lobby",
  });
  await assert.rejects(
    call(parent, "GET", "integrations/overview"),
    (e) => e.status === 403,
  );
  await assert.rejects(
    call(owner, "POST", "integrations/registry", {
      classroomId: room,
      name: "Invalid credential",
      externalId: "rtsp://secret:password@camera",
      area: "lobby",
    }),
    (e) => e.name === "ZodError",
  );
  const raw = JSON.stringify({
      organizationId: org,
      cameraId: camera.id,
      eventId: "QA-SIGNAL-1",
      type: "offline",
      occurredAt: new Date().toISOString(),
    }),
    secret = "QA-only-webhook-secret-00000000000000",
    timestamp = String(Date.now());
  const headers = new Headers({
    "x-daylio-timestamp": timestamp,
    "x-daylio-signature":
      "v1=" +
      createHmac("sha256", secret)
        .update(timestamp + "." + raw)
        .digest("hex"),
  });
  assert.throws(
    () => verifyVideoWebhook(raw, headers),
    (e) => e.code === "ELENIO_NOT_CONFIGURED",
  );
  assert.throws(
    () => verifyVideoWebhook(raw + " ", headers, { secret, enabled: true }),
    (e) => e.status === 401,
  );
  assert.throws(
    () =>
      verifyVideoWebhook(raw, headers, {
        secret,
        enabled: true,
        now: Date.now() + 360000,
      }),
    (e) => e.status === 401,
  );
  const event = verifyVideoWebhook(raw, headers, { secret, enabled: true }),
    received = await db.transaction((tx) => ingestVideoEvent(tx, event));
  assert.equal(received.duplicate, false);
  assert.equal(
    (await db.transaction((tx) => ingestVideoEvent(tx, event))).duplicate,
    true,
  );
  await assert.rejects(
    scoped(owner, (tx) =>
      tx.query(
        "insert into video_events(organization_id,camera_id,external_event_id,event_type,occurred_at) values($1,$2,'forged','offline',now())",
        [org, camera.id],
      ),
    ),
    /permission denied/,
  );
  const overview = await call(manager, "GET", "integrations/overview");
  assert.equal(overview.streaming, "not-configured");
  assert.equal(overview.events.length, 1);
  const reviewed = await call(
    manager,
    "POST",
    `integrations/events/${received.eventId}/review`,
    {
      note: "QA: operator checked context; no identity or child-safety conclusion.",
    },
  );
  assert.equal(reviewed.state, "reviewed");
  assert.equal(reviewed.reviewed_by, manager);
  const incident = await call(manager, "POST", "incidents", {
    childId: kid,
    data: {
      severity: "low",
      note: "Operator observation recorded independently from the metadata signal.",
    },
  });
  await assert.rejects(
    call(
      manager,
      "POST",
      `integrations/events/${received.eventId}/link-incident`,
      { incidentId: incident.id },
    ),
    (e) => e.code === "HUMAN_CONFIRMATION_REQUIRED",
  );
  const linked = await call(
    manager,
    "POST",
    `integrations/events/${received.eventId}/link-incident`,
    { incidentId: incident.id, confirmed: true },
  );
  assert.equal(linked.incident_id, incident.id);
  await assert.rejects(
    call(
      parent,
      "POST",
      `integrations/events/${received.eventId}/link-incident`,
      { incidentId: incident.id, confirmed: true },
    ),
    (e) => e.status === 403,
  );
  assert.equal(
    (
      await scoped(
        owner,
        (tx) => tx.query("select * from camera_registry"),
        other,
      )
    ).rows.length,
    0,
  );
  await call(owner, "POST", `integrations/registry/${camera.id}/disable`);
  await assert.rejects(
    db.transaction((tx) =>
      ingestVideoEvent(tx, { ...event, eventId: "QA-SIGNAL-2" }),
    ),
    (e) => e.code === "CAMERA_NOT_REGISTERED",
  );
});
