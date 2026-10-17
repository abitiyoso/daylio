# START HERE — Daylio by Elenio v5 complete full-stack implementation kit

**Goal:** turn existing Daylio v4 marketing/prototype into a functional, multi-tenant daycare SaaS. Keep same design, photo-led owner-first business copy, unchanged official Elenio logo. Build Daylio-specific frontend, API, DB, permissions, AI contextual tools and operational workflows. **Reuse Elenio existing CCTV/video gateway/video analytics**; never rebuild them.

## First Codex instruction

> Read `DAYLIO_MASTER_CODEX_PROMPT.md` and every referenced specification. Start by inspecting the entire repository and, if accessible, the existing Elenio backend repo. Create `IMPLEMENTATION_STATUS.md` covering **F01–F42** from `FUNCTIONAL_BACKEND_MATRIX.md`, each with UI/API/DB/security/tests status. Implement P0 (real daycare core) and P1 (AI + securely reused CCTV + growth), and list P2 (billing/subscription extensions) with explicit milestones. Use the existing v4 design without redesign. Do not finish with mock screens. Never create a second video gateway. Verify all claimed completion with tests.

## Package contents

- `daylio-web/` = actual existing static v4 source & asset references (this is not a ready-built backend).
- `references/` = visual screenshot targets.
- `brand-official/` = supplied original ELENIO brand files; copy files unmodified, do not trace/recreate logos.
- `DAYLIO_MASTER_CODEX_PROMPT.md` = comprehensive build intent.
- `FUNCTIONAL_BACKEND_MATRIX.md` / `.csv` = **F01–F42**, each UI + backend + DB + role + stage + acceptance; master completion inventory.
- `DAYLIO_API_REFERENCE.md` = **proposed** Daylio API contract (not existing Elenio endpoints).
- `DATA_MODEL_ACCESS_CONTROL.md` = tables and authorization boundaries.
- `ACCEPTANCE_TEST_PLAN.md` = realistic E2E and release criteria.
- `ELENIO_INTEGRATION_CONTRACT.md` = discovery checklist for Elenio system.
- `EXECUTION_RUNBOOK.md` = ordering and milestone rules.

**Honest status:** Full requested coverage is documented. Daylio backend/LEO integration has not been implemented by this kit. The pre-existing Elenio backend API/repository has not been inspected in this session, so existing route support, auth and video-session mechanism remain to be verified by Codex.
