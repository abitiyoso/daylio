# P2 milestones

These are dependency-based milestones, not invented calendar commitments. P0 and P1 verification takes precedence. Each gate must be recorded in `IMPLEMENTATION_STATUS.md` before enabling it.

| Milestone | Scope | Owner | Dependencies | Acceptance gate |
|---|---|---|---|---|
| M1 | F32 external LEO summary generation | Daylio + Elenio service owner | Verified runtime schema, privacy/cost policy | Scoped fixtures and prompt-injection tests; user reviews edits; generated facts never auto-publish. Record-based draft/approval already implemented. |
| M2 | F33 recurring fee schedules and commercial invoice lifecycle | Daylio + daycare finance owner | Approved billing cadence and corrections/refund policy | Schedule retries create one invoice per child/period; accurate line totals; due reminders. Manual invoices and audited transfer confirmation already implemented. |
| M3 | F34 provider settlement | Payment integration owner | Chosen provider, signing contract, sandbox credentials | Invalid signatures denied, replay idempotent, amount/currency/invoice matched, refunds/reconciliation tested. Callback disabled until verified. |
| M4 | F35 SaaS commercial plans and usage | Platform product/finance owner | Approved entitlements, price and grace-period policy | Tenant subscriptions readable by owner, admin changes audited, child creation caps tested; essential existing care/incident/pickup access stays available. Broader usage/proration/trial expiry remains. |
| M5 | Production privacy, storage and recovery | Daycare operator + platform ops | Reviewed retention/deletion policies, shared storage, staging environment | Child deletion/export SOP, verified restore of PostgreSQL plus photos, provider delivery tests, failure alerts and launch approval. |

F20 is implemented as P1 per the matrix even though one supplied acceptance-plan paragraph groups handovers with P2. The function matrix is the completion inventory.


## 24 October v10 progress

M1 now includes a persisted source-hashed work-item lifecycle for two allowlisted internal outputs, with human approval and permission revalidation; external inference remains unconnected. M2 now has approved recurring rules, worker generation, unique monthly invoices and verified manual receipt PDFs; invoice adjustments/refunds and branded layouts remain. M4 now has real catalog prices, 14-day trial/expiry, server/RLS entitlements, child quotas and separate SaaS invoices verified by platform administration. Proration, active-term switching/scheduled downgrade and provider payment lifecycle remain. M3 and M5 still require their external/operational acceptance gates. See `BACKEND_V10_API.md` and the latest evidence in `IMPLEMENTATION_STATUS.md`.
