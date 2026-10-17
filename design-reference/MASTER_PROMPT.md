# DAYLIO BY ELENIO — CODEX MASTER IMPLEMENTATION PROMPT

**Execution target:** existing GitHub repository `https://github.com/abitiyoso/daylio`, branch from its current default branch; use a feature branch / PR.  
**Visual and interaction target:** `Daylio_Backend_v3/` in the accompanying design package, its `index.html`, `styles.css`, `app.js`, `UX_REVIEW.md`, `CODEX_HANDOFF.md`, and supplied desktop/mobile screenshots.  
**Public website baseline:** existing Daylio v4 marketing page in the repository; DO NOT redesign it.  
**Language:** user-facing interface in natural Bahasa Indonesia; code, technical documentation and tests may be English.  
**Goal:** turn the approved Backend v3 UX into real server-backed workflows on top of the **existing** Daylio application. **Do not start another app, duplicate the backend, or port the demo's fake storage into production.**

## 0. MISSION AND NON-NEGOTIABLE RULES

Act as a senior product engineer, UX lead, backend engineer, security reviewer, and QA owner. You are implementing a commercial multi-tenant daycare product for Indonesia, bought by daycare owners and used every day by managers, caregivers and authorized parents/guardians. Daylio's differentiator is less administrative effort for caregivers, reliable information for parents, and actionable business/operational insights for owners.

1. **Existing code is the baseline, not a blank slate.** Audit the exact current repository before making edits. Current observed stack: Next.js 16 App Router, React 19, TypeScript, PostgreSQL + row-level security, Supabase Auth integration boundary, `/api/v1`, existing tests. Reconfirm these facts against HEAD; don't blindly follow outdated specs. Follow `AGENTS.md` and relevant installed Next.js docs, especially version-specific conventions.
2. **Preserve what already works.** Do not rebuild auth, multi-tenancy, RLS, database, media pipeline, CRM, `activities/batch`, pickup workflows, notifications, analytics APIs, or F01–F42 capabilities merely to get new screens. Reuse/refactor existing services and routes, extending only when the v3 workflows require it. Avoid destructive schema rewrites or data loss; add additive, reversible migrations when possible.
3. **Freeze branding.** Preserve the Daylio v4 marketing website and its layout/visual identity. For authenticated UI, faithfully translate Backend v3's warm-white/coral/teal/navy, typography, composition, hierarchy, spacing, card/table design, role-specific navigation, and micro-interactions. Never alter, redraw, recolor or substitute the official Elenio logo. Prefer the repository's approved original brand file and byte-identical asset; its last locally reported SHA256 was `f52cf4a53e361f65f26d2db29049b8747b0a7497b349a805bea1ed47355b0538`; verify rather than forcing any replacement.
4. **Prototype is a design contract, not source of truth for data/security.** `Daylio_Backend_v3/` stores fictitious sample data in `localStorage`; role changes are simulated. Never copy its `localStorage`, fake caregiver identities, fabricated AI answers, fake CCTV thumbnails/evidence, mock payments, or pseudo role switch into production routes. Use authenticated API data and server-side permissions. Development fixtures remain clearly isolated and never migrate into real tenants.
5. **CCTV and Video Analytics INTEGRATION ARE NEXT PHASE, NOT THIS TASK.** Elenio already operates its own camera management, RTSP/ONVIF gateway, streaming backend and Video Analytics at/behind `demo.elenio.id`. **Do NOT create** a new gateway, RTSP ingest, ONVIF discovery, streaming/player backend, analytics engine, face-recognition system, or guessed Elenio endpoints. Maintain/prepare secure Daylio UX modules and adapter contracts only. Existing `lib/elenio.mjs` must fail closed until verified API credentials/contracts exist. Child privacy and consent are prerequisites to future viewing. Avoid fake claims of connected footage.
6. **External WhatsApp API, payment gateway and external LEO LLM are not presumed available.** Phase 1 supports CRM data, explicit click-to-WhatsApp or copyable staff-approved draft, manual verified payment, and existing verified-records LEO. Integrate external providers only when actual credentials and contracts are supplied in approved environment secrets. Never scrape personal WhatsApp or represent a prepared message as delivered.
7. **No imaginary success.** Do not say a workflow is complete based only on rendering a page. Completion means a user can execute it through real authenticated API, persisted database, enforced policies, applicable audit, responsive UI, and passing tests. Distinguish local verification from externally validated production readiness.
8. **Human-in-the-loop for childcare/safety.** AI may draft narratives and surface facts but never certify a person, diagnose a child, automatically authorize pickup, automatically close incidents, or invent an activity. Staff verify identity in person and confirm actual handover.

