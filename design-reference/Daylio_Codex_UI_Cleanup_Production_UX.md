# DAYLIO — CODEX CORRECTIVE MASTER PROMPT: CLEAN DATA + PREMIUM APPLICATION UX

You are the lead product engineer and senior UX/UI engineer working in the **existing** repository `abitiyoso/daylio`. The user-approved experience is already in `design-reference/Daylio_Backend_v3/`; use the supplied desktop/mobile screenshots, HTML/CSS reference, UX review and decision log. **Do not create another app, replace the database, restart F01–F42, or redesign the v4 marketing homepage.** Do not modify the original Elenio logo.

## Read before modifying

1. Confirm current branch and working tree. The updated Daylio operational UI is on `codex/backend-v3-workflows`; `master` may still have the earlier generic workspace. Do not accidentally overwrite or work on the wrong branch. Avoid destructive git operations.
2. Inspect `app/workspace/operations.tsx`, `app/workspace/operations.css`, `app/workspace/page.tsx`, `scripts/browser-v3-test.mjs`, `scripts/browser-v3-business-test.mjs`, `scripts/browser-test.mjs`, `db/sandbox-fixture.mjs`, `scripts/dev-sandbox.mjs`, `README.md`, `IMPLEMENTATION_STATUS.md`, and the `design-reference/` assets.
3. Audit database/model, private media authorization and existing `api/v1` routes. Reuse the current Next.js + PostgreSQL/RLS + Supabase Auth boundaries. Preserve business functionality and test contracts.

## URGENT P0 — Stop contaminating the demo with automated QA data

Observed defects: parent UI repeatedly displays `V3 179...` or `P1 179...` identifiers in stories and morning notes; activity photos show solid pink blocks. Root cause is developer tests writing into **persisted** `data/sandbox`, not user-facing content design. In `scripts/browser-v3-test.mjs`, `tag = "V3 " + Date.now()` is written as a note; `scripts/browser-v3-business-test.mjs` similarly uses `P1`. `scripts/browser-test.mjs` uploads a 100x100 solid `#f57f91` photo and publishes it as an activity image. These should never appear in the normal parent demo.

Required correction:
- Isolate automated UI/API test data from the showcase or manually explored sandbox. Prefer separate ephemeral database/media directory and test tenant per test run, with safe teardown even on failure. Never run destructive cleanup against real/hosted tenant data. Add guards that disallow test/reset operations outside explicit local sandbox.
- Provide a safe, opt-in *local sandbox only* reset/reseed command for existing contaminated demo fixtures; never reset on application startup or delete real users' data. Back up if applicable and report exactly what is reset.
- Create a small, consistent, **fictional** showcase dataset for each role. Synthetic realistic Indonesian names, ages, daycare services, caregiver notes, guardian relationships, inbound prospective inquiries, tour bookings, approved growth observations, routine/substitute pickup states and followups. Keep data internally coherent; no duplicate morning notes or repeated stale stories.
- Replace pink QA swatch in showcase with properly licensed non-sensitive daycare photography or clearly labeled photographic example media. Keep QA-only color swatches inside ephemeral test tenants. Preserve private media permissions and consent gating. Never generate or invent CCTV evidence or claim AI identified a person.
- Use deterministic test identifiers in logs/test-only metadata, not copy shown to users. Don't merely strip `V3` with string.replace; fix data creation and data lifecycle. For *previous* contaminated sandbox records, only reset isolated sandbox safely after verification.
- Avoid repeated/irrelevant old entries on today's Parent Home. Group historical messages, cap initial list to relevant latest records, offer `Lihat semua`, pagination and meaningful chronological ordering. No dummy timestamps in live UI.

## P0 — Elevate visual quality and information hierarchy

