# DAYLIO BY ELENIO — MASTER CODEX PROMPT
## Production Backend, Database, API & Full Journey Implementation

### YOUR ROLE

You are acting as a Principal Software Architect, Senior Full-Stack Engineer, Backend Engineer, and Product Owner.

Your mission is to transform the approved **Daylio Backend v10 interactive HTML** into a fully functional, production-oriented daycare management SaaS.

This is an implementation task, not a redesign or another prototype.

**Primary reference:**
`Daylio_Backend_v10_Journey_Interactive(2).html`

**Additional reference:**
The approved Daylio V20 landing page.

The v10 HTML is the source of truth for back-office features, role journeys, screens, and product interactions. The V20 landing page is the source of truth for public-facing marketing.

Do not confuse these two applications.

---

# 1. FIRST: AUDIT THE EXISTING CODEBASE

Before writing code:

1. Inspect the complete Daylio repository.
2. Identify the frontend framework, existing backend, database, authentication, routing, and integrations.
3. Read the complete v10 HTML, including its JavaScript, initial data, role navigation, event handlers, and modal workflows.
4. Identify features that currently depend on `localStorage`, hardcoded data, simulated role switching, or mock external services.
5. Compare the current repository implementation with the v10 reference.
6. Produce a feature gap analysis and implementation checklist.

**Important:** The v10 HTML is a functional design specification, not proof that production backend services already exist.

Use the existing architecture whenever technically appropriate. If the repository already uses Supabase, PostgreSQL, Next.js, or another established stack, extend it rather than creating a competing backend.

Do not create a new application or replace the repository unnecessarily.

Then proceed with implementation, not planning alone.

---

# 2. PRESERVE THE APPROVED PRODUCT DESIGN

Retain the v10 back-office experience:

- Sidebar structure and role-specific navigation
- Dashboard layouts and KPI hierarchy
- Tables, forms, cards, tabs, and modals
- Child profiles and care records
- Scheduling and calendar interfaces
- CCTV and AI Event Review workflows
- LEO AI workspace
- Daylio Sun of Care branding and official logo
- Indonesian terminology and existing user journeys

Do not redesign the UI or introduce generic dashboard templates.

You may refactor HTML into reusable application components, provided visual fidelity and functionality are preserved.

Remove simulated behavior only when replacing it with real application behavior.

---

# 3. MULTI-TENANT SAAS ARCHITECTURE

Daylio must support multiple independent daycare businesses.

Required hierarchy:

**Daylio Platform**
→ Daycare Organization / Tenant
→ Branch
→ Classroom
→ Child / Family
→ Staff / Caregiver
→ Operations & Financial Records

Build a relational data model using the project's existing database technology.

Suggested entities, subject to repository inspection:

- organizations / tenants
- branches
- users
- organization memberships
- staff profiles and invitations
- roles and permissions
- classrooms and capacity rules
- children
- guardians and child-guardian relationships
- enrollments and daycare packages
- leads and CRM activities
- bookings, trials, drop-ins, and waitlists
- attendance records
- care plans and care activities
- developmental observations
- daily stories and media
- pickup authorizations and pickup logs
- staff shifts and assignments
- parent-caregiver messages
- invoices, invoice items, and payments
- subscriptions, plans, and add-ons
- CCTV cameras, areas, events, and access policies
- AI tasks, drafts, approvals, and execution history
- notification records
- consent records and audit logs

Use appropriate foreign keys, unique constraints, indexes, timestamps, migrations, and transaction boundaries.

Every tenant-owned record must be scoped by organization and branch where applicable.

Cross-tenant data exposure must be prevented at the database and API layers.

Do not use `localStorage` as the system of record. It may remain only for non-sensitive interface preferences.

---

# 4. AUTHENTICATION & ROLE-BASED ACCESS

Implement real account registration, authentication, invitations, and role-based access.

Preserve the four primary roles from v10.

### OWNER
- Ringkasan Bisnis
- CRM & WhatsApp
- Paket & Booking
- Anak & Keluarga
- Tagihan & Pembayaran
- Care & Safety
- CCTV & AI Analytics
- Laporan & Insight
- LEO Copilot
- Pengaturan dan Langganan

### MANAGER
- Control Tower
- Data Anak & Care Plan
- Aktivitas & Review
- Pickup & Safety
- CCTV & AI Analytics
- Rapor & Observasi
- Jadwal & Staf
- Komunikasi
- LEO Operations

### CAREGIVER
- Hari Ini
- Quick Care Kelas
- Anak Asuhan
- Penjemputan
- Serah Terima Shift
- Pesan
- Tanya LEO

