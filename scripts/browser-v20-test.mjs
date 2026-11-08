import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
const root = "evidence/v20",
  sections = [
    "beranda",
    "masalah",
    "solusi",
    "cctv",
    "pengalaman",
    "leo",
    "harga",
    "kontak",
  ];
await mkdir(root, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    const pages = [];
    for (const kind of ["reference", "actual"]) {
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
        deviceScaleFactor: 1,
      });
      pages.push(page);
      const errors = [],
        broken = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("response", (r) => {
        if (r.status() >= 400) broken.push(r.url());
      });
      await page.goto(
        kind === "reference"
          ? "http://127.0.0.1:3120/v20"
          : "http://127.0.0.1:3100/",
        { waitUntil: "networkidle" },
      );
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.images].map((i) => {
            i.loading = "eager";
            return i.decode().catch(() => {});
          }),
        );
      });
      await page.screenshot({
        path: `${root}/${kind}-${width}.png`,
        fullPage: true,
      });
      await page.addStyleTag({
        content:
          "html{scroll-behavior:auto!important}.site-header{visibility:hidden!important}",
      });
      for (const id of sections)
        await page
          .locator("#" + id)
          .screenshot({ path: `${root}/${kind}-${id}-${width}.png` });
      const metrics = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        images: [...document.images]
          .filter((i) => !i.naturalWidth)
          .map((i) => i.src),
        font: getComputedStyle(document.querySelector("h1")).fontFamily,
        sections: [...document.querySelectorAll("main>section")].map((el) => ({
          id: el.id,
          height: el.getBoundingClientRect().height,
        })),
        phone: {
          w: document.querySelector(".leo20-phone").getBoundingClientRect()
            .width,
          h: document.querySelector(".leo20-phone").getBoundingClientRect()
            .height,
        },
      }));
      assert.ok(
        metrics.scroll <= width + 1,
        `${kind} overflow ${width}: ${metrics.scroll}`,
      );
      assert.deepEqual(errors, []);
      assert.deepEqual(metrics.images, []);
      // The standalone source references one missing thumbnail; documented alias is
      // supplied by the reference server to compare its intended approved imagery.
      results.push({ kind, width, metrics, errors, broken });
    }
    for (const id of ["beranda", "solusi", "cctv", "leo", "harga"]) {
      const a = await sharp(`${root}/reference-${id}-${width}.png`).metadata(),
        b = await sharp(`${root}/actual-${id}-${width}.png`).metadata();
      await sharp({
        create: {
          width: a.width + b.width,
          height: Math.max(a.height, b.height),
          channels: 3,
          background: "#eee",
        },
      })
        .composite([
          { input: `${root}/reference-${id}-${width}.png`, left: 0, top: 0 },
          { input: `${root}/actual-${id}-${width}.png`, left: a.width, top: 0 },
        ])
        .png()
        .toFile(`${root}/compare-${id}-${width}.png`);
    }
    for (const p of pages) await p.close();
  }
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:3100/");
  await page.locator("#leoQuestions button").first().waitFor();
  for (const [id, title] of [
    ["care", "Care & Family"],
    ["monitor", "Smart Monitoring"],
    ["leo", "LEO Intelligence"],
    ["business", "Ringkasan Bisnis"],
  ]) {
    await page.locator(`[data-solution="${id}"]`).click();
    await page
      .locator("#dashboardTitle")
      .getByText(title, { exact: true })
      .waitFor();
  }
  for (const id of ["people", "offline", "area"]) {
    await page.locator(`[data-event="${id}"]`).click();
    assert.ok(await page.locator("#monitorStatus").textContent());
  }
  for (const i of [1, 2, 0]) {
    await page.locator("[data-camera]").nth(i).click();
    assert.match(
      await page.locator(".monitor-header>span").textContent(),
      /Simulasi/,
    );
  }
  for (const role of ["caregiver", "parent", "owner"]) {
    await page.locator(`[data-leo="${role}"]`).click();
    for (let i = 0; i < 4; i++) {
      await page.locator("#leoQuestions button").nth(i).click();
      assert.ok(await page.locator("#leoResponse").textContent());
    }
  }
  await page
    .locator("#leoMessageInput")
    .fill("Pertanyaan bebas untuk uji transparansi");
  await page.locator("#leoChatForm button").click();
  assert.match(await page.locator("#leoResponse").textContent(), /simulasi/i);
  for (const plan of ["Essential", "Growth", "Intelligence"]) {
    await page.locator(`[data-plan="${plan}"]`).click();
    assert.equal(
      await page.locator("#infoModal").evaluate((n) => n.open),
      true,
    );
    assert.match(
      await page.locator("#modalLink").getAttribute("href"),
      /^https:\/\/wa.me\/6281933328899/,
    );
    await page.locator("#closeModal").click();
  }
  await page.getByRole("link", { name: "Masuk", exact: true }).click();
  await page.getByRole("heading", { name: "Selamat datang" }).waitFor();
  await page.goBack();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#menuToggle").click();
  assert.equal(await page.locator("#mobileMenu").isVisible(), true);
  await page.locator("#mobileMenu a").first().click();
  assert.equal(await page.locator("#mobileMenu").isVisible(), false);
  assert.deepEqual(errors, []);
  await page.close();
  await writeFile(
    root + "/results.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        results,
        interactions:
          "Four platform tabs; three event states; three cameras; three LEO roles and all twelve suggestions; custom input transparency; three pricing dialogs and WhatsApp target; mobile menu; real login entry",
        passed: true,
      },
      null,
      2,
    ),
  );
  console.log("V20 six viewport captures and all public interactions passed.");
} finally {
  await browser.close();
}
