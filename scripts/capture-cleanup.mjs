import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = "http://127.0.0.1:3100";
const health = await (await fetch(base + "/api/v1/health/ready")).json();
assert.equal(
  health.sandbox?.purpose,
  "showcase",
  "Only the curated local showcase",
);
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [],
  errors = [];
await mkdir("evidence/screenshots/cleanup", { recursive: true });
try {
  for (const [role, title] of [
    ["owner", "Business Pulse"],
    ["manager", "Control Tower"],
    ["caregiver", "Catat Aktivitas"],
    ["parent", "My Child Today"],
  ]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    await context.route("**/api/v1/**", (route) => {
      const r = route.request();
      if (
        r.method() !== "GET" &&
        !/\/auth\/(login|logout|refresh)$/.test(new URL(r.url()).pathname)
      )
        return route.abort("blockedbyclient");
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    page.on("pageerror", (e) => errors.push(role + ": " + e.message));
    await page.goto(base + "/workspace");
    await page.getByLabel("Email", { exact: true }).fill(role + "@daylio.test");
    await page
      .getByLabel("Kata sandi", { exact: true })
      .fill("Sandbox-only-2026!");
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
    await page.locator('.op-content > div[aria-busy="false"]').waitFor();
    if (role === "parent") {
      await page.locator(".op-private-photos img").waitFor();
      await page.waitForFunction(
        () =>
          document.querySelector(".op-private-photos img")?.naturalWidth > 100,
      );
    }
    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => scrollTo(0, 0));
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        role + " overflow " + width,
      );
      const text = await page.locator(".op-content").innerText();
      assert.doesNotMatch(
        text,
        /\b(?:V3|P1)\s?\d|Anak Uji|Browser test:|[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-/i,
      );
      assert.ok(
        (await page
          .locator(".daylio-ops")
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))) >= 15,
      );
      if (role === "parent") {
        assert.equal(await page.locator(".op-parent-note").count(), 1);
        assert.ok(
          await page
            .locator(".op-private-photos img")
            .evaluate((img) => img.naturalWidth > 100),
        );
      }
      await page.screenshot({
        path: `evidence/screenshots/cleanup/${role}-${width}.png`,
        fullPage: true,
      });
      await page.screenshot({
        path: `evidence/screenshots/cleanup/${role}-${width}-viewport.png`,
      });
      if (role === "parent" && width !== 820)
        await page
          .locator(".op-card")
          .filter({
            has: page.getByRole("heading", {
              name: "Daily Story",
              exact: true,
            }),
          })
          .screenshot({
            path: `evidence/screenshots/cleanup/parent-story-card-${width}.png`,
          });
      results.push({ role, width, overflow: false, readableBody: true });
    }
    if (role === "parent") {
      const todayResponse = await context.request.get(
        base +
          "/api/v1/parent/today?childId=50000000-0000-4000-8000-000000000001",
        {
          headers: {
            "x-organization-id": "10000000-0000-4000-8000-000000000001",
          },
        },
      );
      assert.equal(todayResponse.status(), 200);
      const today = (await todayResponse.json()).data;
      assert.equal(today.morning.length, 1);
      assert.equal(today.activityCount, 3);
      assert.equal(today.photos.length, 1);
      assert.ok(
        today.activities.every(
          (record) => Date.parse(record.data.occurredAt) <= Date.now(),
        ),
      );
      assert.ok(Date.parse(today.story.data.publishedAt) <= Date.now());
      results.push({
        workflow:
          "Curated day has one handover, three published activities, one example photo; no future recorded activities/story",
        passed: true,
      });
      await page
        .getByRole("button", { name: "Perbesar foto aktivitas" })
        .click();
      await page
        .getByRole("dialog", { name: "Foto aktivitas", exact: true })
        .waitFor();
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(
          () =>
            document.querySelector("dialog")?.matches(":modal") &&
            (document.activeElement?.tagName === "BODY" ||
              !!document.activeElement?.closest("dialog")),
        ),
        true,
      );
      await page.keyboard.press("Escape");
      await page
        .getByRole("dialog", { name: "Foto aktivitas", exact: true })
        .waitFor({ state: "hidden" });
      await page
        .getByRole("button", { name: "Lihat semua", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Daily Story", exact: true })
        .waitFor();
      await page.screenshot({
        path: "evidence/screenshots/cleanup/parent-story-390.png",
        fullPage: true,
      });
      results.push({
        workflow: "Parent photo enlargement and Daily Story history",
        passed: true,
      });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  const after = await (await fetch(base + "/api/v1/health/ready")).json();
  assert.equal(after.sandbox.fingerprint, health.sandbox.fingerprint);
  await writeFile(
    "evidence/cleanup-visual-results.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        environment:
          "Curated fictional local showcase. Read-only business APIs; auth login only. No production/provider claims.",
        results,
        errors,
        fingerprintBefore: health.sandbox.fingerprint,
        fingerprintAfter: after.sandbox.fingerprint,
      },
      null,
      2,
    ),
  );
  console.log(
    "12 role/viewport captures, clean content, private photo viewer, history, no overflow, no page errors; showcase unchanged.",
  );
} finally {
  await browser.close();
}
