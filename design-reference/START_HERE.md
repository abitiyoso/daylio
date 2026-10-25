# Start Here — Daylio Backend v3 → Existing Daylio GitHub Repository

1. Work in the existing GitHub repository `abitiyoso/daylio` (do not create a new app).
2. Extract this ZIP, then copy `MASTER_PROMPT.md`, `DECISION_LOG.md` and the entire `Daylio_Backend_v3/` design-reference directory into your Codex workspace under `design-reference/` (or another non-runtime documentation directory). Do not overwrite `app/`, `lib/`, `db/`, or any existing website components with the design demo.
3. Paste `PASTE_IN_CODEX.txt` into Codex. In that turn, require it to read `design-reference/MASTER_PROMPT.md` and the attached v3 `README.md`, `UX_REVIEW.md`, `CODEX_HANDOFF.md`, `app.js`, `styles.css`, and screenshots.
4. Have Codex audit current code, APIs, RLS, tests and F01-F42 existing features. Implement only gaps and UI/UX changes based on v3. Phase 1 P0 first; keep a working build throughout.
5. Do NOT integrate CCTV/Video Analytics at this phase, rebuild gateway/RTSP/ONVIF, use real child data in sandbox, or claim provider connectivity without a verified contract.

See `MASTER_PROMPT.md` for full product, workflow, security, UI and test requirements.
