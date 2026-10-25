import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import sharp from "sharp";
import { saveBrowserScreenshot } from "./browser-test-guard.mjs";
const base = "http://127.0.0.1:3100",
  root = "evidence/refinement-20261025/previews";
await mkdir(root, { recursive: true });
const fingerprint = async () => {
  const r = await fetch(base + "/api/v1/health/ready");
  const h = await r.json();
  assert.equal(h.sandbox?.purpose, "showcase");
  return h.sandbox.fingerprint;
};
const before = await fingerprint(),
  results = [],
  errors = [];
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const role of ["owner", "manager", "caregiver", "parent"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    await context.route("**/api/v1/**", (route) =>
      route.request().method() === "GET" ||
      /\/auth\/(login|logout|refresh)$/.test(
        new URL(route.request().url()).pathname,
      )
        ? route.continue()
        : route.abort("blockedbyclient"),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on("pageerror", (e) => errors.push(role + ": " + e.message));
    await page.goto(base + "/workspace");
    await page.getByLabel("Email", { exact: true }).fill(role + "@daylio.test");
    await page
      .getByLabel("Kata sandi", { exact: true })
      .fill("Sandbox-only-2026!");
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await page.locator('.op-content > div[aria-busy="false"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await saveBrowserScreenshot(page, {
        path: root + "/" + role + "-" + width + ".png",
        fullPage: true,
      });
      results.push({ role, width, captured: true });
    }
    if (role === "parent") {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page
        .getByRole("navigation", { name: "Navigasi utama" })
        .getByRole("button", { name: "Cerita Harian", exact: true })
        .click();
      await page.locator('.op-content > div[aria-busy="false"]').waitFor();
      await page
        .getByRole("button", { name: "Perbarui", exact: true })
        .waitFor();
      await page.waitForFunction(() =>
        [...document.querySelectorAll(".op-content button")].some(
          (b) => b.textContent.trim() === "Perbarui" && !b.disabled,
        ),
      );
      if (await page.locator(".op-private-photos").count())
        await page
          .locator(".op-private-photos img,.op-private-photos small")
          .first()
          .waitFor();
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await saveBrowserScreenshot(page, {
          path: root + "/parent-story-" + width + ".png",
          fullPage: true,
        });
      }
    }
    if (role === "owner") {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page
        .getByRole("navigation", { name: "Navigasi utama" })
        .getByRole("button", { name: "Administrasi lanjutan", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Administrasi daycare", exact: true })
        .waitFor();
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await saveBrowserScreenshot(page, {
          path: root + "/administration-" + width + ".png",
          fullPage: true,
        });
      }
    }
    await context.close();
  }
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page.on("console", (m) => {
    if (m.type() === "error")
      errors.push("landing console: " + m.text() + " " + m.location().url);
  });
  await page.goto(base);
  await page.locator("#featureList h3").first().waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [
        ...document.querySelectorAll(
          ".pain-image img,.closing-image img,.monitor .camera-video img",
        ),
      ].map((i) => {
        return i.decode().catch(() => {});
      }),
    );
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => scrollTo(0, 0));
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    const bytes = await page.screenshot({ fullPage: true });
    await writeFile(root + "/landing-" + width + ".png", bytes);
    for (const id of ["masalah", "cctv", "kontak"]) {
      const box = await page.locator("#" + id).boundingBox();
      assert.ok(box);
      await sharp(bytes)
        .extract({
          left: Math.floor(box.x),
          top: Math.floor(box.y),
          width: Math.floor(box.width),
          height: Math.floor(box.height),
        })
        .png()
        .toFile(root + "/" + id + "-" + width + ".png");
    }
    const sizes = await page
      .locator(".pain-image img,.closing-image img,.monitor .camera-video img")
      .evaluateAll((images) =>
        images.map((i) => ({
          src: i.getAttribute("src"),
          naturalWidth: i.naturalWidth,
          renderedWidth: i.getBoundingClientRect().width,
          loaded: i.complete && i.naturalWidth > 0,
        })),
      );
    assert.ok(
      sizes.every((i) => i.loaded && i.naturalWidth >= i.renderedWidth * 1.9),
    );
    results.push({ surface: "landing", width, sizes });
  }
  await page.close();
  assert.deepEqual(errors, []);
  const after = await fingerprint();
  assert.equal(after, before);
  await writeFile(
    root + "/results.json",
    JSON.stringify(
      {
        before,
        after,
        unchanged: before === after,
        results,
        errors,
        policy:
          "Read-only showcase captures; only existing synthetic identity login/refresh allowed. No business record mutation.",
      },
      null,
      2,
    ),
  );
  console.log(
    "Four authenticated role previews and three landing sections captured at desktop/mobile; image density and unchanged records verified.",
  );
} finally {
  await browser.close();
}
