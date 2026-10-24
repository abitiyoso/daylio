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

// A transient Windows file-open error must not discard otherwise valid browser
// evidence. Retry only screenshot I/O failures, never assertions or UI timeouts.
export async function saveBrowserScreenshot(target, options) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await target.screenshot(options);
    } catch (error) {
      if (
        attempt === 2 ||
        !["UNKNOWN", "EPERM", "EBUSY", "EACCES"].includes(error.code)
      )
        throw error;
      console.warn(`Retrying screenshot file I/O: ${options.path}`);
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
}
