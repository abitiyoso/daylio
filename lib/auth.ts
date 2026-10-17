import { cookies } from "next/headers";
import { verifyIdentity } from "./identity.mjs";
export type Identity = { id: string; email: string };
export async function identity(request: Request): Promise<Identity> {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer /, "");
  const token = bearer || (await cookies()).get("daylio_access")?.value;
  return verifyIdentity(token, {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
  });
}
export function sameOrigin(request: Request) {
  if (
    ["GET", "HEAD", "OPTIONS"].includes(request.method) ||
    request.headers.get("authorization")?.startsWith("Bearer ")
  )
    return;
  const origin = request.headers.get("origin");
  if (origin !== new URL(process.env.APP_ORIGIN || request.url).origin)
    throw Object.assign(new Error("Origin ditolak"), {
      status: 403,
      code: "ORIGIN_DENIED",
    });
}
