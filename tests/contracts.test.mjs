import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { verifyIdentity } from "../lib/identity.mjs";
import { mediaGrant, verifyMediaGrant } from "../lib/media.mjs";
import { authorizeCreate, schemas } from "../lib/schemas.mjs";
test("F01 v4 hierarchy, eight FAQ topics and unmodified official asset copy", async () => {
  const html = await readFile("daylio-web/index.html", "utf8");
  assert.equal((html.match(/<details/g) || []).length, 8);
  assert.match(html, /Buat Daycare/);
  assert.match(html, /Lebih Mudah/);
  const source = await readFile("daylio-web/assets/elenio-official.png"),
    published = await readFile("public/marketing/assets/elenio-official.png");
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    createHash("sha256").update(published).digest("hex"),
  );
  const script = await readFile("daylio-web/app.js", "utf8");
  assert.doesNotMatch(script, /let logs =|const leoAnswers|probe.src=url/);
  assert.match(script, /response.ok/);
});
test("F03 identity verifies token with provider; invalid, expired and unverified denied", async () => {
  const config = {
    url: "https://identity.example.test",
    key: "test-public-key",
  };
  await assert.rejects(verifyIdentity("", config), (e) => e.status === 401);
  await assert.rejects(verifyIdentity("token", {}), (e) => e.status === 503);
  await assert.rejects(
    verifyIdentity(
      "expired",
      config,
      async () => new Response("{}", { status: 401 }),
    ),
    (e) => e.status === 401,
  );
  await assert.rejects(
    verifyIdentity("token", config, async () =>
      Response.json({ id: "user", email: "a@example.test" }),
    ),
    (e) => e.status === 403,
  );
  const user = await verifyIdentity("token", config, async (url, options) => {
    assert.equal(options.headers.Authorization, "Bearer token");
    assert.equal(options.cache, "no-store");
    return Response.json({
      id: "verified",
      email: "a@example.test",
      email_confirmed_at: new Date().toISOString(),
    });
  });
  assert.equal(user.id, "verified");
});
test("F14 signed private media grants are user-bound, expiring and tamper resistant", () => {
  process.env.MEDIA_SIGNING_KEY =
    "test-only-media-secret-32-characters-minimum";
  const now = Date.now();
  const grant = new URL(
    mediaGrant("id", "org", "user", now),
    "https://daylio.test",
  );
  const expires = grant.searchParams.get("expires"),
    sig = grant.searchParams.get("sig");
  assert.equal(verifyMediaGrant("id", "org", "user", expires, sig, now), true);
  assert.equal(
    verifyMediaGrant("id", "org", "other", expires, sig, now),
    false,
  );
  assert.equal(
    verifyMediaGrant("id", "other", "user", expires, sig, now),
    false,
  );
  assert.equal(
    verifyMediaGrant("id", "org", "user", expires, sig, now + 61000),
    false,
  );
});
test("F37 role boundaries and strict per-domain validation", () => {
  assert.equal(authorizeCreate("parent", "activity"), false);
  assert.equal(authorizeCreate("caregiver", "lead"), false);
  assert.equal(authorizeCreate("manager", "camera-policy"), false);
  assert.equal(authorizeCreate("owner", "subscription"), false);
  assert.equal(
    schemas.media.safeParse({
      activityId: crypto.randomUUID(),
      mime: "image/svg+xml",
      size: 100,
    }).success,
    false,
  );
  assert.equal(
    schemas.media.safeParse({
      activityId: crypto.randomUUID(),
      mime: "image/jpeg",
      size: 5242881,
    }).success,
    false,
  );
  assert.equal(
    schemas.activity.safeParse({
      type: "invented",
      note: "test",
      occurredAt: new Date().toISOString(),
    }).success,
    false,
  );
});
