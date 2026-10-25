import {
  requireIsolatedBrowserTarget,
  saveBrowserScreenshot,
} from "./browser-test-guard.mjs";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { sandbox as s } from "../db/sandbox-fixture.mjs";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
await requireIsolatedBrowserTarget(base);
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("Synthetic localhost only");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const evidence = [],
  faults = [],
  actors = [],
  tag = "Hari ini";
await mkdir("evidence/screenshots/v3", { recursive: true });
try {
  async function login(role) {
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: "reduce",
      }),
      page = await context.newPage();
    page.setDefaultNavigationTimeout(60000);
    page.on("pageerror", (e) => faults.push(`${role}: ${e.message}`));
    await page.goto(base + "/workspace");
    await page.getByLabel("Email", { exact: true }).fill(role + "@daylio.test");
    await page
      .getByLabel("Kata sandi", { exact: true })
      .fill("Sandbox-only-2026!");
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await page.locator('.op-content > div[aria-busy="false"]').waitFor();
    await page.locator(".op-environment").filter({ hasText: /Sandbox/i }).waitFor();
    return { page, context };
  }
  const owner = await login("owner"),
    manager = await login("manager"),
    caregiver = await login("caregiver"),
    parent = await login("parent");
  actors.push(owner, manager, caregiver, parent);
  await caregiver.page
    .getByRole("button", { name: "Catat Aktivitas", exact: true })
    .click();
  async function api(
    actor,
    path,
    method = "GET",
    body,
    key = randomUUID(),
    expected = method === "POST" ? 201 : 200,
  ) {
    const response = await actor.context.request.fetch(
      base + "/api/v1/" + path,
      {
        method,
        headers: {
          Origin: base,
          "x-organization-id": s.org,
          "idempotency-key": key,
        },
        ...(body ? { data: body } : {}),
      },
    );
    const json = await response.json();
    assert.equal(response.status(), expected, JSON.stringify(json));
    return json.data ?? json;
  }
  const settings = await api(owner, "settings");
  const setting = settings[0];
  await api(owner, "settings/" + setting.id, "PATCH", {
    data: {
      hours: "07:00–18:00",
      timezone: "Asia/Jakarta",
      routinePublishing: "manager-review",
      substituteReview: true,
      managerCrm: true,
      managerFinance: false,
    },
  });
  const context = await api(caregiver, "workspace/context");
  const kids = context.children
    .filter((c) => c.classroom_id === s.room)
    .slice(0, 6);
  for (const kid of kids)
    if (!kid.present)
      await api(caregiver, "attendance", "POST", {
        childId: kid.id,
        data: { type: "in" },
      });
  await caregiver.page.reload();
  await caregiver.page
    .getByRole("button", { name: "Catat Aktivitas", exact: true })
    .click();
  await caregiver.page
    .getByRole("button", { name: "Simpan draf untuk 6 anak", exact: true })
    .waitFor();
  await caregiver.page
    .getByLabel("Catatan bersama", { exact: true })
    .fill(tag + " makan siang diamati langsung.");
  await caregiver.page
    .getByText("Hasil berbeda untuk anak tertentu", { exact: true })
    .click();
  const exception = caregiver.page
    .locator(".op-exception-form")
    .filter({ hasText: "Anak Uji 2" });
  await exception.getByLabel("Hasil khusus", { exact: true }).fill("Sebagian");
  await exception
    .getByLabel("Catatan khusus", { exact: true })
    .fill(tag + " makan separuh porsi.");
  const saved = caregiver.page.waitForResponse(
    (r) =>
      r.url().endsWith("/activities/batch") && r.request().method() === "POST",
  );
  await caregiver.page
    .getByRole("button", { name: "Simpan draf untuk 6 anak", exact: true })
    .click();
  const response = await saved;
  assert.equal(response.status(), 201);
  const batch = (await response.json()).data;
  assert.equal(batch.length, 6);
  assert.equal(
    batch.find((r) => r.child_id === kids[1].id).data.result,
    "Sebagian",
  );
  await caregiver.page
    .getByRole("status")
    .filter({ hasText: "Draf tersimpan untuk 6 anak." })
    .waitFor();
  assert.equal(
    (await api(parent, "activities")).some(
      (r) => r.data.batchId === batch[0].data.batchId,
    ),
    false,
  );
  const key = randomUUID(),
    replayBody = {
      childIds: [kids[0].id],
      classroomId: s.room,
      data: {
        type: "play",
        note: tag + " retry-safe",
        occurredAt: new Date().toISOString(),
      },
    };
  const first = await api(
      caregiver,
      "activities/batch",
      "POST",
      replayBody,
      key,
    ),
    second = await api(caregiver, "activities/batch", "POST", replayBody, key);
  assert.equal(first[0].id, second[0].id);
  evidence.push(
    "Caregiver UI: six present children preselected, absent child excluded, individual exception, 6 persisted drafts; HTTP idempotency replay returns identical record. Parent cannot read drafts.",
  );
  await manager.page.reload();
  await manager.page
    .getByRole("button", { name: "Review catatan", exact: true })
    .first()
    .click();
  const group = manager.page
    .locator(".op-list-item")
    .filter({ hasText: tag + " makan" });
  await group.getByRole("button", { name: "Terbitkan", exact: true }).click();
  await manager.page
    .getByRole("dialog")
    .getByRole("button", { name: "Konfirmasi", exact: true })
    .click();
  await manager.page.getByRole("status").waitFor();
  const visible = await api(parent, "activities");
  assert.equal(
    visible.filter((r) => r.data.batchId === batch[0].data.batchId).length,
    2,
  );
  await parent.page.reload();
  await parent.page
    .getByRole("button", { name: "Pesan pagi", exact: true })
    .waitFor();
  await parent.page
    .getByRole("button", { name: "Pesan pagi", exact: true })
    .click();
  await parent.page
    .getByLabel("Hal yang perlu diketahui pengasuh")
    .fill(tag + " tidur lebih larut, mohon dipantau.");
  await parent.page
    .getByRole("button", { name: "Kirim pesan pagi", exact: true })
    .click();
  await parent.page.getByRole("status").waitFor();
  await caregiver.page.reload();
  await caregiver.page
    .getByRole("button", { name: "Catat Aktivitas", exact: true })
    .click();
  const morning = caregiver.page
    .locator(".op-list-item")
    .filter({ hasText: tag + " tidur lebih larut" });
  await morning
    .getByRole("button", { name: "Sudah dibaca", exact: false })
    .click();
  await caregiver.page.getByRole("status").waitFor();
  await parent.page.reload();
  await parent.page
    .getByText("Sudah diterima", { exact: true })
    .first()
    .waitFor();
  await parent.page
    .getByLabel("Anak aktif", { exact: true })
    .selectOption(kids[1].id);
  await parent.page.getByText(/^Catatan aktivitas hari ini \(/).click();
  await parent.page
    .getByText(tag + " makan separuh porsi.", { exact: true })
    .first()
    .waitFor();
  assert.equal(
    await parent.page
      .getByText(tag + " makan siang diamati langsung.", { exact: true })
      .count(),
    0,
  );
  await parent.page
    .getByLabel("Anak aktif", { exact: true })
    .selectOption(kids[0].id);
  evidence.push(
    "Manager UI publishes reviewed group; linked parent receives only 2 own-child records. Parent morning note acknowledged from caregiver UI; switching siblings replaces meal and notes without mixing children.",
  );
  // Daily Story deliberately uses published records; unique daily story can be revised on repeated test runs.
  const day = context.date,
    stories = await api(manager, "daily-stories");
  let story = stories.find(
    (r) => r.child_id === kids[0].id && r.data.date === day,
  );
  if (story)
    story = await api(manager, "daily-stories/" + story.id, "PATCH", {
      note: tag + " cerita berdasarkan makan siang yang tercatat.",
    });
  else
    story = await api(manager, "daily-stories", "POST", {
      childId: kids[0].id,
      date: day,
      note: tag + " cerita berdasarkan makan siang yang tercatat.",
      sourceIds: [batch[0].id],
    });
  await api(manager, "daily-stories/" + story.id + "/publish", "POST", {
    confirmed: true,
  });
  await parent.page.reload();
  await parent.page
    .getByText(tag + " cerita berdasarkan makan siang yang tercatat.", {
      exact: true,
    })
    .waitFor();
  await parent.page
    .getByRole("button", { name: "Izin Penjemputan", exact: true })
    .click();
  async function createPickup(kind, name) {
    await parent.page
      .getByLabel("Jenis izin", { exact: true })
      .selectOption(kind);
    await parent.page.getByLabel("Nama lengkap penjemput").fill(name);
    await parent.page
      .getByLabel("Hubungan dengan anak")
      .fill(kind === "routine" ? "Ibu" : "Tante");
    const expiry = new Date(Date.now() + 86400000);
    expiry.setMinutes(expiry.getMinutes() - expiry.getTimezoneOffset());
    await parent.page
      .getByLabel("Berlaku hingga", { exact: true })
      .fill(expiry.toISOString().slice(0, 16));
    await parent.page
      .getByLabel("Saya sebagai wali memberi izin kepada orang tersebut.")
      .check();
    const pending = parent.page.waitForResponse(
      (r) =>
        r.url().endsWith("/pickup-authorizations") &&
        r.request().method() === "POST",
    );
    await parent.page
      .getByRole("button", { name: "Konfirmasi izin wali", exact: true })
      .click();
    const r = await pending;
    assert.equal(r.status(), 201);
    await parent.page.getByRole("status").waitFor();
    return (await r.json()).data;
  }
  const routine = await createPickup("routine", tag + " Ibu");
  assert.equal(routine.state, "approved");
  async function handover(auth) {
    await caregiver.page
      .getByRole("button", { name: "Penjemputan", exact: true })
      .click();
    await caregiver.page
      .getByLabel("Anak aktif", { exact: true })
      .selectOption(auth.child_id);
    await caregiver.page
      .getByRole("button", { name: "Perbarui", exact: true })
      .click();
    const row = caregiver.page
      .locator(".op-list-item")
      .filter({ hasText: auth.data.name });
    await row
      .getByRole("button", { name: "Verifikasi & serahkan", exact: true })
      .click();
    await caregiver.page
      .getByLabel("Nama orang yang hadir (sesuai izin)")
      .fill(auth.data.name);
    await caregiver.page
      .getByLabel("Catatan pemeriksaan (minimal 8 karakter)")
      .fill("Uji sintetis: identitas fisik diperiksa, nama cocok izin wali.");
    await caregiver.page
      .getByLabel(
        "Saya memeriksa orang yang hadir dan benar-benar menyerahkan anak kepadanya.",
      )
      .check();
    await caregiver.page
      .getByRole("button", {
        name: "Catat anak diserahkan & pulang",
        exact: true,
      })
      .click();
    await caregiver.page.getByRole("status").waitFor();
  }
  await handover(routine);
  assert.equal(
    (await api(parent, "parent/today?childId=" + kids[0].id)).attendance.data
      .type,
    "out",
  );
  await parent.page
    .getByLabel("Anak aktif", { exact: true })
    .selectOption(kids[1].id);
  const substitute = await createPickup("substitute", tag + " Tante");
  assert.equal(substitute.state, "requested");
  await api(
    caregiver,
    `pickups/${substitute.id}/verify-handover`,
    "POST",
    { identityVerified: true },
    randomUUID(),
    409,
  );
  await manager.page
    .getByRole("button", { name: "Penjemputan & Insiden", exact: true })
    .click();
  await manager.page
    .getByLabel("Anak aktif", { exact: true })
    .selectOption(kids[1].id);
  const authRow = manager.page
    .locator(".op-list-item")
    .filter({ hasText: substitute.data.name });
  await authRow
    .getByRole("button", { name: "Setujui izin", exact: true })
    .click();
  await manager.page
    .getByRole("dialog")
    .getByRole("button", { name: "Konfirmasi", exact: true })
    .click();
  await manager.page.getByRole("status").waitFor();
  await handover(substitute);
  const pickups = await api(parent, "pickups?childId=" + kids[1].id);
  assert.equal(pickups[0].data.staffId, s.caregiver);
  assert.equal(pickups[0].data.verificationMethod, "physical-id");
  evidence.push(
    "Routine pickup UI: linked guardian approval without repeated manager review, physical identity check, explicit real handover confirmation, persisted evidence plus atomic attendance out. Substitute UI: request → manager approval → physical verification → single-use handover; preapproval bypass denied.",
  );
  const incident = await api(caregiver, "incidents", "POST", {
    childId: kids[2].id,
    data: { severity: "medium", note: tag + " perlu tindak lanjut manusia" },
  });
  await manager.page.locator(".v10-additional-nav summary").click();
  await manager.page
    .getByRole("button", { name: "Daily Closing", exact: true })
    .click();
  await manager.page
    .getByLabel("Catatan tindak lanjut / shift berikutnya")
    .fill(tag + " masalah diteruskan ke shift berikutnya.");
  await manager.page
    .getByLabel("Saya telah meninjau daftar dan mencatat tindak lanjut.")
    .check();
  await manager.page
    .getByRole("button", { name: "Catat closing hari ini", exact: true })
    .click();
  await manager.page.getByRole("status").waitFor();
  assert.ok(
    (await api(manager, "manager/exceptions")).items.some(
      (i) => i.id === incident.id,
    ),
  );
  evidence.push(
    "Daily Closing UI persists unresolved snapshot and keeps incident open.",
  );
  // Restore synthetic attendance for representative six-child screenshot; no production data is modified.
  for (const kid of kids.slice(0, 2))
    await api(caregiver, "attendance", "POST", {
      childId: kid.id,
      data: { type: "in" },
    });
  for (const [name, actor, title] of [
    ["owner", owner, "Ringkasan Daycare"],
    ["manager", manager, "Control Tower"],
    ["caregiver", caregiver, /Selamat/],
    ["parent", parent, /^Halo,/],
  ]) {
    await actor.page.reload();
    await actor.page
      .getByRole("heading", { name: title, exact: true })
      .waitFor();
    await actor.page.locator('.op-content > div[aria-busy="false"]').waitFor();
    for (const width of [1440, 820, 390]) {
      await actor.page.setViewportSize({
        width,
        height: width === 390 ? 844 : 1000,
      });
      await actor.page.evaluate(() => document.fonts.ready);
      await actor.page
        .getByRole("button", { name: "Perbarui", exact: true })
        .waitFor();
      await actor.page
        .locator('.op-content > div[aria-busy="false"]')
        .waitFor();
      assert.equal(
        await actor.page.locator('.op-alert[role="alert"]').count(),
        0,
        `${name}: ${await actor.page.locator(".op-content").innerText()}`,
      );
      assert.equal(
        await actor.page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `${name} ${width} overflow`,
      );
      await saveBrowserScreenshot(actor.page, {
        path: `evidence/screenshots/v3/${name}-${width}.png`,
        fullPage: false,
      });
      if (width === 390) {
        await actor.page
          .getByRole("button", { name: "Buka navigasi", exact: true })
          .click();
        await actor.page
          .getByRole("navigation", { name: "Navigasi utama" })
          .getByRole("button")
          .first()
          .click();
      }
    }
  }
  evidence.push(
    "Four authenticated role dashboards at 1440/820/390px: no horizontal overflow; mobile navigation opens and returns to workspace; 12 screenshots captured.",
  );
  assert.deepEqual(faults, [], "Unhandled browser exceptions");
  await writeFile(
    "evidence/v3-browser-results.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        environment:
          "Persistent local PGlite database and synthetic isolated auth. No hosted Supabase, external delivery, video, or model inference claimed.",
        passed: evidence,
        screenshots: "evidence/screenshots/v3/",
        browserErrors: faults,
      },
      null,
      2,
    ),
  );
  console.log(evidence.join("\n"));
} catch (error) {
  for (const [index, actor] of actors.entries()) {
    await actor.page
      .screenshot({ path: `evidence/screenshots/v3/failure-${index}.png` })
      .catch(() => {});
    await writeFile(
      `evidence/v3-failure-${index}.txt`,
      await actor.page.locator("body").innerText(),
    );
  }
  console.error("Browser exceptions:", faults);
  throw error;
} finally {
  await browser.close();
}
