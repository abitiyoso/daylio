# DAYLIO BY ELENIO — EXACT DESIGN IMPLEMENTATION

You are a Senior Frontend Engineer, Product Designer, and UI Quality Assurance Specialist.

Your task is to implement the approved **Daylio V20 landing page** into the existing Daylio application with maximum visual fidelity.

**THIS IS NOT A REDESIGN TASK.**

The supplied V20 source code, styles, assets, and rendered experience are the approved final design. Your responsibility is to faithfully reproduce and integrate them into the existing application.

## 1. SOURCE OF TRUTH

Use the provided `daylio-v20` folder as the primary reference.

Important files:
- `index.html` — approved page structure
- `styles.css` — approved design system and responsive layouts
- `app.js` — approved frontend interactions
- `assets/` — approved images, official logo, and mascot
- `standalone.html` — complete working reference

Study these files before modifying the existing application.

If there is a conflict between your design preferences and the approved V20 implementation, **V20 always wins**.

Do not use older V13–V19 implementations as replacement designs.

## 2. STRICT VISUAL FIDELITY

Preserve exactly:

- Daylio official logo and its proportions
- Sun of Care color palette
- Plus Jakarta Sans typography
- Headline wording and line breaks
- Section order and overall composition
- Photography and image crops
- Cards, border radius, shadows, and spacing
- Buttons, iconography, and hover treatments
- Background colors and decorative elements
- Dashboard mockup
- CCTV & AI Video Analytics showcase
- LEO mobile chat experience
- Pricing cards and closing CTA

Do not reinterpret, simplify, redesign, or replace components with generic templates.

Do not generate new images or logos.

Do not change the approved copywriting.

## 3. REQUIRED PAGE STRUCTURE

Implement the following sections in the same order:

1. Header & Navigation
2. Hero — Daycare Lebih Dipercaya
3. Tantangan Pemilik Daycare
4. Interactive Daylio Platform Showcase
5. CCTV & AI Video Analytics
6. Pengalaman Tiga Peran
7. LEO AI Assistant — Smartphone Chat
8. Pricing — Essential, Growth, Intelligence
9. Closing CTA & Footer

Preserve the approved storytelling: Daylio is a complete daycare management platform. CCTV and AI Video Analytics are important differentiators, not the entire product.

## 4. INTERACTIVITY

All existing V20 interactions must work.

**Platform Showcase**
- Business & Growth
- Care & Family
- Smart Monitoring
- LEO AI

Selecting a tab must update the corresponding content and dashboard preview.

**CCTV & AI**
- Camera selection
- Restricted-zone event
- Occupancy event
- Camera-offline event
- Dynamic overlays and event descriptions

Preserve the simulation disclaimer. Do not present simulated CCTV as real footage.

**LEO Smartphone Chat**
- Preserve the approved smartphone frame and chat interface.
- Tabs: Pemilik, Pengasuh, Orang Tua.
- Suggested questions change according to the selected role.
- Clicking a question updates the user message, LEO response, and insight card.
- The message input and send button must work.
- Unconnected AI functionality must remain transparently labeled as simulation.

**Other interactions**
- Mobile navigation
- Pricing selection
- Modal dialogs
- CTA buttons
- WhatsApp consultation links

Do not introduce decorative controls that have no function.

## 5. EXISTING APPLICATION INTEGRATION

First inspect the existing Daylio repository.

Identify:
- Frontend framework and routing
- Existing landing-page entry point
- Asset directory conventions
- Authentication and protected routes
- Existing shared components
- Build and deployment configuration

Integrate V20 into the current architecture without unnecessarily rebuilding the application.

**Do not change the existing Daylio back-office, parent portal, caregiver flows, database, authentication, or APIs unless strictly required for landing-page integration.**

If the application uses React or Next.js, convert the approved HTML into appropriate reusable components while preserving the rendered output.

Avoid unnecessary new dependencies.

## 6. IMAGE QUALITY AND RESPONSIVENESS

This is a critical requirement.

- Use the approved original assets.
- Never stretch an image to fill a container.
- Preserve natural image proportions.
- Use `object-fit: cover` only where intentional cropping is required.
- Set appropriate `aspect-ratio` and `object-position`.
- Keep faces and important activities visible.
- Ensure the CCTV panel and LEO phone never look flattened.
- Never enlarge low-resolution thumbnails as primary hero images.
- Keep UI text, charts, and analytics overlays as actual HTML/CSS/SVG, not rasterized screenshots.

Responsive behavior must be deliberately designed, not achieved by shrinking the entire desktop page.

## 7. DESIGN QA — MANDATORY

Use a real browser to compare your implementation against the V20 reference.

Test these viewport widths:

- 1440px desktop
- 1280px laptop
- 1024px tablet landscape
- 768px tablet
- 390px mobile
- 320px small mobile

Also test browser zoom at 100%, 125%, and 150%.

Capture screenshots for every major section.

Verify:
- No overlap or clipped text
- No stretched or blurry images
- No horizontal overflow
- No misplaced icons
- No cropped buttons
- No distorted LEO smartphone mockup
- No dashboard layout breakage
- No JavaScript errors
- No broken assets or links

Compare screenshots side by side with the V20 reference and correct the differences.

Do not claim a pixel-perfect result unless it has actually been verified.

## 8. QUALITY GATES

Before completing:

1. Run the project's lint and build commands.
2. Confirm the landing page works in the existing project.
3. Test all interactive components.
4. Verify responsive behavior in the browser.
5. Confirm every official Daylio brand asset is unchanged.
6. Capture final desktop and mobile screenshots.
7. Provide a concise list of changed files and remaining integration limitations.

## 9. NON-NEGOTIABLE RULES

- Do not redesign.
- Do not change the official Daylio logo.
- Do not modify the approved design system.
- Do not replace the approved photos without a documented technical necessity.
- Do not remove product features.
- Do not turn Daylio into a CCTV-only platform.
- Do not replace the LEO smartphone chat with a generic chatbot widget.
- Do not change existing backend behavior.
- Do not silently introduce mock backend integrations.
- Do not call the task complete with unresolved visible UI defects.

## FINAL ACCEPTANCE CRITERIA

The deployed local landing page must look and behave as closely as technically possible to the supplied V20 reference.

A user comparing the V20 reference and the new implementation should see the same visual hierarchy, imagery, spacing, typography, components, storytelling, and interactions.

**Preserve the design. Implement it faithfully. Validate it visually.**

Proceed with implementation and QA, not a new design exploration.