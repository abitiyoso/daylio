# UI correction and data lifecycle — 18 October 2026

## Local implementation

The existing branch is `codex/backend-v3-workflows`. No application, authentication provider, database schema, RLS policy or migration was replaced. The v4 landing files and original Elenio image are unchanged by this correction. CCTV/Video Analytics and external LEO/WhatsApp providers remain deferred.

`lib/sandbox-paths.mjs` separates the explicit local showcase from each QA run. `scripts/run-browser-regressions.mjs` creates a new database, private-media directory and Next build directory per suite under `data/qa-runs/run-*/`, on ports 3101/4012. Browser scripts check both the localhost origin and a matching run identifier from the sandbox-only health response before any mutation. Merely pointing a browser test at localhost:3100 is rejected. Production mode, DATABASE_URL, path traversal and sharing the showcase database are refused. Unit tests cover these negative cases. The runner removes only its own verified temporary path in `finally`, including failures and handled interruption, and restores Next-generated config references. It fingerprints showcase records before/after every suite. No fixture IDs or timestamps are added to normal customer copy.

Preview uses `data/sandbox` and `data/sandbox-media` on ports 3100/4011. There is no automatic startup reset or daily rollover. The opt-in `pnpm sandbox:reset` requires the preview stopped; it rejects custom/hosted paths and symlinks. It moves exactly the two local showcase directories to `data/sandbox-backups/<timestamp>/`, creates a manifest before seeding, and preserves backups on failure. Old `data/media` is left untouched and is not served by the new preview. The original contaminated database remains in the 17 October backup; the final 18 October reset report is copied to `evidence/showcase-reset-report.json`. Never commit the database, media archives or credentials.

To recover a previous local snapshot, stop preview and inspect that backup's manifest. Preserve the current showcase in another local backup first, then restore the saved `sandbox` and matching `sandbox-media` directories to their exact original paths. The first contaminated snapshot used legacy `data/media`, which is deliberately still present. This is a local fixture recovery procedure, not a hosted backup/restore drill.

## Curated fictional data

Seven children (six present), two linked siblings, named owner/manager/caregiver, classroom capacity, guardian-approved routine pickup, substitute review, one acknowledged morning note per child, published care, one reviewed story per child/day, draft batch, separate reviewed observations/report, inquiries, followups and a tour. Fictional sample times are generated within elapsed time on the explicit seed date; pickup expiry and scheduled tours can be future times. On later dates the API correctly does not relabel old activity as today. Refreshing the example day requires explicit reset.

One private photographic example is copied from the approved kit. It is explicitly captioned as an example, never represented as a real customer's child. It is delivered through the same signed, authenticated, consent-checked route as other photos. Its production license is not claimed. QA swatch uploads occur only in ephemeral QA storage. The gallery can enlarge a photo in a native modal with keyboard focus containment/Escape; image grants are refreshed on opening. Revoked consent and unrelated-user denial remain covered by regressions.

## Presentation and retained workflows

Body text is 16px, supporting text 13–14px, fields 16px, and primary controls at least 44px. The approved navy/cream/coral/teal design is retained; coral button foreground and muted text were darkened for readability. Owner retains branch/date filtering, capacity, enrollment funnel and operational drilldowns. Manager shows grouped batch exceptions and truthful closing. Caregiver retains present-child selection, per-child overrides and grouped publication. No review, identity verification or human-confirmation requirements were bypassed.

Parent Today includes child/class/age identity, attendance, latest published meal/sleep, one Daily Story, consent-gated gallery, current pickup and latest handover acknowledgment. `parent/today` returns four initial activities, at most three photos, the latest morning note plus bounded older notes/counts. The story and source chronology use the real persisted event/publication dates. Older handovers are collapsed; activity history uses ten-item pages and story history five-item pages, backed by the existing authorized workspace window. The existing 1,500-record workspace limit remains; server cursor expansion is a separately documented milestone, not claimed here. Test labels are fixed at their source/lifecycle; production copy is not cleaned with string replacement.

## Evidence

- `evidence/cleanup-tests.txt`: 39 automated tests, including RLS, media consent/revocation, cross-tenant/child denial, actual pickup evidence, expired authorization and history bounds.
- `evidence/isolated-browser-results.json` and `evidence/cleanup-browser-run.txt`: full five-suite local browser run (legacy, care, business, entry, access).
- `evidence/isolated-browser-entry-results.json`: two consecutive runs with identical before/after showcase fingerprints and teardown.
- `evidence/cleanup-visual-results.json`: twelve role/viewport checks at 1440/820/390, no overflow/page errors or QA identifiers; one coherent morning note, one example photo, three activities and no future completed activity; private-photo modal/history interactions.
- `evidence/screenshots/cleanup/`: full-page and viewport screenshots for Owner, Manager, Caregiver and Parent, plus Parent Story and overview images.
- `evidence/design-qa/cleanup/comparison-manifest.json`: exact source/actual sizes, crops, state and density. The approved HTML is rendered read-only for matching Quick Care and Manager mobile/tablet states; it is not added to the application's routes.
- `design-qa.md`: manual comparison, iteration findings, resolved differences and local acceptance result.

## Provider / production verification

These results are LOCAL VERIFIED. Hosted Supabase/SMTP delivery, external LEO runtime, official WhatsApp provider, camera/video services, shared production storage, image licensing, hosted restore and assistive-technology UAT are not verified. No external messages or real child data were used. No deployment or merge is claimed.
