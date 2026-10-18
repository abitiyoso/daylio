// Fictional, opt-in local showcase only. Never imported by production startup.
import { seedSandbox, sandbox as s } from "./sandbox-fixture.mjs";
import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
export async function seedShowcase(pg, mediaDirectory) {
  await seedSandbox(pg);
  const q = async (sql, params = []) => (await pg.query(sql, params)).rows;
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
  const [hour, minute] = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date())
    .split(":")
    .map(Number);
  const nowMinutes = hour * 60 + minute,
    start = nowMinutes >= 420 ? 420 : 0,
    end = Math.min(870, Math.max(start, nowMinutes - 10));
  // Compress the fictional sample's completed activities into elapsed time today.
  // Future tour appointments and expiring pickup authorizations remain scheduled ahead.
  const at = (clock, d = day) => {
    const [h, m] = clock.split(":").map(Number),
      source = h * 60 + m;
    const minutes =
      d === day && source <= 870
        ? Math.floor(start + (Math.max(0, source - 420) * (end - start)) / 450)
        : source;
    return `${d}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00+07:00`;
  };
  const napMinutes = Math.max(
    1,
    Math.round((Date.parse(at("13:30")) - Date.parse(at("12:30"))) / 60000),
  );
  const add = async (
    kind,
    data,
    child = null,
    state = "recorded",
    actor = s.caregiver,
    clock = "09:00",
    date = day,
  ) => {
    const [row] = await q(
      "insert into records(organization_id,child_id,kind,data,state,created_by,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$7) returning *",
      [s.org, child, kind, JSON.stringify(data), state, actor, at(clock, date)],
    );
    return row;
  };
  await q("update organizations set name='Little Stars Daycare' where id=$1", [
    s.org,
  ]);
  await q("update organizations set name='Rumah Pelangi' where id=$1", [
    s.otherOrg,
  ]);
  await q("update classrooms set name='Toddler A' where id=$1", [s.room]);
  const names = [
    "Alya Putri",
    "Rafael Putri",
    "Keisha Anindya",
    "Davin Yusuf",
    "Luna Pratama",
    "Bima Aditya",
    "Naura Kirana",
  ];
  const children = names.map((_, i) =>
    i === 0
      ? s.child
      : `50000000-0000-4000-8000-${String(i + 11).padStart(12, "0")}`,
  );
  for (let i = 0; i < children.length; i++)
    await q("update children set name=$1,birth_date=$2 where id=$3", [
      names[i],
      `${new Date().getFullYear() - 3}-0${(i % 6) + 1}-12`,
      children[i],
    ]);
  for (const [user, name] of [
    [s.owner, "Nadia Dewi"],
    [s.manager, "Rani Wulandari"],
    [s.caregiver, "Dina Nuraini"],
    [s.parent, "Nadia Putri"],
  ])
    await q("update memberships set display_name=$1 where user_id=$2", [
      name,
      user,
    ]);
  // This is a newly created empty database, never a mutation of historical records.
  // The basic fixture's attendance is replaced before this opt-in seed is made available.
  await q("delete from records where kind='attendance'");
  for (const child of children.slice(0, 6))
    await add(
      "attendance",
      { type: "in", date: day },
      child,
      "recorded",
      s.caregiver,
      "07:43",
    );
  await add(
    "shift",
    {
      userId: s.caregiver,
      classroomId: s.room,
      onDuty: true,
      startsAt: at("07:00"),
      endsAt: at("23:59"),
    },
    null,
    "recorded",
    s.manager,
    "07:00",
  );
  for (const [i, child] of children.entries()) {
    await add(
      "passport",
      {
        version: 1,
        allergies:
          i === 2
            ? "Telur; ikuti catatan wali."
            : "Tidak ada alergi yang dilaporkan.",
        sleepRoutine: "Istirahat setelah makan siang.",
        dietaryNeeds: "Porsi sesuai kebutuhan anak.",
        emergencyContact: "Kontak keluarga tersimpan oleh daycare.",
        reviewNote: "Contoh fiktif untuk peninjauan antarmuka.",
        approvedAt: at("07:30"),
        approvedBy: s.manager,
      },
      child,
      "approved",
      s.manager,
      "07:30",
    );
    if (i >= 6) continue;
    const play = await add(
      "activity",
      {
        type: "play",
        result: "Aktif",
        note: "Menyusun balok warna bersama teman dan bergantian memilih bentuk.",
        occurredAt: at("09:00"),
        publishedAt: at("09:15"),
        publishedBy: s.manager,
      },
      child,
      "published",
      s.caregiver,
      "09:00",
    );
    const meal = await add(
      "activity",
      {
        type: "meal",
        result: i === 1 ? "Sebagian" : "Habis",
        note:
          i === 1
            ? "Makan separuh porsi nasi ayam dan sayur, kemudian minum air putih."
            : "Makan nasi ayam dan sayur dengan lahap, kemudian minum air putih.",
        occurredAt: at("11:30"),
        publishedAt: at("11:45"),
        publishedBy: s.manager,
      },
      child,
      "published",
      s.caregiver,
      "11:30",
    );
    const sleep = await add(
      "activity",
      {
        type: "sleep",
        result: `${napMinutes} menit`,
        note: `Beristirahat pukul ${at("12:30").slice(11, 16)}–${at("13:30").slice(11, 16)} setelah bermain bersama.`,
        occurredAt: at("13:30"),
        publishedAt: at("13:45"),
        publishedBy: s.manager,
      },
      child,
      "published",
      s.caregiver,
      "13:30",
    );
    if (i < 3)
      await add(
        "daily-story",
        {
          date: day,
          note: `${names[i].split(" ")[0]} menikmati bermain balok bersama teman hari ini. Ia berlatih bergantian dan mengenal warna. Setelah makan, ia beristirahat dengan tenang. Terima kasih sudah berbagi cerita dari rumah pagi ini.`,
          sourceIds: [play.id, meal.id, sleep.id],
          publishedAt: at("14:00"),
          publishedBy: s.manager,
        },
        child,
        "published",
        s.manager,
        "14:00",
      );
    if (i === 3 || i === 4)
      await add(
        "activity",
        {
          type: "learning",
          result: "Mencoba mandiri",
          note: "Menyusun puzzle bentuk dan meminta bantuan saat diperlukan.",
          occurredAt: at("14:15"),
          batchId: "60000000-0000-4000-8000-000000000010",
        },
        child,
        "draft",
        s.caregiver,
        "14:15",
      );
  }
  await add(
    "morning-note",
    {
      date: day,
      note: "Alya tidur lebih larut semalam. Mohon beri waktu istirahat jika terlihat mengantuk. Terima kasih, Bu Dina.",
      acknowledgedAt: at("08:10"),
      acknowledgedBy: s.caregiver,
    },
    s.child,
    "acknowledged",
    s.parent,
    "07:40",
  );
  await add(
    "morning-note",
    {
      date: day,
      note: "Rafael sudah sarapan di rumah dan membawa botol minum sendiri.",
      acknowledgedAt: at("08:12"),
      acknowledgedBy: s.caregiver,
    },
    children[1],
    "acknowledged",
    s.parent,
    "07:42",
  );
  await add(
    "pickup-authorization",
    {
      kind: "routine",
      name: "Fajar Putri",
      relationship: "Ayah",
      expiresAt: at("23:59"),
      guardianId: s.parent,
      reviewRequired: false,
    },
    s.child,
    "approved",
    s.parent,
    "08:00",
  );
  await add(
    "pickup-authorization",
    {
      kind: "substitute",
      name: "Ratna Putri",
      relationship: "Tante",
      expiresAt: at("23:59"),
      guardianId: s.parent,
      reviewRequired: true,
    },
    children[1],
    "requested",
    s.parent,
    "13:00",
  );
  const rubric = await add(
    "development-rubric",
    {
      name: "Tumbuh Bersama",
      version: "1",
      ageMinMonths: 24,
      ageMaxMonths: 60,
      domains: ["Sosial emosional", "Motorik halus"],
    },
    null,
    "active",
    s.manager,
    "08:00",
  );
  const observation = await add(
    "observation",
    {
      rubricId: rubric.id,
      rubricVersion: "1",
      domain: "Sosial emosional",
      observedOn: day,
      ageMonths: 40,
      note: "Alya menunggu giliran memilih balok dan mengajak teman menyusun menara.",
      reviewNote: "Diamati pada kegiatan bermain bersama.",
      reviewedBy: s.manager,
      reviewedAt: at("14:10"),
    },
    s.child,
    "approved",
    s.caregiver,
    "09:10",
  );
  await add(
    "observation",
    {
      rubricId: rubric.id,
      rubricVersion: "1",
      domain: "Motorik halus",
      observedOn: day,
      ageMonths: 40,
      note: "Keisha mencoba memasangkan potongan puzzle sesuai bentuk.",
    },
    children[2],
    "submitted",
    s.caregiver,
    "14:20",
  );
  await add(
    "development-report",
    {
      title: "Langkah kecil Alya",
      from: day,
      to: day,
      note: "Alya mulai lebih percaya diri bermain bersama teman. Ia mau menunggu giliran dan menyampaikan pilihan dengan kata-kata. Mari terus mendampingi dengan permainan bergantian di rumah.",
      sourceIds: [observation.id],
      sources: [
        {
          id: observation.id,
          observedOn: day,
          domain: observation.data.domain,
          note: observation.data.note,
        },
      ],
      publishedBy: s.manager,
      publishedAt: at("14:30"),
    },
    s.child,
    "published",
    s.manager,
    "14:30",
  );
  for (const [i, name] of [
    "Maya Santoso",
    "Febrian Hadi",
    "Melisa Utami",
  ].entries()) {
    const lead = await add(
      "lead",
      {
        name,
        contact: "Kontak keluarga contoh",
        source: "website",
        classroomId: s.room,
        childAgeMonths: 32,
        desiredSchedule: "Senin–Jumat",
        desiredStart: day,
        packageInterest: "Full day",
      },
      null,
      i === 1 ? "tour" : "contacted",
      s.manager,
      "09:30",
    );
    await add(
      "followup",
      {
        leadId: lead.id,
        note:
          i === 1
            ? "Konfirmasi jadwal kunjungan dan kebutuhan keluarga."
            : "Bagikan informasi layanan dan tanyakan jadwal yang dibutuhkan.",
        dueAt: at("16:00"),
        ownerId: s.manager,
      },
      null,
      "requested",
      s.manager,
      "09:40",
    );
    if (i === 1)
      await add(
        "tour",
        {
          leadId: lead.id,
          startsAt: at("16:00"),
          endsAt: at("16:30"),
          timezone: "Asia/Jakarta",
        },
        null,
        "confirmed",
        s.manager,
        "10:00",
      );
  }
  const photo = await add(
    "media",
    {
      uploaded: true,
      date: day,
      depictedChildIds: [s.child],
      exampleMedia: true,
      caption: "Contoh fotografi dari kit desain; bukan foto anak pelanggan.",
    },
    s.child,
    "published",
    s.caregiver,
    "09:20",
  );
  const folder = resolve(mediaDirectory, s.org);
  await mkdir(folder, { recursive: true });
  await cp(
    "design-reference/Daylio_Backend_v3/assets/child-art.webp",
    resolve(folder, photo.id + ".webp"),
  );
  await q(
    "insert into audit_logs(organization_id,actor_id,action) values($1,$2,'showcase.seed.fictional')",
    [s.org, s.owner],
  );
  await q("insert into schema_migrations(version) values(1004)");
  return {
    date: day,
    children: names.length,
    present: 6,
    photographicExamples: 1,
    fictional: true,
  };
}
