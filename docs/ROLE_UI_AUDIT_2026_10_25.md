# Role and screen correction — 25 October 2026

Scope: the user's three screenshots, plus related Owner, Manager, Caregiver and Parent screens. Existing APIs, database records, authentication and server permissions are retained. This is local verification, not production launch acceptance.

## Findings and corrections

1. **Public CCTV illustration — P1.** The supplied before screenshot showed repeated copies of one photograph as a filmstrip, a Live heading and fabricated detection overlays. Removed the seven repeated frames, bounding box, staff indicator and timestamp. The image now says “Ilustrasi ruang daycare” / “Foto contoh · bukan rekaman kamera”; area/event controls explain the intended review workflow and expose their selected state. Desktop and mobile captures were inspected. No camera, gateway, streaming or analytics service was implemented or connected.
2. **Care Passport — P1.** A saved, approved legacy profile lacked emergency-name/phone and care instructions. Direct string interpolation produced `undefined · undefined`; a blank instruction looked like a rendering failure. Presentation helpers now distinguish absent and partially supplied contacts, show explicit missing values and warn about incomplete emergency details. Birth dates are localized. Facts use two columns on desktop and one on mobile. Approval still describes the recorded review; it does not certify completeness. The existing `passportFields` schema in `lib/growth-workflows.mjs` already requires nonempty care/emergency fields on new proposals; it is retained. No contact or allergy data was invented or overwritten.
3. **Accounts and access — P1.** The access screen escaped the approved workspace shell into the legacy pink layout. It now retains the role sidebar/header, one page title, compact member rows, invitation status and role guidance. Only Parent invitations request a child, required by the form and the existing server contract. Owner retains manager invitations and member activation controls; Manager retains its existing narrower permissions. Invitations still require real email verification and a recipient-created password. A mail-provider error remains an error, with the saved invitation available for retry.
4. **Owner — checked.** Passport, account access, planner and family billing at 1440px and 390px. The populated legacy-profile screenshot separately confirms the exact missing-contact defect. The automated fixture has no approved passport and confirms the honest empty state instead.
5. **Manager — checked.** Child passport, access, Control Tower and activity review at both widths. Screenshot inspection also caught browser-default access shortcut buttons in review/development; both now use the existing workspace button style. The form cannot offer a Manager invitation, and member activation controls remain Owner-only.
6. **Caregiver — checked.** Assigned-child passport, batch care, pickup and shift handoff at both widths. Access navigation is absent and the authenticated invitations endpoint returns 403.
7. **Parent — checked.** Care Passport, My Child Today, pickup permissions and messages at both widths. Access navigation is absent and the authenticated invitations endpoint returns 403. Published Story and child linkage remain governed by the existing API/RLS workflow suites.

## Visual iteration and evidence

The first responsive audit passed overflow checks but actual image inspection caught excessive mobile title spacing and member names squeezed beside action buttons. Corrected flex sizing and wrapped member actions. Added geometry assertions for title height and member-name width before rerunning the final audit. The final mobile overview and member-detail crop were inspected, along with desktop role screens and the populated passport.

| Role / example | Desktop | Mobile |
|---|---|---|
| Owner / account access | [1440px](../evidence/role-audit-20261025/screenshots/owner-1-1440.png) | [390px](../evidence/role-audit-20261025/screenshots/owner-1-390.png) |
| Manager / Control Tower | [1440px](../evidence/role-audit-20261025/screenshots/manager-2-1440.png) | [390px](../evidence/role-audit-20261025/screenshots/manager-2-390.png) |
| Caregiver / batch activity | [1440px](../evidence/role-audit-20261025/screenshots/caregiver-1-1440.png) | [390px](../evidence/role-audit-20261025/screenshots/caregiver-1-390.png) |
| Parent / My Child Today | [1440px](../evidence/role-audit-20261025/screenshots/parent-1-1440.png) | [390px](../evidence/role-audit-20261025/screenshots/parent-1-390.png) |

[Same saved Care Passport after correction](../evidence/role-audit-20261025/passport-after.png) · [CCTV illustration](../evidence/role-audit-20261025/cctv-after.png)

Evidence is under `evidence/role-audit-20261025/`:

- `passport-before.png` / `passport-after.png`: actual local preview using the same saved record, inspected manually.
- `access-before.png` / `access-after.png`: actual local preview, legacy screen versus workspace shell.
- `cctv-supplied-before.png`: the user's supplied screenshot, not a new browser capture; `cctv-after.png`: actual browser capture.
- `screenshots/`: 32 role/view/viewport captures plus two public CCTV captures from the disposable browser audit. File indices map to the ordered views above, starting at zero. These use explicitly fictional fixtures, not production records.
- `desktop-review.png`, `mobile-review.png`, `members-review.png`, `workflow-review.png`: comparison contact sheets derived from those captures; the full originals remain available.
- `initial-role-results.json` / `role-browser.txt`: initial run before the extra geometry guards; `results.json`: final role audit.
- `unit-tests.txt`: 55 passing tests, including absent/partial contact and malformed family-contact presentation cases.
- `all-browser.txt` and `../isolated-browser-results.json`: final complete regression run, including the new role audit and the existing business/security workflows.
- `final-role-browser.txt` and `../isolated-browser-roles-results.json`: a subsequent passing repeat of all 32 role cases after styling the review/development access shortcuts; final role screenshots were recaptured.

All **55 tests** and **eight browser suites** pass. The complete run and subsequent role repeat retain preview fingerprint `12a9552d42254df0c6e6fd76a6c357f2` and remove their disposable data. The browser run covers existing verified invitation/activation and provider rejection, care/publishing/Story, routine/substitute pickup, passport approval, developmental report, CRM/enrollment, LEO, subscription and billing workflows; fixture identity/email proofs are not a real inbox integration.

Production webpack build, standalone TypeScript, syntax/embedded-credential lint, marketing JavaScript syntax and source formatting checks pass. Raw logs are `build.txt`, `typecheck.txt`, `lint.txt`, `marketing-syntax.txt` and `format.txt`; successful no-output checks produce empty log files.

The mutation suites run against separate disposable database/media/build directories. The role audit itself performs no real invitation or permission mutation. The persistent preview's business fingerprint must remain unchanged. No test output is promoted into the preview or production.

## Remaining boundaries

The screenshot-reported defects are presentation corrections. Live Elenio video/analytics, real inbox delivery, hosted identity/payment/WhatsApp contracts and operator UAT remain the documented release gates. An incomplete saved emergency contact still requires the guardian and reviewer to supply/approve real information. This audit does not certify all F01–F42 production acceptance criteria or every possible screen/state.
