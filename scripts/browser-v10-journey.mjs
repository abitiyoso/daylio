import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  requireIsolatedBrowserTarget,
  saveBrowserScreenshot,
} from "./browser-test-guard.mjs";
const base = process.env.TEST_BASE_URL;
await requireIsolatedBrowserTarget(base);
await mkdir("evidence/screenshots/v10-journey", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  actors = [],
  passed = [],
  errors = [];
let org;
async function actor(width = 1440) {
  const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    }),
    page = await context.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(25000);
  page.on("pageerror", (e) => errors.push(e.message));
  const a = { context, page };
  actors.push(a);
  return a;
}
async function api(a, path, method = "GET", body, status) {
  const r = await a.context.request.fetch(base + "/api/v1/" + path, {
    method,
    headers: {
      Origin: base,
      "x-organization-id": org || "",
      "idempotency-key": randomUUID(),
    },
    ...(body ? { data: body } : {}),
  });
  const result = await r.json();
  if (status) {
    assert.equal(r.status(), status, JSON.stringify(result));
    return result;
  }
  assert.ok(r.ok(), path + ": " + JSON.stringify(result));
  return result.data ?? result;
}
async function ready(a) {
  await a.page.locator('.op-content > div[aria-busy="false"]').waitFor();
}
async function nav(a, label) {
  const target = a.page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("button", { name: label, exact: true });
  if (!(await target.isVisible())) {
    const menu = a.page.getByRole("button", {
      name: "Buka navigasi",
      exact: true,
    });
    if (await menu.isVisible()) await menu.click();
    if (
      !(await target.isVisible()) &&
      (await a.page.locator(".v10-additional-nav summary").count())
    )
      await a.page.locator(".v10-additional-nav summary").click();
  }
  await target.click();
  await ready(a);
}
async function letter(a, email) {
  const mail = await (
    await a.context.request.get("http://127.0.0.1:4012/__test/mail")
  ).json();
  const item = mail.findLast((m) => m.email === email);
  assert.ok(item, "Verification email requested for " + email);
  return item.link;
}
async function accept(email) {
  const a = await actor();
  await a.page.goto(await letter(owner, email));
  await a.page
    .getByRole("heading", { name: "Atur kata sandi baru", exact: true })
    .waitFor();
  await a.page
    .getByLabel("Kata sandi baru", { exact: true })
    .fill("Journey-fixture-2026!");
  await a.page
    .getByLabel("Ulangi kata sandi", { exact: true })
    .fill("Journey-fixture-2026!");
  await a.page
    .getByRole("button", { name: "Simpan kata sandi", exact: true })
    .click();
  await ready(a);
  return a;
}
let owner;
try {
  owner = await actor();
  const email = "pemilik-journey@daylio.test";
  await owner.page.goto(base + "/register");
  await owner.page.getByLabel("Email", { exact: true }).fill(email);
  await owner.page
    .getByLabel("Kata sandi", { exact: true })
    .fill("Journey-fixture-2026!");
  await owner.page
    .getByRole("button", { name: "Daftar & verifikasi email", exact: true })
    .click();
  await owner.page
    .getByRole("status")
    .getByText("Periksa email untuk verifikasi akun.")
    .waitFor();
  await owner.page.goto(await letter(owner, email));
  await owner.page
    .getByRole("heading", { name: "Siapkan daycare Anda", exact: true })
    .waitFor();
  await owner.page
    .getByLabel("Nama daycare", { exact: true })
    .fill("Taman Ceria");
  await owner.page
    .getByRole("button", { name: "Buat daycare & cabang", exact: true })
    .click();
  await owner.page
    .getByRole("heading", { name: "Ringkasan Daycare", exact: true })
    .waitFor();
  const memberships = await api(owner, "me/memberships");
  org = memberships[0].organization_id;
  assert.equal((await api(owner, "branches")).length, 1);
  await api(owner, "settings", "POST", {
    hours: "07.00–18.00",
    timezone: "Asia/Jakarta",
    routinePublishing: "manager-review",
    managerCrm: true,
    managerFinance: false,
  });
  console.log("Owner signup and branch passed");
  passed.push(
    "Owner registration UI → provider-contract email verification → authenticated tenant + branch; no unverified tenant bootstrap.",
  );
  await owner.page
    .getByRole("button", { name: "Akun & hak akses", exact: true })
    .click();
  for (const [role, email] of [
    ["manager", "pengelola-journey@daylio.test"],
    ["caregiver", "pengasuh-journey@daylio.test"],
  ]) {
    await owner.page.getByLabel("Email penerima", { exact: true }).fill(email);
    await owner.page
      .getByLabel("Hak akses", { exact: true })
      .selectOption(role);
    await owner.page
      .getByRole("button", { name: "Kirim undangan email", exact: true })
      .click();
    await owner.page
      .getByRole("status")
      .filter({ hasText: "Permintaan email verifikasi diterima" })
      .waitFor();
  }
  const manager = await accept("pengelola-journey@daylio.test"),
    caregiver = await accept("pengasuh-journey@daylio.test");
  await owner.page
    .getByRole("button", { name: "← Kembali ke dashboard", exact: true })
    .click();
  await ready(owner);
  console.log("Verified invitations passed");
  passed.push(
    "Owner invites manager and caregiver through Access UI; each verifies a one-use email proof and creates its own private password.",
  );
  await nav(manager, "Jadwal & Kapasitas");
  await manager.page
    .getByRole("button", { name: "Atur kelas", exact: true })
    .click();
  let dialog = manager.page.getByRole("dialog");
  await dialog.getByLabel("Nama kelas", { exact: true }).fill("Toddler A");
  await dialog.getByLabel("Kapasitas anak", { exact: true }).fill("2");
  await dialog.getByLabel("Anak per pengasuh", { exact: true }).fill("2");
  await dialog
    .getByRole("button", { name: "Simpan kelas", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  const room = (await api(owner, "classrooms"))[0];
  assert.equal(room.capacity, 2);
  const staff = (await api(owner, "staff")).find((m) => m.role === "caregiver");
  const lead = await api(owner, "leads", "POST", {
    name: "Keluarga Hana",
    contact: "keluarga-journey@daylio.test",
    source: "Permintaan keluarga",
    notes: "Trial untuk kebutuhan daycare.",
  });
  const tomorrow = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date(Date.now() + 86400000));
  await nav(owner, "Jadwal & Booking");
  const dateInput = owner.page.getByLabel("Tanggal planner", { exact: true });
  const initialDate = await dateInput.inputValue();
  await owner.page
    .getByRole("button", { name: "Minggu sebelumnya", exact: true })
    .click();
  assert.notEqual(await dateInput.inputValue(), initialDate);
  await owner.page
    .getByRole("button", { name: "Minggu berikutnya", exact: true })
    .click();
  assert.equal(await dateInput.inputValue(), initialDate);
  await dateInput.fill("");
  assert.equal(await dateInput.inputValue(), initialDate);
  assert.equal(await owner.page.getByRole("heading", { level: 1 }).count(), 1);
  assert.equal(
    await owner.page
      .getByRole("button", { name: "Minggu sebelumnya", exact: true })
      .locator("svg")
      .evaluate((svg) => getComputedStyle(svg).transform),
    "none",
  );
  await owner.page
    .getByLabel("Tanggal planner", { exact: true })
    .fill(tomorrow);
  await owner.page
    .getByRole("button", { name: "Atur shift", exact: true })
    .click();
  dialog = owner.page.getByRole("dialog");
  await dialog
    .getByLabel("Pengasuh", { exact: true })
    .selectOption(staff.user_id);
  await dialog
    .getByRole("button", { name: "Cek & simpan", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  await owner.page
    .getByRole("button", { name: "Booking baru", exact: true })
    .click();
  dialog = owner.page.getByRole("dialog");
  await dialog.getByLabel("Prospek", { exact: true }).selectOption(lead.id);
  await dialog.getByLabel("Nama anak prospek", { exact: true }).fill("Hana");
  await dialog
    .getByRole("button", { name: "Cek & simpan", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  await owner.page.getByText("Hana · trial", { exact: true }).waitFor();
  await saveBrowserScreenshot(owner.page, {
    path: "evidence/screenshots/v10-journey/planner-desktop.png",
    fullPage: true,
  });
  const enrolled = await api(owner, `leads/${lead.id}/enroll`, "POST", {
    name: "Hana",
    classroomId: room.id,
    email: "keluarga-journey@daylio.test",
    packageName: "Full Day",
    packagePrice: 1800000,
    emergencyName: "Wali Hana",
    emergencyPhone: "081234567890",
    confirmed: true,
  });
  const kid = enrolled.child_id;
  assert.ok(kid);
  const range = new URLSearchParams({
    from: tomorrow + "T00:00:00+07:00",
    to: tomorrow + "T23:59:59+07:00",
  });
  assert.equal(
    (await api(owner, "planner/overview?" + range)).bookings[0].state,
    "cancelled",
  );
  await api(owner, "staff-assignments", "POST", {
    userId: staff.user_id,
    childId: kid,
  });
  const invitation = enrolled.invitation;
  await api(owner, `invitations/${invitation.id}/email`, "POST", {
    token: new URL(invitation.acceptUrl, base).searchParams.get("invitation"),
  });
  const parent = await accept("keluarga-journey@daylio.test");
  assert.deepEqual(
    (await api(parent, "children")).map((c) => c.id),
    [kid],
  );
  console.log("Planner and enrollment passed");
  passed.push(
    "Manager configures classroom/capacity; owner records real future staff shift + trial through planner UI; transactional enrollment replaces reserved prospective seat and verified guardian gets only its child.",
  );
  await caregiver.page.reload();
  await ready(caregiver);
  await caregiver.page
    .getByRole("button", { name: "Buka kehadiran kelas", exact: true })
    .click();
  await caregiver.page
    .getByRole("button", { name: "Catat kedatangan", exact: true })
    .click();
  await caregiver.page.getByRole("status").waitFor();
  await caregiver.page
    .getByRole("button", { name: "Catat aktivitas kelas", exact: true })
    .click();
  await caregiver.page
    .getByLabel("Catatan bersama", { exact: true })
    .fill("Hana makan siang dengan lahap bersama kelas.");
  await caregiver.page
    .getByRole("button", { name: "Simpan draf untuk 1 anak", exact: true })
    .click();
  await caregiver.page.getByRole("status").waitFor();
  await manager.page.reload();
  await ready(manager);
  await manager.page
    .getByRole("button", { name: "Review catatan", exact: true })
    .first()
    .click();
  const group = manager.page
    .locator(".op-list-item")
    .filter({ hasText: "Hana makan siang" });
  await group.getByRole("button", { name: "Terbitkan", exact: true }).click();
  await manager.page
    .getByRole("dialog")
    .getByRole("button", { name: "Konfirmasi", exact: true })
    .click();
  await manager.page.getByRole("status").waitFor();
  const source = (await api(manager, "activities")).find(
    (r) => r.child_id === kid && r.state === "published",
  );
  assert.ok(source);
  const story = await api(manager, "daily-stories", "POST", {
    childId: kid,
    date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
      new Date(),
    ),
    sourceIds: [source.id],
    note: "Hana menikmati makan siang dan berlatih berinteraksi bersama teman.",
  });
  await api(manager, `daily-stories/${story.id}/publish`, "POST", {
    confirmed: true,
  });
  await parent.page.reload();
  await parent.page
    .getByText(
      "Hana menikmati makan siang dan berlatih berinteraksi bersama teman.",
      { exact: true },
    )
    .waitFor();
  await nav(owner, "Tagihan Orang Tua");
  await owner.page
    .getByRole("button", { name: "Atur tagihan berulang", exact: true })
    .click();
  dialog = owner.page.getByRole("dialog");
  await dialog.getByLabel("Anak", { exact: true }).selectOption(kid);
  await dialog
    .getByLabel("Rincian biaya", { exact: true })
    .fill("Paket daycare bulanan");
  await dialog.getByLabel("Jumlah IDR", { exact: true }).fill("1800000");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await owner.page
    .getByRole("button", { name: "Buat invoice bulan ini", exact: true })
    .click();
  await owner.page
    .getByRole("button", { name: "Verifikasi transfer", exact: true })
    .click();
  dialog = owner.page.getByRole("dialog");
  await dialog
    .getByLabel("Referensi bank / transaksi", { exact: true })
    .fill("QA-FAMILY-JOURNEY-01");
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Konfirmasi verifikasi", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  await owner.page
    .getByRole("button", { name: "Bukti bayar", exact: true })
    .waitFor();
  await saveBrowserScreenshot(owner.page, {
    path: "evidence/screenshots/v10-journey/family-billing-desktop.png",
    fullPage: true,
  });
  await nav(parent, "Paket & Jadwal");
  await parent.page
    .getByText("Terverifikasi manual", { exact: true })
    .waitFor();
  assert.equal((await api(parent, "family/billing")).invoices.length, 1);
  passed.push(
    "New tenant: caregiver attendance + care draft → manager publication → guardian Daily Story; recurring family invoice → independent staff verification → own-family payment receipt.",
  );
  await nav(owner, "Langganan Daylio");
  const plan = owner.page.locator("article").filter({
    has: owner.page.getByRole("heading", { name: "Essential", exact: true }),
  });
  await plan
    .getByRole("button", { name: "Ajukan paket", exact: false })
    .click();
  dialog = owner.page.getByRole("dialog");
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Buat permintaan tagihan", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(
    (await api(owner, "commercial/context")).invoices[0].state,
    "pending",
  );
  const admin = await actor();
  await admin.page.goto(base + "/workspace");
  await admin.page
    .getByLabel("Email", { exact: true })
    .fill("admin@daylio.test");
  await admin.page
    .getByLabel("Kata sandi", { exact: true })
    .fill("Sandbox-only-2026!");
  await admin.page.getByRole("button", { name: "Masuk", exact: true }).click();
  await admin.page
    .getByRole("heading", { name: "Siapkan daycare Anda", exact: true })
    .waitFor();
  await admin.page.goto(base + "/platform");
  await admin.page
    .getByRole("button", { name: "Tagihan langganan Daylio", exact: true })
    .click();
  const bill = admin.page.locator("article").filter({
    has: admin.page.getByRole("heading", {
      name: "Taman Ceria",
      exact: true,
    }),
  });
  await bill
    .getByLabel("Referensi transaksi yang diperiksa", { exact: true })
    .fill("QA-SUBSCRIPTION-JOURNEY-01");
  await bill
    .getByLabel("Jumlah transaksi yang diterima", { exact: true })
    .fill("299000");
  await bill.getByRole("checkbox").check();
  await bill
    .getByRole("button", { name: "Konfirmasi pembayaran & paket", exact: true })
    .click();
  await admin.page
    .getByRole("status")
    .filter({ hasText: "Transaksi dicatat" })
    .waitFor();
  await api(owner, "crm/overview", "GET", undefined, 403);
  assert.equal(
    (await api(owner, "commercial/context")).subscription.effective_plan,
    "essential",
  );
  await parent.page.reload();
  await parent.page
    .getByText(
      "Hana menikmati makan siang dan berlatih berinteraksi bersama teman.",
      { exact: true },
    )
    .waitFor();
  await parent.page.setViewportSize({ width: 390, height: 844 });
  await saveBrowserScreenshot(parent.page, {
    path: "evidence/screenshots/v10-journey/parent-mobile.png",
    fullPage: true,
  });
  passed.push(
    "SaaS invoice remains pending until platform-admin manual verification; customer cannot activate itself. Essential entitlement denies paid CRM API while preserving parent care/story/billing history. No real payment or external message.",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "evidence/v10-journey-results.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        environment:
          "Disposable QA database + isolated localhost identity/email-contract fixture; no real inbox or bank transaction",
        passed,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(passed.join("\n"));
} catch (e) {
  for (let i = 0; i < actors.length; i++)
    await actors[i].page
      .screenshot({ path: `evidence/screenshots/v10-journey/failure-${i}.png` })
      .catch(() => {});
  throw e;
} finally {
  for (const a of actors) await a.context.close();
  await browser.close();
}
