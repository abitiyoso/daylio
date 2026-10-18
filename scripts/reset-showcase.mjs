import { mkdir, rename, lstat, writeFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { sandboxPaths } from "../lib/sandbox-paths.mjs";
import { seedShowcase } from "../db/showcase-fixture.mjs";
if (process.argv.slice(2).join(" ") !== "--confirm-local-showcase")
  throw Error(
    "Opt-in only: --confirm-local-showcase; preview must be stopped first.",
  );
const config = sandboxPaths({
  ...process.env,
  DAYLIO_SANDBOX_PURPOSE: "showcase",
});
if (process.env.DAYLIO_SANDBOX_DIRECTORY || process.env.MEDIA_DIRECTORY)
  throw Error("Custom database/media paths are forbidden for showcase reset");
try {
  await fetch("http://127.0.0.1:3100/api/v1/health/ready", {
    signal: AbortSignal.timeout(1000),
  });
  throw Error("Stop local preview before resetting its database");
} catch (error) {
  if (error.message.startsWith("Stop local")) throw error;
}
const root = resolve("data");
await mkdir(root, { recursive: true });
if ((await realpath(root)) !== root)
  throw Error("Refuse symlinked data directory");
const backupRoot = resolve(root, "sandbox-backups");
await mkdir(backupRoot, { recursive: true });
if ((await realpath(backupRoot)) !== backupRoot)
  throw Error("Refuse symlinked backup directory");
const backup = resolve(
  root,
  "sandbox-backups",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
await mkdir(backup, { recursive: true });
const moved = [];
for (const name of ["sandbox", "sandbox-media"]) {
  const target = resolve(root, name);
  const stat = await lstat(target).catch(() => null);
  if (!stat) continue;
  if (stat.isSymbolicLink() || (await realpath(target)) !== target)
    throw Error("Refuse symlinked reset target");
  await rename(target, resolve(backup, name));
  moved.push(name);
}
await writeFile(
  resolve(backup, "reset-report.json"),
  JSON.stringify(
    {
      backup,
      moved,
      status: "backup-complete-seeding",
      legacyMedia: "data/media untouched",
    },
    null,
    2,
  ),
);
const pg = new PGlite(config.directory);
await pg.waitReady;
let report;
try {
  await pg.exec(
    "create table schema_migrations(version integer primary key,applied_at timestamptz not null default now())",
  );
  for (const file of (await readdir("db/migrations")).sort())
    await pg.exec(await readFile(`db/migrations/${file}`, "utf8"));
  report = await seedShowcase(pg, resolve(root, "sandbox-media"));
} catch (error) {
  await writeFile(
    resolve(backup, "reset-report.json"),
    JSON.stringify(
      {
        backup,
        moved,
        status: "seed-failed-backup-preserved",
        error: error.message,
      },
      null,
      2,
    ),
  );
  throw Error(
    `Showcase seed failed; original data preserved at ${backup}: ${error.message}`,
  );
} finally {
  await pg.close();
}
await writeFile(
  resolve(backup, "reset-report.json"),
  JSON.stringify(
    {
      backup,
      moved,
      seed: report,
      legacyMedia:
        "data/media left untouched; new showcase uses data/sandbox-media",
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    { backup, moved, seed: report, legacyMedia: "untouched" },
    null,
    2,
  ),
);
