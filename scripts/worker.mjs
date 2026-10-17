import postgres from "postgres";
import { runWorker } from "../lib/worker.mjs";
if (!process.env.DATABASE_URL) throw Error("DATABASE_URL is required");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  await sql.begin((tx) =>
    runWorker({
      query: async (s, p = []) => ({ rows: await tx.unsafe(s, p) }),
    }),
  );
  console.log(
    JSON.stringify({
      job: "daylio-worker",
      status: "ok",
      at: new Date().toISOString(),
    }),
  );
} catch {
  console.error(JSON.stringify({ job: "daylio-worker", status: "failed" }));
  process.exitCode = 1;
} finally {
  await sql.end();
}