## 1. REQUIRED REPOSITORY DISCOVERY — BEFORE CHANGES

Read these existing files in full or relevant portions:
- `AGENTS.md`, `README.md`, `IMPLEMENTATION_STATUS.md`, `FUNCTIONAL_BACKEND_MATRIX.md`, `DATA_MODEL_ACCESS_CONTROL.md`, `DAYLIO_API_REFERENCE.md`, `ELENIO_API_DISCOVERY.md`, `docs/ARCHITECTURE.md`, `docs/OPERATIONS.md`, `docs/openapi.json`, `package.json`, `docs/P2_MILESTONES.md`.
- `app/workspace/page.tsx`, `app/workspace/workspace.css`, `app/platform/page.tsx`, `app/page.tsx`, `app/api/v1/**`, `lib/service.mjs`, `lib/elenio.mjs`, relevant auth/permission/media modules, `db/migrations/**` and existing test files.
- Attached `Daylio_Backend_v3/README.md`, `UX_REVIEW.md`, `CODEX_HANDOFF.md`, `app.js`, `styles.css`, and screenshots. Do not treat the demo's JS business rules as secure implementations.

Produce `docs/DAYLIO_V3_GAP_ANALYSIS.md` with a table for every change: **v3 UX / existing UI / existing API / DB/policy / missing behavior / risk / priority / verification plan**. Map changes back to F01–F42; add explicit IDs for v3-only enhancements. Record what is **already done and proven** so it is not rewritten. Verify git status before changes and preserve unrelated user work.

Report a short plan, then **proceed to implementation** without stopping at analysis. Do not require approval unless action is destructive, needs new credentials, or changes production data.

## 2. FINAL INFORMATION ARCHITECTURE AND ROLE-BASED NAVIGATION

Do not return to generic `Ringkasan / Anak / Prospek / Lainnya` as the primary navigation. Navigation is different by authenticated role, but shared domain state and APIs remain consistent.

**Owner:** Business Pulse; CRM & WhatsApp; Children & Families; Daily Operations; Rapor & Development; Parent Experience; Finance & Billing; LEO Copilot; CCTV & Analytics (future integration shell); Settings. Key value above the fold: usable capacity/occupancy by class, relevant leads to follow up, report coverage, unresolved safety/operational issues, recent family communications and finance items.

**Manager:** Operations Control Tower; Today / Daily Care; Children & Care Plans; Staff & Shifts; Pickup & Safety; Development & Rapor; Parent Communication; Daily Closing; LEO Operations. Show an actionable exception queue; don't require manual manager approval of every routine record unless configurable daycare policy mandates it.

**Caregiver:** Hari Ini; Catat Aktivitas; Anak Asuhan; Handover & Pesan; Observasi Anak; Penjemputan/Insiden when authorized. Default view = **current assigned classroom/shift and present children**, with prominent one-tap/two-tap care actions, not generic CRUD forms.

**Parent/Guardian:** Beranda Anakku / My Child Today; Daily Story; Growth Journey / Rapor; Pesan Daycare; Penjemputan; Tanya LEO; Profil & Izin; authorized CCTV (future shell). The parent must see **only linked children**, including when changing URL/IDs, accessing images or asking AI.

**Platform Admin Elenio:** separate route `/platform` for tenant/subscription/system health/demo inquiries/audited support; never ordinary access to private child records or camera footage. Do not expose `/platform` as a menu/action to unauthorized users.

