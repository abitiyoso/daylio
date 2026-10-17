import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
function redirect(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const token_hash = z
      .string()
      .min(16)
      .max(256)
      .parse(url.searchParams.get("token_hash"));
    const type = z
      .enum(["signup", "recovery", "invite", "email"])
      .parse(url.searchParams.get("type"));
    const base = process.env.SUPABASE_URL,
      key = process.env.SUPABASE_ANON_KEY;
    if (!base || !key) throw Error("unconfigured");
    const response = await fetch(`${base}/auth/v1/verify`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ token_hash, type }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) throw Error("invalid");
    const session = await response.json();
    const jar = await cookies();
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };
    jar.set("daylio_access", session.access_token, {
      ...options,
      maxAge: session.expires_in,
    });
    jar.set("daylio_refresh", session.refresh_token, {
      ...options,
      maxAge: 604800,
    });
    return redirect(
      new URL(
        type === "recovery" ? "/workspace?reset=1" : "/workspace",
        request.url,
      ),
    );
  } catch {
    return redirect(new URL("/workspace?authError=expired", request.url));
  }
}
