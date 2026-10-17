import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
for (const dir of ["lib", "scripts", "tests"])
  for (const file of await readdir(dir))
    if (file.endsWith(".mjs")) {
      const r = spawnSync(process.execPath, ["--check", `${dir}/${file}`], {
        stdio: "inherit",
      });
      if (r.status) process.exit(r.status);
    }
for (const file of [".env.example", "app/api/v1/[...path]/route.ts"]) {
  const s = await readFile(file, "utf8");
  if (/eyJ[A-Za-z0-9_-]{30,}\./.test(s))
    throw Error("Possible embedded credential");
}
console.log("JavaScript syntax and embedded credential checks passed.");