Current app UI is too small and resembles a developer admin test harness rather than the polished, warm, premium Daylio v3 design reference.
- Use the **approved** `design-reference/Daylio_Backend_v3` as the visual source of truth. Match desktop and mobile hierarchy, spacing, navigation, parent emotional tone and CTA placement. Do not replace the marketing landing page v4.
- Fix base typography: currently `operations.css` uses 13px overall and numerous labels 9–11px. Set body copy around 15–16px on desktop/mobile, supporting text about 13–14px, accessible 16px+ form fields; avoid tiny 9px labels and micro badges. Maintain clear WCAG-conscious contrast and touch targets (~44px).
- Use consistent restrained design tokens: warm cream/white, navy heading, coral main actions, teal positive actions; no rainbow cards, excessive borders, noisy badges or generic table-first screens.
- Clarify information density: one headline, one human-readable summary, 1–2 primary actions per card. Improve card alignment, readable whitespace, skeleton/loading, helpful empty states and responsive stacking. Prioritize usability, not decoration.
- Parent My Child Today should feel like a personal family product, not a business ERP: child identity/profile header, today's status, meaningful highlights, clean photo gallery, approved Daily Story, pickup status and morning message acknowledgment. Use actual scoped data. Place repeated/historical content behind expansion or dedicated history screens.
- Daily Story should show natural, human reviewed narrative + source date/time, not developer IDs. Safe truncation for long text; ensure no corrupted internal UUIDs or `V3/P1` tags leak into user-visible strings.
- Remove raw developer/test labels, timestamps, fixture IDs and technical source metadata from normal user-facing content. Keep **one small sandbox environment badge** where needed so dev data is never confused with real customer data. Do not hide integration limitations by claiming features are live.
- Test 1440/820/390 viewport with real browser screenshots; check content, fonts, crop, scrolling and action targets. No horizontal overflow, overlapping controls, fake photo placeholders or photos covering faces.

## Preserve and refine role-specific UX

- Owner: Business Pulse with capacity/occupancy, today's operational exceptions, CRM leads/tours/renewal and drill-down actions.
- Manager: Control Tower driven by exceptions, not a long static dashboard; grouped review and daily closing with no false safety guarantee.
- Caregiver: present-child classroom-first Quick Care, select all + individual exceptions, batch submit, grouped review where required. No duplicate per-child form entry for routine activities.
- Parent: My Child Today, one Daily Story digest, scoped photos, care passport, growth report, morning handover status, routine/substitute pickup, child-scoped LEO.
- Platform admin: platform operations only, no routine access to child/media data.

## Preserve core workflows and backend invariants

- Multi-tenant RLS, role checks, guardian-child links, caregiver assignments, media consent, signed photo grants, audit logs, existing idempotency, and all related negative-authorization tests MUST remain intact.
- No test-sandbox sample data, fake customer facts or fake LEO answers in production.
- Pickup: routine approved pickup without repeated manager approval; substitute requires active guardian authorization + applicable manager review + human identity verification. Audit the actual handover and never manufacture CCTV evidence.
- Development reports rely on reviewed observations, not meal/sleep logs being interpreted as development milestones.
- CRM WhatsApp remains human initiated/draft-only until an official provider integration is configured.
- **CCTV & Video Analytics are deferred**. Preserve shell/adapter and security boundaries for later reuse of existing Elenio backend. Do not rebuild a gateway, RTSP/ONVIF client, VMS or analytics engine.
- External LEO model runtime is not verified; use authorized deterministic sourced facts when appropriate. Do not claim AI provider integration has happened.
- Do not silently amend real historical records, defeat audit trails or change old migrations. Only additive safe migrations if absolutely necessary.

## Required acceptance tests and delivery

1. Fresh local sandbox with curated demo records: Parent Home has natural activities and consistent morning messages, no visible `V3`, `P1`, random IDs, and no solid pink QA photo (except intentionally isolated QA environment). Automated tests must not pollute showcase on subsequent runs.
2. Caregiver logs a meal for 6 present children with 1 individual exception; manager reviews according to policy; parent sees exactly the authorized child's approved record and a clean daily digest.
3. Parent submits a morning handover note; caregiver acknowledges; parent sees one coherent latest status, not stale duplicates.
4. Test both pickup paths, expired authorization denial and audit evidence; no generated/imaginary CCTV frames.
5. Owner and manager dashboards reflect persisted scoped data; cross-daycare and sibling access denial still pass.
6. Screenshot comparison against the approved `design-reference/Daylio_Backend_v3` desktop/mobile references. **Actually inspect** the screenshots, not just assert no overflow. Parent photo gallery, fonts, story layout and card hierarchy require manual visual review.
7. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, plus browser regression tests. Save screenshots and results. If test isolation requires updated commands, document them and prove repeated test runs no longer contaminate the showcase.
8. Update `IMPLEMENTATION_STATUS.md`, record modified files, pass/fail outcomes and any blockers. Clearly separate LOCAL VERIFIED from PROVIDER/PRODUCTION VERIFIED.

## Execution order

A. Inspect branch and affected code; establish baseline screenshots. B. Fix test data isolation + safe clean demo sandbox. C. Repair parent My Child Today/Story/gallery and typography globally. D. Polish owner/manager/caregiver screens and responsiveness, preserving flows. E. Run all tests, capture before/after screenshots and report remaining differences. **Do not stop after a plan. Implement, run, iterate and show visual results.**
