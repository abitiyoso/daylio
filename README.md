# Daylio by Elenio

Next.js/TypeScript, PostgreSQL RLS, Supabase Auth, private photo storage, role-scoped daycare operations and a disabled Elenio adapter. The supplied v4 layout, CSS, photography assets and official Elenio mark are retained. See `IMPLEMENTATION_STATUS.md` for exact F01–F42 coverage and unresolved release gates.

## Run an isolated local sandbox

Requires Node 24 and pnpm. From this directory:

```powershell
pnpm install --frozen-lockfile
node scripts/prepare.mjs
# First use, or explicitly rebuild the fictional showcase; stop preview first:
pnpm sandbox:reset
pnpm sandbox
```

Open `http://127.0.0.1:3100`, then **Masuk**. Synthetic accounts: `owner@daylio.test`, `manager@daylio.test`, `caregiver@daylio.test`, `parent@daylio.test`, `otherowner@daylio.test`, `otherparent@daylio.test`, and `admin@daylio.test`. Password for these local fixtures only: `Sandbox-only-2026!`. Admin console: `/platform`.

The fictional showcase persists under ignored `data/sandbox` with private example media in `data/sandbox-media`. Initialization/reset is explicit, never performed at application startup. `pnpm sandbox:reset` archives only these two local directories in `data/sandbox-backups/<timestamp>/` and writes a reset report before reseeding. It refuses production mode, DATABASE_URL, custom paths, symlinked targets and a running preview. Existing `data/media` is left untouched. The app and identity fixture bind to localhost and show one small environment badge. It cannot verify real emails or stream cameras. Port 4011 is the isolated identity fixture. Do not deploy either fixture or put real child information in it.

## Backend v3 workspace

The approved reference package is preserved under `design-reference/`. The existing workspace now opens a role-specific operations view, backed by the same authenticated API and database. Earlier administrative tools remain available through **Administrasi lanjutan** or `/workspace?tools=1`.

See `docs/DAYLIO_V3_GAP_ANALYSIS.md`, `docs/DAYLIO_V3_WORKFLOW_MAP.md`, and `docs/BACKEND_V3_API.md`. Local evidence and responsive screenshots are tracked in `IMPLEMENTATION_STATUS.md`. Migration 011 adds care/development records and permission policy after the original ten migrations without replacing existing records. The synthetic sandbox uses a one-time versioned six-present/one-absent fixture; it does not re-create attendance after every checkout. Sandbox-only HTTP rate allowances are larger for repeated UI acceptance runs; production limits are unchanged.

CCTV and Video Analytics are explicitly deferred; see `docs/ELENIO_INTEGRATION_NEXT.md`. Do not deploy the reference prototype or sandbox identity/data as production.

## Production-shaped environment

Copy `.env.example` to `.env.local`; populate the database, Supabase Auth and media settings. Configure email templates as described in `docs/OPERATIONS.md`.

```powershell
node --env-file=.env.local scripts/migrate.mjs
node scripts/prepare.mjs
pnpm build
pnpm start
```

No live service credentials are supplied. Normal app routes return honest unavailable errors until configured. Elenio remains disabled until its actual APIs, authorization and playback protocol are verified; no new video gateway or analytics service exists in this project.

## Verification

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
# Chrome is required. Tests start their own isolated local server:
pnpm test:browser
# Two runs proving the showcase stays unchanged:
node scripts/run-browser-regressions.mjs --suite=entry --repeat=2
# Read-only business data capture of all four preview roles at 1440/820/390:
pnpm screenshots:showcase
```

Database tests apply every SQL migration to an actual embedded PostgreSQL engine and use restricted roles. Browser tests use synthetic identities, real HTTP routes, persistent database records and real image processing. They are not evidence of deployed Supabase/Elenio integration. Screenshots and machine-readable evidence are under `evidence/`.

API inventory: `docs/openapi.json`. Security/storage decisions: `docs/ARCHITECTURE.md`. Deployment, workers and restore procedure: `docs/OPERATIONS.md`. External integration gaps: `ELENIO_API_DISCOVERY.md`. P2: `docs/P2_MILESTONES.md`.

All included photographs are retained source assets. Their production license/provenance has not been verified; the original kit explicitly identifies concept fallback crops. No public-stock hotlinks are loaded at runtime. Replacing them with licensed production photos is a launch gate, separate from preserving the supplied v4 design.

Email access configuration and local evidence: [docs/EMAIL_ACCESS.md](docs/EMAIL_ACCESS.md). Run `node scripts/run-browser-regressions.mjs --suite=access` to verify the invitation workflow.


## Clean showcase and QA isolation

Browser suites reject the preview server and require a run-bound health identity. The runner creates a new database, media and build folder under `data/qa-runs/run-*/` for each suite on ports 3101/4012. It removes them in `finally`, on test failures, and on handled interruption. Production/hosted connection variables are refused. It fingerprints the preview records before and after each run and reports whether they changed. Do not invoke old browser scripts directly against port 3100. See `docs/UI_CLEANUP_VERIFICATION.md` for evidence, reset/backup details and reference comparisons.

Sample activities are compressed into elapsed time on the explicit seed date; tour appointments and pickup expiry remain future scheduled times. On another day, the preview correctly does not show old activity as today. Reseeding a new fictional example day is an opt-in action, not a startup behavior.
