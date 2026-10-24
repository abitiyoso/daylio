# Daylio v10 implementation — 24 October 2026

This extends the existing application, identity provider, PostgreSQL RLS, care records and API. It does not replace the backend. Approved source archives and original asset hashes: `design-reference/approved-2026-10-24/`. Audit before implementation: `V10_GAP_ANALYSIS.md`. Cross-spec decisions: `V10_DECISIONS.md`. Journey evidence: `V10_ACCEPTANCE.md`. Functional coverage and release gates remain in `IMPLEMENTATION_STATUS.md`.

## Authentication and permissions

The V20 public **Masuk** link opens `/workspace`. `/register` starts owner registration through the configured identity provider and email verification; only a verified identity can bootstrap a daycare and its first branch. Existing owner access administration invites users by email, assigns server-side membership/child scope and requires acceptance, verification and a private password. There is no runtime role dropdown. The local email fixture tests this contract; actual inbox delivery requires production Supabase/SMTP configuration and verification.

Authenticated APIs use the existing HttpOnly cookie or verified bearer token, selected `X-Organization-Id`, active membership, capability checks and restricted database role/RLS. Mutations retain origin checks, validation, audit and idempotency. An idempotent response is reauthorized against current membership and plan before replay. Parent data is linked-child only; caregivers use assignments. Delegated manager CRM/finance permissions remain explicit owner settings.

## Additive migrations

Apply **all** migrations in order with `node --env-file=.env.local scripts/migrate.mjs`. Back up the hosted database first and exercise restore in staging before a production rollout. No database was replaced by this implementation.

| Migration | Persistent additions / invariants |
|---|---|
| 012 | Classroom age range, staff shifts, child/prospect bookings, immutable schedule history, scoped RLS, capacity/coverage/time conflict triggers |
| 013 | Catalog, tenant entitlement, separate SaaS invoices, draft add-on requests; API and restrictive RLS feature gates |
| 014 | Reserved prospect seats counted in enrollment/class changes; staff changes cannot uncover bookings; shared tenant lock |
| 015 | Approved recurring family billing rules and unique rule/month invoices; own-family verified receipt visibility |
| 016 | Narrow staff-name directory for handoff selection, no unrelated contact/child details |
| 017 | External camera registry and actual incoming event metadata; no playback/device infrastructure |
| 018 | LEO source hashes and work-item lifecycle, role/child/capability RLS |
| 019 | Human-confirmed event-to-incident link, source identity XOR and future booking ratio guard |
| 020 | Normalized lead-contact lookup; warns about a shared guardian without preventing sibling inquiries |

Existing tenants get an explicit **legacy** entitlement preserving working capabilities; it is not represented as a paid subscription. Newly registered tenants receive a 14-day Intelligence trial. Expiry resolves to Essential in server authorization, even before a worker runs. Catalog: Essential Rp299,000/25 children, Growth Rp699,000/60, Intelligence Rp1,490,000/120; yearly requests use ten monthly prices. Essential retains care and parent history; premium CRM, finance, scheduling writes, business exports and LEO require the appropriate feature. Exceeding the active-child limit is blocked at API and DB, with existing child care retained.

## New authenticated routes

All paths below start `/api/v1/`. Route DTOs are validated strictly in the named service modules. Existing v3 routes remain available; see `BACKEND_V3_API.md` and generated `openapi.json`.

