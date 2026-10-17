# Codex task — implement Daylio website and prepare product backend

Use the supplied v4 files as the *visual specification* for Daylio by Elenio. Preserve their layout, warmth, brand hierarchy, owner-first messaging, all eight FAQ topics, and the interactive owner/parent/caregiver preview. Do not redesign from scratch or switch Daylio to Elenio enterprise brand colors.

## Business intent

Primary buyer: daycare owners. Clear value: make it easier to convince prospective parents during tours, give enrolled parents consistent transparency via authorized camera access and caregiving notes, and reduce repetitive staff/admin work. No invented proof of revenue uplift or child safety guarantee.

## First implementation milestone

- Port responsive static marketing website to a clean Next.js application.
- Keep all images optimized, with genuinely licensed and non-duplicative photography of daycare owners, care staff, tours, kids and parent views. Faces must remain unobstructed at desktop and mobile aspect ratios. Replace `data-stock` hotlinks/local concept crops with locally hosted licensed assets.
- Preserve official Elenio logo unchanged and Daylio as the main sub-brand.
- Wire navigation, CTA WhatsApp flow, FAQ accordion and role-based interactive experience.
- Use real-time dates in dynamic UI; no stale hardcoded date.
- No labels on public marketing sections saying "prototype", "preview belum jalan", "simulasi", or "coming soon". During development keep accurate technical information in documentation and do not silently pass off static samples as real active functionality.

## Second implementation milestone

Implement real product APIs with database, auth and strict multi-tenant role-based permissions; daycare, child, guardian, staff, daily activities, photos, incident logs, authorized pickup, consent and audit records. Connect owner reporting and parent timeline to real data. Once deployed and tested, integrate streaming via Elenio video gateway with authorized area/parent sessions and LEO grounded in the available verified records. Avoid child face recognition, inferred abuse detection, and emotion recognition as default features.

## Acceptance criteria

1. Owner business value is obvious above the fold.
2. Independent owner-focused section with three concrete outcomes exists before feature cards.
3. Images are different per section and avoid face-obscuring UI/graphics.
4. All eight production-toned FAQs are displayed and work on mobile.
5. The brand hierarchy is Daylio → by Elenio, unchanged official Elenio PNG.
6. Public CTA opens the WhatsApp draft for 081933328899; no false submission success.
7. Role picker switches owner, parent, caregiver; caretaker activity updates parent/owner where appropriate in real backend, or explicitly seeded development environment during coding.
8. Data isolation and consent enforcement is tested before using real children's information or camera feeds.
9. No horizontal overflow at 390px, 768px, 1440px; good color contrast and keyboard access to FAQ and modal.
10. CI passes lint, typecheck, unit/smoke tests, and a responsive screenshot review.
