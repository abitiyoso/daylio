import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
if (!process.env.DATABASE_URL) throw Error("Set DATABASE_URL before migrating");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  await sql`create table if not exists schema_migrations(version integer primary key,applied_at timestamptz not null default now())`;
  for (const filename of (await readdir("db/migrations")).sort()) {
    const version = Number(filename.split("_")[0]);
    const existing =
      await sql`select version from schema_migrations where version=${version}`;
    if (existing.length) continue;
    await sql.begin(async (tx) => {
      await tx.unsafe(await readFile(`db/migrations/${filename}`, "utf8"));
    });
    console.log(`Applied ${filename}`);
  }
} finally {
  await sql.end();
}
