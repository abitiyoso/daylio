import { spawn } from "node:child_process";
import { startSandboxAuth } from "./sandbox-auth.mjs";
if (process.env.NODE_ENV === "production")
  throw Error("Sandbox cannot run in production");
const auth = startSandboxAuth();
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DAYLIO_SANDBOX: "true",
      NEXT_PUBLIC_SANDBOX: "true",
      APP_ORIGIN: "http://127.0.0.1:3100",
      SUPABASE_URL: "http://127.0.0.1:4011",
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