### PARENT
- Beranda Anakku
- Daily Story
- Rapor & Portofolio
- Paket & Jadwal
- Izin Penjemput
- CCTV Area Anak
- Pesan Daycare
- Tanya LEO

Implement verification for newly registered accounts and invited users.

Owners can manage organization settings and authorized staff. Managers can administer permitted branch operations. Caregivers must only access assigned children or classrooms. Parents must only access children for whom they have a verified guardian relationship.

A user's role must never be determined by a client-side dropdown in production.

Enforce permissions server-side on every read, mutation, download, and media-access request.

---

# 5. IMPLEMENT COMPLETE BUSINESS JOURNEYS

## A. CRM → ENROLLMENT → ACTIVE CHILD

Convert the existing CRM into a functioning lead-management system.

Workflow:

Inquiry received
→ Lead created
→ Follow-up assigned
→ Daycare visit / survey
→ Trial booking
→ Package offer
→ Registration
→ Guardian verification
→ Enrollment approval
→ Classroom assignment
→ Active child profile

Required capabilities:

- Lead creation and editing
- Lead source tracking
- Pipeline statuses
- PIC assignment
- Notes and follow-up history
- Booking and trial scheduling
- Waiting list
- Conversion to enrollment
- Duplicate detection
- Capacity checking
- Guardian linking
- Audit trail of status changes

Integrate WhatsApp only through an actual configured provider. Until then, provide a clean connector interface and an explicitly unconnected state.

## B. CLASSROOM & CAPACITY MANAGEMENT

Implement:

- Classroom creation and configuration
- Age-group settings
- Maximum capacity
- Enrollment tracking
- Actual attendance
- Available slots
- Trial and drop-in allocations
- Occupancy reports
- Staff coverage

Preserve the v10 Schedule & Capacity Planner journey.

Validate bookings server-side to prevent overbooking or conflicting allocations.

Support the trial, regular, extra-day, and drop-in scenarios represented in the prototype.

Staffing ratios must be configurable; do not treat example ratios as universal regulations.

## C. CHILD PROFILE & CARE PASSPORT

Implement an individual child profile containing:

- Child identification and profile photo
- Linked guardians
- Classroom and active package
- Authorized pickup persons
- Care instructions
- Allergies and important care notes
- Attendance
- Daily activities
- Observations
- Incidents
- Family communication

Sensitive child information must have stricter access controls than general operational information.

Use private media storage and time-limited authorized access.

## D. CAREGIVER DAILY OPERATIONS

Implement the v10 Quick Care journey.

A caregiver must be able to:

1. Select an assigned classroom.
2. See children attending that day.
3. Select multiple children.
4. Record an activity once for the group.
5. Add an individual exception.
6. Save the activity.
7. Submit it for review where required.
8. Publish approved information to the relevant parents.

Supported activity categories include:

- Makan
- Tidur
- Bermain
- Toilet
- Belajar
- Catatan

Include timestamps, author identity, child relationships, editing history, and publication status.

Caregiver submissions and parent-visible publications must be distinguishable.

## E. PARENT EXPERIENCE & DAILY STORY

Build the parent-facing data services behind:

- Beranda Anakku
- Daily Story
- Development reports
- Booking and package information
- Billing
- Pickup authorization
- Messaging
- LEO

Parents must see information for their own verified children only.

Daily Story should contain caregiver-approved activities, timestamps, permitted photos/videos, and relevant notes.

Never publish internal incidents, other children's personal information, or unapproved media to parents.

## F. PICKUP AUTHORIZATION & CHILD SAFETY

Implement:

Guardian creates pickup authorization
→ Identity and relationship checked
→ Approval where required
→ Authorization validity confirmed
→ Caregiver verifies person
→ Child handover recorded
→ Audit evidence stored

Support routine and temporary pickup permissions.

Record authorization status, validity period, guardian, staff verifier, handover time, and evidence references.

Expired or revoked authorizations cannot be reused.

Do not automatically approve an unknown person based on a CCTV recognition result.

## G. BILLING & PAYMENT

Implement two independent financial domains.

**1. Daycare billing to parents**
- Package charges
- Recurring invoices
- Due dates
- Payment status
- Receipts
- Reconciliation
- Overdue reminders
- Revenue reporting

**2. Daylio SaaS billing to daycare owners**
- Subscription
- Plan entitlement
- Billing cycle
- Add-ons
- Usage limits
- Upgrade/downgrade
- Billing history

These must never be mixed.

