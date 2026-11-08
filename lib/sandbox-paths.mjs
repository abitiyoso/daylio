import { resolve, relative, isAbsolute } from "node:path";
export function sandboxPaths(env = process.env) {
  if (env.NODE_ENV === "production" || env.DATABASE_URL)
    throw Error("Local sandbox must not use production mode or DATABASE_URL");
  const purpose = env.DAYLIO_SANDBOX_PURPOSE || "showcase";
  if (!["showcase", "test"].includes(purpose))
    throw Error("Invalid sandbox purpose");
  const root = resolve("data");
  const directory = resolve(env.DAYLIO_SANDBOX_DIRECTORY || "data/sandbox");
  const rel = relative(root, directory);
  if (
    isAbsolute(rel) ||
    rel.startsWith("..") ||
    (purpose === "showcase"
      ? rel !== "sandbox"
      : !/^qa-runs[\\/][a-zA-Z0-9_-]+[\\/]database$/.test(rel))
  )
    throw Error("Sandbox path outside allowed local directory");
  if (
    purpose === "test" &&
    !/^[a-zA-Z0-9_-]{8,100}$/.test(env.DAYLIO_TEST_RUN_ID || "")
  )
    throw Error("Explicit test run identity required");
  return {
    purpose,
    directory,
    runId: purpose === "test" ? env.DAYLIO_TEST_RUN_ID : null,
  };
}
