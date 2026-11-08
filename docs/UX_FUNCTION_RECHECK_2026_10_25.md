# UX and function recheck — 25 October 2026

Scope: existing Daylio branch `codex/backend-v3-workflows`, local authenticated preview and disposable PostgreSQL-compatible test databases. The user requested another UX/function check across roles. This report uses screenshots and test runs captured during this recheck, rather than treating previous acceptance as current evidence.

## Findings and corrections

| Priority | Evidence / step | Finding | Correction |
|---|---|---|---|
| P1 | Step 2; `01-owner-before.png`; existing search component | Search required Enter without a visible submit control. It was entirely hidden below 1025px. | Visible submit button, labeled search form, readable input and mobile search toggle with input focus. Same authenticated API and record permissions. |
| P1 | Step 6; real API delayed-response tests | Editing the query or pressing Escape could allow the previous request's response to reopen outdated results. Errors were also retained while editing. | Request generations invalidate old responses on edit, dismissal and unmount. Results/error/loading clear together. The component remounts on organization change. |
| P1 | Step 6; `rejected-left-clipped-search.png` | First mobile implementation clipped the popup's left edge at 320px even though document scroll-width assertions passed. | Anchor the popup to the header with explicit viewport margins; test both element edges at 1440/390/320px. Rejected screenshot retained as failure evidence, not final acceptance. |
| P2 | Step 6; sidebar implementation and responsive assertions | Closed off-canvas navigation was translated offscreen but its controls could still receive focus. Menu buttons did not expose expanded state. | Closed mobile sidebar is hidden from focus/accessibility navigation; both menu triggers expose expanded state and controlled sidebar ID. |
| QA | Step 1 / public showcase | One initial role-suite run clicked server-rendered CCTV controls before their effect attached. A new search test assumed the obsolete fixture name `Anak Sandbox`. | Wait for actual initialized marketing content; use the current fixture name `Anak Uji 1`. Retain failed logs. These are harness corrections, not claims of broken authorization or stored data. |

No schema, role grant, camera service, logo, published activity record or original photo was replaced by this recheck. Whitespace-only search gets an understandable validation message. Search retry, empty state, Escape, outside dismissal and network-failure recovery have dedicated browser checks.

## Captured steps

1. **Entry and identity.** Current workspace login observed in the in-app browser. Isolated entry/access journeys check login, verification, invitations and role restrictions. The local identity provider is a contract fixture; this does not establish real inbox delivery.
2. **Owner.** Summary, search → child profile, account permissions, calendar, finance, subscription and grouped administration. Actual saved showcase [dashboard](../evidence/recheck-20261025/previews/owner-1440.png), [mobile](../evidence/recheck-20261025/previews/owner-390.png), and [search from the real preview API](../evidence/recheck-20261025/03-owner-search-actual.png).
3. **Manager.** Control Tower, exception/review entry points, child data, access and administration. [Desktop](../evidence/recheck-20261025/previews/manager-1440.png), [mobile](../evidence/recheck-20261025/previews/manager-390.png). Empty attendance is represented as zero rather than invented present children.
4. **Caregiver.** Today, classroom-first batch care, pickup and handoff. [Desktop](../evidence/recheck-20261025/previews/caregiver-1440.png), [mobile](../evidence/recheck-20261025/previews/caregiver-390.png), [batch logging fixture](../evidence/recheck-20261025/roles/screenshots/caregiver-1-390.png). Mutation journeys separately verify saved drafts/publication and role boundaries.
5. **Parent.** My Child Today, published Daily Story, pickup authorization, messages and passport. [Today desktop](../evidence/recheck-20261025/previews/parent-1440.png), [Today mobile](../evidence/recheck-20261025/previews/parent-390.png), [Story desktop](../evidence/recheck-20261025/previews/parent-story-1440.png), [Story mobile](../evidence/recheck-20261025/previews/parent-story-390.png). Today's unrecorded activity remains an honest empty state; previously published history remains accessible.
6. **Responsive search and navigation.** Four roles at desktop, 390px and 320px. Final search screenshots and assertions: [results](../evidence/recheck-20261025/search/results.json). Checks include actual authenticated search output, profile navigation, cross-tenant denial, no prospect results for Parent/Caregiver, response dismissal and menu visibility. Screenshot inspection caught the left-clipping defect missed by the first geometry assertion.

Screenshots were saved and visually inspected in this run. The full-page mobile captures show the fixed bottom navigation at the initial viewport boundary; this is a capture of an actual fixed control, not a duplicated content row.

## Evidence and limits

Current validation results are recorded in `IMPLEMENTATION_STATUS.md` and `evidence/recheck-20261025/`. Read-only showcase captures block business mutations and record the before/after fingerprint. Mutation suites use their own database, media and build directories and remove them after each run. Failed/intermediate evidence is retained separately.

- **55/55 backend tests pass:** `unit-tests.txt`.
- **9/9 browser suites pass together:** `final-browser-regressions.txt`, `all-suite-results.json`. Includes 40 role/screen/viewport cases, public interactions, registration and verified invitations, care/review/pickup, passport/development/CRM/LEO, finance/subscriptions and access restrictions.
- **Expanded final search rerun passes:** `final-search-regressions.txt`, `search/results.json`, `regression-results/isolated-browser-ux-results.json`. Includes all four roles at 1440/390/320px, left/right bounds, menu visibility/expanded state, delayed real API responses, whitespace, network error recovery and outside dismissal. Final 320px search screenshot was inspected after fixing clipping.
- **Production webpack build, standalone TypeScript, syntax/credential lint and formatting pass:** `build.txt`, `final-typecheck.txt`, `final-lint.txt`, `format.txt`.
- **Showcase unchanged:** `previews/results.json` and suite results preserve fingerprint `12a9552d42254df0c6e6fd76a6c357f2`. Final read-only screenshot capture has no captured page or landing console errors.

The nine-suite run includes the initial search checks. The final targeted search rerun adds the stricter geometry, menu and error-recovery checks after visual iteration; it is not counted as a tenth distinct suite.

This checks the implemented local workflows. It does not certify all F01–F42 as production complete or establish WCAG compliance. Real hosted identity/email delivery, WhatsApp delivery, payment settlement, external LEO provider behavior, restore/load/operator acceptance and live Elenio video integration remain separate gates. CCTV/Video Analytics remain explicitly deferred; no camera gateway, streaming service or analytics engine was rebuilt.
