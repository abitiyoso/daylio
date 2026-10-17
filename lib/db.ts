import postgres from "postgres";
import { sandboxClient } from "./sandbox";
let client: ReturnType<typeof postgres> | undefined;
export function database() {
  if (process.env.DAYLIO_SANDBOX === "true") {
    if (process.env.NODE_ENV === "production")
      throw Object.assign(new Error("Sandbox forbidden in production"), {
        status: 503,
      });
    return sandboxClient as ReturnType<typeof postgres>;
  }
  if (!process.env.DATABASE_URL)
    throw Object.assign(new Error("Database belum dikonfigurasi"), {
      status: 503,
      code: "DATABASE_UNAVAILABLE",
    });
  return (client ??= postgres(process.env.DATABASE_URL, {
    max: 8,
    connect_timeout: 5,
    idle_timeout: 20,
  }));
}
export type DB = any;
export async function scoped<T>(
  userId: string,
  orgId: string,
  fn: (tx: DB) => Promise<T>,
): Promise<T> {
  return (await database().begin(async (tx) => {
    await tx`select set_config('app.user_id',${userId},true),set_config('app.organization_id',${orgId},true)`;
    await tx`set local role daylio_app`;
    const [membership] = await tx`select app_role() as role`;
    if (!membership.role)
      throw Object.assign(new Error("Keanggotaan tidak aktif"), {
        status: 403,
        code: "FORBIDDEN",
      });
    return fn(tx);
  })) as unknown as T;
}
