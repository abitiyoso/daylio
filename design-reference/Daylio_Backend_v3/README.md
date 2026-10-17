# Daylio Backend v3 — Operations That Take Fewer Taps

Interactive **frontend design reference** for Daylio by Elenio. Designed for business owners, daycare managers, caregivers, and authorized guardians in Indonesian daycare businesses.

## How to open

- Easiest: download `Daylio_Backend_v3_Interactive.html` from ChatGPT and open in Chrome/Edge. Single HTML file contains CSS/JS and all visual assets, including the exact original official Elenio logo.
- Source project: open `index.html` in a browser from this folder (`assets`, `styles.css`, `app.js` are required). No build process.
- Role dropdown at the top right lets you simulate Owner, Manager, Caregiver, and Parent.
- Data is fictional and stored in browser localStorage (where supported). Use Owner → Settings → Reset Data Demo to start over.
- Camera/AI visuals are conceptual: **no real footage, no live LLM, no production personal data, no WhatsApp messages sent**.

## What to try in order

1. **Caregiver** → Catat Aktivitas → default: Toddler A, 6 present children. Choose Makan, select a class, add one exception for Rafael, and click **Simpan 6 Catatan Sekaligus**. Each record is stored separately for the relevant child as a draft.
2. **Manager** → Daily Care → **Review & Terbitkan Semua** → confirm review. Published records are now visible in Parent Daily Story.
3. **Parent** → Beranda Anakku / Daily Story → new activities are scoped to Alya; parent account does not see other child timelines. Ask LEO about Alya's meals or sleep to see grounded example answers.
4. **Parent** → Pesan Daycare → add a morning note. **Caregiver** → Hari Ini → mark it read.
5. **Manager** → Pickup & Safety → Rafael → confirm existing guardian request for substitute pickup → human identity confirmation and handover → view audit/evidence trail. Fast pickup for recurring authorized pickups skips repeated manager approval.
6. **Owner** → CRM & WhatsApp → change stage or create a new prospect → schedule tour/trial, review AI reply draft, convert prospect into a child profile.
7. **Caregiver** → Observasi Anak → add observation. **Manager** → Development & Rapor → review observation and issue report from approved records. **Parent** → Growth Journey → see published report for linked child.
8. **Owner** → Finance & Billing → open an invoice → confirm a **manual** payment with a reference, not by merely clicking "paid".
9. **Manager** → Control Tower → **Daily Closing**. Open exceptions remain open in the handover; never silently marked safe.

## Design principles

- **Classroom-first for caregivers:** present children preselected, shared result, per-child exceptions. No repeated individual forms for group activities.
- **Child-first for parents:** one child home with daily status, notes, permitted pickup, report, and scoped Ask LEO.
- **Exception-first for managers:** morning notes, review queue, temporary pickup permissions, incidents, staff handoff, and development approval.
- **Business-first for owners:** enrollment leads, occupancy and capacity, actionable follow-ups, parent confidence, revenue.
- **Routine by default, exception by approval, AI by assistance.** AI cannot certify pickup identities, child development milestones, or incidents.

## Design versus live application

`github.com/abitiyoso/daylio` already contains a real Next.js application with PostgreSQL RLS, authenticated roles, `activities/batch`, guardian authorization and pickup verification. This artifact is a **UX specification with working local data**, not replacement backend code. Preserve and reuse the repository's real APIs, migrations, RLS policies and tests. CCTV/gateway/Video Analytics are pre-existing Elenio services; only keep the integration slots and verified interface boundaries in this phase.

## Source assets

The copy of `assets/elenio-official.png` is byte-identical to the provided official `Logo Default.png`. Other photos are illustrative reference assets from the previous prototype; replace with licensed approved production photography when going live. Do not assert that any image depicts an actual Daylio child/customer.
