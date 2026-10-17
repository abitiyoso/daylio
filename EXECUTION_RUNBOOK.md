# Codex runbook — exactly what to do

1. Read `START_HERE.md`, `DAYLIO_MASTER_CODEX_PROMPT.md`, `FUNCTIONAL_BACKEND_MATRIX.md`, `DAYLIO_API_REFERENCE.md`, `DATA_MODEL_ACCESS_CONTROL.md`, `ACCEPTANCE_TEST_PLAN.md`, `ELENIO_INTEGRATION_CONTRACT.md`.
2. Inspect source directory `daylio-web/`, screenshot references, official logos. Preserve v4 layout, owner-first pitch and photo intent.
3. Inspect repo(s) available in workspace. If backend Elenio repo missing: ask for repo/API contract once, proceed with independent Daylio P0 functions and prepare stubbed, **disabled-by-default** video adapter with contract tests. Do not assume URL `demo.elenio.id` is an API specification.
4. Establish baseline: what works, what is frontend-only, confirmed existing Elenio methods, proposed Daylio endpoints. Write `IMPLEMENTATION_STATUS.md` with every function F01–F42 and current status.
5. Choose compatible stack: Next.js/TypeScript/Postgres/Supabase if no pre-existing approved backend. Type-safe schemas, DB migrations, RLS/permission tests, private storage, auth and user invitations before real data.
6. Execute P0 end to end, function-by-function. For each Fxx: UI → API → DB → authorization → tests → evidence → mark complete. Do not mark as complete if only the UI is built.
7. Execute P1: lead conversion, LEO, secure reuse of actual Elenio video/analytics API, parent authorization and errors. Integrations only enabled after successful contract/security testing.
8. P2 commercial extensions may be staged. Record stage boundaries, unmet dependencies, owners and acceptance tests without hiding them.
9. Run lint, typecheck, build, migrations, automated tests, screenshot QA at 390/768/1440 px. Provide tested setup docs, `.env.example` without secrets, OpenAPI schema and deployment notes.
10. Do not begin a rebuild of Elenio VMS or RTSP/ONVIF gateway; prefer least-privilege adapter and minimal approved enhancement to existing Elenio service if essential API is missing.

**Definition:** The packet is a complete BUILD REQUIREMENTS package, not an implemented backend. Finish with a reviewable pull request, runnable app instructions, DB migrations and test evidence for everything claimed complete.
