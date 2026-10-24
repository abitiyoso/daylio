import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { service } from "../lib/service.mjs";
import { jakartaDay } from "../lib/care-workflows.mjs";
import { authorizeReplay } from "../lib/replay-authorization.mjs";
let db,
  org,
  owner,
  manager,
  caregiver,
  parent,
  stranger,
  room,
  kids,
  absent,
  other,
  settings;
const roles = () => ({
  [owner]: "owner",
  [manager]: "manager",
  [caregiver]: "caregiver",
  [parent]: "parent",
  [stranger]: "parent",
});
async function scoped(user, fn) {
  return db.transaction(async (tx) => {
    await tx.query(
      "select set_config('app.user_id',$1,true),set_config('app.organization_id',$2,true)",
      [user, org],
    );
    await tx.exec("set local role daylio_app");
    return fn(tx);
  });
}
const call = (user, method, path, body = {}, params = new URLSearchParams()) =>
  scoped(user, (tx) =>
    service(
      tx,
      { userId: user, orgId: org, role: roles()[user] },
      method,
      path,
      body,
      params,
    ),
  );
const denied = (status) => (e) => e.status === status;
before(async () => {
  db = new PGlite();
  for (const name of (await readdir("db/migrations")).sort())
    await db.exec(await readFile(`db/migrations/${name}`, "utf8"));
  [org, owner, manager, caregiver, parent, stranger, room, absent, other] =
    Array.from({ length: 9 }, randomUUID);
  kids = Array.from({ length: 6 }, randomUUID);
  await db.query("insert into organizations(id,name) values($1,'V3 test')", [
    org,
  ]);
  for (const [user, role] of Object.entries(roles()))
    await db.query(
      "insert into memberships(organization_id,user_id,role,display_name) values($1,$2,$3,$3)",
      [org, user, role],
    );
  const branch = randomUUID();
  await db.query(
    "insert into branches(id,organization_id,name) values($1,$2,'Utama')",
    [branch, org],
  );
  await db.query(
    "insert into classrooms(id,organization_id,branch_id,name,capacity) values($1,$2,$3,'Toddler',10)",
    [room, org, branch],
  );
  for (const [index, kid] of [...kids, absent, other].entries()) {
    await db.query(
      "insert into children(id,organization_id,classroom_id,name,birth_date) values($1,$2,$3,$4,'2024-01-01')",
      [kid, org, room, `Child ${index + 1}`],
    );
    if (kid !== other)
      await db.query(
        "insert into staff_assignments(organization_id,child_id,user_id) values($1,$2,$3)",
        [org, kid, caregiver],
      );
    if (index < 2)
      await db.query(
        "insert into guardian_child_links(organization_id,child_id,user_id) values($1,$2,$3)",
        [org, kid, parent],
      );
    if (index < 6)
      await call(caregiver, "POST", "attendance", {
        childId: kid,
        data: { type: "in" },
      });
  }
  settings = await call(owner, "POST", "settings", {
    data: {
      hours: "07:00–18:00",
      timezone: "Asia/Jakarta",
      routinePublishing: "manager-review",
      substituteReview: true,
    },
  });
});
after(async () => db?.close());
let batch;
test("V3 Quick Care: present assigned class batch, one exception, persisted drafts, policy review and bundled delivery", async () => {
  const context = await call(caregiver, "GET", "workspace/context");
  assert.equal(context.children.filter((c) => c.present).length, 6);
  assert.equal(context.children.length, 7);
  const data = {
    type: "meal",
    note: "Makan siang tercatat",
    result: "Habis",
    occurredAt: new Date().toISOString(),
  };
  await assert.rejects(
    call(
      caregiver,
      "POST",
      "activities/batch",
      { childIds: [kids[0]], classroomId: room, data },
      new URLSearchParams({ date: "2000-01-01" }),
    ),
    denied(422),
  );
  await assert.rejects(
    call(caregiver, "POST", "activities/batch", {
      childIds: [kids[0], absent],
      classroomId: room,
      data,
    }),
    denied(409),
  );
  await assert.rejects(
    call(caregiver, "POST", "activities/batch", {
      childIds: [other],
      classroomId: room,
      data,
    }),
    denied(404),
  );
  batch = await call(caregiver, "POST", "activities/batch", {
    childIds: kids,
    classroomId: room,
    data,
    exceptions: {
      [kids[1]]: { result: "Sebagian", note: "Makan separuh porsi" },
    },
  });
  assert.equal(batch.length, 6);
  assert.equal(new Set(batch.map((r) => r.data.batchId)).size, 1);
  assert.equal(batch[1].data.result, "Sebagian");
  assert.ok(batch.every((r) => r.state === "draft"));
  assert.equal((await call(parent, "GET", "activities")).length, 0);
  await assert.rejects(
    call(
      caregiver,
      "POST",
      `activities/batches/${batch[0].data.batchId}/publish`,
      { confirmed: true },
    ),
    denied(403),
  );
  await assert.rejects(
    call(caregiver, "PATCH", `activities/${batch[0].id}`, {
      data: { ...data, reviewRequired: false },
    }),
    (e) => e.name === "ZodError",
  );
  await call(
    manager,
    "POST",
    `activities/batches/${batch[0].data.batchId}/publish`,
    { confirmed: true },
  );
  assert.equal((await call(parent, "GET", "activities")).length, 2);
  await call(manager, "POST", `activities/${batch[0].id}/publish`);
  assert.equal(
    (await call(parent, "GET", "notifications")).filter((n) =>
      n.event_key.endsWith(":daily-update"),
    ).length,
    2,
  );
  await assert.rejects(
    call(parent, "GET", `activities/${batch[2].id}`),
    denied(404),
  );
});
test("V3 parent today and Daily Story contain published same-child sources only", async () => {
  await assert.rejects(
    call(manager, "POST", "daily-stories", {
      childId: kids[0],
      date: jakartaDay(),
      note: "Cerita",
      sourceIds: [batch[1].id],
    }),
    denied(422),
  );
  const story = await call(caregiver, "POST", "daily-stories", {
    childId: kids[0],
    date: jakartaDay(),
    note: "Makan siang habis sesuai catatan pengasuh.",
    sourceIds: [batch[0].id],
  });
  assert.equal((await call(parent, "GET", "daily-stories")).length, 0);
  await assert.rejects(
    call(caregiver, "POST", `daily-stories/${story.id}/publish`, {
      confirmed: true,
    }),
    denied(403),
  );
  await call(manager, "POST", `daily-stories/${story.id}/publish`, {
    confirmed: true,
  });
  const today = await call(
    parent,
    "GET",
    "parent/today",
    {},
    new URLSearchParams({ childId: kids[0] }),
  );
  assert.equal(today.meal.id, batch[0].id);
  assert.equal(today.story.id, story.id);
  assert.equal(today.sleep, null);
  await assert.rejects(
    call(
      stranger,
      "GET",
      "parent/today",
      {},
      new URLSearchParams({ childId: kids[0] }),
    ),
    denied(404),
  );
});
test("V3 morning handover requires linked guardian, caregiver acknowledgment and immutable history", async () => {
  await assert.rejects(
    call(stranger, "POST", "morning-notes", {
      childId: kids[0],
      note: "Denied",
    }),
    denied(404),
  );
  const note = await call(parent, "POST", "morning-notes", {
    childId: kids[0],
    note: "Tidur lebih larut, mohon dipantau.",
  });
  assert.ok(
    (await call(manager, "GET", "manager/exceptions")).items.some(
      (r) => r.id === note.id,
    ),
  );
  await assert.rejects(
    call(parent, "POST", `morning-notes/${note.id}/acknowledge`),
    denied(403),
  );
  const ack = await call(
    caregiver,
    "POST",
    `morning-notes/${note.id}/acknowledge`,
  );
  assert.equal(ack.data.acknowledgedBy, caregiver);
  assert.ok(
    !(await call(manager, "GET", "manager/exceptions")).items.some(
      (r) => r.id === note.id,
    ),
  );
  const history = await db.query(
    "select * from record_history where record_id=$1",
    [note.id],
  );
  assert.ok(history.rows.length > 0);
});
const pickupBody = {
  verificationMethod: "physical-id",
  verifiedPersonName: "Ibu Test",
  identityNote: "Nama dan identitas cocok dengan izin wali",
  handoverConfirmed: true,
};
test("V3 routine pickup: guardian authorization, real in-person evidence, atomic checkout and duplicate protection", async () => {
  const auth = await call(parent, "POST", "pickup-authorizations", {
    childId: kids[0],
    data: {
      kind: "routine",
      name: "Ibu Test",
      relationship: "Ibu",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  assert.equal(auth.state, "approved");
  await assert.rejects(
    call(caregiver, "POST", `pickups/${auth.id}/verify-handover`, {
      identityVerified: true,
    }),
    (e) => e.name === "ZodError",
  );
  await assert.rejects(
    call(caregiver, "POST", `pickups/${auth.id}/verify-handover`, {
      ...pickupBody,
      verifiedPersonName: "Orang lain",
    }),
    denied(422),
  );
  const pickup = await call(
    caregiver,
    "POST",
    `pickups/${auth.id}/verify-handover`,
    pickupBody,
  );
  assert.equal(pickup.data.staffId, caregiver);
  assert.ok(pickup.data.checkInId);
  assert.ok(!("cctv" in pickup.data));
  assert.equal(
    (
      await call(
        parent,
        "GET",
        "parent/today",
        {},
        new URLSearchParams({ childId: kids[0] }),
      )
    ).attendance.data.type,
    "out",
  );
  await assert.rejects(
    call(caregiver, "POST", `pickups/${auth.id}/verify-handover`, pickupBody),
    denied(409),
  );
  await call(caregiver, "POST", "attendance", {
    childId: kids[0],
    data: { type: "in" },
  });
  const again = await call(
    caregiver,
    "POST",
    `pickups/${auth.id}/verify-handover`,
    pickupBody,
  );
  assert.notEqual(again.id, pickup.id);
});
test("V3 substitute pickup: review, physical ID, expiry, revocation and single use", async () => {
  const create = () =>
    call(parent, "POST", "pickup-authorizations", {
      childId: kids[1],
      data: {
        kind: "substitute",
        name: "Ibu Test",
        relationship: "Tante",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    });
  await assert.rejects(
    call(caregiver, "POST", "pickup-authorizations", {
      childId: kids[1],
      data: {},
    }),
    denied(403),
  );
  const auth = await create();
  assert.equal(auth.state, "requested");
  await assert.rejects(
    call(caregiver, "POST", `pickups/${auth.id}/verify-handover`, pickupBody),
    denied(409),
  );
  await assert.rejects(
    call(caregiver, "POST", `pickup-authorizations/${auth.id}/approve`),
    denied(403),
  );
  await call(manager, "POST", `pickup-authorizations/${auth.id}/approve`);
  await assert.rejects(
    call(caregiver, "POST", `pickups/${auth.id}/verify-handover`, {
      ...pickupBody,
      verificationMethod: "known-authorized-person",
    }),
    denied(422),
  );
  await call(
    caregiver,
    "POST",
    `pickups/${auth.id}/verify-handover`,
    pickupBody,
  );
  assert.equal(
    (await call(parent, "GET", "pickup-authorizations")).find(
      (r) => r.id === auth.id,
    ).state,
    "used",
  );
  await assert.rejects(
    call(caregiver, "POST", `pickups/${auth.id}/verify-handover`, pickupBody),
    denied(409),
  );
  const revoked = await create();
  await call(parent, "POST", `pickup-authorizations/${revoked.id}/revoke`);
  await assert.rejects(
    call(manager, "POST", `pickup-authorizations/${revoked.id}/approve`),
    denied(409),
  );
  const expired = await create();
  await call(manager, "POST", `pickup-authorizations/${expired.id}/approve`);
  await db.query(
    "update records set data=jsonb_set(data,'{expiresAt}',to_jsonb('2020-01-01T00:00:00Z'::text)) where id=$1",
    [expired.id],
  );
  await assert.rejects(
    call(
      caregiver,
      "POST",
      `pickups/${expired.id}/verify-handover`,
      pickupBody,
    ),
    denied(409),
  );
});
test("V3 closing snapshots open incidents and children without hiding unresolved exceptions", async () => {
  const incident = await call(caregiver, "POST", "incidents", {
    childId: kids[2],
    data: { severity: "medium", note: "Perlu tindak lanjut manusia" },
  });
  const closing = await call(manager, "POST", "manager/closing", {
    note: "Diteruskan ke shift berikutnya",
    confirmed: true,
  });
  assert.ok(closing.data.unresolved.some((r) => r.id === incident.id));
  assert.ok(closing.data.unresolved.some((r) => r.kind === "still-present"));
  assert.ok(
    (await call(manager, "GET", "manager/exceptions")).items.some(
      (r) => r.id === incident.id,
    ),
  );
  assert.equal(
    (await call(manager, "GET", `incidents/${incident.id}`)).state,
    "draft",
  );
  await assert.rejects(call(parent, "GET", "manager/closing"), denied(403));
});
test("V3 finance/CRM capabilities default denied in service AND RLS, explicit owner delegation", async () => {
  await assert.rejects(call(manager, "GET", "invoices"), denied(403));
  await assert.rejects(call(manager, "GET", "crm/overview"), denied(403));
  const lead = await call(owner, "POST", "leads", {
    data: { name: "Wali calon", contact: "6281234567890", source: "Website" },
  });
  const rows = await scoped(manager, (tx) =>
    tx.query("select * from records where kind='lead'"),
  );
  assert.equal(rows.rows.length, 0);
  await call(owner, "PATCH", `settings/${settings.id}`, {
    data: { ...settings.data, managerCrm: true },
  });
  assert.equal(
    (await call(manager, "GET", "crm/overview")).leads[0].id,
    lead.id,
  );
  await assert.rejects(call(manager, "GET", "invoices"), denied(403));
  const draft = await call(
    manager,
    "POST",
    `crm/leads/${lead.id}/whatsapp-draft`,
    { purpose: "reply", text: "Terima kasih, jadwal dapat kita diskusikan." },
  );
  assert.equal(draft.data.delivery, "not-sent");
  await call(manager, "POST", `crm/whatsapp-drafts/${draft.id}/copy`);
  assert.equal(
    (await call(manager, "GET", "crm/overview")).drafts[0].data.delivery,
    "not-sent",
  );
  const enrollment = await call(
    manager,
    "POST",
    `crm/leads/${lead.id}/confirm-enrollment`,
    {
      name: "Anak baru",
      classroomId: room,
      email: "new@example.test",
      packageName: "Bulanan",
      packagePrice: 1500000,
      emergencyName: "Kontak darurat",
      emergencyPhone: "081234567890",
      confirmed: true,
    },
  );
  const repeat = await call(
    manager,
    "POST",
    `crm/leads/${lead.id}/confirm-enrollment`,
    {
      name: "Anak baru",
      classroomId: room,
      email: "new@example.test",
      packageName: "Bulanan",
      packagePrice: 1500000,
      emergencyName: "Kontak darurat",
      emergencyPhone: "081234567890",
      confirmed: true,
    },
  );
  assert.equal(repeat.id, enrollment.id);
});
test("V3 passport changes require guardian proposal and manager sign-off with version history", async () => {
  const input = {
    childId: kids[0],
    data: {
      allergies: "Tidak ada yang dilaporkan",
      careInstructions: "Pantau istirahat",
      emergencyName: "Ayah",
      emergencyPhone: "081234567890",
      authorizedContacts: [],
    },
  };
  await assert.rejects(
    call(stranger, "POST", "passport-changes", input),
    denied(404),
  );
  const change = await call(parent, "POST", "passport-changes", input);
  assert.equal(
    (await call(parent, "GET", `passports/${kids[0]}`)).current,
    null,
  );
  await assert.rejects(
    call(parent, "POST", `passport-changes/${change.id}/approve`, {
      note: "Self approval",
      confirmed: true,
    }),
    denied(403),
  );
  await call(manager, "POST", `passport-changes/${change.id}/approve`, {
    note: "Dikonfirmasi bersama wali",
    confirmed: true,
  });
  const approved = (await call(caregiver, "GET", `passports/${kids[0]}`))
    .current;
  assert.equal(approved.data.version, 1);
  assert.equal(approved.data.sourceId, change.id);
});
test("V3 development: separate observations, configurable rubric, review, human publication, guardian PDF scope", async () => {
  const rubric = await call(manager, "POST", "development-rubrics", {
    name: "Observasi kelas",
    version: "2026.1",
    ageMinMonths: 12,
    ageMaxMonths: 48,
    domains: ["Motorik", "Bahasa"],
  });
  const observation = await call(caregiver, "POST", "observations", {
    childId: kids[0],
    rubricId: rubric.id,
    domain: "Motorik",
    observedOn: jakartaDay(),
    note: "Menyusun tiga balok saat kegiatan terarah.",
  });
  await assert.rejects(
    call(manager, "POST", "development-reports", {
      childId: kids[0],
      title: "Rapor",
      from: jakartaDay(),
      to: jakartaDay(),
      note: "Catatan guru",
      sourceIds: [batch[0].id],
    }),
    denied(404),
  );
  await call(caregiver, "POST", `observations/${observation.id}/submit`);
  await assert.rejects(
    call(caregiver, "POST", `observations/${observation.id}/approve`, {
      note: "Self review",
      confirmed: true,
    }),
    denied(403),
  );
  await call(manager, "POST", `observations/${observation.id}/approve`, {
    note: "Sumber observasi diperiksa",
    confirmed: true,
  });
  const report = await call(manager, "POST", "development-reports", {
    childId: kids[0],
    title: "Rapor pengamatan",
    from: jakartaDay(),
    to: jakartaDay(),
    note: "Teramati menyusun balok. Bukan diagnosis.",
    sourceIds: [observation.id],
  });
  assert.equal((await call(parent, "GET", "development-reports")).length, 0);
  await call(manager, "POST", `development-reports/${report.id}/publish`, {
    confirmed: true,
  });
  const pdf = await call(parent, "GET", `development-reports/${report.id}/pdf`);
  assert.ok(Buffer.from(pdf.content, "base64").toString().startsWith("%PDF"));
  await assert.rejects(
    call(stranger, "GET", `development-reports/${report.id}/pdf`),
    denied(404),
  );
  assert.equal((await call(parent, "GET", "observations")).length, 0);
});
test("V3 media requires guardian consent for every depicted child and withdrawal blocks access", async () => {
  const data = { activityId: batch[0].id, mime: "image/jpeg", size: 100 };
  await assert.rejects(
    call(caregiver, "POST", "media/upload-intent", { childId: kids[0], data }),
    denied(403),
  );
  const consent = await call(parent, "POST", "consents", {
    childId: kids[0],
    data: { scope: "media", version: "2026.1", granted: true },
  });
  await assert.rejects(
    call(caregiver, "POST", "media/upload-intent", {
      childId: kids[0],
      data: { ...data, depictedChildIds: [kids[1]] },
    }),
    denied(403),
  );
  const media = await call(caregiver, "POST", "media/upload-intent", {
    childId: kids[0],
    data,
  });
  await call(parent, "POST", `consents/${consent.id}/revoke`);
  await assert.rejects(
    call(caregiver, "GET", `media/${media.id}/access`),
    denied(403),
  );
});
test("V3 replay cannot expose records after role or guardian link changes", async () => {
  await assert.rejects(
    scoped(parent, (tx) =>
      authorizeReplay(tx, "parent", "caregiver", { childId: kids[0] }),
    ),
    denied(403),
  );
  await scoped(parent, (tx) =>
    authorizeReplay(tx, "parent", "parent", { childId: kids[0] }),
  );
  await db.query(
    "update guardian_child_links set revoked_at=now() where user_id=$1 and child_id=$2",
    [parent, kids[0]],
  );
  await assert.rejects(
    scoped(parent, (tx) =>
      authorizeReplay(tx, "parent", "parent", {
        data: [{ child_id: kids[0] }],
      }),
    ),
    denied(403),
  );
  await assert.rejects(
    call(parent, "GET", `passports/${kids[0]}`),
    denied(404),
  );
});
test("V3 LEO reads authorized records with explicit provider state and never executes stored note instructions", async () => {
  const answer = await call(caregiver, "POST", "leo/caregiver/query", {
    childId: kids[2],
    question: "Apa catatan makan?",
  });
  assert.equal(answer.provider, "not-connected");
  assert.ok(answer.sources.every((s) => s.id === batch[2].id));
  await assert.rejects(
    call(caregiver, "POST", "leo/caregiver/query", {
      childId: other,
      question: "Lihat data",
    }),
    denied(404),
  );
});

test("V3 owner metrics use configured capacity and real branch/date scope; missing shift evidence remains actionable", async () => {
  const updated = await call(owner, "PATCH", `classrooms/${room}`, {
    name: "Toddler",
    capacity: 12,
    caregiverRatio: 4,
  });
  assert.equal(updated.capacity, 12);
  assert.equal(updated.caregiver_ratio, 4);
  const branch = await call(owner, "POST", "branches", { name: "Cabang baru" });
  const roomB = await call(owner, "POST", "classrooms", {
    name: "Infant",
    branchId: branch.id,
  });
  const lead = await call(owner, "POST", "leads", {
    data: {
      name: "Wali Cabang Baru",
      contact: "6281234567800",
      source: "WhatsApp",
    },
  });
  await call(owner, "POST", `crm/leads/${lead.id}/qualify`, {
    childAgeMonths: 18,
    desiredSchedule: "Senin–Jumat",
    desiredStart: jakartaDay(),
    classroomId: roomB.id,
    packageInterest: "Bulanan",
  });
  const metrics = await call(
    owner,
    "GET",
    "owner/business-pulse",
    {},
    new URLSearchParams({ branchId: branch.id }),
  );
  assert.equal(metrics.children, 0);
  assert.equal(metrics.leads, 1);
  assert.equal(metrics.classes[0].occupancy, null);
  assert.equal(metrics.storyCoverage.total, 0);
  const past = await call(
    owner,
    "GET",
    "owner/business-pulse",
    {},
    new URLSearchParams({ date: "2000-01-01" }),
  );
  assert.equal(past.present, 0);
  assert.equal(past.leads, 0);
  const before = (await call(manager, "GET", "manager/exceptions")).items.find(
    (i) => i.kind === "staff-coverage" && i.id === room,
  );
  assert.ok(before);
  assert.equal(before.data.staffOnDuty, 0);
  await call(owner, "POST", "shifts", {
    data: {
      userId: caregiver,
      startsAt: new Date(Date.now() - 3600000).toISOString(),
      endsAt: new Date(Date.now() + 3600000).toISOString(),
      onDuty: true,
    },
  });
  assert.ok(
    !(await call(manager, "GET", "manager/exceptions")).items.some(
      (i) => i.kind === "staff-coverage" && i.id === room,
    ),
  );
  await call(owner, "PATCH", `classrooms/${roomB.id}`, {
    name: "Infant",
    capacity: 1,
  });
  await call(owner, "POST", "children", {
    name: "Occupying slot",
    classroomId: roomB.id,
  });
  await assert.rejects(
    call(owner, "POST", `crm/leads/${lead.id}/confirm-enrollment`, {
      name: "No slot",
      classroomId: roomB.id,
      email: "noslot@example.test",
      packageName: "Bulanan",
      packagePrice: 1500000,
      emergencyName: "Wali",
      emergencyPhone: "081234567890",
      confirmed: true,
    }),
    denied(409),
  );
  assert.equal(
    (await call(owner, "GET", "leads")).find((r) => r.id === lead.id).state,
    "qualified",
  );
});

test("Parent Home bounds today's highlights, picks the latest handover, and preserves scoped history", async () => {
  const date = jakartaDay(),
    target = randomUUID();
  await db.query(
    "insert into children(id,organization_id,classroom_id,name) values($1,$2,$3,'Nara Putri')",
    [target, org, room],
  );
  await db.query(
    "insert into guardian_child_links(organization_id,child_id,user_id) values($1,$2,$3)",
    [org, target, parent],
  );
  // Fixture writes stay inside this test's in-memory PostgreSQL database.
  for (let index = 0; index < 8; index++)
    await db.query(
      "insert into records(organization_id,child_id,kind,data,state,created_by,created_at,updated_at) values($1,$2,'activity',$3,'published',$4,$5,$5)",
      [
        org,
        target,
        JSON.stringify({
          type: "play",
          note: `Bermain balok sesi ${index + 1}.`,
          occurredAt: `${date}T09:${String(index + 10).padStart(2, "0")}:00+07:00`,
        }),
        caregiver,
        `${date}T09:${String(index + 10).padStart(2, "0")}:00+07:00`,
      ],
    );
  for (let index = 0; index < 3; index++)
    await db.query(
      "insert into records(organization_id,child_id,kind,data,state,created_by,created_at,updated_at) values($1,$2,'morning-note',$3,'submitted',$4,$5,$5)",
      [
        org,
        target,
        JSON.stringify({ date, note: `Kabar dari rumah ${index + 1}.` }),
        parent,
        `${date}T07:${String(index + 10).padStart(2, "0")}:00+07:00`,
      ],
    );
  const today = await call(
    parent,
    "GET",
    "parent/today",
    {},
    new URLSearchParams({ childId: target }),
  );
  assert.equal(today.activities.length, 4);
  assert.ok(today.activityCount >= 8);
  assert.equal(today.morning.length, 1);
  assert.ok(today.morningHistory.length >= 2);
  assert.ok(today.activities.every((r) => r.child_id === target));
  const history = await call(
    parent,
    "GET",
    "activities",
    {},
    new URLSearchParams({ childId: target }),
  );
  assert.ok(history.filter((r) => r.kind === "activity").length >= 8);
  await assert.rejects(
    call(
      stranger,
      "GET",
      "parent/today",
      {},
      new URLSearchParams({ childId: target }),
    ),
    denied(404),
  );
});
