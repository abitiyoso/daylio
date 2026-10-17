# Daylio by Elenio

Next.js/TypeScript, PostgreSQL RLS, Supabase Auth, private photo storage, role-scoped daycare operations and a disabled Elenio adapter. The supplied v4 layout, CSS, photography assets and official Elenio mark are retained. See `IMPLEMENTATION_STATUS.md` for exact F01–F42 coverage and unresolved release gates.

## Run an isolated local sandbox

Requires Node 24 and pnpm. From this directory:

```powershell
pnpm install --frozen-lockfile
node scripts/prepare.mjs
node scripts/dev-sandbox.mjs
```

Open `http://127.0.0.1:3100`, then **Masuk**. Synthetic accounts: `owner@daylio.test`, `manager@daylio.test`, `caregiver@daylio.test`, `parent@daylio.test`, `otherowner@daylio.test`, `otherparent@daylio.test`, and `admin@daylio.test`. Password for these local fixtures only: `Sandbox-only-2026!`. Admin console: `/platform`.

The sandbox persists under ignored `data/sandbox`, binds the app and identity fixture to localhost, displays a sandbox banner and refuses production mode. It cannot verify real emails or stream cameras. Port 4011 is the isolated identity fixture. Do not deploy either fixture or put real child information in it.

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
# With the localhost sandbox running and Chrome installed:
node scripts/browser-test.mjs
```

Database tests apply every SQL migration to an actual embedded PostgreSQL engine and use restricted roles. Browser tests use synthetic identities, real HTTP routes, persistent database records and real image processing. They are not evidence of deployed Supabase/Elenio integration. Screenshots and machine-readable evidence are under `evidence/`.

API inventory: `docs/openapi.json`. Security/storage decisions: `docs/ARCHITECTURE.md`. Deployment, workers and restore procedure: `docs/OPERATIONS.md`. External integration gaps: `ELENIO_API_DISCOVERY.md`. P2: `docs/P2_MILESTONES.md`.

All included photographs are retained source assets. Their production license/provenance has not been verified; the original kit explicitly identifies concept fallback crops. No public-stock hotlinks are loaded at runtime. Replacing them with licensed production photos is a launch gate, separate from preserving the supplied v4 design.
