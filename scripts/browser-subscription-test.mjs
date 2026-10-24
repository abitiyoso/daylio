import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  requireIsolatedBrowserTarget,
  saveBrowserScreenshot,
} from "./browser-test-guard.mjs";
import { sandbox as s } from "../db/sandbox-fixture.mjs";
const base = process.env.TEST_BASE_URL;
await requireIsolatedBrowserTarget(base);
await mkdir("evidence/screenshots/subscription", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  actors = [],
  errors = [];
async function login(role) {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => errors.push(e.message));
  actors.push({ context, page });
  await page.goto(base + "/workspace");
  await page.getByLabel("Email", { exact: true }).fill(role + "@daylio.test");
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill("Sandbox-only-2026!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  if (role === "admin")
    await page
      .getByRole("heading", { name: "Siapkan daycare Anda", exact: true })
      .waitFor();
  else await page.locator('.op-content > div[aria-busy="false"]').waitFor();
  return { context, page };
}
async function api(a, path, method = "GET", body) {
  const r = await a.context.request.fetch(base + "/api/v1/" + path, {
    method,
    headers: {
      Origin: base,
      "x-organization-id": s.org,
      "idempotency-key": randomUUID(),
    },
    ...(body ? { data: body } : {}),
  });
  return { status: r.status(), ...(await r.json()) };
}
async function requestPlan(owner, name) {
  const card = owner.page
    .locator("article")
    .filter({ has: owner.page.getByRole("heading", { name, exact: true }) });
  await card
    .getByRole("button", { name: "Ajukan paket", exact: false })
    .click();
  const d = owner.page.getByRole("dialog");
  await d.getByRole("checkbox").check();
  await d
    .getByRole("button", { name: "Buat permintaan tagihan", exact: true })
    .click();
  await d.waitFor({ state: "hidden" });
  await owner.page
    .getByRole("button", { name: "Batalkan tagihan", exact: true })
    .waitFor();
}
async function verify(admin, amount, reference) {
  await admin.page.goto(base + "/platform");
  await admin.page
    .getByRole("button", { name: "Tagihan langganan Daylio", exact: true })
    .click();
  const bill = admin.page.locator("article").filter({
    has: admin.page.getByLabel("Referensi transaksi yang diperiksa", {
      exact: true,
    }),
  });
  await bill
    .getByLabel("Referensi transaksi yang diperiksa", { exact: true })
    .fill(reference);
  await bill
    .getByLabel("Jumlah transaksi yang diterima", { exact: true })
    .fill(String(amount));
  await bill.getByRole("checkbox").check();
  await bill
    .getByRole("button", { name: "Konfirmasi pembayaran & paket", exact: true })
    .click();
  await admin.page
    .getByRole("status")
    .filter({ hasText: "Transaksi dicatat" })
    .waitFor();
}
try {
  const owner = await login("owner");
  await owner.page
    .getByRole("button", { name: "Langganan Daylio", exact: true })
    .click();
  await owner.page
    .getByRole("heading", { name: "Growth", exact: true })
    .waitFor();
  await owner.page
    .getByRole("button", { name: "Tahunan · 10× harga bulanan", exact: true })
    .click();
  await requestPlan(owner, "Growth");
  const pending = (await api(owner, "commercial/context")).data.invoices[0];
  assert.equal(pending.amount, 6990000);
  await owner.page
    .getByRole("button", { name: "Batalkan tagihan", exact: true })
    .click();
  const cancel = owner.page.getByRole("dialog", {
    name: "Batalkan permintaan tagihan",
  });
  await cancel
    .getByLabel("Alasan pembatalan", { exact: true })
    .fill("Memilih periode bulanan sesuai kebutuhan.");
  await cancel.getByRole("checkbox").check();
  await cancel
    .getByRole("button", { name: "Konfirmasi pembatalan", exact: true })
    .click();
  await cancel.waitFor({ state: "hidden" });
  await owner.page
    .getByRole("status")
    .filter({ hasText: "dibatalkan" })
    .waitFor();
  assert.equal(
    (await api(owner, "commercial/context")).data.invoices[0].state,
    "cancelled",
  );
  await owner.page
    .getByRole("button", { name: "Bulanan", exact: true })
    .click();
  await requestPlan(owner, "Growth");
  const admin = await login("admin");
  await verify(admin, 699000, "QA-SUBSCRIPTION-INITIAL");
  await owner.page.reload();
  await owner.page
    .getByRole("button", { name: "Langganan Daylio", exact: true })
    .click();
  await owner.page.getByText("Langganan aktif", { exact: true }).waitFor();
  const before = (await api(owner, "commercial/context")).data.subscription;
  await requestPlan(owner, "Essential");
  await verify(admin, 299000, "QA-SUBSCRIPTION-SCHEDULED");
  await owner.page.reload();
  await owner.page
    .getByRole("button", { name: "Langganan Daylio", exact: true })
    .click();
  const section = owner.page.getByRole("region", {
    name: "Periode paket terjadwal",
  });
  await section.getByText("Essential", { exact: true }).waitFor();
  const after = (await api(owner, "commercial/context")).data;
  assert.equal(after.subscription.effective_plan, "growth");
  assert.equal(
    new Date(after.scheduledTerms[0].starts_at).toISOString(),
    new Date(before.period_end).toISOString(),
  );
  await saveBrowserScreenshot(owner.page, {
    path: "evidence/screenshots/subscription/owner-desktop.png",
    fullPage: true,
  });
  await owner.page.setViewportSize({ width: 390, height: 844 });
  // Resizing starts the real sidebar's slide-out transition. Capture its
  // settled closed state, then exercise the mobile control before taking QA evidence.
  await owner.page.waitForFunction(
    () =>
      document.querySelector(".op-sidebar").getBoundingClientRect().right <= 0,
  );
  await owner.page
    .getByRole("button", { name: "Buka navigasi", exact: true })
    .click();
  await owner.page.locator(".op-sidebar.open").waitFor();
  await owner.page
    .getByRole("button", { name: "Langganan Daylio", exact: true })
    .click();
  await owner.page.waitForFunction(
    () =>
      document.querySelector(".op-sidebar").getBoundingClientRect().right <= 0,
  );
  assert.equal(
    await owner.page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await saveBrowserScreenshot(owner.page, {
    path: "evidence/screenshots/subscription/owner-mobile.png",
    fullPage: true,
  });
  const manager = await login("manager");
  assert.equal(
    (
      await api(manager, `commercial/invoices/${pending.id}/cancel`, "POST", {
        confirmed: true,
        reason: "Unauthorized manager attempt",
      })
    ).status,
    403,
  );
  const parent = await login("parent");
  await parent.page.getByRole("heading", { name: /^Halo,/ }).waitFor();
  assert.equal((await api(parent, "children")).status, 200);
  assert.deepEqual(errors, []);
  await writeFile(
    "evidence/subscription-browser-results.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        environment:
          "Disposable PostgreSQL and local identity fixture; fictional manual payment references, no bank transaction.",
        passed: [
          "Owner cancels an unverified yearly request through real UI and can choose a replacement cycle.",
          "Platform admin verifies the first real persisted invoice; owner receives Growth access.",
          "A verified Essential change is scheduled exactly after the paid Growth period; Growth remains current.",
          "Desktop/mobile schedule and invoice history render without overflow; manager cannot cancel and linked-parent care remains available.",
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "Subscription cancellation, independent verification and next-period change passed across roles.",
  );
} finally {
  for (const a of actors) await a.context.close();
  await browser.close();
}
