import { spawn } from "node:child_process";
import { sandboxPaths } from "../lib/sandbox-paths.mjs";
import { startSandboxAuth } from "./sandbox-auth.mjs";
if (process.env.NODE_ENV === "production")
  throw Error("Sandbox cannot run in production");
const config = sandboxPaths();
const port = config.purpose === "test" ? 3101 : 3100;
const authPort = config.purpose === "test" ? 4012 : 4011;
const auth = startSandboxAuth(authPort);
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DAYLIO_SANDBOX: "true",
      NEXT_PUBLIC_SANDBOX: "true",
      APP_ORIGIN: `http://127.0.0.1:${port}`,
      MEDIA_DIRECTORY:
        config.purpose === "test"
          ? process.env.MEDIA_DIRECTORY
          : "data/sandbox-media",
      SUPABASE_URL: `http://127.0.0.1:${authPort}`,
      SUPABASE_ANON_KEY: "isolated-fixture-only",
      MEDIA_SIGNING_KEY: "isolated-sandbox-fixture-media-key-only",
    },
  },
);
child.on("exit", (code) => {
  auth.close();
  process.exitCode = code || 0;
});
process.on("SIGINT", () => {
  child.kill();
  auth.close();
});
console.log(
  "SANDBOX ONLY: owner/caregiver/parent/manager/otherowner/otherparent/admin @daylio.test; password Sandbox-only-2026!",
);