Use a provider adapter for payment gateways. If a real provider is connected, verify payment events with authenticated, idempotent webhooks.

Do not mark an invoice paid merely because the frontend receives a successful response or displays a success modal.

---

# 6. SUBSCRIPTION & FEATURE ENTITLEMENTS

Use the plan structure represented in v10 as the initial configurable commercial reference.

| Plan | Monthly Reference | Child Limit |
|---|---:|---:|
| Essential | Rp299,000 | 25 |
| Growth | Rp699,000 | 60 |
| Intelligence | Rp1,490,000 | 120 |

Use database-driven plan definitions rather than hardcoding limits throughout the UI.

Preserve the v10 feature distinctions:

**Essential:** child records, attendance, care passport, caregiver activities, Daily Story, authorized pickup, parent communication, and basic reporting.

**Growth:** Essential plus CRM, enrollment workflows, scheduling, invoicing, and business reporting.

**Intelligence:** Growth plus LEO workspace, approval-based AI workflows, and advanced insights.

CCTV and AI Video Analytics remain separately configurable Elenio add-ons. They must not be automatically bundled into Intelligence.

Preserve the prototype's add-on pricing references as configurable draft values, not verified live tariffs.

Implement entitlement enforcement on the backend, including API routes—not only hidden navigation.

If a plan is downgraded, preserve existing child and safety records. Never delete records to enforce a lower subscription tier.

---

# 7. CCTV & ELENIO AI VIDEO ANALYTICS

The v10 prototype contains a CCTV management journey, but its camera events and feeds are simulations.

Implement the integration architecture without inventing working streams or detections.

Required modules:

- Camera registry
- Organization and branch mapping
- Camera-to-area relationships
- Camera health/status
- Authorized stream session requests
- Event ingestion
- Event timeline
- Event review
- Human verification
- Incident linkage
- Access audit

Support a future connection to Elenio CCTV / AI Gateway through documented APIs or event webhooks.

Separate raw video access from AI event metadata.

For parents, check all relevant consent, area, child relationship, time-window, and tenant policies server-side. Do not issue a stream session until authorization succeeds.

Use short-lived, revocable access credentials. Never expose RTSP credentials or privileged camera tokens in the browser.

Until the integration is actually connected, show a truthful unavailable or demo state.

AI events are **signals to review**, not definitive evidence of wrongdoing or child safety.

---

# 8. LEO AI — AGENTIC DAYCARE OPERATIONS

Implement LEO as an assistant grounded in authorized Daylio business records.

It should support the three practical contexts reflected in the approved product:

**Owner**
- Occupancy summaries
- Revenue and overdue invoice analysis
- Enrollment funnel insights
- Operational recommendations

**Caregiver / Manager**
- Authorized class summaries
- Incomplete care records
- Attendance and handover reminders
- Work items requiring review

**Parent**
- Questions about their own child's approved Daily Story
- Authorized schedule and package information
- Approved activity summaries

Architecture:

User request
→ Authentication and authorization
→ Intent identification
→ Approved data retrieval
→ Answer generation
→ Evidence references and permission checks
→ Optional proposed action
→ Human confirmation
→ Controlled execution
→ Audit logging

LEO must never read records outside the user's authorization scope.

Preserve the v10 concept of proposed actions, draft preparation, review, and human approval.

Do not let LEO silently send messages, modify financial records, approve pickups, publish sensitive content, or change enrollments.

Use structured tool interfaces with strict server-side authorization and allowlisted actions.

If no LLM credentials or provider exists, keep the interface functional with an explicitly labeled local demo mode. Do not claim real AI inference.

---

# 9. DATABASE & API IMPLEMENTATION

Design and implement production-oriented database migrations and API endpoints for the above modules.

For each workflow, provide:

- Data model
- Validation schema
- Service/business logic
- Authorized read endpoints
- Mutation endpoints
- Pagination/filtering/search where needed
- Error responses
- Audit events
- Integration tests

Use database transactions for operations that modify related records, such as enrollment conversion, booking confirmation, invoice settlement, and pickup handover.

Use stable identifiers and timestamps. Do not rely on hardcoded dates, client-generated role grants, or `Date.now()` as authoritative entity identity.

Persist timestamps consistently and present local times using the daycare's configured timezone.

Use environment variables for secrets and provider configuration.

Do not expose service-role keys or privileged database credentials in frontend bundles.

---

# 10. FRONTEND ↔ BACKEND INTEGRATION

Replace frontend simulation with authenticated application services.

The following UI components must retrieve live application data when connected:

