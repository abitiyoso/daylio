# Daylio V20 / v10 visual and functional QA

Latest continuation, 25 October 2026: the user's following four-image correction replaces generic challenge/closing photos, adds explicit daycare CCTV demonstration scenarios and embeds legacy administration inside the existing role shell. Parent Story uses reader language and bounded uncropped private photos. Fresh populated-showcase desktop/mobile previews, actual before/after comparison and image-generation provenance: `docs/VISUAL_REFINEMENT_2026_10_25.md`, `evidence/refinement-20261025/`. Validation: 55 tests, eight complete isolated browser suites, a subsequent 40-case role audit, production build, standalone TypeScript, lint and source formatting pass. Original logos, archived sources, business records and permission rules remain unchanged. Live video/analytics remains deferred. Historical source-matching results below do not apply to these intentionally revised regions.

Date: 24 October 2026, Asia/Bangkok. Scope: approved V20 public landing and the implemented v10 workflow phase in the existing application. Local acceptance is distinct from a hosted production release and full F01–F42 completion. Prior report: `docs/design-qa-2026-10-18.md`.

## Source and matching

### Current corrective audit — 24 October 2026

The user's new robot/UI feedback explicitly supersedes the poster treatment in the archived V20 reference. Current LEO uses a transparent, inspected derivative of the same robot (`public/brand/leo-cutout-v1.png`); the original poster, exact archived HTML and official brand logos remain unchanged. Prior exact landing pixel metrics below are historical and no longer apply to the intentionally corrected LEO mascot region.

Current-run evidence and eight-step audit: `docs/UI_AUDIT_2026_10_24.md`, `evidence/ui-audit-20261024/`. In-app browser checks covered LEO Parent tab/photo question, Owner refresh/pipeline, CRM qualification dialog, calendar previous/next/today and Parent sibling switching. Existing read-only capture workflow produced all four roles at five matching source/actual widths with no overflow, broken images or business-record change. `evidence/v10/results.json` is the latest role comparison result; comparison PNGs were inspected. Actual counts, available photographs, explicit unavailable services and initials remain intentional differences from prototype data.

Resolved issues: poster edges/text; omitted active pipeline stages; summary refresh/error recovery; duplicate planner title; reversed arrow; out-of-week detail selection and empty-date crash; crowded CRM buttons; raw legacy tour status/date; narrow review controls; stray care-note punctuation; wrapped child-age/badge; truncated mobile navigation. Scoped selectors ensure calendar/funnel readability overrides the later source stylesheet. Source geometry is retained outside these authorized corrections. This audit is not a claim of complete accessibility compliance or production release readiness. Final validation is recorded in `IMPLEMENTATION_STATUS.md`.

### Subscription continuation QA — 24 October 2026

The new current/scheduled-period cards, pending-invoice cancellation dialog and admin period evidence use the existing authenticated v10 typography, colors, spacing and controls. Desktop (1440px) and mobile (390px) actual screenshots were inspected at `evidence/screenshots/subscription/owner-desktop.png` and `owner-mobile.png`. Current Growth, subsequent Essential and cancelled yearly request all reflect database records. The mobile invoice table scrolls within its container; the page has no horizontal overflow.

The first mobile capture caught the sidebar's resize transition and obscured content. The final test waits for actual closed geometry, opens navigation, selects the subscription destination, waits for closure and captures again. No CSS or business data is modified for screenshots. Both final images show the correct hierarchy and scheduled-period information. These screenshots use disposable, explicitly fictional payment references; they are not production bank evidence. No landing/logo assets changed.

All seven browser suites pass in `evidence/isolated-browser-results.json`; the final mobile-navigation repeat passes separately in `evidence/isolated-browser-subscription-results.json`. Both retain the same preview business fingerprint and remove temporary data. Backend tests: 51/51. Prior source comparisons and four-role screenshots below remain the reference baseline; the care suite also recaptured four roles at 1440/820/390px in this run.

Exact supplied HTML, request texts and original asset hashes: `design-reference/approved-2026-10-24/`. V20 uses real React sections, original scoped CSS, copy, SVG and imagery. Actual login navigation, a mobile login link and the source's missing thumbnail alias are technical integration changes. Original Elenio brand bytes are unchanged; V4 source remains archived.

`evidence/v20/` contains source/actual full pages and all eight section crops at 1440/1280/1024/768/390/320px. Comparisons put source left / actual right. Header visibility and smooth scrolling are set identically for section crops; untouched full-page captures retain the real header. All **48 section pairs have identical dimensions**. Maximum mean absolute RGBA-channel difference: **0.0595/255**. Maximum channels differing by more than 10: **0.000332%**. See `pixel-comparison.json`. Static initial-state comparisons do not imply that an illustrated public service is connected.

Native Chrome zoom was changed through settings in a fresh owned profile and verified with devicePixelRatio. All **18 width × zoom cases** (six widths, 100/125/150%) passed without CSS zoom/transform, overflow or missing images. User preferences were untouched. Evidence: `evidence/v20/zoom/results.json`.

`evidence/v10/` contains approved/authenticated actual full-page and viewport pairs for Owner, Manager, Caregiver and Parent at **1440/1024/768/390/320px**. Twenty actual cases pass without horizontal overflow, broken visible images or business-data mutation during capture. `four-roles-overview.png` shows desktop/mobile results. Reference rendering serves the same official Inter/Plus Jakarta binaries locally; archived reference HTML is unchanged. Workspace font hashes and OFL licenses: `public/fonts/`.

## Iterations

