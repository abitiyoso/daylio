# Data model, tenant isolation and role permissions

## Required domains and suggested relational tables

- **Accounts & configuration:** `organizations`, `branches`, `classrooms`, `memberships`, `invitations`, `org_settings`, `staff_assignments`, `shifts`.
- **Children & authorizations:** `children`, `child_care_instructions`, `guardian_child_links`, `authorized_pickups`, `pickup_events`, `consent_records`, `data_requests`.
- **Daily operations:** `attendance_events`, `activity_logs`, `activity_media`, `shift_handoffs`, `incidents`, `incident_updates`, `announcements`, `messages`, `notifications`, `delivery_attempts`.
- **Marketing & enrollment:** `demo_leads`, `enrollment_leads`, `lead_events`, `tour_bookings`, `trials`, `followup_tasks`, `enrollments`.
- **Existing Elenio references only:** `elenio_camera_links`, `camera_access_policies`, `camera_access_sessions`, `elenio_event_refs`, `integration_status`. **Do not store RTSP passwords, camera configs, replicated video or an alternative gateway registry.**
- **LEO:** `ai_queries` (minimal metadata), `ai_drafts` (scoped, retention restricted).
- **Later billing:** `fee_plans`, `invoices`, `invoice_items`, `payments`, `payment_events`, `plan_subscriptions`, `usage_meter`.
- **Platform/system:** `audit_logs`, `retention_jobs`, `report_jobs`, `job_runs`, `support_access`.

Every tenant-domain record must include a server-verified organization boundary. Scope branch/classroom/child appropriately. Use database foreign keys and RLS/policy checks; never rely solely on React route visibility. Avoid storing unnecessary health details and protect sensitive care instructions separately.

## Permissions matrix

| Action | Platform admin | Owner | Manager | Caregiver | Parent |
|---|---|---|---|---|---|
| Manage tenant registration/subscription | Policy-controlled | Own tenant | No | No | No |
| Edit organization/branches/classrooms | With audited support approval | Yes | Limited delegated | No | No |
| Manage staff and roles | Audited | Yes | Limited delegated | No | No |
| Child records | Support-by-exception only | Own daycare | Own daycare | Assigned child relevant fields | Own linked child view only |
| Record attendance/care | Support-by-exception only | Yes | Yes | Assigned children | Read linked child published records |
| Upload photos | No routine access | Controlled | Controlled | Assigned children | No public upload by default |
| View/access child private media | No routine access | Allowed staff scope | Allowed staff scope | Assigned children | Linked child only |
| Report incident | Support-by-exception only | Yes | Yes | Yes | Parent submits concern (separate) |
| Read incident full detail | Not by default | Authorized management | Authorized management | Own assigned cases | Only approved parent-facing updates |
| Manage prospects and tours | Platform leads only | Yes | Yes | No | Prospect own request |
| CCTV camera management | Existing Elenio service authority | Daylio room links/policies | Delegated only | No | View permitted camera only |
| Issue parent stream session | No blanket override | Via policy flow | Via policy flow | No | Only own authorized entitlement |
| LEO answers | Cross-tenant no | Tenant-wide approved ops | Scoped tenant ops | Assigned-child tasks only | Linked-child published facts only |
| SaaS billing, support | Yes (approved, audited) | Read own tenant | No | No | No |

## Concrete isolation tests

1. Two owners each create same child display name; queries, routes, files, LEO tools and camera grants cannot cross tenants.
2. Parents with two children can switch between linked children; no access to third unlinked child despite URL tampering.
3. Moving a caregiver between classes removes old assignments and relevant data access immediately.
4. Parent/consent revocation invalidates newly issued camera/AI authorization and sessions as supported by Elenio's enforcement; otherwise camera feature blocked until corrected.
5. An owner cannot read platform-wide billing or support records; a platform support user cannot casually browse child media.
6. Database RLS blocks direct bypass even if server handler accidentally omits a filter.
7. Media signed URLs expire and cannot be generated for unlinked child; uploads refuse disallowed MIME and large files.
8. Changes to published activities, incidents, payments, authorized pickup, camera policies retain audit events and actor.
