import { spawn, spawnSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  rm,
  realpath,
  writeFile,
  readFile,
} from "node:fs/promises";
import { resolve, relative } from "node:path";
import { randomUUID } from "node:crypto";
import { startSandboxAuth } from "./sandbox-auth.mjs";
if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL)
  throw Error("Local QA only; remove production connection variables");
const suites = {
  v10: "browser-v10-journey.mjs",
  legacy: "browser-test.mjs",
  care: "browser-v3-test.mjs",
  business: "browser-v3-business-test.mjs",
  entry: "browser-entry-test.mjs",
  access: "browser-access-test.mjs",
};
const requested = process.argv
  .find((a) => a.startsWith("--suite="))
  ?.split("=")[1];
if (requested && !suites[requested]) throw Error("Unknown suite");
const repeat = process.argv.includes("--repeat=2") ? 2 : 1;
async function previewFingerprint() {
  try {
    const r = await fetch("http://127.0.0.1:3100/api/v1/health/ready", {
      signal: AbortSignal.timeout(30000),
    });
    return (await r.json()).sandbox?.fingerprint;
  } catch {
    return null;
  }
}
let interrupted = false,
  activeTest,
  activeServer;
function stop(child) {
  if (!child?.pid) return;
  if (process.platform === "win32")
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      windowsHide: true,
      stdio: "ignore",
    });
  else child.kill("SIGTERM");
}
function interrupt() {
  interrupted = true;
  stop(activeTest);
  stop(activeServer);
}
process.on("SIGINT", interrupt);
process.on("SIGTERM", interrupt);
const before = await previewFingerprint(),
  results = [];
for (let iteration = 1; iteration <= repeat; iteration++)
  for (const [name, file] of Object.entries(suites).filter(
    ([name]) => !requested || name === requested,
  )) {
    const root = resolve("data/qa-runs");
    await mkdir(root, { recursive: true });
    if ((await realpath(root)) !== root)
      throw Error("Symlinked QA root forbidden");
    const directory = await mkdtemp(resolve(root, "run-")),
      runId = randomUUID();
    const env = {
      ...process.env,
      DAYLIO_SANDBOX: "true",
      NEXT_PUBLIC_SANDBOX: "true",
      DAYLIO_SANDBOX_PURPOSE: "test",
      DAYLIO_TEST_RUN_ID: runId,
      DAYLIO_SANDBOX_DIRECTORY: resolve(directory, "database"),
      MEDIA_DIRECTORY: resolve(directory, "media"),
      DAYLIO_BUILD_DIRECTORY: relative(
        process.cwd(),
        resolve(directory, "build"),
      ),
      APP_ORIGIN: "http://127.0.0.1:3101",
      SUPABASE_URL: "http://127.0.0.1:4012",
      SUPABASE_ANON_KEY: "isolated-fixture-only",
      MEDIA_SIGNING_KEY: "isolated-sandbox-fixture-media-key-only",
      TEST_BASE_URL: "http://127.0.0.1:3101",
    };
    const generatedBefore = await Promise.all(
      ["tsconfig.json", "next-env.d.ts"].map(async (path) => [
        path,
        await readFile(path, "utf8"),
      ]),
    );
    let output = "",
      testOutput = "",
      server;
    const auth = startSandboxAuth(4012);
    const started = Date.now();
    try {
      server = spawn(
        process.execPath,
        [
          "node_modules/next/dist/bin/next",
          "dev",
          "--webpack",
          "--hostname",
          "127.0.0.1",
          "--port",
          "3101",
        ],
        { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
      );
      activeServer = server;
      for (const stream of [server.stdout, server.stderr])
        stream.on("data", (data) => {
          output = (output + data.toString()).slice(-50000);
        });
      let ready = false;
      for (let attempt = 0; attempt < 90; attempt++) {
        if (interrupted)
          throw Error("QA interrupted; cleaning temporary state");
        if (server.exitCode !== null)
          throw Error("QA server exited: " + output.slice(-2000));
        try {
          const response = await fetch(
            env.TEST_BASE_URL + "/api/v1/health/ready",
            { signal: AbortSignal.timeout(15000) },
          );
          const value = await response.json();
          if (value.sandbox?.runId === runId) {
            ready = true;
            break;
          }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      if (!ready) throw Error("QA server not ready: " + output.slice(-2000));
      // Dev compilation is setup, not an application action timeout. Warm the
      // real entry routes before the browser starts its interaction checks.
      for (const path of ["/workspace", "/register", "/"]) {
        const response = await fetch(env.TEST_BASE_URL + path, {
          signal: AbortSignal.timeout(60000),
        });
        if (!response.ok)
          throw Error(`QA entry route failed: ${path} ${response.status}`);
        await response.text();
      }
      console.log(
        `Running ${name}, iteration ${iteration}, isolated database/media`,
      );
      const test = spawn(process.execPath, ["scripts/" + file], {
        env,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      activeTest = test;
      const timeout = setTimeout(() => stop(test), 240000);
      for (const stream of [test.stdout, test.stderr])
        stream.on("data", (data) => {
          testOutput += data.toString();
          process.stdout.write(data);
        });
      const code = await new Promise((resolve) => test.once("exit", resolve));
      clearTimeout(timeout);
      activeTest = null;
      results.push({
        suite: name,
        iteration,
        passed: code === 0,
        elapsedMs: Date.now() - started,
        output: testOutput,
      });
      if (code !== 0) throw Error(`${name} failed`);
      if (interrupted) throw Error("QA interrupted");
    } finally {
      if (server?.pid) {
        if (process.platform === "win32")
          spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], {
            windowsHide: true,
            stdio: "ignore",
          });
        else server.kill("SIGTERM");
      }
      activeServer = null;
      await new Promise((resolve) => auth.close(resolve));
      if (
        !directory.startsWith(root + "/") &&
        !directory.startsWith(root + "\\")
      )
        throw Error("Unsafe cleanup path");
      if ((await realpath(directory)) !== directory)
        throw Error("Refuse symlinked cleanup");
      await rm(directory, {
        recursive: true,
        force: true,
        maxRetries: 8,
        retryDelay: 500,
      });
      for (const [path, source] of generatedBefore) {
        const current = await readFile(path, "utf8");
        if (
          current.includes(
            relative(process.cwd(), directory).replaceAll("\\", "/"),
          )
        )
          await writeFile(path, source);
      }
      const after = await previewFingerprint();
      await mkdir("evidence", { recursive: true });
      await writeFile(
        `evidence/isolated-browser${requested ? "-" + requested : ""}-results.json`,
        JSON.stringify(
          {
            at: new Date().toISOString(),
            previewFingerprintBefore: before,
            previewFingerprintAfter: after,
            previewUnchanged: before === after,
            teardown:
              "Temporary database, media and build directory removed, including on failure.",
            results,
          },
          null,
          2,
        ),
      );
      if (before !== after) throw Error("Showcase changed during isolated QA");
    }
  }
console.log(
  "All selected browser suites passed; showcase unchanged; temporary data removed.",
);