Use UX labels that are understandable to daycare staff and parents, not endpoint names, database UUIDs or technical role codes. Preserve child/tenant switch where relevant. Keep role-specific routes protected even if sidebar links are hidden. Owner and Manager can share components but must not silently have identical permissions.

## 3. P0 — CAREGIVER QUICK CARE: CLASSROOM-FIRST, BATCH-FIRST, EXCEPTION-BASED

This is the top UX differentiator. **A caregiver must not open eight child profiles to record one shared meal/activity.**

Sequence:
1. Authenticate caregiver and resolve currently assigned classrooms/shift server-side.
2. Open `Hari Ini`: select class; show today's **present and assigned children preselected**. Absent, checked-out, unassigned and unauthorized children MUST NOT be preselected or recorded implicitly.
3. Quick actions: `Makan`, `Tidur`, `Bermain`, `Belajar`, `Kebersihan`, `Catatan`; useful sub-options for each (e.g. meal result Habis/Sebagian/Tidak makan, sleep start/end/duration; optional short free text).
4. Choose common activity/result and time once. Optional **per-child exception** edits via clear inline selector. Only those children selected actually participated; offer deselect all/individual and confirm count.
5. Single `Simpan X Catatan` calls existing `POST /api/v1/...activities/batch` (verify actual route) or extends its existing service safely. Create **one distinct persisted activity per selected child**, with shared batch correlation ID, actor, timestamp and per-child result/notes. On timeout/retry, ensure idempotency and no duplicate notes. For error, do not falsely show success; preserve entered input for safe retry.
6. Caregiver can review/change drafts they own per policy. Grouped review/publish flow should avoid repetitive approvals; manager can review group and publish together **when policy requires**. If owner config allows trusted caregivers to publish routine updates, implement safe staff publishing with exception-based manager checks. Published changes are audited/versioned. Parents can NEVER read drafts or other children's records.
7. Optional photo attaches to authorized children individually with guardian media consent. Group photo needs permission evaluation for all depicted children; don't leak unconsented child's face through another child's gallery.
8. Use clear success/partial-failure feedback, easy undo/correction where appropriate (audited), touch targets ~44 px, no repeated typed child IDs. Avoid duplicate push per child/activity; send bundled appropriate parent updates.

Provide a tested user journey: 6 present toddler children, 1 absent, 1 result override (Rafael: `Sebagian`), save exactly 6 distinct records, manager/authorized staff publish once, parent Alya sees only Alya's published activity. Absent/unassigned children do not receive records.

## 4. P0 — MORNING HANDOVER, CHILD CARE PASSPORT, DAILY CLOSING

**Morning arrival:** record child check-in and who handed the child over, actual timestamp, condition or special notes provided by parent (e.g. kurang tidur, meals) with restricted visibility, caregiver acknowledgment; no medical diagnosis. Make the note visible in the caregiver's assigned-child `Hari Ini`. Parent sees that it was acknowledged, not necessarily all internal staff notes.

**Child Care Passport:** authenticated profile of child, guardian(s), emergency contacts, care instructions, allergies and important restrictions, routines, class, active package, authorized pickup persons. Sensitive health/care information is read only by roles assigned to the child who need it. Parent can propose edits, but sensitive changes may require manager review; store audit/history and effective dates. Child cannot be enrolled without minimum authorized contact and emergency information; allow a tracked onboarding checklist for incompleteness.

**Daily Closing:** actionable checklist driven by real records (e.g. child still checked in, missing daily story, open incident, shift handover, pending pickup authorization). Explicit manager confirmation and audit. Do NOT close open issues, attest safety, or mark children collected merely by pressing `Closing selesai`; unresolved items persist as tracked exceptions and are handed over.

## 5. P0 — PICKUP: FAST ROUTINE vs VERIFIED SUBSTITUTE

Two different journeys with one secure audit model; do not mimic prototype checkbox-only verification.

**Routine authorized pickup**
- Guardian has previously approved stable pickup person per child. Server validates current authorization, expiry/revocation, day/branch constraints.
- Caregiver/desk staff selects child, selects authorized person, checks actual person in situ according to daycare SOP, and records actual handover.
- Capture person, authorization record, staff ID, event timestamp, verification method/confirmation, result and audit. No recurring manager approval for the same still-valid pickup permission.

