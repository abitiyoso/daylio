import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { chromium } from "playwright";
const root = resolve("design-reference/Daylio_Backend_v3");
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://127.0.0.1").pathname,
    );
    const path = resolve(
      root,
      "." + (pathname === "/" ? "/index.html" : pathname),
    );
    if (!path.startsWith(root + sep)) throw Error("path");
    const bytes = await readFile(path);
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".webp": "image/webp",
        ".png": "image/png",
      }[extname(path)] || "application/octet-stream",
    );
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(3120, "127.0.0.1", resolve));
const browser = await chromium.launch({ channel: "chrome", headless: true });
await mkdir("evidence/design-qa/cleanup/reference-states", { recursive: true });
try {
  for (const role of ["caregiver", "manager"])
    for (const width of [390, 820]) {
      const page = await browser.newPage({
        viewport: { width, height: width === 390 ? 844 : 1000 },
      });
      await page.goto("http://127.0.0.1:3120/");
      await page.locator("#roleSwitch").selectOption(role);
      if (role === "caregiver")
        await page
          .getByRole("button", { name: "Catat Aktivitas Kelas", exact: true })
          .click();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: `evidence/design-qa/cleanup/reference-states/${role}-${width}.png`,
        fullPage: true,
      });
      await page.screenshot({
        path: `evidence/design-qa/cleanup/reference-states/${role}-${width}-viewport.png`,
      });
      await page.close();
    }
  console.log(
    "Captured approved HTML in matching Quick Care and Manager mobile/tablet states; read-only reference server closed.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
