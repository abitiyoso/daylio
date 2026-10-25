# Backend v3 API additions

All paths below are under `/api/v1`. The existing verified session/Bearer identity, `x-organization-id`, mutation same-origin protection, strict JSON validation, RLS transaction and error envelope apply. Use a stable `idempotency-key` for retrying an unchanged POST. JSON responses use `{data, requestId}`; PDF endpoints return authenticated base64 PDF data, not a public URL. Full older API inventory remains in `DAYLIO_API_REFERENCE.md` and generated OpenAPI.

| Method / path | Authorized roles | Payload / result |
|---|---|---|
| GET `workspace/context` | All | Actual role, organization, scoped children/classes/current attendance, authorized records, care policy and capabilities |
| GET `care/today`, `care/policy` | Staff | Assigned/tenant care context and owner-configured publication/substitute policy |
| POST `activities/batch` | Staff | `{childIds, classroomId?, data:{type,note,result?,occurredAt}, exceptions?:{childId:{note?,result?,type?,occurredAt?}}}`; each child must be present and assigned; server batch ID/review flag |
| POST `activities/batches/:batchId/publish` | Management or allowed caregiver author | `{confirmed:true}`; atomic publish of visible batch drafts |
| GET/POST `morning-notes` | Scoped read / parent create | `{childId,note}` → submitted |
| PATCH `morning-notes/:id` | Parent author | `{note}` → submitted, previous acknowledgment retained in history |
| POST `morning-notes/:id/acknowledge` | Assigned staff | Actor/time → acknowledged |
| GET `manager/exceptions`, `manager/closing` | Management | Actionable source records; closing also includes still-present/missing-story items and prior snapshots |
| POST `manager/closing` | Management | `{note,confirmed:true}`; stores unresolved references, never silently resolves |
| GET/POST `daily-stories` | Scoped read / staff create | `{childId,date,note,sourceIds}`; published same-child/day activity IDs required |
| PATCH `daily-stories/:id` | Management or caregiver author | `{note}` → draft |
| POST `daily-stories/:id/publish` | Management or policy-authorized author | `{confirmed:true}`; source revalidation and daily bundle notification |
| GET `parent/today?childId=` | Linked parent | Published same-child/day meal, sleep, activity, story, own morning note, attendance, pickup and reports; missing records stay null |
| GET/POST `pickup-authorizations` | Scoped read / linked parent create | `{childId,data:{name,relationship,kind:'routine'\|'substitute',expiresAt,validFrom?,days?:[0..6]}}` |
| POST `pickup-authorizations/:id/approve` | Management | Current guardian permission rechecked; routine already approved |
| POST `pickup-authorizations/:id/revoke` | Management or parent author | Audit + revoked state |
| POST `pickups/:authorizationId/verify-handover` | Assigned staff | `{verificationMethod:'physical-id'\|'known-authorized-person',verifiedPersonName,identityNote,handoverConfirmed:true}`. Substitute requires physical ID; name must match; atomically records pickup + attendance out |
| GET `pickups` | Scoped | Actual audit evidence, no fabricated camera evidence |
| GET `passports/:childId` | Scoped | Current approved passport and authorized proposals |
| POST `passport-changes` | Linked parent | `{childId,data:{allergies,careInstructions,emergencyName,emergencyPhone,authorizedContacts:[{name,relationship,phone}]}}` |
| POST `passport-changes/:id/approve` or `/reject` | Management | `{note,confirmed:true}`; approval versions current passport |
| GET/POST `development-rubrics` | Staff read / management create | `{name,version,ageMinMonths,ageMaxMonths,domains:[]}` |
| GET/POST `observations` | Scoped staff | `{childId,rubricId,domain,observedOn,note}`; age/domain/version guards |
| POST `observations/:id/submit` | Assigned author or management | Draft → submitted |
| POST `observations/:id/approve` or `/reject` | Management | `{note,confirmed:true}` |
| GET/POST `development-reports` | Published parent read / management create | `{childId,title,from,to,note,sourceIds:[approvedObservationId]}` |
| POST `development-reports/:id/publish` | Management | `{confirmed:true}`; human sign-off |
| GET `development-reports/:id/pdf` | Scoped staff or linked parent of published report | Current permission checked; private base64 PDF with observation sources |
| GET `crm/overview` | Owner/delegated CRM manager | Existing leads, followups, tours, trials and saved drafts |
| POST `crm/leads/:id/whatsapp-draft` | CRM | `{purpose:'reply'\|'follow-up'\|'tour'\|'enrollment',text}`; never sent automatically |
| POST `crm/leads/:id/qualify` | CRM | `{childAgeMonths,desiredSchedule,desiredStart,classroomId,packageInterest,nextOwnerId?}`; validates actual class/staff and stores dated qualification event |
| POST `crm/whatsapp-drafts/:id/copy` or `/open` | CRM | Audit human copy/open action; delivery remains not-sent |
| POST `crm/leads/:id/confirm-enrollment` | CRM | `{name,classroomId,email,packageName,packagePrice,emergencyName,emergencyPhone,confirmed:true}`; positive IDR price, capacity lock, existing atomic enrollment/invitation, incomplete initial passport. The retained `leads/:id/enroll` route uses this same validation; there is no legacy bypass. |
| GET `owner/business-pulse?date=&branchId=` | Management | Persisted roster, capacity, attendance, story coverage, lead state and exception records; no invented denominator |
| POST `leo/caregiver/query` | Assigned staff | `{childId,question}`; published authorized sources, provider not connected |
| PATCH `classrooms/:id` | Management | `{name,capacity?,caregiverRatio?}`; positive configured denominators, audited |
| PATCH `children/:id` | Management | `{name,birthDate?}`; actual birth date used for age-based rubric checks, future birth dates denied |
| POST/PATCH existing `settings` | Owner only | Existing hours/timezone + optional `routinePublishing`, `substituteReview`, `managerCrm`, `managerFinance` |

The workspace record window is bounded at 1,500; existing paginated children endpoint remains available. Cursor pagination across all new list endpoints is a documented hardening milestone. Current pickup verification is a human action, not automated proof of identity. Routine authorization date/day fields use Jakarta operational time; browser date/time entries are submitted as explicit ISO instants.