**Temporary/substitute pickup**
- Verified linked guardian requests or explicitly confirms named substitute + validity window; no daycare staff self-approval as parent.
- Manager approval is conditional on configured policy. Require an actual guardian-confirmed authorization; reject unauthorized, expired or revoked requests.
- At pickup, staff physically checks identity and optional one-time code per deployed policy. A checkbox or placeholder PIN is **not sufficient**; design secure token/code server verification if used (expiration, rate limiting, one-time consumption). If unavailable, rely on documented physical ID check and authorized person list rather than claim cryptographic PIN verification.
- Confirm actual handover explicitly. Persist time, actor, pickup person, permission source, verification method, audit and any follow-up. Guard against concurrency/repeated submissions.
- **Evidence now:** factual signed audit metadata and permission records, with optional authorized staff capture (only if consent/policy exists); no synthetic photo/clip evidence.
- **Evidence later:** verified external Elenio clip/event/snapshot reference behind scoped access. Camera analytics/face recognition do not decide pickup authorization or prove identity.
- Parent receives only their child's pickup completion and high-level evidence/status, not arbitrary surveillance footage or another family's data.

## 6. P0/P1 — PARENT MY CHILD TODAY AND PARENT VALUE

First-screen essentials (real linked-child data only): present/checked-out status with arrival time; last published meal; sleep (only if logged); meaningful activity; latest published personal Daily Story/photos where consent; pickup authorization/status; caregiver/manager messages; relevant next steps. Show `Belum tercatat` where there is no record; do not fill blanks using predictions or canned text. If parent has two authorized children, switch them explicitly without cross-contamination.

**Home → Daycare morning note:** parent shares simple contextual note; staff acknowledges and optionally responds. Handle sensitive info with minimal storage, role-scoped access and consent.

**Daily Story:** compiled from verified/published per-child activity entries; system may provide a ready-to-review personalized summary, not fake learning claims. Caregiver/manager can review, edit and publish. Prefer one summary notification per day and critical updates only; avoid sending push on every common classroom event.

**Growth Journey:** child-specific portfolio, photos with consent, approved observations, periodic report cards (see §7), archived reports and suggested at-home activities reviewed by educators. No AI developmental diagnosis or milestone assertion without documented observations.

**Parent trust:** clear who logged an activity and when, friendly copy, ability to ask daycare about an entry, child pickup transparency, and visible differences between documented information and unknowns. Do not create fake camera availability.

## 7. P1 — CHILD DEVELOPMENT / RAPOR

Rapor ≠ daily activity checklist. Design a **separate observation-to-report workflow**:
1. Caregiver/educator records a dated observation about a child, tagged to a defined developmental area and source evidence; respect actual age band/curriculum configured by daycare. Keep observational language rather than diagnoses.
2. Manager/responsible educator reviews, corrects, approves/rejects with audit.
3. Per-period report assembly (monthly/term configurable) draws from **approved observations**, may include selected portfolio images, educator notes and at-home suggestion.
4. LEO may draft narrative with linked source IDs/time, using verified facts only; human reviews and explicitly approves; never infer milestones from meal/sleep events alone, never diagnose.
5. Publish to authorized guardian(s) only, notify once and provide private downloadable PDF. Keep version history and sign-off.
6. Handle missing observations transparently (`Belum cukup observasi`), never manufacture report content.

Implement schema/API/UI, permission and tests for draft → review → approved → published → PDF → parent; reuse existing `records` model where appropriate, do not create dozens of duplicate entities if the existing schema handles typed records securely.

## 8. P1 — CRM + WHATSAPP + ENROLLMENT + CAPACITY

Keep and extend the existing leads/tours/trials/follow-up/enrollment services. Typical journey is `WhatsApp / referral / web inquiry → Qualification → Class & slot suitability → Tour (optional) → Trial (optional) → Package/price confirmation → Enrollment → Guardian invitation + Child Onboarding`. Tour/trial must be skippable; allow direct enrollment.

