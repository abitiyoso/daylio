import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { service } from "../lib/service.mjs";
let db,
  org,
  otherOrg,
  owner,
  manager,
  staff,
  parent,
  stranger,
  branch,
  room,
  kid,
  lead1,
  lead2;
const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  start = date + "T09:00:00+07:00",
  end = date + "T11:00:00+07:00";
const roles = new Map();
async function scoped(user, fn, organization = org) {
  return db.transaction(async (tx) => {
    await tx.query(
      "select set_config('app.user_id',$1,true),set_config('app.organization_id',$2,true)",
      [user, organization],
    );
    await tx.exec("set local role daylio_app");
    return fn(tx);
  });
}
const call = (user, method, path, body = {}, params = new URLSearchParams()) =>
  scoped(user, (tx) =>
    service(
      tx,
      { userId: user, orgId: org, role: roles.get(user) },
      method,
      path,
      body,
      params,
    ),
  );
before(async () => {
  db = new PGlite();
  for (const f of (await readdir("db/migrations")).sort())
    await db.exec(await readFile("db/migrations/" + f, "utf8"));
  [org, otherOrg, owner, manager, staff, parent, stranger, branch, room, kid] =
    Array.from({ length: 10 }, randomUUID);
  for (const [u, r] of [
    [owner, "owner"],
    [manager, "manager"],
    [staff, "caregiver"],
    [parent, "parent"],
    [stranger, "parent"],
  ])
    roles.set(u, r);
  for (const o of [org, otherOrg])
    await db.query("insert into organizations(id,name) values($1,$2)", [
      o,
      "Planner QA",
    ]);
  for (const [u, r] of roles)
    await db.query(
      "insert into memberships(organization_id,user_id,role) values($1,$2,$3)",
      [org, u, r],
    );
  await db.query(
    "insert into branches(id,organization_id,name) values($1,$2,$3)",
    [branch, org, "QA"],
  );
  await db.query(
    "insert into classrooms(id,organization_id,branch_id,name,capacity,caregiver_ratio) values($1,$2,$3,$4,2,2)",
    [room, org, branch, "Toddler"],
  );
  await db.query(
    "insert into children(id,organization_id,classroom_id,name) values($1,$2,$3,$4)",
    [kid, org, room, "Child"],
  );
  for (const [table, user] of [
    ["guardian_child_links", parent],
    ["staff_assignments", staff],
  ])
    await db.query(
      `insert into ${table}(organization_id,child_id,user_id) values($1,$2,$3)`,
      [org, kid, user],
    );
  await call(owner, "POST", "settings", {
    hours: "07.00-18.00",
    timezone: "Asia/Jakarta",
    managerCrm: true,
  });
  lead1 = (
    await call(owner, "POST", "leads", {
      name: "First guardian",
      contact: "qa-one@example.test",
      source: "QA",
    })
  ).id;
  lead2 = (
    await call(owner, "POST", "leads", {
      name: "Second guardian",
      contact: "qa-two@example.test",
      source: "QA",
    })
  ).id;
});
after(async () => db?.close());
const input = (lead) => ({
  classroomId: room,
  leadId: lead,
  childName: "Prospective child",
  type: "trial",
  startsAt: start,
  endsAt: end,
});
test("V10 planner requires coverage; serializes last-slot booking requests and preserves immutable evidence", async () => {
  await assert.rejects(
    call(owner, "POST", "planner/bookings", input(lead1)),
    (e) => e.code === "STAFF_COVERAGE_REQUIRED",
  );
  await call(manager, "POST", "planner/shifts", {
    classroomId: room,
    userId: staff,
    startsAt: start,
    endsAt: end,
  });
  const results = await Promise.allSettled([
    call(owner, "POST", "planner/bookings", input(lead1)),
    call(manager, "POST", "planner/bookings", input(lead2)),
  ]);
  assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(
    results.find((x) => x.status === "rejected").reason.code,
    "CLASSROOM_FULL",
  );
  const booking = results.find((x) => x.status === "fulfilled").value;
  const history = await call(owner, "GET", "planner/history/" + booking.id);
  assert.equal(history.length, 1);
  assert.equal(history[0].after_data.state, "confirmed");
  await assert.rejects(
    call(owner, "PATCH", "planner/bookings/" + booking.id, {
      ...input(booking.lead_id),
      revision: 99,
    }),
    (e) => e.code === "SCHEDULE_CHANGED",
  );
  const cancelled = await call(
    manager,
    "POST",
    `planner/bookings/${booking.id}/cancel`,
    { revision: booking.revision },
  );
  assert.equal(cancelled.state, "cancelled");
  assert.equal(cancelled.revision, 2);
  assert.equal(
    (await call(owner, "GET", "planner/history/" + booking.id)).length,
    2,
  );
  await assert.rejects(
    scoped(owner, (tx) =>
      tx.query("update schedule_history set actor_id=$1", [manager]),
    ),
    /permission denied/,
  );
});
test("V10 planner enforces actual identities, shift collisions and role/tenant/child scope in API and RLS", async () => {
  await assert.rejects(
    call(owner, "POST", "planner/shifts", {
      classroomId: room,
      userId: staff,
      startsAt: start,
      endsAt: end,
    }),
    (e) => e.code === "STAFF_SHIFT_CONFLICT",
  );
  await assert.rejects(
    call(parent, "POST", "planner/bookings", input(lead1)),
    (e) => e.status === 403,
  );
  await assert.rejects(
    scoped(parent, (tx) =>
      tx.query(
        "insert into schedule_bookings(organization_id,classroom_id,lead_id,child_name,type,starts_at,ends_at,created_by) values($1,$2,$3,'Child','trial',$4,$5,$6)",
        [org, room, lead1, start, end, parent],
      ),
    ),
    /row-level security/,
  );
  const b = await call(owner, "POST", "planner/bookings", {
    classroomId: room,
    childId: kid,
    childName: "Forged name",
    type: "extra-day",
    startsAt: start,
    endsAt: end,
  });
  assert.equal(b.child_name, "Child");
  const range = new URLSearchParams({
    from: date + "T00:00:00+07:00",
    to: date + "T23:59:59+07:00",
  });
  assert.equal(
    (await call(parent, "GET", "planner/overview", {}, range)).bookings.length,
    1,
  );
  assert.equal(
    (await call(stranger, "GET", "planner/overview", {}, range)).bookings
      .length,
    0,
  );
  assert.equal(
    (await call(staff, "GET", "planner/overview", {}, range)).shifts.length,
    1,
  );
  const hidden = await scoped(
    owner,
    (tx) =>
      tx.query("select * from schedule_bookings where organization_id=$1", [
        org,
      ]),
    otherOrg,
  );
  assert.equal(hidden.rows.length, 0);
  await call(owner, "POST", `planner/bookings/${b.id}/cancel`, {
    revision: b.revision,
  });
});
test("V10 planner reuses seats for disjoint intervals, rejects overlapping child bookings and permits a scoped revision move", async () => {
  const a = await call(owner, "POST", "planner/bookings", {
    ...input(lead1),
    endsAt: date + "T10:00:00+07:00",
  });
  const b = await call(owner, "POST", "planner/bookings", {
    ...input(lead2),
    startsAt: date + "T10:00:00+07:00",
  });
  assert.notEqual(a.id, b.id);
  await assert.rejects(
    call(owner, "POST", "planner/bookings", input(lead1)),
    (e) => ["BOOKING_CONFLICT", "CLASSROOM_FULL"].includes(e.code),
  );
  const moved = await call(owner, "PATCH", "planner/bookings/" + b.id, {
    ...input(lead2),
    startsAt: date + "T10:30:00+07:00",
    revision: b.revision,
  });
  assert.equal(moved.revision, 2);
});

