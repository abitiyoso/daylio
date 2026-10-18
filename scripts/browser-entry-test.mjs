import { requireIsolatedBrowserTarget } from "./browser-test-guard.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { sandbox } from "../db/sandbox-fixture.mjs";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
await requireIsolatedBrowserTarget(base);
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw Error("Use only the isolated local sandbox.");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const passed = [];
await mkdir("evidence/screenshots/entry", { recursive: true });
try {
  for (const [role, title] of [
    ["owner", "Business Pulse"],
    ["manager", "Control Tower"],
    ["caregiver", "Catat Aktivitas"],
    ["parent", "My Child Today"],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base);
    const desktopEntry = page.locator(".nav-actions").getByRole("link", {
      name: "Masuk",
      exact: true,
    });
    assert.equal(await desktopEntry.getAttribute("href"), "/workspace");
    assert.equal(await desktopEntry.isVisible(), true);
    if (role === "owner") {
      await desktopEntry.click();
    } else {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator("#menuToggle").click();
      const mobileEntry = page
        .getByRole("navigation", { name: "Navigasi mobile" })
        .getByRole("link", { name: "Masuk", exact: true });
      assert.equal(await mobileEntry.isVisible(), true);
      if (role === "manager")
        await page.screenshot({
          path: "evidence/screenshots/entry/mobile-menu.png",
        });
      await mobileEntry.click();
    }
    await page.waitForURL(base + "/workspace");
    await page
      .getByRole("heading", { name: "Selamat datang", exact: true })
      .waitFor();
    const denied = await context.request.get(
      base + "/api/v1/workspace/context",
      {
        headers: { "x-organization-id": sandbox.org },
      },
    );
    assert.equal(denied.status(), 401, "Anonymous API access must be denied");
    await page.getByLabel("Email", { exact: true }).fill(role + "@daylio.test");
    await page
      .getByLabel("Kata sandi", { exact: true })
      .fill("Sandbox-only-2026!");
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
    await page.locator('.op-content > div[aria-busy="false"]').waitFor();
    assert.equal(await page.locator('.op-alert[role="alert"]').count(), 0);
    const response = await context.request.get(
      base + "/api/v1/workspace/context",
      {
        headers: { "x-organization-id": sandbox.org },
      },
    );
    assert.equal(response.status(), 200);
    const data = (await response.json()).data;
    assert.equal(data.role, role);
    assert.equal(data.organization.id, sandbox.org);
    assert.ok(data.children.length > 0, "Read persisted authorized children");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: `evidence/screenshots/entry/${role}-dashboard.png`,
    });
    passed.push(
      `${role}: authenticated dashboard, scoped persisted API, responsive entry`,
    );
    // The phone is a labeled showcase.
    await page.goto(base);
    await page
      .locator("#phoneContent")
      .getByText(/SHOWCASE/)
      .waitFor();
    assert.equal(
      await page.locator("#phoneContent a[href='/workspace']").count(),
      0,
    );
    await context.close();
  }
  await writeFile(
    "evidence/entry-browser-results.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        environment:
          "Local synthetic sandbox; actual HTTP API and persisted database. No hosted deployment claimed.",
        passed,
      },
      null,
      2,
    ),
  );
  console.log(passed.join("\n"));
} finally {
  await browser.close();
}