Owner/manager need:
- searchable lead inbox, contact phone, child age/desired schedule/start date, lead source, class/capacity fit, package interest and next task owner/due date;
- explicit stage changes, notes/history, human assigned follow-up and reminders;
- ability to book tour/trial without double booking, to prepare tailored reply and to generate explicit WhatsApp click-to-chat, **not claim message delivered or read**;
- optional official WhatsApp Business Platform integration **future**; no scraping, session hijack, browser automation into consumer WA;
- acceptance of enrollment with slot/capacity/price confirmed, atomic conversion into child record and guardian link/invitation, no duplicate enrollment on retry;
- occupancy and funnel metrics computed from stored capacity/enrollment/lead stage, not invented constants.

Ensure CRM and parent/child records are linked but protected: sales prospect profile does not automatically grant a parent access to a child until verified onboarding.

## 9. P0/P1 — MANAGER CONTROL TOWER, SAFETY, STAFF, OWNER BUSINESS PULSE

**Manager Control Tower:** default shows only actionable exceptions—morning notes awaiting acknowledgment, incomplete/pending daily story as defined by policy, substitute pickup requests, open incidents, staff coverage issues, unresolved shift handovers. For each item: `Buka`, contextual action, status, actor/time; not universal approval for routine logs. Incidents need human escalation, outcome and follow-up communication according to policy; never auto-close/auto-guarantee safety. Staff coverage warnings derive from configured class/caregiver ratios and actual shifts, not hardcoded universal legal standards.

**Owner Business Pulse:** real occupancy per class = active enrolled places divided by configured capacity, count of qualified leads awaiting follow-up, active tours/trials, completion of meaningful daily updates, unresolved incidents, pickup exceptions, finance status, upcoming renewals. Actions must deep-link to filtered underlying records. Support branch/date filtering. Metrics must handle missing capacity/zero denominators/partial attendance honestly.

**Finance** (preserve existing partial P2): show verified invoice state; manual payment confirmation requires actual reference, actor, amount/date, audit and an explicit confirmation. Payment gateway is **not** part of P0/P1 unless real provider is available. No magic `Mark Paid` without verified source.

## 10. LEO COPILOT — PRACTICAL AND PRIVACY-FIRST

- Preserve existing source-backed deterministic `verified-records` mode, available even without an external LLM model.
- Role tools: owner/manager sees authorized business and operational aggregates; caregiver sees assigned-child tasks only; parent sees only own linked child's **published** facts and associated report permissions.
- For every answer, include data-source/date context when meaningful, distinguish missing data from true negatives, never invent events, health diagnoses, identity, safety conclusions or conversion metrics.
- Draft WhatsApp follow-up, Daily Story, rapor narrative, and work prioritization with explicit human confirmation for any send/publish/approval; no autonomously contacting parents or changing financial/childcare records.
- Defend against prompt injection embedded in notes, uploaded text or prospect chat; retrieve scoped structured data, not unrestricted user-controlled documents. Enforce tenant/child scope server-side BEFORE building context.
- External LLM service remains optional until credentials/integration are verified. No hardcoded API keys or mock assistant text presented as AI inference.

## 11. CCTV AND ELENIO VIDEO ANALYTICS — PREPARE PLACE ONLY

Keep a clean `CCTV & Analytics` shell and pre-existing Elenio integration adapter boundary. UI may show room mapping metadata, access-policy configuration requirements and integration status but **must not pretend video is live**. Do not expose stream URLs, device credentials or identity inference. Leave secured typed contracts for future camera reference IDs, room mapping, child/guardian access policy, consent state, playback grant lifecycle and analytics-event references. No new Elenio backend functionality, network probing, credential invention, gateway, video analytics engine or stored video duplication. If there is no verified API, a clear unavailable state is correct. Mark F27–F29/F42 external portions `DEFERRED` and include future test criteria.

## 12. ROLE PERMISSIONS (MUST BE ENFORCED IN DB AND API)

