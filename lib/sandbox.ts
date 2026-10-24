import { readFile, readdir, mkdir } from "node:fs/promises";
import { sandboxPaths } from "./sandbox-paths.mjs";
import { seedSandbox } from "../db/sandbox-fixture.mjs";
const shared = globalThis as unknown as { daylioSandbox?: Promise<any> };
export function sandboxDatabase() {
  if (process.env.NODE_ENV === "production")
    throw Error("Sandbox is forbidden in production");
  return (shared.daylioSandbox ??= initialize());
}
async function initialize() {
  const { PGlite } = await import("@electric-sql/pglite");
  await mkdir("data", { recursive: true });
  const config = sandboxPaths();
  const pg = new PGlite(config.directory);
  await pg.waitReady;
  await pg.exec(
    "create table if not exists schema_migrations(version integer primary key,applied_at timestamptz not null default now())",
  );
  for (const name of (await readdir("db/migrations")).sort()) {
    const version = Number(name.split("_")[0]);
    if (
      (
        await pg.query(
          "select version from schema_migrations where version=$1",
          [version],
        )
      ).rows.length
    )
      continue;
    const source = await readFile(`db/migrations/${name}`, "utf8");
    await pg.transaction((tx) => tx.exec(source));
  }
  if (config.purpose === "test") await seedSandbox(pg);
  else if (
    !(await pg.query("select id from organizations limit 1")).rows.length
  )
    throw Error(
      "Initialize showcase explicitly: node scripts/reset-showcase.mjs --confirm-local-showcase",
    );
  return pg;
}
function adapter(get: () => Promise<any>): any {
  const tag: any = async (strings: TemplateStringsArray, ...values: any[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i++)
      text += `$${i + 1}` + strings[i + 1];
    return (await (await get()).query(text, values)).rows;
  };
  tag.json = (value: any) => JSON.stringify(value);
  tag.unsafe = async (text: string, values: any[] = []) => {
    const pg = await get();
    return values.length
      ? (await pg.query(text, values)).rows
      : (await pg.query(text)).rows;
  };
  tag.begin = async (fn: any) =>
    (await get()).transaction((tx: any) => fn(adapter(async () => tx)));
  return tag;
}
export const sandboxClient = adapter(sandboxDatabase);