| Routes | Role / behavior |
|---|---|
| `owner/summary?date=&branchId=` | Owner business pulse, actual active children/class seats, family invoice totals, current lead funnel, exceptions |
| `workspace/search?q=` | Authorized child/lead names, bounded 20 results; no cross-tenant search |
| `planner/overview?from=&to=` | Bounded 31-day window; management full tenant, caregiver/parent scoped data |
| `planner/bookings`, `planner/shifts` POST; `/{id}` PATCH; `/{id}/cancel` POST | Management + scheduling entitlement; actual future times, assigned class/staff/source; optimistic `revision`, database capacity and full-interval staff checks |
| `planner/history/{id}` | Management audit of before/after changes |
| `classrooms` POST, `classrooms/{id}` PATCH | Existing management API extended with capacity, ratio, age range and branch; occupied/reserved seats constrain changes |
| `leads`, `leads/{id}`, `leads/{id}/status`, `/history` | Existing CRM extended with duplicate warning, validated PIC, stage/waitlist and history; qualification preserved on contact edits |
| `care/handoff-options` | Authorized staff display names for existing recipient acknowledgment workflow |
| `billing/overview?page=` | Owner or finance-delegated manager, Growth+; paginated family invoices and totals |
| `family/billing`, `family/receipts/{id}` | Parent linked-child package/history/verified receipt PDF; historical access retained on Essential |
| `billing/recurring` GET/POST; `/{id}/generate`, `/{id}/stop` POST | Explicitly approved rule, validated lines/due day/start month; one invoice per rule/month; worker uses the same permission and uniqueness guards |
| `commercial/context` | Owner catalog, actual usage, entitlement state, SaaS invoice history, add-on history and disconnected provider state |
| `commercial/invoices` POST | Owner request only, server catalog amount; explicit confirmation; cannot activate entitlement |
| `commercial/addons` POST | Owner request only; CCTV Rp30,000 and analytics Rp120,000 are labeled draft estimates, not activated services |
| `platform/saas-invoices` GET, `/{id}/verify` POST | Verified platform admin only; explicit manually checked reference/amount/confirmation; independent verification audit, duplicate verification stable |
| `integrations/overview` GET, `integrations/registry` POST; `/{id}/disable` POST | Management registry of external camera ID and classroom; no passwords, RTSP or transport URLs |
| `integrations/overview` GET; `integrations/events` `/{id}/review`, `/{id}/link-incident` POST | Management actual event metadata, human review and explicit same-class incident linkage |
| `leo/work-items` GET/POST; `/{id}/draft`, `/approve`, `/execute`, `/cancel` POST | Intelligence + authorized role/sources; management human approval and execution; narrow outputs described below |

Family payments remain independent from Daylio SaaS payments. A staff-confirmed family transfer generates a receipt and an immutable audit; it does not assert a bank callback was received. SaaS requests remain pending until platform administration records a separately verified payment. Active paid terms cannot currently be replaced early: `CURRENT_PAID_TERM_ACTIVE`. Scheduled downgrade, proration, refunds, tax-compliant invoice layout and provider settlement are follow-up work, not simulated success.

## Elenio boundary

The existing live camera/session/analytics adapter remains disabled. No gateway, RTSP/ONVIF, streaming, camera firmware or analytics engine has been built. Local dashboards never fabricate actual video evidence.

The optional `POST integrations/elenio/events` is a **Daylio metadata bridge v1 proposal**, not a verified official Elenio contract. It is disabled by default (`ELENIO_METADATA_ENABLED=false`). If explicitly configured after agreement with the existing service, it requires a secret of at least 32 characters, `x-daylio-timestamp` in Unix milliseconds within five minutes, and `x-daylio-signature: v1=<hex HMAC-SHA256(timestamp + '.' + exact raw body)>`. Only this signed endpoint bypasses cookie origin verification. JSON fields: `organizationId`, registered/enabled `cameraId`, provider `eventId`, `type` (`restricted-zone`, `occupancy`, `offline`), ISO `occurredAt`, optional confidence 0..1. Strict allowlist rejects additional fields. Unique org/camera/event ID deduplicates retries. Tenant sessions cannot insert incoming events. A documented service principal records ingestion; humans remain responsible for review and incident decisions.

## LEO work lifecycle

This is transparent **verified-records mode**, not an external model response. Allowlisted work kinds are `care-summary-draft` (child ID and published same-child activity IDs) and `crm-followup` (authorized lead ID, due time and staff note). Proposal records source IDs/hash; drafting, approval and execution recheck current sources, permissions, plan and active approver. Changed or inaccessible sources block execution. Approved execution creates only an internal care draft or follow-up task. It does not publish care, send WhatsApp/email, verify payment, grant pickup access or change plans. Execution replay returns the original output.

## Local verification and production boundaries

`pnpm test` applies every migration to actual embedded PostgreSQL under restricted roles. `pnpm test:browser` runs six suites, each with a new database, media root and build root on ports 3101/4012; run-bound guards reject the persistent preview. The localhost 3100 fictional showcase is fingerprinted before/after. `node scripts/capture-v10.mjs` captures four authenticated roles at five widths with business mutations blocked. V20 comparison and real browser zoom scripts are separate read-only captures. All local accounts, bank references and emails in evidence are fictional.

Still required before real users: hosted Postgres/Supabase/SMTP validation, actual payment and WhatsApp providers if selected, verified Elenio authorization/event contracts, external LLM selection if desired, licensed photography/consent/legal documents, hosted backup/restore and operational UAT. These dependencies have not been silently substituted by local fixtures.
