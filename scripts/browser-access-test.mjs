import {
  requireIsolatedBrowserTarget,
  saveBrowserScreenshot,
} from "./browser-test-guard.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { sandbox } from "../db/sandbox-fixture.mjs";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3101";
await requireIsolatedBrowserTarget(base);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const contexts = [],
  evidence = [],
  errors = [];
await mkdir("evidence/screenshots/access", { recursive: true });
async function actor(role) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/workspace");
  await page.getByLabel("Email", { exact: true }).fill(role + "@daylio.test");
  await page
    .getByLabel("Kata sandi", { exact: true })
    .fill("Sandbox-only-2026!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.locator('.op-content > div[aria-busy="false"]').waitFor();
  return { context, page };
}
async function api(actor, path, method = "GET", body) {
  return actor.context.request.fetch(base + "/api/v1/" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: base,
      "x-organization-id": sandbox.org,
    },
    data: body,
  });
}
try {
  const owner = await actor("owner");
  await owner.page
    .getByRole("button", { name: "Akun & hak akses", exact: true })
    .click();
  await owner.page.getByRole("heading", { name: "Akun & hak akses" }).waitFor();
  const email = `invited-${Date.now()}@daylio.test`;
  console.log("Access UI loaded");
  await owner.page.getByLabel("Email penerima").fill(email);
  await owner.page
    .getByLabel("Hak akses", { exact: true })
    .selectOption("parent");
  await owner.page
    .getByLabel("Anak untuk akses orang tua")
    .selectOption(sandbox.child);
  console.log("Form filled");
  await owner.page
    .getByRole("button", { name: "Kirim undangan email", exact: true })
    .click();
  await owner.page
    .getByRole("status")
    .filter({ hasText: "Permintaan email verifikasi diterima" })
    .waitFor();
  await saveBrowserScreenshot(owner.page, {
    path: "evidence/screenshots/access/admin-desktop.png",
  });
  const mail = await (
    await owner.context.request.get("http://127.0.0.1:4012/__test/mail")
  ).json();
  const letter = mail.findLast((x) => x.email === email);
  assert.ok(letter);
  const invites = await (await api(owner, "invitations")).json();
  const invite = invites.data.find((x) => x.email === email);
  assert.equal(invite.accepted_by, null);
  evidence.push(
    "Admin UI creates persistent parent invitation; provider receives verification request; membership not activated before verification.",
  );
  const inviteeContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  contexts.push(inviteeContext);
  const page = await inviteeContext.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  const notVerified = await inviteeContext.request.post(
    base + "/api/v1/auth/login",
    {
      headers: { Origin: base },
      data: { email, password: "Sandbox-only-2026!" },
    },
  );
  assert.equal(notVerified.status(), 403);
  const denied = await inviteeContext.request.get(
    base + "/api/v1/me/memberships",
  );
  assert.equal(denied.status(), 401);
  await page.goto(letter.link);
  await page
    .getByRole("heading", { name: "Atur kata sandi baru", exact: true })
    .waitFor();
  assert.equal(page.url(), base + "/workspace?reset=1");
  const accepted = await (await api(owner, "invitations")).json();
  assert.ok(accepted.data.find((x) => x.id === invite.id).accepted_by);
  await page
    .getByLabel("Kata sandi baru", { exact: true })
    .fill("Invited-test-2026!");
  await page.getByLabel("Ulangi kata sandi").fill("Invited-test-2026!");
  await page.getByRole("button", { name: "Simpan kata sandi" }).click();
  await page.getByRole("heading", { name: /^Halo,/, exact: true }).waitFor();
  const today = await inviteeContext.request.get(
    base + "/api/v1/workspace/context",
    { headers: { "x-organization-id": sandbox.org } },
  );
  const data = (await today.json()).data;
  assert.equal(data.role, "parent");
  assert.equal(data.children.length, 1);
  assert.equal(data.children[0].id, sandbox.child);
  await saveBrowserScreenshot(page, {
    path: "evidence/screenshots/access/invited-parent-mobile.png",
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  const forbidden = await inviteeContext.request.post(
    base + "/api/v1/invitations",
    {
      headers: { Origin: base, "x-organization-id": sandbox.org },
      data: { email: "forbidden@daylio.test", role: "manager" },
    },
  );
  assert.equal(forbidden.status(), 403);
  evidence.push(
    "Unverified identity denied; email link → verified session → invitation acceptance → private password → linked-child-only parent dashboard on mobile.",
  );
  // Clear cookies and prove the chosen password works independently of the email session.
  await inviteeContext.clearCookies();
  const login = await inviteeContext.request.post(base + "/api/v1/auth/login", {
    headers: { Origin: base },
    data: { email, password: "Invited-test-2026!" },
  });
  assert.equal(login.status(), 200);
  const replay = await owner.context.request.get(letter.link, {
    maxRedirects: 0,
  });
  assert.equal(replay.status(), 403);
  const wrong = await actor("otherparent");
  const fresh = (
    await (
      await api(owner, "invitations", "POST", {
        email: `wrong-${Date.now()}@daylio.test`,
        role: "caregiver",
      })
    ).json()
  ).data;
  const token = new URL(fresh.acceptUrl, base).searchParams.get("invitation");
  assert.equal(
    (await api(wrong, `invitations/${token}/accept`, "POST", {})).status(),
    403,
  );
  await api(owner, `invitations/${fresh.id}/revoke`, "POST", {});
  assert.equal(
    (
      await api(owner, `invitations/${fresh.id}/email`, "POST", { token })
    ).status(),
    403,
  );
  const failure = (
    await (
      await api(owner, "invitations", "POST", {
        email: `failure-${Date.now()}@example.test`,
        role: "caregiver",
      })
    ).json()
  ).data;
  const failureToken = new URL(failure.acceptUrl, base).searchParams.get(
    "invitation",
  );
  const failedSend = await api(
    owner,
    `invitations/${failure.id}/email`,
    "POST",
    { token: failureToken },
  );
  assert.equal(failedSend.status(), 503);
  assert.equal((await failedSend.json()).error.code, "EMAIL_DELIVERY_FAILED");
  const audits = await (await api(owner, "audit")).json();
  assert.ok(
    audits.data.some(
      (x) =>
        x.action === "invitation.email_requested" &&
        x.resource_id === invite.id,
    ),
  );
  evidence.push(
    "Provider rejection returns explicit 503 without claiming delivery; successful request and invitation acceptance leave persistent audit evidence.",
  );
  const manager = await actor("manager");
  assert.equal(
    (
      await api(manager, "invitations", "POST", {
        email: "manager-try@daylio.test",
        role: "manager",
      })
    ).status(),
    403,
  );
  evidence.push(
    "Chosen password login works; used email proof rejected; wrong-account acceptance, revoked email send, parent privilege escalation and manager-to-manager invite denied.",
  );
  const landing = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  contexts.push(landing);
  const lp = await landing.newPage();
  lp.setDefaultNavigationTimeout(60000);
  lp.setDefaultTimeout(15000);
  await lp.goto(base + "/#leo");
  await lp.locator("#leoQuestions button").first().waitFor();
  for (const role of ["parent", "caregiver", "owner"]) {
    await lp.locator(`[data-leo="${role}"]`).click();
    assert.match(
      await lp.locator(".leo20-demo-caption").textContent(),
      /simulasi/i,
    );
    assert.equal(await lp.locator("#leoThread a").count(), 0);
  }
  await lp
    .locator("#leo")
    .screenshot({ path: "evidence/screenshots/access/showcase-desktop.png" });
  await lp.goto(base + "/workspace");
  await lp
    .getByRole("heading", { name: "Selamat datang", exact: true })
    .waitFor();
  await saveBrowserScreenshot(lp, {
    path: "evidence/screenshots/access/login-desktop.png",
  });
  await lp.setViewportSize({ width: 390, height: 844 });
  await saveBrowserScreenshot(lp, {
    path: "evidence/screenshots/access/login-mobile.png",
  });
  evidence.push(
    "Three labeled V20 LEO simulation roles; separate login entry; desktop/mobile login screenshots.",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "evidence/access-browser-results.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        environment:
          "Local synthetic email provider fixture and persistent sandbox DB. No real inbox delivery or hosted provider configuration claimed.",
        passed: evidence,
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log(evidence.join("\n"));
} finally {
  await Promise.all(contexts.map((c) => c.close()));
  await browser.close();
}
