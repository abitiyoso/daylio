import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { referenceServer } from "./approved-reference.mjs";
const root = "evidence/v10",
  base = "http://127.0.0.1:3100";
await mkdir(root, { recursive: true });
let ownedReference;
try {
  await fetch("http://127.0.0.1:3120/v10", {
    signal: AbortSignal.timeout(1500),
  });
} catch {
  ownedReference = referenceServer();
  await new Promise((resolve) =>
    ownedReference.listen(3120, "127.0.0.1", resolve),
  );
}
const health = async () =>
  (await (await fetch(base + "/api/v1/health/ready")).json()).sandbox;
const before = await health();
assert.equal(before.purpose, "showcase");
assert.ok(before.fingerprint);
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [],
  errors = [];
try {
  for (const [role, title] of [
    ["owner", "Ringkasan Daycare"],
    ["manager", "Control Tower"],
    ["caregiver", /^Selamat/],
    ["parent", /^Halo,/],
  ]) {
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
    await page
      .getByRole("heading", { name: title, exact: typeof title === "string" })
      .waitFor();
    await page.locator('.op-content > div[aria-busy="false"]').waitFor();
    if (role === "parent")
      await page.locator(".op-private-photos img").waitFor();
    const reference = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    await reference.goto("http://127.0.0.1:3120/v10?role=" + role);
    await reference.getByLabel("Ganti peran pengguna").selectOption(role);
    for (const width of [320, 390, 768, 1024, 1440]) {
      const height = width < 500 ? 844 : 1000;
      for (const [kind, target] of [
        ["actual", page],
        ["reference", reference],
      ]) {
        await target.setViewportSize({ width, height });
        await target.evaluate(() => document.fonts.ready);
        await target.evaluate(() => scrollTo(0, 0));
        if (kind === "actual")
          await target.waitForFunction(() =>
            [...document.images]
              .filter((img) => img.getBoundingClientRect().width > 0)
              .every((img) => img.complete && img.naturalWidth > 0),
          );
        const overflow = await target.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        if (kind === "actual") {
          if (overflow) {
            console.error(
              await target.evaluate(() =>
                [...document.querySelectorAll("body *")]
                  .filter(
                    (el) => el.getBoundingClientRect().right > innerWidth + 1,
                  )
                  .map((el) => ({
                    tag: el.tagName,
                    cls: el.className,
                    right: el.getBoundingClientRect().right,
                    width: el.getBoundingClientRect().width,
                  }))
                  .slice(0, 20),
              ),
            );
            await target.screenshot({
              path: root + "/overflow-" + role + "-" + width + ".png",
            });
          }
          assert.equal(overflow, false, `${role} overflow ${width}`);
          assert.doesNotMatch(
            await target.locator(".op-content").innerText(),
            /\b(?:V3|P1)\s?\d|Anak Uji|Browser test:/i,
          );
          assert.equal(
            await target
              .locator("img")
              .evaluateAll(
                (imgs) =>
                  imgs.filter(
                    (img) =>
                      img.getBoundingClientRect().width > 0 &&
                      (!img.complete || !img.naturalWidth),
                  ).length,
              ),
            0,
            "Broken image",
          );
        }
        await target.screenshot({
          path: `${root}/${kind}-${role}-${width}.png`,
          fullPage: true,
        });
        await target.screenshot({
          path: `${root}/${kind}-${role}-${width}-viewport.png`,
        });
      }
      const a = await sharp(
          `${root}/reference-${role}-${width}-viewport.png`,
        ).toBuffer(),
        b = await sharp(
          `${root}/actual-${role}-${width}-viewport.png`,
        ).toBuffer();
      await sharp({
        create: {
          width: width * 2,
          height,
          channels: 3,
          background: "#e8e8e8",
        },
      })
        .composite([
          { input: a, left: 0, top: 0 },
          { input: b, left: width, top: 0 },
        ])
        .png()
        .toFile(`${root}/compare-${role}-${width}.png`);
      results.push({
        role,
        width,
        overflow: false,
        imagesLoaded: true,
        comparison: `compare-${role}-${width}.png`,
      });
    }
    await context.close();
    await reference.close();
  }
  assert.deepEqual(errors, []);
  const after = await health();
  assert.equal(
    after.fingerprint,
    before.fingerprint,
    "Read-only screenshots must not change business data",
  );
  await writeFile(
    root + "/results.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        results,
        errors,
        showcaseUnchanged: true,
        fingerprint: before.fingerprint,
      },
      null,
      2,
    ),
  );
  console.log(
    "All four authenticated roles captured at five widths; showcase unchanged.",
  );
} finally {
  await browser.close();
  ownedReference?.close();
}
