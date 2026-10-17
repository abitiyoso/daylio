# UX Review — Daylio Backend v2 → v3

**Purpose:** achieve substantially fewer caregiver actions without removing auditability or parent visibility. Prototype-specific numbers and timings are illustrative, not measured outcomes.

## Interaction redesign

| Workflow | Previous v2 interaction | v3 proposed interaction | Implementation guardrails |
|---|---|---|---|
| Caregiver daily log | Child-by-child form or generic activities list | Choose activity once → present class children preselected → shared result → exceptions only → save separate per-child drafts in 1 action | Must exclude absent children, allow per-child corrections, no fabricated event, enforce assignment at server |
| Publish daily log | Each draft separately or unclear bulk controls | Manager sees grouped drafts → one explicit human-review confirmation → bulk publish | Source-backed, audit versions, only linked guardians read published care |
| Parent's day | General feed of activity items | "My Child Today" showing check-in, last documented meal, sleep, story, pickup; deeper timeline available | No invented claims; no mixing sibling/other child data |
| Morning handover | Attendance only | Guardian sends brief condition/update; it appears in caregiver Today until acknowledged | Role and child restrictions, special health details minimized |
| Standard pickup | Manager approval/PIN on all attempts | Pre-authorized routine person → in-person verification → log staff/time/handover | Recognition is not automated biometric identification |
| Substitute pickup | Same workflow as routine | Guardian-origin authorization → manager review when required → in-person staff verification → audit | Revoke/expiry must be enforced server-side; no AI automatic verification |
| Pickup evidence | Concept CCTV snapshot/clip on every event | Trustworthy human-staff audit evidence now, optional Elenio event/clip reference later | Clips/snapshots only via existing authorized Elenio service, not fabricated or public |
| Rapor | Narrative from activity feed | Observations separately collected → reviewed by responsible staff → period report → guardian publication | LEO assists drafting only; no developmental diagnosis or fabricated milestones |
| Owner work | Metrics and deep menu navigation | Business Pulse shows follow-ups, occupancy, missing records and genuine issues | No fabricated KPIs in production; calculations must derive from DB |
| Manager work | Every operational item presented | Exception Queue and Closing; routine work does not need universal approval | Human safety/medical escalation and explicit unresolved task handoff |
| WhatsApp inquiries | More generic CRM and chat demo | Contextual lead → stage update → tour/trial → follow-up → child enrollment | Link/open WA explicitly; integration to official provider later, do not scrape consumer WhatsApp |
| Payments | Click "paid" | Require verified manual reference and responsible actor | No fake provider settlement, audit status transitions |

## Recommended 4 roles / capabilities

- **Owner:** business metrics, staff/workspace settings, CRM & prospects, invoices, management exceptions, read-only relevant care and report overviews. Cannot read unrelated tenant data.
- **Manager:** handle assignments/attendance/incidents/guardian pickup approvals; human review/publish; approve developmental observations and reports. Financial/admin permission only if separately delegated.
- **Caregiver:** access only assigned children/class, note care and development observations, acknowledge home notes, confirm actual handover of already authorized pickup. Cannot authorize guardian pickup, change tenant settings or read CRM.
- **Parent/guardian:** own linked child daily story, growth reports, morning note, messages, substitute pickup requests, future authorized camera entitlement. Cannot read other child data or unpublished drafts.

**Security note:** The prototype role dropdown intentionally simulates every role with fictional data. It is NOT an access-control implementation. Reuse and test the existing repository's RLS, tenancy and server-side policies; protect guardian documents, pictures and LEO retrieval with role-specific authorization.

## Acceptance scenarios for Codex

1. One caregiver captures a shared meal event for 6 present assigned children, overrides Rafael as "Sebagian", and creates exactly 6 separate draft activity records with common batch ID and individual exceptions. No record is created for absent Naura.
2. Manager reviews a draft group and publishes. Only related guardians see their child's record. No universal publish without explicit confirmation and audit entry.
3. A parent changes morning instructions. Only authorized assigned caregiver/manager sees the note; the acknowledgment appears on the parent view.
4. A recurring pickup uses preapproved permission, not repeated management approval; a substitute person cannot trigger handover before verified guardian authorization.
5. Pickup audit contains child, guardian authorization, pickup person, staff actor, verified timestamp, method, handover status and any (optional) Elenio evidence ID with time-bounded permission. Video alone does not determine identity.
6. Child's development report references approved observations, is signed off by responsible manager/educator, and becomes accessible only to that child's linked guardians.
7. CRM tour/trial optional. Enrolled lead creates linked child/guardian records without duplicate data and protects against repeated submit.
8. Parent LEO answers refer to authorized published activity source/time; when no record exists, explicitly say "belum tercatat".
9. Phone 390px: quick activity can be finished without entering children's profiles; touch targets at least 40–44px recommended and forms preserve state during navigations.
10. Run automated role/tenant tests, photo authorization, revocation, duplicate submit, offline retries, keyboard accessibility and layout tests.

## Items deferred / not invented

CCTV camera ingestion, RTSP/ONVIF, video gateway, analytics engine, WhatsApp Business API inbox, live external LEO provider, actual payment gateway, and push-notification provider. Expose integration adapters/contracts only; preserve Elenio existing services. Production photography must be licensed.
