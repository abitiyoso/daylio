# Daylio by Elenio — Owner-first Marketing Website (v4)

Marketing website design intended for B2B sales to independent daycare owners/operators in Indonesia. Mobile responsive, built with HTML/CSS/JavaScript so Codex can migrate it to a production app without losing layout, copy, or UX.

## Product strategy and visual direction

- **Economic buyer:** owner or director of a daycare/preschool, not the parent.
- **Sales positioning:** "Buat Daycare Anda Lebih Dipercaya. Dan Lebih Mudah Dikelola."
- **Business customer outcomes:** help convince prospective parents during facility tours; provide transparent, consistent parent experience; reduce repetitive childcare administration; provide owner visibility.
- **Parent experience:** Live CCTV for permitted shared areas, daily child timeline, Tanya LEO grounded in verified childcare notes.
- **Caregiver:** simple meal/sleep/play activity logging.
- **Owner:** attendance overview, staff logging, event review and simple summaries.
- **Design:** Daylio endorsed by Elenio; warm white, deep navy, restrained soft coral and teal; minimal ornaments, photo-led, no text/cards over faces. Retain official parent-company ELENIO logo asset *exactly*.

## How to open

Open `index.html` in Chrome or serve the directory via `python -m http.server 8000`. An all-in-one, offline HTML version is also included as separate downloadable artifact.

## Current functionality

- Responsive public landing page with functional anchors, navigation and accordion FAQ.
- Role experience demo: owner / parent / caregiver; different screens and actions.
- A caregiver can add a local activity entry, then switch to parent to see the new entry; owner reports update based on that same local demo data.
- Tanya LEO is a scripted UX flow answering based on the demonstration notes; it **is not connected to an AI service**.
- CCTV in the prototype is a still image used to present intended video UX; **it is not a real stream**.
- Owner metrics are example values, not from a client.
- Demo request builds a WhatsApp message to Elenio Business `+62 819-3332-8899`, opened in WhatsApp for the user to send.

**Important:** The public-facing design copy intentionally has no prototype/dev terminology because it is intended as the production marketing content. That does *not* turn the prototype's simulated backend, CCTV, or LEO into live features. Codex must build and verify those before representing them as available to customers or enabling public access to real child data.

## Photography

- Marketing photos are wired with *distinct online Pexels stock references* (via `data-stock`) and local fallback crops derived from the earlier design concepts. The environment used to generate this artifact cannot fetch photos over the internet, so previews show the local fallbacks.
- **For launch:** replace fallback cropped illustrations and hotlinked Pexels URLs with real appropriately licensed and locally hosted stock images, including daycare-owner/manager interactions, parent facility tours, classroom caregivers, and daycare interiors.
- No photo should overlap or obstruct anyone's face. Do not imply photos show Daylio's actual customers or deployments.
- Do not invent testimonial quotes, logos, user counts, operational performance percentages or demonstrated enrollment growth.

## Brand assets

`assets/elenio-official.png` is from Elenio's official provided logo. It must not be redrawn or modified. Daylio icon and wordmark are concept-only sub-brand treatment; confirm final branding before store launch.

## Next implementation requirements for Codex

1. Move website UI to Next.js (maintain styling, semantic sections, speed, desktop/mobile fidelity).
2. Build scoped auth / multi-tenant organization and role access (owner, caregiver, parent; parent sees **only authorized child records**).
3. Create child profiles, caregivers, day logs, consent, authorized guardians, audit logs, and incident/escalation workflows. Implement production storage and security.
4. Implement actual video streaming through the supported Elenio VMS/video gateway, with compatible camera onboarding, proper authorization/expiry, revocation, area-based permissions, secure sessions and concurrency controls. Never show private areas. Do not grant CCTV access on the basis of one parent's consent to all children visible in a shared room.
5. Implement LEO using verified authorized activity data via API and access control, with transparent unknown responses and no inference of child's emotional/safety status from video.
6. Replace sample dashboard values with real filtered data and ensure billing/contact/data removal policies as product requirements are confirmed.
7. Track owner-value funnel events (demo requests, tour-to-enrollment conversion if customer has data, parent adoption, caregiver workload) **without promising conversion uplifts**.
8. Validate monitoring/camera/privacy/safeguarding with real consent flows before pilot launch.
9. Use official Elenio logo asset without changes.

## Contents

- `index.html` — site markup
- `styles.css` — styling, breakpoints and owner outcomes section
- `app.js` — role-based interaction UX and WhatsApp CTA
- `assets/` — official Elenio mark and illustrative images
- `CODEX_HANDOFF.md` — implementation assignment and acceptance criteria