1. **[P1] Wrong public presentation:** integrated the exact V20 sections, source assets and complete platform/camera/event/LEO/pricing/menu interactions; actual login opens the authenticated workspace. Public simulations retain their explicit source labels.
2. **[P1] Private hierarchy/navigation:** adopted grouped v10 role navigation, Owner summary, Caregiver Today/Quick Care and Parent status/day-strip/Story/family actions, preserving existing APIs and working tools. No runtime role dropdown grants permissions.
3. **[P1] Parent mobile Story displaced:** removed duplicate tool/title rows, placed sibling selection in the header and morning action in its actual card, and restrained the private photo beside the reviewed narrative. Missing profile portraits use initials; an activity photo is not treated as a child's portrait.
4. **[P2] Owner toolbar / caregiver controls:** compact native filters retain date/branch and Control Tower actions. Caregiver shortcuts now use matching rounded controls. The profile count is labeled as confirmed care profiles rather than incorrectly implying every profile has a medical exception.
5. **[P1] Narrow header overflow:** corrected a 1.4px overflow at 320px through flex/min-width, breadcrumb truncation and mobile avatar/role treatment. Repeated all twenty role cases. `overflow-owner-320.png` retains the identified failure; final actual/compare images record the correction.
6. **[P2] External font loading / Windows screenshot writes:** serve the same official font binaries locally; warm actual entry routes before development interaction tests. Bounded screenshot retries handle only explicit file I/O errors, never assertions or permission failures. A stale activity assertion now opens the actual timeline disclosure before reading it. Original failed run logs remain available.

## Surface review

| Surface | Result |
|---|---|
| Typography | Approved Inter/Plus Jakarta hierarchy and weights; 15px primary workspace text with 44px actions; original V20 typography preserved. Local fonts remove an external loading dependency. |
| Layout/spacing | Near-identical public section geometry at six widths. Private sidebar/header/cards/mobile navigation inspected against source at desktop/mobile. Parent Story is no longer displaced by a tall tool block. |
| Colors/states | Source navy, warm cream, clay/coral and restrained semantic accents. Actual private state follows persisted review/payment/authorization records. |
| Imagery/brand | Original source bytes retained; no generated art or solid pink test photo in showcase. One fictional example now uses exact v10 activity art with its previous file backed up. |
| Copy/data | V20 copy retained. Private greetings, counts, stories and capabilities use scoped database records. No QA identifiers, fabricated private video evidence or external-model responses. |
| Icons/actions | Original public SVG sprite and existing Phosphor icons. Source-style care tiles, working dialogs/disclosures/search/forms and role navigation remain connected to authenticated APIs. |
| Responsive | Six public widths, eighteen native zoom cases, four private roles at five widths: final overflow/image checks pass. |
| Functional/permissions | Six passing browser suites and 48 PostgreSQL regressions; child/tenant/role isolation, human review, pickup, private media, financial verification and email proofs exercised. |

## Intentional differences and remaining gates

Private v10 integrates real services rather than prototype localStorage. Actual counts, names, dates and records differ from hardcoded examples. Missing portraits use initials. A small fictional-environment badge, original Elenio footer, existing access administration and additional working tools remain. Owner filters and actual manager exception/closing behavior are retained; Manager keeps its Control Tower heading and broader real exception list. Parent has one actual approved example photo rather than a fabricated multi-photo history. Role/plan-preview dropdowns and simulated confirmations are excluded.

The V20 Essential card lists CRM/enrollment while the explicit backend request assigns those capabilities to Growth. Server gates follow the explicit backend rule; exact public copy retains its prototype-price disclaimer. Commercial-copy alignment requires product approval before launch; see `docs/V10_DECISIONS.md`.

Latest local functional/visual evidence: **53/53 tests**, **seven passing isolated browser suites**, twenty recaptured private visual cases and the inspected in-app before/after audit. Raw results: `evidence/ui-audit-20261024/` and `evidence/isolated-browser-results.json`. Earlier V20 work separately recorded six public widths and eighteen native zoom cases; its exact-pixel results are historical for the intentionally changed LEO region. Current build/TypeScript/lint outcomes are recorded in the functional ledger.

The single fictional example's prior file is recoverable at `data/sandbox-backups/photo-2026-10-24T08-12-51.987Z`; business records were unchanged. Hosted SMTP/Supabase/payment/WhatsApp/Elenio/model validation, live stream contracts, real-media consent/licensing, privacy/legal/restore and operator/assistive-technology UAT remain release gates. Advanced scope remains in the functional ledger. No deployment or live-provider readiness is implied.

final result: passed — scoped local LEO and eight-step workflow corrective visual audit, four-role responsive comparison and recorded functional regressions; production release and full F01–F42 completion remain gated.

## Role and screenshot corrections — 25 October 2026

The latest user screenshots supersede exact V20 source matching for the public CCTV illustration. Removed repeated same-photo frames, fake detections/staff indicators/timestamp and the Live heading; retained the original photograph, layout and brand assets. Selected area/event controls now describe an illustration and the future Elenio integration. No private evidence or live camera service is implied.

The saved Care Passport shown by the user now displays explicit missing values, a localized birthday, an emergency-contact completion warning and responsive facts. It retains the same database record. Account administration uses the existing Daylio sidebar/header, role guidance, conditional Parent child selection and compact member rows. Existing email verification and server permissions are preserved.

Actual desktop/mobile images were inspected for Owner, Manager, Caregiver and Parent. Inspection caught mobile title spacing and crushed member names that overflow tests alone missed; flex sizing was corrected and geometry assertions added. The final overview/crops and full originals are in `evidence/role-audit-20261025/`; detailed steps, scope and limitations are in `docs/ROLE_UI_AUDIT_2026_10_25.md`. Prior pixel-perfect source comparison results above are historical and do not claim exact matching for the intentionally corrected LEO/CCTV regions. Current regression results: 55 tests and all eight isolated browser suites pass, preserving the preview fingerprint.