- Owner: tenant-wide approved business and care management, billing, role settings, audit within own org; cannot access other tenant.
- Manager: operations/child/guardian/staff/pickup/incident/rapor review and delegated CRM as configured. Owner-only subscription, ownership, financial and security-sensitive settings protected.
- Caregiver: assigned classroom/children, routine attendance and care logs, morning handover acknowledgment, own observations, authorized actual handovers; cannot see sales, unassigned children, billing, owner settings or approve their own exceptional pickup request.
- Parent: linked children, published notes/media/reports, own messages/morning note, request pickup changes, own invoice info as approved; no staff-only incident details or other child's data.
- Platform admin: tenant metadata, system and subscription controls and explicitly scoped audited support; not blanket child/photo/CCTV viewing.
- Revoking child-link, membership, caregiver assignment or consent must remove future access at next request and invalidate signed media grants as designed; future camera grants must have matching behavior.
- All sensitive writes record who acted and when, and why for corrections/authorizations. Refuse forged organization, child and role IDs even when UI hides controls. RLS remains active under least-privileged runtime role.

**Mandatory negative tests:** other tenant owner denied; other child parent denied; caregiver unassigned child denied; parent unpublished activity denied; parent other child's photo URL denied; revoked guardian denied; revoked caregiver assignment denied; forged parent pickup denied; duplicate handover blocked; unauthenticated admin denied; improper cross-role LEO context denied.

## 13. UX QUALITY BAR AND ACCESSIBILITY

- V3 screenshots are target visual references, but optimize touch/flow further if it **reduces steps without removing safeguards**. Prefer contextual action, keyboard-friendly forms, inline validation, sensible defaults, immediate persistence feedback, and task-oriented details over generic technical CRUD.
- Keep major navigation shallow (maximum ~2 levels for key daily tasks), usable at widths 390px, 768/820px, 1440px. Minimum touch targets ~44px; no horizontal overflow; focus visible; screen-reader labels; correct empty/loading/error/retry states; accessible modal and toast behavior.
- Use stored, authorized data for all real counts and lists. In development sandbox, use visibly marked synthetic data only. On a real empty daycare account, show helpful onboarding calls-to-action instead of fictional children/leads or invented KPI.
- Preserve submitted form state on retry/navigation where practical. Avoid duplicate mutation on rapid double tap. Use Indonesian dates/timezone appropriately; store timestamps as timezone-safe UTC and format for Asia/Jakarta.
- Don't visually bury important owner or care decisions under decorative marketing elements or overcomplicated graphs. Brand photos must not cover faces; verified photos/licensing required before production.

## 14. IMPLEMENTATION PHASES — EXECUTE, TEST, DOCUMENT

**Phase 0 — Audit and guardrails (must do first):** inspect repository, F01–F42 ledger and v3 design; run baseline `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` where environment allows; document baseline results and exact paths; preserve unrelated changes. Create gap map and PR branch.

**Phase 1 — Critical care workflows (P0):** role-specific navigation/layout, classroom-first Quick Care with real `activities/batch`, safe publish/review, Parent My Child Today and linked-child restrictions, morning notes/acknowledgment, Manager exception queue and Daily Closing, two pickup journeys with secure audit. Implement missing APIs/migrations only as needed, fix existing UI gaps.

**Phase 2 — Business journeys and development (P1):** CRM WhatsApp staff workflow/optional tours/trials/capacity checks/atomic enrollment; Child Care Passport; observation/approval/rapor/PDF; owner Business Pulse and parent experience polishing; LEO role-scoped sourced summaries and human approval.

**Phase 3 — Hardening / later scope:** audit/retention, permission tests, error handling, responsive browser tests, notification bundling and accessibility; preserve existing P2 billing/subscription scope. Do not treat CCTV/Video Analytics, provider LLM, WhatsApp Business API or payments as blockers for independently functioning P0/P1 Daylio—leave their verified integration tasks documented.

**Important:** Work incrementally with working vertical slices, not all screens first and backend later. Every meaningful slice must ship UI + existing/extended API + persisted state + server permission + audit (where relevant) + tests. Do not stop after a list of TODOs; implement until available time/tooling is exhausted, then report exactly what remains.

