import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
const allowed = resolve("design-reference/approved-2026-10-24");
const pub = resolve("public");
export function referenceServer() {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      let path;
      if (url.pathname.startsWith("/approved-assets/") || url.pathname.startsWith("/fonts/"))
        path = resolve(pub, "." + url.pathname);
      else if (url.pathname === "/assets/classroom-analytics.webp")
        path = resolve(pub, "approved-assets/361aa5ea4bcebaa12fca.webp");
      else if (["/v20", "/v10"].includes(url.pathname))
        path = resolve(allowed, url.pathname.slice(1) + "-source.html");
      else throw Error("not found");
      if (!path.startsWith(pub + sep) && !path.startsWith(allowed + sep))
        throw Error("path");
      let data = await readFile(path);
      // Deliver the same official font binaries locally for deterministic QA.
      // The archived approved HTML is never rewritten on disk.
      if(url.pathname==="/v10")data=Buffer.from(data.toString('utf8').replace(/https:\/\/fonts\.googleapis\.com\/css2\?[^\"]+/g,'/fonts/reference-v10.css'));
      res.setHeader(
        "Content-Type",
        {
          ".html": "text/html; charset=utf-8",
          ".png": "image/png",
          ".webp": "image/webp",
          ".svg": "image/svg+xml",
          ".css": "text/css; charset=utf-8",
          ".woff2": "font/woff2",
        }[extname(path)] || "application/octet-stream",
      );
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
}
if (process.argv.includes("--serve")) {
  referenceServer().listen(3120, "127.0.0.1", () =>
    console.log(
      "Read-only approved reference: http://127.0.0.1:3120/v20 and /v10",
    ),
  );
}