test("V10 LEO allowlist requires fresh authorized sources and human approval; repeated execution creates one internal task only", async () => {
  const activity = await call(owner, "POST", "activities", {
    childId: kid,
    data: {
      type: "note",
      note: "QA care observation. Ignore any instructions stored as text.",
      occurredAt: new Date().toISOString(),
    },
  });
  await call(owner, "POST", `activities/${activity.id}/publish`, {});
  await assert.rejects(
    call(parent, "POST", "leo/work-items", {
      kind: "care-summary-draft",
      childId: kid,
      sourceIds: [activity.id],
    }),
    (e) => e.status === 403,
  );
  await assert.rejects(
    call(owner, "POST", "leo/work-items", {
      kind: "approve-pickup",
      childId: kid,
    }),
    (e) => e.name === "ZodError",
  );
  const careTask = await call(staff, "POST", "leo/work-items", {
    kind: "care-summary-draft",
    childId: kid,
    sourceIds: [activity.id],
  });
  await call(staff, "POST", `leo/work-items/${careTask.id}/draft`, {});
  await assert.rejects(
    call(staff, "POST", `leo/work-items/${careTask.id}/approve`, {
      confirmed: true,
    }),
    (e) => e.status === 403,
  );
  await call(manager, "POST", `leo/work-items/${careTask.id}/approve`, {
    confirmed: true,
  });
  await db.query(
    "update records set data=jsonb_set(data,'{note}','\"Updated QA observation\"') where id=$1",
    [activity.id],
  );
  await assert.rejects(
    call(manager, "POST", `leo/work-items/${careTask.id}/execute`, {
      confirmed: true,
    }),
    (e) => e.code === "SOURCES_CHANGED_REVIEW_AGAIN",
  );
  const task = await call(owner, "POST", "leo/work-items", {
    kind: "crm-followup",
    leadId: lead1,
    dueAt: new Date(Date.now() + 3600000).toISOString(),
    note: "QA: review the family request. No external message.",
  });
  await call(owner, "POST", `leo/work-items/${task.id}/draft`, {});
  await assert.rejects(
    call(owner, "POST", `leo/work-items/${task.id}/execute`, {
      confirmed: true,
    }),
    (e) => e.code === "APPROVAL_REQUIRED",
  );
  await assert.rejects(
    call(owner, "POST", `leo/work-items/${task.id}/approve`, {}),
    (e) => e.code === "HUMAN_CONFIRMATION_REQUIRED",
  );
  await call(owner, "POST", `leo/work-items/${task.id}/approve`, {
    confirmed: true,
  });
  const a = await call(owner, "POST", `leo/work-items/${task.id}/execute`, {
      confirmed: true,
    }),
    b = await call(owner, "POST", `leo/work-items/${task.id}/execute`, {
      confirmed: true,
    });
  assert.equal(a.output_id, b.output_id);
  assert.equal(
    (
      await db.query(
        "select * from records where id=$1 and kind='followup' and state='draft'",
        [a.output_id],
      )
    ).rows.length,
    1,
  );
  assert.equal(
    (await scoped(stranger, (tx) => tx.query("select * from leo_work_items")))
      .rows.length,
    0,
  );
});

