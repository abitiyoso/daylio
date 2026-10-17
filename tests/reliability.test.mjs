import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { ReliableElenioAdapter } from "../lib/elenio.mjs";
test("F42 bounded read retries, circuit breaker, cooldown and no blind session retry", async () => {
  let calls = 0,
    clock = 0;
  const client = {
    listAuthorizedCameras: async () => {
      calls++;
      throw Error("provider secret never returned");
    },
    createPlaybackSession: async () => {
      calls++;
      throw Error("failure");
    },
  };
  const adapter = new ReliableElenioAdapter(client, {
    threshold: 3,
    cooldownMs: 100,
    now: () => clock,
  });
  await assert.rejects(
    adapter.listAuthorizedCameras({}),
    (e) => e.code === "ELENIO_UNVERIFIED" && !e.message.includes("secret"),
  );
  assert.equal(calls, 2);
  await assert.rejects(adapter.listAuthorizedCameras({}));
  assert.equal(calls, 3);
  await assert.rejects(adapter.listAuthorizedCameras({}));
  assert.equal(calls, 3);
  clock = 101;
  await assert.rejects(adapter.createPlaybackSession({}));
  assert.equal(calls, 4);
  const slow = new ReliableElenioAdapter(
    { listAuthorizedCameras: () => new Promise(() => {}) },
    { timeoutMs: 5, threshold: 1 },
  );
  await assert.rejects(slow.listAuthorizedCameras({}), (e) => e.status === 503);
});
test("F40 embedded PostgreSQL backup can be restored with persisted data", async () => {
  const source = new PGlite();
  await source.exec(
    "create table restore_probe(id integer primary key);insert into restore_probe values(42)",
  );
  const snapshot = await source.dumpDataDir();
  await source.close();
  const restored = new PGlite({ loadDataDir: snapshot });
  assert.equal(
    (await restored.query("select id from restore_probe")).rows[0].id,
    42,
  );
  await restored.close();
});
