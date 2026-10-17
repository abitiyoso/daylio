export async function verifyIdentity(token, config, fetcher = fetch) {
  if (!token)
    throw Object.assign(new Error("Silakan masuk"), {
      status: 401,
      code: "UNAUTHENTICATED",
    });
  if (!config.url || !config.key)
    throw Object.assign(new Error("Layanan identitas belum dikonfigurasi"), {
      status: 503,
      code: "AUTH_UNAVAILABLE",
    });
  const response = await fetcher(`${config.url}/auth/v1/user`, {
    headers: { apikey: config.key, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (!response.ok)
    throw Object.assign(new Error("Sesi tidak berlaku"), {
      status: 401,
      code: "SESSION_EXPIRED",
    });
  const user = await response.json();
  if (!user.id || !user.email_confirmed_at)
    throw Object.assign(new Error("Verifikasi email diperlukan"), {
      status: 403,
      code: "EMAIL_UNVERIFIED",
    });
  return { id: user.id, email: user.email };
}
