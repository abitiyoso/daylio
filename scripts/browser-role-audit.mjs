import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import {
  requireIsolatedBrowserTarget,
  saveBrowserScreenshot,
} from "./browser-test-guard.mjs";
import { sandbox } from "../db/sandbox-fixture.mjs";
const base = process.env.TEST_BASE_URL;
await requireIsolatedBrowserTarget(base);
const root = "evidence/refinement-20261025",
  results = [],
  errors = [];
await mkdir(root + "/screenshots", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const [role, views] of [
    [
      "owner",
      [
        "Anak & Keluarga",
        "Akun & hak akses",
        "Jadwal & Booking",
        "Tagihan Orang Tua",
      ],
    ],
    [
      "manager",
      ["Data Anak", "Akun & hak akses", "Control Tower", "Aktivitas & Review"],
    ],
    [
      "caregiver",
      ["Anak Asuhan", "Catat Aktivitas", "Penjemputan", "Serah Terima Shift"],
    ],
    [
      "parent",
      [
        "Care Passport",
        "Anakku Hari Ini",
        "Izin Penjemputan",
        "Pesan Daycare",
        "Cerita Harian",
      ],
    ],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      page.setDefaultNavigationTimeout(60000);
      page.on("pageerror", (e) => errors.push(role + ": " + e.message));
      await page.goto(base + "/workspace");
      await page
        .getByLabel("Email", { exact: true })
        .fill(role + "@daylio.test");
      await page
        .getByLabel("Kata sandi", { exact: true })
        .fill("Sandbox-only-2026!");
      await page.getByRole("button", { name: "Masuk", exact: true }).click();
      await page.locator('.op-content > div[aria-busy="false"]').waitFor();
      if (["caregiver", "parent"].includes(role)) {
        assert.equal(
          await page
            .getByRole("button", { name: "Akun & hak akses", exact: true })
            .count(),
          0,
        );
        const denied = await context.request.get(base + "/api/v1/invitations", {
          headers: { "x-organization-id": sandbox.org },
        });
        assert.equal(denied.status(), 403);
      }
      for (const [index, view] of views.entries()) {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page
          .getByRole("navigation", { name: "Navigasi utama" })
          .getByRole("button", { name: view, exact: true })
          .click();
        await page.locator('.op-content > div[aria-busy="false"]').waitFor();
        await page
          .getByRole("button", { name: "Perbarui", exact: true })
          .waitFor();
        if (view === "Akun & hak akses") {
          await page.locator('.op-access[aria-busy="false"]').waitFor();
          assert.equal(await page.locator(".op-sidebar").count(), 1);
          assert.equal(
            await page.getByRole("heading", { level: 1 }).count(),
            1,
          );
          assert.equal(
            await page.getByLabel("Anak untuk akses orang tua").count(),
            0,
          );
          const options = await page
            .getByLabel("Hak akses", { exact: true })
            .locator("option")
            .allTextContents();
          assert.equal(
            options.some((x) => x.includes("Pengelola")),
            role === "owner",
          );
          await page
            .getByLabel("Hak akses", { exact: true })
            .selectOption("parent");
          assert.equal(
            await page
              .getByLabel("Anak untuk akses orang tua")
              .getAttribute("required"),
            "",
          );
          await page
            .getByLabel("Hak akses", { exact: true })
            .selectOption("caregiver");
          assert.equal(
            await page.getByLabel("Anak untuk akses orang tua").count(),
            0,
          );
          assert.equal(
            (await page
              .getByRole("button", { name: "Nonaktifkan akses", exact: true })
              .count()) > 0,
            role === "owner",
          );
        }
        for (const width of [1440, 390]) {
          await page.setViewportSize({
            width,
            height: width === 390 ? 844 : 1000,
          });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForFunction(
            () =>
              innerWidth > 1070 ||
              document.querySelector(".op-sidebar").getBoundingClientRect()
                .right <= 0,
          );
          const text = await page.locator(".op-content").innerText();
          assert.doesNotMatch(text, /\bundefined\b|\bnull\b|\[object Object\]/);
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
            role + ": " + view,
          );
          assert.equal(
            await page.evaluate(() => {
              const header = document.querySelector(
                ".op-titlebar:not([hidden])",
              );
              return !header || header.getBoundingClientRect().height < 320;
            }),
            true,
            role + ": oversized title spacing in " + view,
          );
          if (view === "Akun & hak akses")
            assert.equal(
              await page
                .locator(".op-access-member .op-grow")
                .evaluateAll((rows) =>
                  rows.every((r) => r.getBoundingClientRect().width >= 120),
                ),
              true,
              "Member names must not be crushed by action buttons",
            );
          await saveBrowserScreenshot(page, {
            path: `${root}/screenshots/${role}-${index}-${width}.png`,
            fullPage: true,
          });
          results.push({
            role,
            view,
            width,
            noOverflow: true,
            noLeakedValues: true,
          });
        }
      }
      if (role !== "parent") {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page
          .getByRole("navigation", { name: "Navigasi utama" })
          .getByRole("button", { name: "Administrasi lanjutan", exact: true })
          .click();
        await page.locator(".workspace-admin").waitFor();
        await page
          .getByRole("heading", { name: "Administrasi daycare", exact: true })
          .waitFor();
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 1000 });
          assert.equal(await page.locator(".op-sidebar").count(), 1);
          assert.equal(
            await page.getByRole("heading", { level: 1 }).count(),
            1,
          );
          assert.equal(
            await page
              .getByRole("heading", {
                name: "Kabar daycare hari ini",
                exact: true,
              })
              .count(),
            0,
          );
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
          );
          await saveBrowserScreenshot(page, {
            path:
              root +
              "/screenshots/" +
              role +
              "-administration-" +
              width +
              ".png",
            fullPage: true,
          });
          results.push({
            role,
            view: "Administrasi daycare",
            width,
            noOverflow: true,
            noLeakedValues: true,
          });
        }
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page
          .getByRole("button", { name: "← Kembali ke dashboard", exact: true })
          .click();
        assert.equal(await page.locator(".workspace-admin").count(), 0);
      }
    } finally {
      await context.close();
    }
  }
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await page.goto(base + "/#cctv");
  await page.locator('[data-event="people"]').click();
  await page
    .getByRole("status")
    .filter({ hasText: "tidak dianalisis" })
    .waitFor();
  assert.equal(
    await page
      .locator(".filmshot, #detectionOverlay, .caregiver-indicator")
      .count(),
    0,
  );
  for (const scenario of ["area", "people", "offline"]) {
    await page.locator('[data-event="' + scenario + '"]').click();
    assert.equal(
      await page.locator(".monitor").getAttribute("data-scenario"),
      scenario,
    );
    assert.equal(
      await page
        .locator('[data-event="' + scenario + '"]')
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.ok(await page.locator("#scenarioTitle").innerText());
  }
  await page.locator('[data-event="area"]').click();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await saveBrowserScreenshot(page.locator("#cctv"), {
      path: `${root}/screenshots/cctv-${width}.png`,
    });
  }
  await page.close();
  assert.deepEqual(errors, []);
  await writeFile(
    root + "/results.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        environment:
          "Disposable local fixture only; no real email or permission mutation in this audit.",
        results,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "40 role/screen/viewport cases passed: unified administration, passports, access shell and conditional fields, planning, finance, review, care, pickup, handoff and family messages. Public CCTV scenarios checked at desktop/mobile with explicit demo annotation and no fabricated live evidence.",
  );
} finally {
  await browser.close();
}