- Dashboard KPIs
- CRM pipeline
- Classroom capacity
- Booking calendar
- Child lists and profiles
- Attendance
- Care activities
- Daily Story
- Pickup permissions
- Invoices and payment states
- Staff schedules
- CCTV events
- LEO tasks and responses
- Subscription usage

Use loading, empty, error, and permission-denied states.

Avoid inconsistent optimistic updates for safety-critical or financial operations.

Retain the existing visual design, terminology, navigation, and user journeys from v10.

The approved V20 public landing page must remain unchanged, except for necessary authentication, registration, and demo entry-point integration.

---

# 11. SECURITY, PRIVACY & RELIABILITY

This platform handles children's personal information.

Security requirements are mandatory:

- Strict multi-tenant isolation
- Database-level access control where supported
- Verified guardian-child relationships
- Role and classroom scoping
- Encryption in transit and appropriate protection at rest
- Private media storage
- Signed, expiring media access
- Consent collection and revocation
- Audit logs for sensitive operations
- Input validation
- Rate limiting
- Safe authentication and session handling
- Secure invitation lifecycle
- Minimal sensitive-data exposure in logs
- Backup and recovery procedures
- Secure handling of external webhooks

Protect against unauthorized media access and insecure direct object references.

Avoid exposing other children's identities through parent CCTV views or media-sharing features.

Implement configurable retention and deletion policies, subject to applicable legal and operational requirements.

---

# 12. IMPLEMENTATION SEQUENCE

Work in this order:

**Phase 1 — Foundation**
Repository audit, architecture, authentication, tenants, branches, roles, database migrations.

**Phase 2 — Core Operations**
CRM, enrollment, children, classrooms, capacity, scheduling, and attendance.

**Phase 3 — Care & Family**
Care Passport, caregiver activities, review/publish workflow, Daily Story, messaging, pickup authorization.

**Phase 4 — Commercial**
Parent invoices, financial reporting, SaaS subscription, feature entitlements, payment-provider adapters.

**Phase 5 — Intelligence**
CCTV integration contracts, event review, authorized video sessions, LEO workflows and approval engine.

**Phase 6 — Stabilization**
Tests, migrations, security audit, responsive QA, performance, and deployment readiness.

Implement working vertical slices rather than creating dozens of nonfunctional routes.

Do not stop after generating a database schema or architectural proposal.

---

# 13. REQUIRED END-TO-END TESTS

At minimum, validate these journeys:

1. Owner registers a daycare, verifies their account, and creates a branch.
2. Owner invites a manager and caregiver.
3. Manager creates a classroom and defines capacity.
4. Owner creates a lead and converts it into an enrollment.
5. A verified guardian is linked to the child.
6. Caregiver marks attendance and records a group activity with an exception.
7. Manager reviews and publishes the activity.
8. Parent sees only their child's approved Daily Story.
9. Parent creates a temporary pickup authorization.
10. Staff verifies and records handover; revoked or expired permissions are rejected.
11. Daycare generates an invoice and updates payment status through an authorized process.
12. Owner sees reporting derived from actual persisted records.
13. Subscription entitlement correctly restricts paid capabilities.
14. Cross-tenant and cross-child access attempts are denied.
15. Unauthorized camera access fails.
16. LEO cannot retrieve unauthorized child information or execute an unapproved sensitive action.

Test concurrent bookings to ensure capacity cannot be exceeded.

Test on desktop, tablet, and mobile without modifying the approved design.

---

# 14. FINAL DELIVERABLES

Before declaring the work complete, provide:

1. Repository architecture summary
2. Implemented module checklist
3. Database schema and migrations
4. API endpoint inventory
5. Role-permission matrix
6. Environment variable documentation
7. Setup and deployment instructions
8. Seed data for a dedicated demo environment
9. Automated test results
10. Browser screenshots of critical workflows
11. Integration status: connected, sandbox, or not configured
12. Remaining risks and unfinished items

Use clear, truthful implementation status reporting.

Do not label a feature production-ready if it only works with mocked data.

## FINAL ACCEPTANCE CRITERIA

Daylio must become a functional multi-tenant daycare operations platform—not merely an interactive HTML demo.

The core lifecycle must work:

**Prospect → Enrollment → Childcare → Parent Communication → Billing → Operational Insight**

Preserve the v10 back-office design and its approved role journeys while implementing the backend necessary to support them.

The public V20 landing page remains visually unchanged.

**Start by auditing the existing repository and the supplied v10 HTML. Then implement the backend and integrate the frontend systematically until the agreed core journeys are working and tested.**