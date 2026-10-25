import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import {
  requireIsolatedBrowserTarget,
  saveBrowserScreenshot,
} from "./browser-test-guard.mjs";
const base = process.env.TEST_BASE_URL;
await requireIsolatedBrowserTarget(base);
const root = "evidence/design-polish-20261025/validation";
await mkdir(root, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [],
  errors = [];
try {
  for (const role of ["owner", "manager", "caregiver", "parent"]) {
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
      if (role === "owner")
        await page.locator('.v10-owner-summary[aria-busy="false"]').waitFor();
      for (const width of [1440, 1024, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.getByRole("heading", { level: 1 }).count(), 1);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        const selector =
          role === "owner"
            ? ".v10-stat small"
            : role === "parent"
              ? ".v6-parent-day-strip span"
              : role === "caregiver"
                ? ".v6-care-strip span"
                : ".op-muted";
        const sizes = await page
          .locator(selector)
          .evaluateAll((nodes) =>
            nodes.map((n) => parseFloat(getComputedStyle(n).fontSize)),
          );
        assert.ok(
          sizes.length && sizes.every((s) => s >= 13),
          `${role} ${width}: readable secondary text`,
        );
        if (role === "owner") {
          const labels = await page
            .locator(".v10-stat label,.v10-caprow small")
            .evaluateAll((nodes) =>
              nodes.map((n) => ({
                size: parseFloat(getComputedStyle(n).fontSize),
                color: getComputedStyle(n).color,
              })),
            );
          for (const label of labels) {
            const rgb = label.color
              .match(/[\d.]+/g)
              .slice(0, 3)
              .map(Number)
              .map((v) => v / 255)
              .map((v) =>
                v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
              );
            const luminance =
              rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
            assert.ok(
              label.size >= 13 && 1.05 / (luminance + 0.05) >= 4.5,
              "Owner secondary labels must remain readable on white",
            );
          }
        }
        if (role === "parent") {
          assert.equal(
            await page.locator(".op-parent-grid > section").count(),
            5,
          );
          if (width === 1440) {
            const boxes = await page
              .locator(".op-parent-grid > section")
              .evaluateAll((nodes) =>
                nodes.map((n) => ({
                  x: n.getBoundingClientRect().x,
                  y: n.getBoundingClientRect().y,
                })),
              );
            assert.equal(Math.round(boxes[2].x), Math.round(boxes[0].x));
            assert.equal(Math.round(boxes[3].y), Math.round(boxes[2].y));
          }
        }
        if (role === "caregiver" && width <= 620) {
          const columns = await page
            .locator(".v6-care-strip")
            .evaluate(
              (n) => getComputedStyle(n).gridTemplateColumns.split(" ").length,
            );
          assert.equal(columns, 2);
        }
        await saveBrowserScreenshot(page, {
          path: `${root}/${role}-${width}.png`,
          fullPage: true,
        });
        results.push({
          role,
          width,
          oneHeading: true,
          noOverflow: true,
          secondaryTextAtLeast13: true,
        });
      }
      if (role === "owner") {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page
          .getByRole("navigation", { name: "Navigasi utama" })
          .getByRole("button", { name: "Jadwal & Booking", exact: true })
          .click();
        await page.locator(".v10-live-week").waitFor();
        assert.equal(
          await page
            .locator(".sc-tablewrap")
            .evaluate((n) => n.scrollWidth <= n.clientWidth),
          true,
          "Full week must fit at normal desktop width",
        );
        await saveBrowserScreenshot(page, {
          path: `${root}/owner-planner-1440.png`,
          fullPage: true,
        });
      }
      if (role === "parent") {
        await page
          .getByRole("button", { name: "Pesan pagi", exact: true })
          .click();
        await page.getByRole("dialog").waitFor();
        const bounds = await page.getByRole("dialog").boundingBox();
        assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 320);
        const fonts = await page
          .getByRole("dialog")
          .locator("input,select,textarea")
          .evaluateAll((nodes) =>
            nodes.map((n) => parseFloat(getComputedStyle(n).fontSize)),
          );
        assert.ok(fonts.length && fonts.every((size) => size >= 16));
        await saveBrowserScreenshot(page, {
          path: `${root}/parent-morning-dialog-320.png`,
          fullPage: false,
        });
        await page
          .getByRole("button", { name: "Tutup dialog", exact: true })
          .click();
        assert.equal(await page.getByRole("dialog").count(), 0);
      }
    } finally {
      await context.close();
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(
    root + "/results.json",
    JSON.stringify(
      {
        results,
        errors,
        scope:
          "Four role homes at five widths; real authenticated disposable fixture. Parent morning form inspected without submission.",
      },
      null,
      2,
    ),
  );
  console.log(
    "Design polish: 20 role/viewport cases, readable labels, balanced Parent grid, 2-column mobile caregiver metrics and 320px morning form passed.",
  );
} finally {
  await browser.close();
}
