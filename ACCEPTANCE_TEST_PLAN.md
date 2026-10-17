# End-to-end UAT and release gates — no partial front-end-only sign-off

Codex must execute these or record an exact blocker/test environment. **Do not mark PASSED based on reading source or using mock data alone.** Use two daycare tenants with separate seeded children, parents, caregivers and camera references.

## Phase P0 (usable daycare SaaS)

- [ ] Landing at 390/768/1440 px matches v4 visual hierarchy, owner CTA, different real photographs, no faces obscured.
- [ ] FAQ answers owner questions; interactions and mobile menu work; no fabricated social proof or development labels on public marketing.
- [ ] Daycare sign-up creates a new org and branch with real DB records; no access without active membership.
- [ ] Owner invites caregiver and parent; expired/revoked tokens deny access; duplicate acceptance is safe.
- [ ] Manager creates classroom and child, assigns caregiver, adds authorized guardian and pickup contact.
- [ ] Assigned caregiver checks in child and adds meal/nap/photo; photo stored privately; publishes; linked parent sees updates on reload/login; unrelated parent sees none.
- [ ] Batch activity logging respects individual child exceptions; manager can audit editing history.
- [ ] Staff verifies pickup and time stamps recorded; invalid/non-authorized pickup flagged for human handling.
- [ ] Caregiver creates incident; manager receives notification and acknowledges; incident closure keeps edit history; urgent instructions direct to daycare human SOP.
- [ ] Guardian views child status and sends feedback; authorization changes take effect without stale access.
- [ ] Owner daily figures computed from persisted records and lead pipeline, not hardcoded fixture counts.
- [ ] Marketing demo request persists once with anti-spam and consent; admin can review it.
- [ ] Two tenants and unrelated guardians cannot query each other's routes, media, storage, notifications, or records.
- [ ] All mutations enforce server-side schema validation; invalid input and auth errors render accurately.
- [ ] Notification worker retries safely without duplicate delivery, and can process failures.
- [ ] Full auth flow, password reset, logout, session expiry, permission change tested.

## Phase P1 (customer-facing differentiation)

- [ ] Prospect inquiry → tour request → confirmed booking → trial → enrollment is linked to real record, with calendar timezone correct and no double booking.
- [ ] Elenio repository/API docs inspected; `ELENIO_API_DISCOVERY.md` lists real routes, schema, scopes, environments, concurrency, playback, analytics and unknowns, never guessed paths.
- [ ] Daylio can show only cameras assigned to authorized daycare rooms using Elenio references, not duplicate camera objects/device credentials.
- [ ] Guardian live view uses **existing** gateway, with scoped expiring grant and approved shared-area consent; disallowed rooms, revoked access, expired sessions, and cross-tenant attempts are rejected.
- [ ] Elenio unreachable → clear unavailable state and no fake camera live; API failures logged without credentials.
- [ ] Video Analytics owner alerts sourced from existing Elenio event IDs; no new detection model or duplicate VMS.
- [ ] Parent asks LEO about a meal/sleep record and gets answer grounded in published notes with source/time; absent data explicitly unknown; other child data blocked.
- [ ] Owner asks LEO about attendance and open cases and gets tenant-scoped exact counts; prompt injection from caregiver notes doesn't override authorization.
- [ ] Role-based messaging and announcements notify only intended guardians/staff; read/unread recorded.
- [ ] Provider quota and cost limits for AI sessions monitored by tenant; degraded AI service gets fallback.

## Phase P2 (commercial growth extensions; documented and scheduled)

- [ ] Daycare invoices generated with due dates; manual payments require explicit authorized confirmation; provider callbacks signature and idempotency verified.
- [ ] SaaS plan entitlement/trial and pricing enforce intended service limits while baseline safeguarding functions remain available.
- [ ] Shift handover and daily summary approval workflow function end to end.
- [ ] Multi-branch analytics only shows authorized branches; API ready for future Flutter Elenio One client.

## Operational and privacy readiness

- [ ] HTTPS/cookies/CORS/CSRF according to stack; logs redact child names and tokens.
- [ ] Access/consent is versioned and revocable; deletion/export/retention policy configured and reviewed before real child data.
- [ ] Backup + test restore procedure; CI lint/typecheck/unit/integration/e2e/build; dependency and secrets scan.
- [ ] Photos and CCTV access compliant with approved school/daycare procedures; no cameras in private spaces and no inference of abuse/emotions from video by default.
- [ ] `IMPLEMENTATION_STATUS.md` table lists function ID, completed code, test evidence, deployment status, blockers. No claiming “done” based on static UI.
