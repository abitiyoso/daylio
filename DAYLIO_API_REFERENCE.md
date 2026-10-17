# Daylio API-first reference contract (TO IMPLEMENT; not currently deployed)

**This file proposes Daylio-owned REST/JSON endpoints, not existing Elenio endpoints.** Codex should adapt route shapes after inspecting the existing stack. All protected routes require verified session, active tenant membership and resource-level authorization; no trust in client-supplied `tenant_id` alone. Version APIs (`/api/v1`) for future Flutter/Elenio One.

## Identity / organization / tenant
- `POST /api/v1/organizations` create daycare tenant + owner, idempotency key.
- `GET/PATCH /api/v1/organizations/current` owner-configured profile; `GET /api/v1/branches` / `POST /api/v1/branches` / `PATCH /api/v1/branches/:id`.
- `GET/POST/PATCH /api/v1/classrooms` and `/classrooms/:id`; `GET/POST /api/v1/invitations`, `POST /invitations/:token/accept`, `POST /invitations/:id/revoke`.
- `GET /api/v1/me`, `GET /api/v1/me/memberships`, `POST /api/v1/me/active-workspace` (when needed), and auth provider login/logout/recovery endpoints.
- `GET/PATCH /api/v1/staff`, `POST/PATCH /api/v1/staff-assignments`, `GET/POST /api/v1/shifts`.

## Children / guardians / care (P0)
- `GET/POST /api/v1/children`, `GET/PATCH /api/v1/children/:id`, `POST /api/v1/children/:id/archive`.
- `GET/POST /api/v1/children/:id/guardians`, `DELETE /api/v1/children/:id/guardians/:linkId` (revoke with audit).
- `GET/POST /api/v1/children/:id/pickup-authorizations`, `POST /api/v1/pickups/:id/verify-handover`.
- `GET/POST /api/v1/attendance`, `POST /api/v1/attendance/:id/correct` (never overwrite event history).
- `GET/POST /api/v1/activities`, `PATCH /api/v1/activities/:id`, `POST /api/v1/activities/batch`, `POST /api/v1/activities/:id/publish`, `GET /api/v1/children/:id/timeline`.
- `POST /api/v1/media/upload-intent`, `POST /api/v1/media/:id/attach`, `GET /api/v1/media/:id/access` (signed, short-lived, child-scoped).
- `GET/POST /api/v1/handoffs`, `POST /api/v1/handoffs/:id/acknowledge`.
- `GET/POST /api/v1/incidents`, `POST /api/v1/incidents/:id/acknowledge`, `POST /api/v1/incidents/:id/updates`, `POST /api/v1/incidents/:id/resolve`.
- `GET/POST /api/v1/announcements`, `GET/POST /api/v1/messages`, `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read`.
- `GET /api/v1/parent/home?childId=...`, `GET /api/v1/owner/overview?branchId=...&date=...`, `GET /api/v1/reports/operations`.

## Owner sales (P0/P1)
- `POST /api/v1/public/demo-requests` (honeypot/captcha/rate-limit; public CTA record with notice).
- `GET/POST/PATCH /api/v1/leads`, `GET /api/v1/leads/:id/history`, `POST /api/v1/leads/:id/status`.
- `GET/POST/PATCH /api/v1/tours`, `POST /api/v1/tours/:id/confirm`, `POST /api/v1/leads/:id/enroll` (atomic, idempotent).
- `GET /api/v1/owner/enrollment-funnel`, `GET/POST /api/v1/follow-up-tasks`.

## Consent / Elenio CCTV bridge (P0 policy; P1 actual video)
- `GET/POST /api/v1/consents`, `POST /api/v1/consents/:id/revoke`, `POST /api/v1/data-requests`.
- `GET /api/v1/cameras/authorized?childId=...` only through backend scoped mapping to **verified** existing Elenio camera IDs.
- `POST /api/v1/camera-sessions` requires tenant, linked guardian, classroom, camera policy, consent and permitted hours. Requests restricted playback session from existing Elenio service; **no creation of RTSP gateway**.
- `DELETE /api/v1/camera-sessions/:id` for revocation/stop; `GET /api/v1/owner/analytics-events` populated only from verified Elenio data source.
- If Elenio lacks server-enforced short-lived scoped playback, **disable parent playback until secure minimal extension is approved**. Do not fake an API.

## LEO (P1)
- `POST /api/v1/leo/parent/query` scoped to linked child and published fact records (source/time included).
- `POST /api/v1/leo/owner/query` scoped to tenant metrics/incidents/lead records.
- `POST /api/v1/leo/caregiver/draft-summary`, `POST /api/v1/leo/drafts/:id/approve` (human-reviewed publication).
- AI runtime may be existing Elenio LEO or validated provider adapter; must prevent prompts from overriding tenancy/policy.

## Billing / subscription (P2)
- `GET/POST /api/v1/fee-plans`, `GET/POST /api/v1/invoices`, `POST /api/v1/invoices/:id/remind`, `POST /api/v1/invoices/:id/record-manual-payment` (authorized with audit).
- `POST /api/v1/payments/provider-webhook` (signature + idempotency + reconcile), `GET /api/v1/parent/invoices`, `GET /api/v1/subscription`.

## Platform administration and operational readiness
- `GET /api/v1/platform/tenants`, `GET /api/v1/platform/tenants/:id/health`, `POST /api/v1/platform/support-access` with approval/audit.
- `GET /api/v1/health/ready` minimal health without PII, background workers for notifications, overdue reminders, cleanup, audit/retention and exports.

## Cross-cutting contract requirements
- Strict JSON schemas, bounded pagination and sorting, `Asia/Jakarta` date/time formatting at UI, UTC timestamps at storage layer.
- Tenant and child identity derived/verified server-side. 401 unauthenticated, 403 not authorized, 404 for resource hidden from caller, 409 conflicts, 422 validation, 429 limit, 5xx retryable errors.
- Idempotency on invite acceptance, booking confirmation, attendance retries, conversion and billing callbacks.
- OpenAPI/typed clients, testing fixtures for demo tenants only, rate limiting, logs without child secrets/PII.
- Where parent video sessions are proxied, headers and caching must prevent token exposure in logs/analytics/referrers; verify provider's scope enforcement and revocation.
