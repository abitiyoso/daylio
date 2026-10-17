import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import sharp from "sharp";
import { sandbox as s } from "../db/sandbox-fixture.mjs";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw Error("Browser test may only use local synthetic sandbox");
await mkdir("evidence/screenshots", { recursive: true });
const readiness = await fetch(base + "/api/v1/health/ready", {
  signal: AbortSignal.timeout(30000),
});
assert.equal(
  readiness.status,
  200,
  "Start the sandbox and apply migrations before browser acceptance.",
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const evidence = [];
try {
  const page = await browser.newPage();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base, { waitUntil: "networkidle" });
    await page
      .locator(".hero-photo img,.hero-visual img")
      .first()
      .waitFor({ state: "visible" })
      .catch(() => {});
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `Horizontal overflow ${width}`,
    );
    assert.equal(await page.locator("details").count(), 8);
    await page.locator("details").nth(1).locator("summary").click();
    assert.equal(await page.locator("details").nth(1).getAttribute("open"), "");
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: `evidence/screenshots/marketing-${width}.png`,
      fullPage: false,
    });
    evidence.push(
      `Marketing ${width}px: no overflow; FAQ keyboard-native details; screenshot captured`,
    );
  }
  async function login(role) {
    const context = await browser.newContext();
    const p = await context.newPage();
    const faults = [];
    p.on("response", async (r) => {
      if (r.url().includes("/api/") && r.status() >= 400)
        faults.push(`${new URL(r.url()).pathname}: ${r.status()}`);
    });
    p.on("pageerror", (error) => faults.push(error.message));
    await p.goto(base + "/workspace?tools=1");
    await p.getByLabel("Email", { exact: true }).fill(role + "@daylio.test");
    await p
      .getByLabel("Kata sandi", { exact: true })
      .fill("Sandbox-only-2026!");
    await p.getByRole("button", { name: "Lanjutkan", exact: true }).click();
    try {
      await p.getByRole("button", { name: "Keluar", exact: true }).waitFor();
    } catch {
      await p.screenshot({
        path: `evidence/screenshots/login-${role}-failure.png`,
      });
      throw Error(
        `Login ${role}: ${faults.join("; ")}; page ${(await p.locator("body").innerText()).slice(0, 800)}`,
      );
    }
    return { context, page: p };
  }
  const owner = await login("owner"),
    caregiver = await login("caregiver"),
    parent = await login("parent"),
    other = await login("otherparent");
  async function api(actor, path, method = "GET", data, org = s.org) {
    const response = await actor.context.request.fetch(
      base + "/api/v1/" + path,
      {
        method,
        headers: {
          Origin: base,
          "x-organization-id": org,
          ...(method === "POST"
            ? { "Idempotency-Key": crypto.randomUUID() }
            : {}),
        },
        data,
      },
    );
    const json = await response.json();
    return { status: response.status(), body: json.data ?? json };
  }
  const contact = "browser-" + crypto.randomUUID() + "@example.test";
  const publicLead = await api(owner, "public/demo-requests", "POST", {
    name: "Browser demo lead",
    daycare: "Synthetic daycare",
    contact,
    children: "Di bawah 20",
    cctv: "Belum",
    consent: true,
    website: "",
  });
  assert.equal(publicLead.status, 201);
  const repeatedLead = await api(owner, "public/demo-requests", "POST", {
    name: "Browser demo lead",
    daycare: "Synthetic daycare",
    contact,
    children: "Di bawah 20",
    cctv: "Belum",
    consent: true,
    website: "",
  });
  assert.equal(publicLead.body.id, repeatedLead.body.id);
  const inquiry = await api(owner, "public/inquiries/" + s.org, "POST", {
    name: "Synthetic prospective guardian",
    contact,
    consent: true,
    website: "",
  });
  assert.equal(inquiry.status, 201);
  assert.ok(inquiry.body.prospectToken);
  const startsAt = new Date(Date.now() + 2 * 86400000).toISOString(),
    endsAt = new Date(Date.now() + 2 * 86400000 + 3600000).toISOString();
  const tour = await api(owner, "public/tours/" + s.org, "POST", {
    leadId: inquiry.body.id,
    prospectToken: inquiry.body.prospectToken,
    startsAt,
    endsAt,
  });
  assert.equal(tour.status, 201);
  assert.equal(tour.body.state, "requested");
  evidence.push(
    "Public demo persisted and deduplicated; daycare inquiry issues private prospect token; survey request stays requested until staff confirmation",
  );
  await caregiver.page
    .getByRole("button", { name: "Catat aktivitas", exact: true })
    .click();
  await caregiver.page
    .getByText("Catat untuk beberapa anak", { exact: true })
    .click();
  await caregiver.page
    .getByLabel("Catatan kelompok", { exact: true })
    .fill("Browser UI group note");
  await caregiver.page.locator('input[name="batchChild"]').first().check();
  await caregiver.page
    .getByRole("button", { name: "Simpan catatan kelompok", exact: true })
    .click();
  await caregiver.page
    .getByText(/Browser UI group note/)
    .first()
    .waitFor();
  evidence.push(
    "Caregiver group logging submitted through the browser form and rendered from persisted API records",
  );
  const meal = await api(caregiver, "activities", "POST", {
    childId: s.child,
    data: {
      type: "meal",
      note: "Browser test: nasi, sayur dan air putih",
      occurredAt: new Date().toISOString(),
    },
  });
  assert.equal(meal.status, 201);
  const draft = await api(parent, `children/${s.child}/timeline`);
  assert.equal(
    draft.body.some((r) => r.id === meal.body.id),
    false,
  );
  const photo = await sharp({
    create: { width: 100, height: 100, channels: 3, background: "#f57f91" },
  })
    .png()
    .toBuffer();
  const intent = await api(caregiver, "media/upload-intent", "POST", {
    childId: s.child,
    data: { activityId: meal.body.id, mime: "image/png", size: photo.length },
  });
  assert.equal(intent.status, 201, JSON.stringify(intent));
  const upload = await caregiver.context.request.put(
    `${base}/api/v1/media/${intent.body.id}/content`,
    {
      headers: {
        Origin: base,
        "x-organization-id": s.org,
        "Content-Type": "image/png",
      },
      data: photo,
    },
  );
  assert.equal(upload.status(), 200, await upload.text());
  await api(caregiver, `media/${intent.body.id}/attach`, "POST", {});
  assert.equal(
    (await api(parent, `media/${intent.body.id}/access`)).status,
    404,
  );
  assert.equal(
    (await api(owner, `activities/${meal.body.id}/publish`, "POST", {}))
      .status,
    201,
  );
  const live = await api(parent, `children/${s.child}/timeline`);
  assert.ok(live.body.some((r) => r.id === meal.body.id));
  const grant = await api(parent, `media/${intent.body.id}/access`);
  assert.equal(grant.status, 200, JSON.stringify(grant));
  const download = await parent.context.request.get(base + grant.body.url);
  assert.equal(download.status(), 200);
  assert.equal(download.headers()["content-type"], "image/webp");
  assert.equal(
    (await other.context.request.get(base + grant.body.url)).status(),
    403,
  );
  assert.equal(
    (await api(other, `children/${s.child}`, "GET", undefined, s.otherOrg))
      .status,
    404,
  );
  const leo = await api(parent, "leo/parent/query", "POST", {
    childId: s.child,
    question: "Sudah makan?",
  });
  assert.equal(leo.status, 201);
  assert.ok(leo.body.sources.some((source) => source.id === meal.body.id));
  const off = await api(parent, "cameras/authorized?childId=" + s.child);
  assert.equal(off.status, 503);
  const badOrigin = await owner.context.request.post(
    base + "/api/v1/children",
    {
      headers: { Origin: "https://attacker.test", "x-organization-id": s.org },
      data: { name: "Denied", classroomId: s.room },
    },
  );
  assert.equal(badOrigin.status(), 403);
  const dashboard = await api(owner, "owner/overview");
  assert.ok(dashboard.body.activities >= 1);
  await parent.page.reload();
  await parent.page
    .getByRole("button", { name: "Keluar", exact: true })
    .waitFor();
  await parent.page
    .getByText("Browser test: nasi, sayur dan air putih", { exact: true })
    .first()
    .waitFor();
  await parent.page.setViewportSize({ width: 390, height: 844 });
  await parent.page.screenshot({ path: "evidence/screenshots/parent-390.png" });
  await owner.page.setViewportSize({ width: 1440, height: 900 });
  await owner.page.reload();
  await owner.page
    .getByRole("button", { name: "Keluar", exact: true })
    .waitFor();
  await owner.page.locator(".cards article strong").first().waitFor();
  await owner.page.screenshot({ path: "evidence/screenshots/owner-1440.png" });
  evidence.push(
    "Browser login with isolated identity fixture for owner, caregiver, parent and unrelated guardian",
  );
  evidence.push(
    "Real API + persistent PostgreSQL engine: draft hidden, private photo upload/resize, publish, linked parent timeline on reload, signed media access, cross-user URL denied, owner counts, LEO citation, unavailable CCTV, CSRF rejection",
  );
  // Explicit revocation invalidates an already-issued photo grant, then restore synthetic fixture.
  const links = await api(owner, `children/${s.child}/guardians`);
  const link = links.body.find((r) => r.user_id === s.parent);
  assert.equal(
    (await api(owner, `guardians/${link.id}`, "DELETE")).status,
    200,
  );
  assert.equal(
    (await parent.context.request.get(base + grant.body.url)).status(),
    404,
  );
  await api(owner, `children/${s.child}/guardians`, "POST", {
    userId: s.parent,
  });
  evidence.push(
    "Revoked guardian cannot use a previously issued media grant; synthetic link restored after test",
  );
  await writeFile(
    "evidence/browser-results.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        environment:
          "localhost synthetic sandbox; PGlite PostgreSQL; isolated identity fixture, not Supabase delivery",
        passed: evidence,
      },
      null,
      2,
    ),
  );
  console.log(evidence.join("\n"));
} finally {
  await browser.close();
}
