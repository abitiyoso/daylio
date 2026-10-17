import { mkdir, cp, readFile, writeFile } from "node:fs/promises";
await mkdir("public/marketing", { recursive: true });
await cp("daylio-web/assets", "public/marketing/assets", { recursive: true });
await cp("daylio-web/styles.css", "public/marketing/styles.css");
await cp("daylio-web/app.js", "public/marketing/app.js");
console.log("Copied v4 assets without modification.");
