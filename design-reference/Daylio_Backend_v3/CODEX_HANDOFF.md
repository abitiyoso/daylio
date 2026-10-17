# Codex Handoff — Apply Daylio Backend v3 UX Without Rebuilding Backend

Use `Daylio_Backend_v3_Interactive.html` and screenshots as the visual interaction reference. **Do not deploy the frontend demo's localStorage objects, synthetic child records, or simulated pickup/LEO outputs as production behavior.** Work in `https://github.com/abitiyoso/daylio` and inspect current code before edits.

## Required initial reads

- Existing repo `README.md`, `IMPLEMENTATION_STATUS.md`, `FUNCTIONAL_BACKEND_MATRIX.md`, `DATA_MODEL_ACCESS_CONTROL.md`, `DAYLIO_API_REFERENCE.md`, `AGENTS.md`.
- Actual `app/workspace/page.tsx`, API handlers `app/api/v1`, `lib/service.mjs`, `lib/elenio.mjs`, `db/migrations`, and workflow/browser tests.
- `UX_REVIEW.md` and source prototype `app.js` (design-only).

## Change priority

### P0. Caregiver Quick Care
- Implement mobile-first room/shift entry; list currently present/assigned children. Defaults selected, no absent children selected.
- Offer Makan, Tidur, Bermain, Kebersihan, Belajar, Catatan as quick actions. Single result/note for group; per-child result/notes override.
- Call existing `activities/batch` with only selected children, exceptions and source actor; ensure idempotency/retry safety, foreign key/assignment checks, append-only corrections.
- Group visible in UI; each child retains own record. Keep drafts and explicit human review/publish. Media attaches only to authorized children with consent.

### P0. Manager Exception Control
- Review pending family morning notes, draft care reports, temporary pickup permission, incidents, reviewed developmental observations, and handover exceptions.
- Daily closing must preserve unresolved items rather than mark safe or hide problems. No forced manual manager review for normal routine records unless daycare policy explicitly requires it.

### P0. Parent My Child Today
- Personalized child dashboard (attendance, latest *documented* meal/sleep, published timeline, parent messaging, pickup, rapor). Server restricts to linked children.
- Morning Home→Daycare note with acknowledgment. Parent receives useful bundle notifications, not one push per group activity.
- LEO tools read only scoped, sourced, published facts and use safe uncertainty when data is absent. Existing deterministic mode remains valid without LLM provider.

### P0. Two Pickup Journeys
- Regular authorized pickup: verify actual person in situ; record staff, timestamp, permission, handover and audit. Avoid manager reapproval every time.
- Substitute: guardian confirms identity/time-bound authorization, manager reviews per policy, staff verifies person's ID and actual handover. Prevent unauthorized/revoked/expired cases; be careful about replay and concurrency.
- Evidence metadata must be factual. Reuse existing Elenio backend for future CCTV clip/snapshot/event IDs only after verified API & consent; never build a new gateway, streamer, surveillance identity matcher or analytics model.

### P1. Development Report
- Separate teacher observation from daily-care records. Add stable observation source IDs, age/curriculum configurable rubrics, draft/review, guardian-scoped report and export PDF. LEO drafts text grounded in approved sources, never invents milestones or diagnoses.

### P1. CRM / WhatsApp / Enrollment
- Retain working leads, tours, trials, followup tasks, enrollment APIs. Improve UX based on v3 prototype. Contextual reply drafts may be copied, never auto-sent; later optionally connect verified official WhatsApp Business Platform API.
- Support optional tour/trial and record slot and package confirmation prior to final enrollment.

### P2. Revenue + platform settings
- Preserve existing invoices/subscription scaffolding. Manual invoice confirmation must require payment reference, audit and role verification; no fake settlement.

## Definition of done

For each designed action, ensure a real route + server-side permission + persistence + audit where required + loading/error/retry UX + automated tests. Preserve original Daylio v4 visual brand and official Elenio logo byte-identical to supplied asset. Responsive tests at 390, 820, 1440px. Update `IMPLEMENTATION_STATUS.md` and map screens back to F01–F42. Do not state modules are production-live unless provider/hosted validation has succeeded.
