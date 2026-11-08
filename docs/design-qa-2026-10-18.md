# Daylio Backend v3 corrective visual QA

Date: 18 October 2026 (Asia/Bangkok). Scope: existing authenticated application, local fictional showcase. This is a design/functional acceptance of the requested cleanup, not a pixel-identical clone or a production release certificate.

## Source, capture and matching

Approved source: `design-reference/Daylio_Backend_v3/desktop_owner.png`, `desktop_manager.png`, `desktop_caregiver.png`, `desktop_parent.png`, `mobile_owner.png`, `mobile_parent.png`, plus supplied HTML/CSS. `mobile_caregiver.png` is a Today overview, so it is not falsely compared as Quick Care: `scripts/capture-reference.mjs` renders the approved HTML read-only and selects the actual Quick Care state at 390/820. The same process captures Manager mobile/tablet, for which no supplied PNG exists. Those reference captures are under `evidence/design-qa/cleanup/reference-states/`.

Implementation: `evidence/screenshots/cleanup/{owner,manager,caregiver,parent}-{1440,820,390}.png`, the matching `-viewport.png` images and Parent Story card/history captures. CSS viewports are 1440×1000, 820×1000 and 390×844, deviceScaleFactor 1. Desktop sources are 1440px wide with differing full-page heights; matched top crops use the smaller source/actual height, never stretch either screenshot. Mobile uses a matched 390×844 top viewport. Full images are also inspected for content below the fold. The comparison manifest records exact pixel sizes, paths and crops.

Combined source-left / implementation-right comparisons are in `evidence/design-qa/cleanup/*comparison.png`. Owner, Manager, Caregiver and Parent desktop, mobile Owner/Parent, matched mobile Quick Care/Manager, and 820px source states were inspected. `parent-story-focused.png` places the approved Daily Story card beside its actual card at the same 660px width, retaining aspect ratio and noting the longer reviewed narrative. This focused pass examines photography, type, copy, crop, source date and CTA; full-screen comparison alone would not resolve those details.

## Iteration history

1. **[P0] Persisted QA contamination.** Before: `evidence/screenshots/cleanup-before/parent.png` shows repeated V3/P1 notes, stale handovers and pink QA uploads. Fix: fresh per-suite database/media/build lifecycle, run-bound mutation guards, explicit backup/reseed of the local preview only. After: clean named fictional family; one labeled photographic example; no visible QA identifiers. Repeated-run fingerprints prove tests do not rewrite the showcase.
2. **[P1] Tiny typography and noisy Parent feed.** Before: 13px body, numerous 9–11px labels, entire activity/morning lists on Home. Fix: 16px body/fields, 13–14px support, 44px controls, child identity, one reviewed digest, latest handover, collapsed initial activity list and actual paginated history. After: readable narrative and supporting hierarchy in Parent desktop/mobile and focused-card evidence. No source UUIDs are rendered in these normal screens.
3. **[P2] Excessive Parent hero height and cramped Manager mobile rows.** First correction still pushed Story down and placed action buttons beside narrow paragraphs. Fix: move morning action to the title toolbar, combine the environment badge with the heading, place mobile exception actions below full-width text, group batch exceptions. After: Parent story is the primary content card and Manager rows have readable line length without colliding controls.
4. **[P2] Metric whitespace / Owner toolbar.** Initial corrected metrics stacked icons above labels and retained a second filter row below the banner. Fix: align metric icon beside its label, shorten repeated explanations, move Owner date/branch and Control Tower action into the title toolbar. After: final matched Owner comparison restores the reference's banner → metrics → two-column work hierarchy; Manager mobile has compact two-column metrics. All three viewport widths were recaptured.
5. **[P2] Small-text/action contrast and photo keyboard behavior.** Fix: retain coral surfaces with navy action text, darken muted/status text and selected navigation text; use a native modal photo dialog with refreshed private grant, focus containment, Escape and return focus. After: final photo/history browser checks pass; imagery has a visible example caption, no swatch, no covering overlays and no missing image state.

6. **[P0] Morning action available before child context loaded.** The complete regression caught an early-click race after moving the CTA into the toolbar: a modal could capture an empty child ID while the page was still loading. Evidence: `evidence/cleanup-morning-loading-race.txt` and the matching before screenshot. Fix: disable the action until current child context and scoped Today data are ready; retain the API validation and permission checks. The care suite explicitly submits through this control after reload.

## Required fidelity surfaces

| Surface | Actual review and accepted result |
|---|---|
| Fonts / type | DM Sans body and Plus Jakarta Sans headings retained. Corrective brief intentionally increases the reference's smaller text to 16px body/fields and 13–14px support. Headings, line height and readable wrapping inspected; the larger text naturally makes some cards longer than the original mock. |
| Spacing / layout | Fixed 244px desktop sidebar, cream/white surfaces, restrained rounded cards, banner and metric rhythm, two-column content and stacked mobile cards retained. Final toolbar and metric refinements resolve major density drift. At 820 the sidebar becomes an actual menu. No horizontal overflow at 1440/820/390. |
| Color / tokens | Navy, warm neutrals, coral primary actions and teal positive actions. Darker foregrounds deliberately satisfy the cleanup's readability requirement; no rainbow dashboard or additional decorative theme. |
| Imagery / assets | Original Elenio PNG retained byte-identically. Approved kit photographic example is served privately with consent checks and a visible example caption. A child without a saved portrait uses actual initials; no invented profile photo. No generated/simulated CCTV frames. |
| Copy / content | Natural Indonesian care notes/story, real stored event/publication times, human-review attribution, current pickup and latest handover. No V3/P1 identifiers, raw internal IDs, fixture names or repeated stale feed items. One sandbox badge and an explicit example-photo caption remain intentional. |
| Icons / actions | Existing Phosphor library retained, coherent stroke/style. Role navigation, batch logging, grouped review, acknowledgment, pickup, report, CRM and LEO actions remain connected to authenticated APIs. |
| Responsive / keyboard | Full screenshots inspected for all four roles. Mobile Manager actions now sit below text; caregiver selection and overrides remain usable. Dialog focus/Escape and photo/history navigation checked. Full assistive-technology certification is a production UAT gate. |

## Intentional differences and follow-up

The implementation displays actual scoped counts and capabilities, not the mock's fabricated metrics or role dropdown. Date/branch filtering and access administration remain functional. Caregiver opens Quick Care by default, as required. Parent has actual initials in the identity hero and a separate consent-gated gallery rather than pretending an activity image is a profile portrait. The approved kit image is explicitly an example; replacing it with licensed customer photography requires production consent/licensing. Story text is a genuine human-written sample digest tied to stored sources rather than the short prototype-generated sentence. These are expected product/privacy/readability differences, not unresolved P0/P1/P2 defects.

P3 follow-up: licensed production imagery and richer profile-photo management, exact copy polish, broader assistive-technology UAT. Hosted provider verification is outside local visual acceptance. No deployment is implied.

final result: passed
