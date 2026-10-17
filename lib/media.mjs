import { createHmac, timingSafeEqual } from "node:crypto";
function signature(payload) {
  const key = process.env.MEDIA_SIGNING_KEY;
  if (!key || key.length < 32)
    throw Object.assign(new Error("Private media signing is not configured"), {
      status: 503,
      code: "MEDIA_UNAVAILABLE",
    });
  return createHmac("sha256", key).update(payload).digest("hex");
}
export function mediaGrant(id, org, user, now = Date.now()) {
  const expires = Math.floor(now / 1000) + 60;
  const sig = signature(`${id}:${org}:${user}:${expires}`);
  return `/api/v1/media/${id}/content?org=${org}&expires=${expires}&sig=${sig}`;
}
export function verifyMediaGrant(
  id,
  org,
  user,
  expires,
  sig,
  now = Date.now(),
) {
  if (
    !/^\d+$/.test(expires) ||
    Number(expires) < Math.floor(now / 1000) ||
    Number(expires) > Math.floor(now / 1000) + 60 ||
    !/^[a-f0-9]{64}$/.test(sig)
  )
    return false;
  const expected = signature(`${id}:${org}:${user}:${expires}`);
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
