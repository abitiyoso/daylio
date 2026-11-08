# Approved V20 / v10 integration audit — 24 October 2026

## Architecture and source selection

Existing Next.js 16.4.2 / React 19 App Router, authenticated `/workspace` and `/platform`, versioned `/api/v1`, PostgreSQL with eleven existing migrations, shared validated domain records plus relational tenant/child/access tables. Supabase verifies sessions server-side; `daylio_app` RLS scopes each transaction. PGlite and localhost identity fixtures are explicitly isolated QA tools. The existing branch is `codex/backend-v3-workflows`; no application/backend is replaced.

Approved originals were the two supplied standalone HTML files in Downloads. There was no supplied multi-file `daylio-v20/` folder or `(2)` filename; the exact supplied standalone equivalents are used. Asset bytes are extracted into `public/approved-assets`, deduplicated by SHA-256, with provenance in `design-reference/approved-2026-10-24/asset-manifest.json`. The original v4 marketing source remains archived; V20 supersedes its public presentation under the new instruction. Existing Elenio brand bytes remain unchanged.

## Prototype inspection

The v10 reference contains three executable scripts: core role journeys, schedule/capacity planner, and subscription/tier extensions (including final v10 grouped navigation/owner dashboard). Its localStorage stores core records, shifts/bookings, plan preview, invoices and add-on state. Browser role selection grants fictional access; scheduler seeds October dates and hardcoded staff/ratios; commercial confirmations edit local status. CCTV and AI event cards are simulations. LEO candidate/action/draft history is local and provider-free. None of these scripts, identities or simulated confirmations is used as the production backend.

V20 has nine approved page regions, SVG symbol assets, sixteen embedded raster uses, four platform tabs, camera/event controls, three LEO role previews, suggested/custom chat, pricing and native dialog interactions. Public simulation copy is preserved. Login is the intended exception: `/workspace` replaces the unconnected prototype modal. The source's missing `assets/classroom-analytics.webp` thumbnail URL resolves to its own embedded approved camera illustration; no new image is introduced.

## Gap checklist and sequence

| Journey | Existing evidence / gap | Implementation sequence |
|---|---|---|
| Foundation | Tenant bootstrap, branches/classes, verified provider identity, invitations, guardian links, assignments, audit/RLS exist; public owner onboarding UI needs refinement | Preserve; extend UI without client role grants |
| CRM → enrollment | Persistent qualification, history, tours/trials, capacity-checked atomic enrollment and guardian invitation exist; richer pipeline/PIC/waitlist UI and planned slot coordination needed | Extend existing services |
| Schedule & Capacity | No persistent date-based planner or collision-safe staff roster matching v10 | New additive schedule tables, transaction locks, RLS, revisions, audit; real planner UI |
| Care & Family | Quick Care exceptions, manager review, morning notes, Daily Story/private media, passport, observations/reports and messages already tested | Retain; adopt v10 navigation/visual hierarchy |
| Pickup & Safety | Routine/substitute permissions, expiry/revoke, physical verification, atomic handover/evidence already tested | Retain; no camera recognition approval |
| Parent billing | Persistent fee plans, invoices, manual verification and reminders exist | Add recurring generation/reconciliation presentation |
| SaaS billing & entitlements | Legacy platform child-cap record; no Essential/Growth/Intelligence commercial lifecycle | Separate catalog/subscription invoices; server enforcement; no frontend payment activation |
| CCTV/Video AI | Disabled Elenio adapter and scoped unavailable routes; no provider contract/credentials | Reuse adapter; truthful unavailable state; no gateway/engine rebuild |
| LEO | Authorized facts and citations/local verified-records mode, drafts with approval exist; broad proposed-action execution absent | Extend allowlisted draft/approval actions; no fabricated inference |
| Stabilization | 39 existing tests pass before new backend work | Regression plus v10 end-to-end/tenant/capacity/concurrency tests and matched browser QA |

## Acceptance tracking

This is the initial audit/checklist, not a completion claim. Actual results and remaining gaps are maintained in IMPLEMENTATION_STATUS.md and workflow evidence. Provider credentials, SMTP, bank/payment events, WhatsApp and Elenio availability cannot be inferred from prototypes. Hosted verification remains distinct from local persistent application behavior.