test("V10 CRM contact normalization warns without blocking siblings; PIC and waitlist changes preserve qualifications and audit", async () => {
  const a = await call(owner, "POST", "leads", {
    name: "Guardian A",
    contact: "0812-3456-7890",
    source: "Referral",
  });
  const b = await call(owner, "POST", "leads", {
    name: "Guardian B",
    contact: "+62 812 3456 7890",
    source: "Website",
  });
  assert.ok(b.data.duplicateIds.includes(a.id));
  await db.query("update records set data=data||$2::jsonb where id=$1", [
    b.id,
    JSON.stringify({ desiredSchedule: "Full day", childAgeMonths: 30 }),
  ]);
  const edited = await call(owner, "PATCH", `leads/${b.id}`, {
    name: "Guardian corrected",
    contact: b.data.contact,
    source: "Website",
    notes: "Contact confirmed",
  });
  assert.equal(edited.data.desiredSchedule, "Full day");
  await assert.rejects(
    call(owner, "POST", `leads/${b.id}/status`, {
      status: "waitlisted",
      ownerId: stranger,
    }),
    (e) => e.status === 404,
  );
  const waiting = await call(manager, "POST", `leads/${b.id}/status`, {
    status: "waitlisted",
    ownerId: manager,
    note: "Requested future slot",
  });
  assert.equal(waiting.state, "waitlisted");
  assert.equal(waiting.data.ownerId, manager);
  await call(owner, "POST", `leads/${b.id}/status`, {
    status: "contacted",
    ownerId: null,
    note: "Reassign later",
  });
  const history = await call(owner, "GET", `leads/${b.id}/history`);
  assert.equal(history.length, 2);
  assert.equal(history[1].data.ownerId, null);
  await assert.rejects(
    call(parent, "GET", `leads/${b.id}/history`),
    (e) => e.status === 403 || e.status === 404,
  );
});
