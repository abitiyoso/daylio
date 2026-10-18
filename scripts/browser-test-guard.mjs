export async function requireIsolatedBrowserTarget(base) {
  const url = new URL(base);
  if (!process.env.DAYLIO_TEST_RUN_ID || url.origin !== "http://127.0.0.1:3101")
    throw Error(
      "Browser mutations require the isolated test runner; use node scripts/run-browser-regressions.mjs",
    );
  const response = await fetch(url.origin + "/api/v1/health/ready");
  const health = await response.json();
  if (
    !response.ok ||
    health.sandbox?.purpose !== "test" ||
    health.sandbox?.runId !== process.env.DAYLIO_TEST_RUN_ID
  )
    throw Error("Target is not this run's isolated sandbox");
}
