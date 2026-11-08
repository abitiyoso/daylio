import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { sandboxPaths } from "../lib/sandbox-paths.mjs";
import { requireIsolatedBrowserTarget } from "../scripts/browser-test-guard.mjs";
test("Sandbox paths reject production, hosted connections, traversal, and test reuse of showcase", () => {
  assert.equal(sandboxPaths({}).purpose, "showcase");
  for (const env of [
    { NODE_ENV: "production" },
    { DATABASE_URL: "postgres://host/db" },
    { DAYLIO_SANDBOX_DIRECTORY: "../outside" },
    {
      DAYLIO_SANDBOX_PURPOSE: "test",
      DAYLIO_SANDBOX_DIRECTORY: "data/sandbox",
      DAYLIO_TEST_RUN_ID: "run-local",
    },
    {
      DAYLIO_SANDBOX_PURPOSE: "test",
      DAYLIO_SANDBOX_DIRECTORY: "data/qa-runs/valid/database",
    },
  ])
    assert.throws(() => sandboxPaths(env));
  const config = sandboxPaths({
    DAYLIO_SANDBOX_PURPOSE: "test",
    DAYLIO_SANDBOX_DIRECTORY: resolve("data/qa-runs/run-local/database"),
    DAYLIO_TEST_RUN_ID: "run-local",
  });
  assert.equal(config.runId, "run-local");
});
test("Mutating browser suites cannot target the preview or an unowned QA instance", async () => {
  const previous = process.env.DAYLIO_TEST_RUN_ID,
    fetcher = globalThis.fetch;
  try {
    process.env.DAYLIO_TEST_RUN_ID = "run-test";
    await assert.rejects(requireIsolatedBrowserTarget("http://127.0.0.1:3100"));
    globalThis.fetch = async () =>
      Response.json({ sandbox: { purpose: "showcase", runId: "run-test" } });
    await assert.rejects(requireIsolatedBrowserTarget("http://127.0.0.1:3101"));
    globalThis.fetch = async () =>
      Response.json({ sandbox: { purpose: "test", runId: "other-test" } });
    await assert.rejects(requireIsolatedBrowserTarget("http://127.0.0.1:3101"));
    globalThis.fetch = async () =>
      Response.json({ sandbox: { purpose: "test", runId: "run-test" } });
    await requireIsolatedBrowserTarget("http://127.0.0.1:3101");
  } finally {
    globalThis.fetch = fetcher;
    if (previous === undefined) delete process.env.DAYLIO_TEST_RUN_ID;
    else process.env.DAYLIO_TEST_RUN_ID = previous;
  }
});
