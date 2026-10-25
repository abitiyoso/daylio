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
const root = "evidence/recheck-20261025/search";
await mkdir(root, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [],
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
      const field = page.getByRole("textbox", {
        name: "Cari data",
        exact: true,
      });
      const search = page.getByRole("button", { name: "Cari", exact: true });
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        if (width < 1025) {
          const menu = page.getByRole("button", {
            name: "Buka navigasi",
            exact: true,
          });
          assert.equal(await menu.getAttribute("aria-expanded"), "false");
          assert.equal(
            await page
              .locator(".op-sidebar")
              .evaluate((node) => getComputedStyle(node).visibility),
            "hidden",
          );
          await menu.click();
          assert.equal(await menu.getAttribute("aria-expanded"), "true");
          await page
            .locator(".op-overlay")
            .click({ position: { x: width - 5, y: 100 } });
          assert.equal(await menu.getAttribute("aria-expanded"), "false");
        }
        if (width < 1025)
          await page
            .getByRole("button", { name: "Buka pencarian", exact: true })
            .click();
        await field.fill("Anak");
        await search.click();
        await page.locator(".v10-search-results button").first().waitFor();
        const rows = await page
          .locator(".v10-search-results button strong")
          .allTextContents();
        assert.ok(rows.includes("Anak Uji 1"));
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        for (const selector of [
          ".v10-live-search form",
          ".v10-search-results",
        ]) {
          const bounds = await page.locator(selector).boundingBox();
          assert.ok(
            bounds && bounds.x >= 0 && bounds.x + bounds.width <= width,
            `${role} ${width}: ${selector} must fit inside both viewport edges`,
          );
        }
        await saveBrowserScreenshot(page, {
          path: `${root}/${role}-${width}.png`,
          fullPage: true,
        });
        await page
          .locator(".v10-search-results button")
          .filter({ hasText: "Anak Uji 1" })
          .click();
        await page.locator('.op-content > div[aria-busy="false"]').waitFor();
        assert.equal(
          await page.locator(".daylio-ops").getAttribute("data-view"),
          "children",
        );
        results.push({
          role,
          width,
          searchAndOpenProfile: true,
          noOverflow: true,
        });
      }
      // Delayed responses use actual authenticated API output, not fabricated records.
      await page.setViewportSize({ width: 1440, height: 1000 });
      async function delayed(action) {
        let release, entered;
        const gate = new Promise((r) => (release = r)),
          seen = new Promise((r) => (entered = r));
        const pattern = "**/api/v1/workspace/search?*";
        await page.route(pattern, async (route) => {
          const response = await route.fetch();
          entered();
          await gate;
          await route.fulfill({ response });
        });
        await field.fill("Anak");
        await search.click();
        await seen;
        await action();
        const completed = page.waitForResponse((r) =>
          r.url().includes("/workspace/search?"),
        );
        release();
        await completed;
        await page.unroute(pattern);
        // A DOM round-trip after request completion observes any committed result.
        await page.waitForFunction(
          () => !document.querySelector(".v10-search-loading"),
        );
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        assert.equal(await page.locator(".v10-search-results").count(), 0);
      }
      await delayed(() => field.fill("Tidak cocok"));
      await delayed(() => field.press("Escape"));
      await field.fill("  ");
      await search.click();
      await page.getByRole("alert").filter({ hasText: "2 karakter" }).waitFor();
      await field.fill("Anak");
      assert.equal(await page.locator(".v10-search-results").count(), 0);
      const failurePattern = "**/api/v1/workspace/search?*";
      await page.route(failurePattern, (route) => route.abort("failed"));
      await search.click();
      await page.locator('.v10-search-results [role="alert"]').waitFor();
      await page.unroute(failurePattern);
      await field.fill("Anak Uji");
      assert.equal(await page.locator(".v10-search-results").count(), 0);
      await field.press("Enter");
      await page.locator(".v10-search-results button").first().waitFor();
      await page.getByRole("heading", { level: 1 }).click();
      assert.equal(await page.locator(".v10-search-results").count(), 0);
      await field.fill("zz-no-match");
      await search.click();
      await page
        .getByRole("status")
        .filter({ hasText: "Tidak ada data yang cocok" })
        .waitFor();
      await field.press("Escape");
      // RLS must scope direct search requests as well as visible navigation.
      const r = await context.request.get(
        base + "/api/v1/workspace/search?q=Anak",
        {
          headers: { "x-organization-id": sandbox.org },
        },
      );
      assert.equal(r.status(), 200);
      const payload = await r.json(),
        data = payload.data ?? payload;
      assert.ok(data.some((row) => row.id === sandbox.child));
      assert.ok(data.every((row) => row.id !== sandbox.otherChild));
      if (["parent", "caregiver"].includes(role))
        assert.ok(data.every((row) => row.type !== "lead"));
      const forbidden = await context.request.get(
        base + "/api/v1/workspace/search?q=Anak",
        {
          headers: { "x-organization-id": sandbox.otherOrg },
        },
      );
      assert.equal(forbidden.status(), 403);
      results.push({
        role,
        lateResponseAfterEditDismissed: true,
        lateResponseAfterEscapeDismissed: true,
        emptyState: true,
        networkErrorRecovery: true,
        whitespaceValidation: true,
        outsideDismissal: true,
        crossTenantDenied: true,
      });
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
        policy:
          "Disposable local fixture; delayed responses preserve real authenticated API bodies.",
      },
      null,
      2,
    ),
  );
  console.log(
    "Search UX passed: four roles at desktop/390/320, profile navigation, delayed-response dismissal, empty states and cross-tenant denial.",
  );
} finally {
  await browser.close();
}
