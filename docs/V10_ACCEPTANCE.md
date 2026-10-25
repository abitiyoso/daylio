# v10 journey evidence

Local acceptance uses real authenticated HTTP routes and persistent PostgreSQL records with disposable identities and databases. It does not demonstrate delivery to an actual inbox, a bank settlement, external inference or live Elenio connectivity. `IMPLEMENTATION_STATUS.md` remains the per-function completion ledger.

| Journey | Evidence / authorization boundary |
|---|---|
| Public landing → login → role dashboard | `browser-entry-test.mjs`: desktop/mobile entry for all four roles; persisted scoped API data after reload |
| Owner signup → verified identity → daycare/branch | `browser-v10-journey.mjs`: actual registration UI and one-use provider-contract email proof; unverified sessions rejected |
| Owner invites manager/caregiver → password setup | v10 and access suites; actual access UI, verified invitation, explicit server role; no role chooser grants |
| Guardian invite → only linked children | access/v10 suites and RLS tests; no unrelated family visibility |
| Classroom setup and capacity | v10 UI plus schedule tests; actual class/age/ratio configuration and DB guards |
| Staff roster → future trial booking | v10 planner UI; coverage and time/room conflicts checked at server/database |
| Competing final-slot bookings | `v10-schedule.test.mjs`; tenant advisory lock, reserved seats, disjoint time intervals and revision/history |
| CRM qualification/contact edit/PIC/waitlist | business UI and schedule test; qualifications retained, normalized shared contacts warned, active same-tenant PIC only, append-only status history |
| Trial → enrollment → parent invitation | v10 and business suites; actual price/slot/emergency confirmation, prospect reservation cancelled atomically, existing child not duplicated on replay |
| Classroom attendance → batch care exceptions | care suite; only present/assigned children, one exception per child, persisted drafts, stable idempotent retry |
| Manager review → publication | care suite; human confirmation, grouped review, unpublished care hidden from guardians |
| Morning note → caregiver acknowledgment | care suite; linked guardian submits, assigned caregiver reads, sibling context replaces previous child data |
| Daily Story → private photo and history | care/legacy/business suites; published sources, current consent/grant, revoked guardian URL denied, no fabricated evidence |
| Routine pickup | care suite; guardian authorization, expiry/revoke and physical verification, explicit handover and atomic attendance checkout |
| Substitute pickup | care suite; requested → manager-approved → physical verification → single use; bypass before approval denied |
| Shift handoff / Daily Closing | care + existing workflow tests; actual recipient acknowledgment, unresolved safeguarding items remain open |
| Care Passport change → approved version | business suite; guardian proposal, human manager review, scoped approved version |
| Observation → reviewed report → guardian PDF | business suite; source observations, human sign-off and private child-scoped export |
| Family recurring invoice → manual verification → receipt | v10 + commercial tests; approved rule, one invoice per month, independent staff confirmation and own-family receipt |
| Separate SaaS invoice → admin verification → entitlement | v10 + commercial tests; server catalog price, pending request cannot self-activate, exact amount/reference and audit; Essential denies premium APIs while care/history remains |
| Pending SaaS cancellation → replacement → verified next-period change | subscription browser + lifecycle SQL tests; owner confirmation/reason, independent admin payment verification, full purchased time retained, future Essential period while Growth remains current; exact date-based gates and recurring worker eligibility |
| LEO question / proposed work → approved internal draft | business + schedule tests; assigned/published sources, hash revalidation, explicit human approval/execution, no auto-send/publish/financial/pickup action |
| Existing Elenio boundary | commercial + existing workflow tests; live stream unavailable, optional signed metadata bridge disabled by default, actual event ID deduplication, human review and explicit incident link; tenant sessions cannot forge events |
| No preview contamination | runner health/run guards, new DB/media/build per suite, cleanup in `finally`, before/after business fingerprint; screenshot capture blocks business mutations |

The embedded PostgreSQL engine exercises the actual SQL and restricted roles. Multi-connection hosted PostgreSQL load/race tests and operational UAT are still required before production. `evidence/v20-v10-audit/final-browser-acceptance.json` consolidates the six actual passing outcomes with links to their raw runs. Five suites passed in the aggregate run; the access suite passed separately after development-route warmup. Original failed/intermediate logs are retained rather than rewritten as passes.

The newer subscription-continuation regression runs all **seven suites successfully together** in `evidence/isolated-browser-results.json`, with raw output at `evidence/subscription-phase/full-browser.txt`. A subsequent subscription-only repeat verifies settled mobile navigation/capture; its separate artifact is `evidence/isolated-browser-subscription-results.json`. The complete backend suite now has 51 passing tests. No hosted provider/payment claim is made by these local fixtures.

V20 source/actual and section comparisons: `evidence/v20/`; real Chrome zoom 100/125/150 at six widths: `evidence/v20/zoom/`. Authenticated four-role comparisons at 1440/1024/768/390/320: `evidence/v10/`. Compare images put the approved reference on the left and actual authenticated application on the right. Actual records, permission states, initials and the visible fictional-environment badge intentionally differ from the prototype's hardcoded identities and metrics.