## 15. REQUIRED TEST MATRIX / DEMONSTRATION

At minimum, automate or record evidence for:

A. **Batch care:** caregiver assigned 6 present + 1 absent → one input = exactly 6 individual records; one child exception; no absent record; idempotent retries; unauthorized child rejected; manager/authorized publisher releases them; only each child's guardian sees that child's entries; instant parent refresh across sessions.

B. **Morning handover:** parent submits note for linked child; assigned caregiver sees it; acknowledges; parent sees acknowledgment; unrelated parent/caregiver cannot read it.

C. **Routine pickup:** valid recurring authorized person; staff verification/handover; no manager reapproval; audit complete; double-tap does not double-log.

D. **Substitute pickup:** linked guardian authorizes temporary person; invalid/unverified/expired/revoked token cannot hand over; manager policy review if required; staff verifies and logs; parent receives own child status; evidence never fictional.

E. **Rapor:** observation → human approval → sourced draft → human signed report → private PDF visible to linked parent only; no auto-diagnosis, no report with invented observations.

F. **CRM:** new WhatsApp inquiry logged manually, qualification and slot match, optional tour/trial, follow-up, package confirmation, enrollment -> correct linked child + guardian invite; no duplicate on retry; WhatsApp draft not marked sent.

G. **Owner:** dashboard indicators match real DB data after actions and filter by branch/date; no hardcoded count on normal accounts; unresolved incidents/closing tasks remain open until actual resolution.

H. **LEO:** linked parent asks about documented meal and sees cited fact; absent meal returns `Belum tercatat`; caregiver and owner cannot leak prohibited role context; LLM-dependent functions degrade gracefully if no provider.

I. **Access & privacy:** two tenants, two guardians, unassigned caregiver, no cross-tenant/child read/write, revocation, signed-media expiry, audit, rate limits and misuse cases.

J. **Visual & performance:** desktop 1440px, tablet ~820px, mobile 390px screenshots for Owner/Manager/Caregiver/Parent; no overflow, broken controls, empty errors or inaccessible primary actions. Browser test real API persistence, not only localStorage.

Run existing `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, existing browser tests (`pnpm test:browser` or `node scripts/browser-test.mjs`) and add new regression tests for changed flows. Note actual Node/pnpm environment requirements from repo. Do not assert tests passed unless they did; save reproducible logs.

## 16. DELIVERABLES AND DONE CRITERIA

1. Working source changes to the **existing** `abitiyoso/daylio` repository, preferably feature branch and reviewable PR; no deployment without approval.
2. `docs/DAYLIO_V3_GAP_ANALYSIS.md` mapping v3 design to existing actual APIs and F01–F42.
3. `docs/DAYLIO_V3_WORKFLOW_MAP.md` describing state transitions and role/action ownership for Caregiver, Parent, Manager, Owner, CRM, Rapor, Pickup.
4. Database migrations and OpenAPI docs only for genuinely missing/modified domain operations; preserve existing RLS and upgrade existing services.
5. Updated `IMPLEMENTATION_STATUS.md` per feature with status `DONE LOCALLY / PARTIAL / DEFERRED / BLOCKED`, evidence and release gates, and `docs/ELENIO_INTEGRATION_NEXT.md` for deferred CCTV/Video Analytics.
6. Automated/visual test evidence and screenshots, including mobile; test account instructions for safe sandbox.
7. A concise summary in Bahasa Indonesia: **what is implemented, what reuses existing code, what's still missing, tests actually executed, and what requires my credentials/approval.**

**Definition of DONE:** I can log in as actual sandbox Owner, Manager, Caregiver and Parent, complete all P0 workflows against the same persisted database, see consistent data across the four roles, and have server-side permissions, audit and tests backing the visible interactions. Phase 1 and Phase 2 may be separately delivered; never mark later integrations or hosted production checks as completed prematurely.

**START NOW:** Audit current HEAD and v3 source; write the gap report; then implement Phase 1 in working increments with tests. Preserve the website v4 and existing functional backend. Do not ask me to restate the approved UX direction.
