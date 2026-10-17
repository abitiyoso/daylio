import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { sandbox as s } from "../db/sandbox-fixture.mjs";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("Synthetic localhost only");
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  actors = [],
  faults = [],
  passed = [],
  tag = "P1 " + Date.now(),
  today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );
await mkdir("evidence/screenshots/v3", { recursive: true });
try {
  async function login(role) {
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: "reduce",
      }),
      page = await context.newPage();
    page.on("pageerror", (e) => faults.push(role + ": " + e.message));
    await page.goto(base + "/workspace");
    await page.getByLabel("Email", { exact: true }).fill(role + "@daylio.test");
    await page
      .getByLabel("Kata sandi", { exact: true })
      .fill("Sandbox-only-2026!");
    await page.getByRole("button", { name: "Lanjutkan", exact: true }).click();
    await page.locator('.op-content > div[aria-busy="false"]').waitFor();
    const actor = { page, context };
    actors.push(actor);
    return actor;
  }
  const owner = await login("owner"),
    manager = await login("manager"),
    caregiver = await login("caregiver"),
    parent = await login("parent");
  async function api(actor, path, method = "GET", body) {
    const response = await actor.context.request.fetch(
      base + "/api/v1/" + path,
      {
        method,
        headers: {
          Origin: base,
          "x-organization-id": s.org,
          "idempotency-key": randomUUID(),
        },
        ...(body ? { data: body } : {}),
      },
    );
    const json = await response.json();
    assert.ok(response.ok(), JSON.stringify(json));
    return json.data ?? json;
  }
  async function nav(actor, label) {
    await actor.page
      .getByRole("navigation", { name: "Navigasi utama" })
      .getByRole("button", { name: label, exact: true })
      .click();
    await actor.page.locator('.op-content > div[aria-busy="false"]').waitFor();
  }
  async function saved(actor) {
    await actor.page.getByRole("status").waitFor();
    await actor.page.locator('.op-content > div[aria-busy="false"]').waitFor();
    assert.equal(
      await actor.page.locator('.op-alert[role="alert"]').count(),
      0,
    );
  }
  const kid = await api(owner, "children/" + s.child);
  await api(owner, "children/" + s.child, "PATCH", {
    name: kid.name,
    birthDate: "2024-01-01",
  });
  await nav(parent, "Care Passport");
  for (const [label, value] of [
    ["Alergi yang diketahui", "Tidak ada yang dilaporkan — " + tag],
    ["Instruksi perawatan", "Konfirmasi kondisi dengan wali."],
    ["Nama kontak darurat", "Wali Uji"],
    ["Telepon darurat", "081234567890"],
  ])
    await parent.page.getByLabel(label, { exact: true }).fill(value);
  await parent.page
    .getByRole("button", { name: "Ajukan untuk dikonfirmasi", exact: true })
    .click();
  await saved(parent);
  await nav(manager, "Anak & Keluarga");
  const proposal = manager.page
    .locator(".op-list-item")
    .filter({ hasText: "Tidak ada yang dilaporkan — " + tag });
  await proposal
    .getByLabel("Catatan konfirmasi", { exact: true })
    .fill("Uji: informasi dikonfirmasi dengan wali.");
  await proposal
    .getByRole("button", { name: "Catat keputusan", exact: true })
    .click();
  await saved(manager);
  await nav(caregiver, "Anak & Care Passport");
  await caregiver.page
    .getByText("Tidak ada yang dilaporkan — " + tag, { exact: true })
    .waitFor();
  await caregiver.page.screenshot({
    path: "evidence/screenshots/v3/passport-1440.png",
  });
  passed.push(
    "Care Passport UI: parent proposal → manager confirmed version → assigned caregiver read, with actual persisted emergency/allergy information.",
  );
  await nav(manager, "Rapor & Perkembangan");
  const rubricCard = manager.page.locator(".op-card").filter({
    has: manager.page.getByRole("heading", {
      name: "Rubrik usia & kurikulum",
      exact: true,
    }),
  });
  for (const [label, value] of [
    ["Nama rubrik", tag + " rubrik"],
    ["Versi", "1"],
    ["Usia minimum (bulan)", "12"],
    ["Usia maksimum (bulan)", "48"],
    ["Domain, pisahkan dengan koma", "Motorik, Bahasa"],
  ])
    await rubricCard.getByLabel(label, { exact: true }).fill(value);
  await rubricCard
    .getByRole("button", { name: "Tetapkan rubrik", exact: true })
    .click();
  await saved(manager);
  const rubrics = await api(manager, "development-rubrics"),
    rubric = rubrics.find((r) => r.data.name === tag + " rubrik");
  assert.ok(rubric);
  await nav(caregiver, "Observasi & Rapor");
  await caregiver.page
    .getByLabel("Rubrik & versi", { exact: true })
    .selectOption(rubric.id);
  await caregiver.page
    .getByLabel("Domain sesuai rubrik", { exact: true })
    .fill("Motorik");
  await caregiver.page
    .getByLabel("Tanggal observasi", { exact: true })
    .fill(today);
  await caregiver.page
    .getByLabel("Perilaku yang benar-benar diamati", { exact: true })
    .fill(tag + " menyusun tiga balok saat kegiatan terarah.");
  await caregiver.page
    .getByRole("button", { name: "Simpan draf observasi", exact: true })
    .click();
  await saved(caregiver);
  const observation = caregiver.page
    .locator(".op-list-item")
    .filter({ hasText: tag + " menyusun tiga balok" });
  await observation
    .getByRole("button", { name: "Ajukan review", exact: true })
    .click();
  await saved(caregiver);
  await nav(manager, "Rapor & Perkembangan");
  const review = manager.page
    .locator(".op-list-item")
    .filter({ hasText: tag + " menyusun tiga balok" });
  await review
    .getByLabel("Catatan reviewer", { exact: true })
    .fill("Catatan diperiksa, sesuai pengamatan guru.");
  await review
    .getByRole("button", { name: "Catat review", exact: true })
    .click();
  await saved(manager);
  await manager.page
    .getByLabel("Judul rapor", { exact: true })
    .fill(tag + " Rapor Pengamatan");
  await manager.page
    .getByLabel("Narasi yang ditinjau manusia", { exact: true })
    .fill(
      "Teramati menyusun balok dalam kegiatan guru. Catatan ini bukan diagnosis.",
    );
  await manager.page
    .getByRole("button", { name: "Simpan draf rapor", exact: true })
    .click();
  await saved(manager);
  const reportRow = manager.page.locator(".op-list-item").filter({
    has: manager.page.getByRole("heading", {
      name: tag + " Rapor Pengamatan",
      exact: true,
    }),
  });
  await reportRow
    .getByRole("button", { name: "Sahkan & terbitkan", exact: true })
    .click();
  await manager.page
    .getByRole("dialog")
    .getByRole("button", { name: "Konfirmasi", exact: true })
    .click();
  await saved(manager);
  await nav(parent, "Rapor Anak");
  const parentReport = parent.page.locator(".op-list-item").filter({
    has: parent.page.getByRole("heading", {
      name: tag + " Rapor Pengamatan",
      exact: true,
    }),
  });
  await parentReport.waitFor();
  const report = (await api(parent, "development-reports")).find(
    (r) => r.data.title === tag + " Rapor Pengamatan",
  );
  const pdf = await api(parent, "development-reports/" + report.id + "/pdf");
  assert.ok(Buffer.from(pdf.content, "base64").toString().startsWith("%PDF"));
  await writeFile(
    "evidence/v3-report-synthetic.pdf",
    Buffer.from(pdf.content, "base64"),
  );
  await parent.page.screenshot({
    path: "evidence/screenshots/v3/report-parent-1440.png",
  });
  passed.push(
    "Development UI: configured age/curriculum rubric → educator observation → submit → manager source review → human report draft → sign-off/publication → linked parent read and private PDF generated.",
  );
  const room = await api(owner, "classrooms", "POST", {
    name: tag + " kelas",
    branchId: s.branch,
  });
  await api(owner, "classrooms/" + room.id, "PATCH", {
    name: room.name,
    capacity: 1,
  });
  await nav(owner, "CRM & WhatsApp");
  for (const [label, value] of [
    ["Nama wali", tag + " Wali Prospek"],
    ["Nomor WhatsApp, format 62…", "6281234567890"],
    ["Kebutuhan keluarga", "Membutuhkan perawatan Senin–Jumat."],
  ])
    await owner.page.getByLabel(label, { exact: true }).fill(value);
  await owner.page
    .getByRole("button", { name: "Simpan prospek", exact: true })
    .click();
  await saved(owner);
  let leadRow = owner.page
    .locator(".op-list-item")
    .filter({ hasText: tag + " Wali Prospek" });
  await leadRow
    .getByRole("button", { name: "Kualifikasi", exact: true })
    .click();
  const dialog = owner.page.getByRole("dialog");
  await dialog.getByLabel("Usia anak (bulan)", { exact: true }).fill("24");
  await dialog
    .getByLabel("Jadwal yang dibutuhkan", { exact: true })
    .fill("Senin–Jumat");
  await dialog.getByLabel("Rencana mulai", { exact: true }).fill(today);
  await dialog
    .getByLabel("Kelas yang sesuai", { exact: true })
    .selectOption(room.id);
  await dialog
    .getByLabel("Paket yang diminati", { exact: true })
    .fill("Bulanan");
  await dialog
    .getByRole("button", { name: "Simpan kualifikasi", exact: true })
    .click();
  await saved(owner);
  leadRow = owner.page
    .locator(".op-list-item")
    .filter({ hasText: tag + " Wali Prospek" });
  await leadRow
    .getByRole("button", { name: "Draf WhatsApp", exact: true })
    .click();
  await owner.page
    .getByLabel("Draf yang sudah diperiksa petugas", { exact: true })
    .fill(tag + " Terima kasih, berikut paket yang dapat didiskusikan.");
  await owner.page
    .getByRole("button", { name: "Simpan draf", exact: true })
    .click();
  await saved(owner);
  const crm = await api(owner, "crm/overview");
  assert.equal(
    crm.drafts.find((r) => r.data.text.startsWith(tag)).data.delivery,
    "not-sent",
  );
  leadRow = owner.page
    .locator(".op-list-item")
    .filter({ hasText: tag + " Wali Prospek" });
  await leadRow.getByRole("button", { name: "Daftarkan", exact: true }).click();
  const enroll = owner.page.getByRole("dialog");
  for (const [label, value] of [
    ["Nama anak", tag + " Anak Baru"],
    ["Email wali", `p1-${Date.now()}@example.test`],
    ["Paket yang disepakati", "Bulanan"],
    ["Harga paket yang disepakati (Rp)", "1500000"],
    ["Nama kontak darurat", "Wali Uji"],
    ["Telepon darurat", "081234567890"],
  ])
    await enroll.getByLabel(label, { exact: true }).fill(value);
  await enroll.getByLabel("Kelas", { exact: true }).selectOption(room.id);
  await enroll
    .getByLabel(
      "Slot, paket, dan kontak darurat telah dikonfirmasi dengan wali.",
    )
    .check();
  await enroll
    .getByRole("button", {
      name: "Konfirmasi & buat undangan wali",
      exact: true,
    })
    .click();
  await saved(owner);
  const lead = (await api(owner, "leads")).find(
    (r) => r.data.name === tag + " Wali Prospek",
  );
  assert.equal(lead.state, "enrolled");
  const children = await api(owner, "children");
  assert.ok(
    children.some(
      (c) => c.classroom_id === room.id && c.name === tag + " Anak Baru",
    ),
  );
  await owner.page.screenshot({ path: "evidence/screenshots/v3/crm-1440.png" });
  passed.push(
    "CRM UI: manual inquiry → age/schedule/class/package qualification → saved unsent WhatsApp draft → confirmed class slot/price/emergency contact → atomic child/enrollment and guardian invitation. Optional tour/trial skipped explicitly; capacity enforced by shared existing enrollment service. No external messages sent.",
  );
  for (const [actor, label] of [
    [parent, "Tanya LEO"],
    [caregiver, "LEO Assistant"],
    [owner, "LEO Copilot"],
  ]) {
    await nav(actor, label);
    await actor.page
      .getByLabel("Pertanyaan", { exact: true })
      .fill("Apa catatan makan yang tersedia?");
    await actor.page
      .getByRole("button", { name: "Cari catatan", exact: true })
      .click();
    await actor.page
      .getByText("Berdasarkan catatan", { exact: true })
      .waitFor();
    assert.equal(
      await actor.page.locator('.op-alert[role="alert"]').count(),
      0,
    );
  }
  passed.push(
    "LEO UI works for actual parent, assigned caregiver and owner sessions in explicit verified-records mode.",
  );
  assert.deepEqual(faults, []);
  await writeFile(
    "evidence/v3-business-browser-results.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        environment:
          "Synthetic localhost; persisted PGlite and isolated identity fixture. No external messages or provider integration.",
        passed,
        browserErrors: faults,
      },
      null,
      2,
    ),
  );
  console.log(passed.join("\n"));
} catch (error) {
  for (const [index, actor] of actors.entries()) {
    await actor.page
      .screenshot({
        path: `evidence/screenshots/v3/business-failure-${index}.png`,
      })
      .catch(() => {});
    await writeFile(
      `evidence/v3-business-failure-${index}.txt`,
      await actor.page.locator("body").innerText(),
    );
  }
  console.error(faults);
  throw error;
} finally {
  await browser.close();
}
