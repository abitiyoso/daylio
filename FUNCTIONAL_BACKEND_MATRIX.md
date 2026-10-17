# DAYLIO — FULL FUNCTION → BACKEND COVERAGE MATRIX

This is the **implementation contract**, NOT evidence any backend has been completed. Codex must maintain checkboxes, concrete API mappings, database migrations and test evidence per row. Stages: P0 = launch-capable core; P1 = integrated/growth; P2 = commercial extensions. Nothing is silently omitted: if a function is deferred, it stays listed as deferred with reason.

| ID | Area | Frontend function | Backend/service obligation | DB/data source | Who | Stage | Done means |
|---|---|---|---|---|---|---|---|
| F01 | Marketing | Landing page & owner benefits | SSR/CMS content + SEO + FAQ + responsive UI | Marketing content | Public | P0 | Hero, unique photos, FAQ, navigable responsive UX |
| F02 | Sales intake | Jadwalkan Demo form / WhatsApp CTA | Lead create + captcha/rate limit + admin notification | demo_leads, audit_logs | Public, platform admin | P0 | Persist lead; no false submitted/WhatsApp sent state |
| F03 | Auth | Login / logout / forgot password | Supabase Auth or verified existing auth; session/rotation | auth users, sessions | All | P0 | Access persists, invalid/expired invitations denied |
| F04 | Tenancy | Register daycare and branch | Create tenant + branch, owner membership, isolation rules | organizations, branches, memberships | Owner, platform admin | P0 | Two daycare tenants cannot read each others data |
| F05 | Onboarding | Owner checklist + setup | Daycare profile, classes, hours, timezone, lead vs tenant states | organizations, classrooms, settings | Owner | P0 | Self-service daycare setup ends with real tenant ready |
| F06 | Members | Invite manager and caregiver | Token invitation, expiry, role, resend/revoke | invitations, memberships | Owner, manager (limited) | P0 | Invitation activation and removal tested |
| F07 | Child | Anak: listing/detail/CRUD | Child records, class, status, minimal care needs | children, child_care_instructions | Owner, manager; caregiver assigned | P0 | Create/edit/archive child, no orphan links |
| F08 | Guardians | Connect parent to child | Guardian invite, verified link, co-guardian, revoke | guardian_child_links, invitations | Owner, manager, parent | P0 | Unlinked guardian cannot access child |
| F09 | Staff | Caregiver assignment/schedule | Class/child assignments, on-duty status, shifts | staff_assignments, shifts | Owner, manager, caregiver self | P0 | Caregiver only reads children assigned |
| F10 | Attendance | Child check-in/out | Server timestamps, actors, attendance logs, corrections history | attendance_events | Caregiver, manager, owner; parent read | P0 | Parent sees child status and manager reports reflect DB |
| F11 | Pickup | Authorized pickups and release | Wali/penjemput approval, expiry, staff verification + handover | authorized_pickups, pickup_events | Owner, manager, caregiver, parent | P0 | Unapproved pickup never gets automatic valid handover |
| F12 | Care | Meal/sleep/play/hygiene logging | Activity create/edit with time/type/notes + audit | activity_logs | Caregiver, manager; parent read after published | P0 | Caregiver note visible to linked parent after publish |
| F13 | Care | Batch activity and child exceptions | Grouped write, assigned-child validation and per-child edits | activity_logs, batch_jobs | Caregiver | P0 | Group action creates child-specific logs safely |
| F14 | Media | Photo uploads and gallery | Private object storage, signed URLs, size/type checks | activity_media | Caregiver upload; guardian/owner scoped read | P0 | Parent cannot enumerate other child media |
| F15 | Publishing | Draft/publish/edits on timeline | Approval and publish state, timestamps, change history | activity_logs, audit_logs | Caregiver/manager; parent read | P0 | Draft invisible until published |
| F16 | Parent experience | My Child home / multiple children | Authorized aggregated child queries | children, guardian_child_links, attendance, activities | Parent | P0 | Only linked child displayed; multi-child switch works |
| F17 | Messaging | Announcements and feedback | Tenant announcements + child-scoped feedback/replies | announcements, messages | Owner, manager, caregiver permitted, parent | P1 | Recipients restricted; notifications delivered only once |
| F18 | Notifications | In-app and optional email push | Events, preferences, queue, retries + dedup, delivery status | notifications, delivery_attempts | All | P0 | Activity, pickup, incident notifications audited |
| F19 | Safeguarding | Report and resolve incidents | Case creation, severity, acknowledgment, escalation, immutable history | incidents, incident_updates | Caregiver, owner, manager; guardian limited | P0 | Critical incident reaches authorized human PIC |
| F20 | Care transitions | Shift handover | Handover notes, assignment, acknowledgment | shift_handoffs | Caregiver, manager | P1 | Next shift sees assigned handover |
| F21 | Owner overview | Business/operations dashboard | Tenant-scoped aggregates computed from DB | attendance, activities, incidents, leads | Owner, manager | P0 | Counts backed by persisted data; no seeded prod metrics |
| F22 | Reports | Daily/weekly operations export | Date/branch filters, CSV/PDF export server-side | report_jobs, audit | Owner, manager | P1 | Correct totals and permission to download |
| F23 | Prospects | Inquiry lead inbox | Lead capture/source/owner/status/notes and dedup | enrollment_leads, lead_events | Owner, manager | P0 | Lead moves through statuses, history recorded |
| F24 | Tours | Survey / trial appointments | Availability, timezone Asia/Jakarta, confirmation | tour_bookings, trials | Owner, manager, prospect | P1 | No double booking; confirmed vs requested distinct |
| F25 | Enrollment | Convert prospect to enrolled child | Atomic enrollment with guardian invite + child creation | enrollments, children, guardian links | Owner, manager | P1 | No duplicate child created on retries |
| F26 | Growth analytics | Enrollment funnel and follow-up | Conversion by dated events, reminders, task queue | lead_events, followup_tasks | Owner, manager | P1 | Metrics match source events; not invented uplift |
| F27 | CCTV linking | Map Elenio locations/cameras to classes | Server-only adapter referencing verified Elenio APIs | elenio_camera_links, room_map | Owner, platform admin | P1 | No camera provisioning/video server duplication |
| F28 | CCTV parent | Allowed cameras and playback | Scoped short-lived sessions with consent/policy checks | camera_access_policies, sessions, consent | Parent, owner admin | P1 | No raw RTSP/password; revoked/expired access fails |
| F29 | CCTV events | Owner AI Video Analytics feed | Read verified external events, event IDs, statuses | elenio_event_refs | Owner, manager | P1 | Shows only existing analytics from Elenio |
| F30 | LEO parent | Ask LEO child questions | Scoped query tools on published child records + LEO provider | ai_queries, activities, attendance | Parent | P1 | No cross-child leakage; cites event/time; says unknown |
| F31 | LEO owner | Ask LEO daycare operations | Scoped metrics, cases, lead toolset and summaries | ai_queries, dashboard sources | Owner, manager | P1 | Answers based on stored records, no unsupported claims |
| F32 | LEO staff | Assist caregiver daily summary | Draft from records, human approval before publish | ai_drafts, activities | Caregiver, manager | P2 | AI never publishes unreviewed care facts |
| F33 | Billing daycare | Child subscription fees / invoices | Invoice schedule, lines, payment status, reminders | fee_plans, invoices, invoice_items | Owner, manager, parent read | P2 | Never mark paid absent verified/manual authorized approval |
| F34 | Payment | Manual transfer/payment provider | Receipts, verified settlement/webhook signatures, audit | payments, payment_events | Owner, manager, parent | P2 | Idempotent provider callback and reconcilable status |
| F35 | Platform plans | Daylio SaaS customer plans and usage | Tenant subscription/entitlement/limits, trial, status | plan_subscriptions, usage_meter | Platform admin, owner read | P2 | Plan scopes respected; no safeguarding essential blocked |
| F36 | Platform admin | Manage tenants/support access | Tenant lookup, suspension, support impersonation with approval | organizations, support_access, audits | Platform admin | P1 | No silent access to child data; support actions audited |
| F37 | Settings | Daycare settings, roles, CCTV policies | Tenant preferences, staff permission matrix, hours | org_settings, memberships, camera policies | Owner, manager limited | P0 | Role/access updates effective immediately |
| F38 | Consent | Privacy and caregiver/child CCTV permission | Versioned scopes, parental consent & withdrawal; data requests | consent_records, data_requests | Parent, owner, platform limited | P0 | Withdrawing consent restricts relevant access |
| F39 | Audit & retention | Change tracking, retention, deletion/export | Immutable audit records, access/export logs, retention policies | audit_logs, retention_jobs | System, authorized admins | P0 | Sensitive events traceable; retention jobs tested |
| F40 | Ops | Monitoring, backups, jobs | Error tracking, logs redacted, scheduled workers, backups | job_runs, log metadata | Platform ops | P0 | Restore procedure and failure alert documented |
| F41 | Flutter readiness | Versioned APIs & identity interoperability | Contract/OpenAPI, pagination, tokens, RBAC, stable DTOs | API schema | Future Flutter app | P1 | API callable from separate mobile client |
| F42 | Integration reliability | Elenio API error states | Timeouts, retries, circuit breaker, no connected false states | integration_status, audit | Backend ops | P1 | Elenio offline => parent UI accurate and safe |

## Strict full-stack definition of done for EVERY row

1. UI is navigable and calls a real authenticated API (unless truly content-only).
2. API has input validation, server-side tenant/child authorization and typed errors.
3. Persistent data is modeled and migration/index/RLS (where relevant) implemented.
4. Success, unauthorized, empty, loading, failed request, retry, and offline (where relevant) UX are handled.
5. Unit/integration and end-to-end acceptance are attached to the row.
6. Observability, audit, and notification hooks are wired where relevant.
7. No UI fake success, fixture leakage into production, stale hardcoded metrics or made-up Elenio endpoints.

## Important limitation
**Existing CCTV/video/analytics/LEO APIs cannot be marked verified from these files alone**. Map after access to Elenio repository or formal API contract. Daylio can be function-complete in core domains while Elenio integration remains explicitly blocked.
