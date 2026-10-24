# Elenio integration — explicitly deferred

F27–F29 and the live-provider portion of F42 are **DEFERRED** by the approved Backend v3 scope. Existing `lib/elenio.mjs` remains the fail-closed adapter. No gateway, camera discovery, RTSP/ONVIF ingest, streaming backend, analytics engine or identity matcher is added. Prototype camera images and confidence scores are not evidence and are not used by the runtime.

Next phase requires the existing Elenio team's verified API contract and approved environment credentials. Confirm organization and classroom reference mapping, narrowly scoped viewer grants, expiry/revocation, shared-area child/guardian consent, audit/event identifiers, rate limits, timeout/error semantics and data retention. Do not guess endpoints or probe the installation.

Acceptance requires an existing-service staging environment: positive authorized viewing; unrelated child/tenant, revoked guardian and withdrawn consent denial; expired/replayed grant denial; no credentials or permanent stream URLs returned to clients; authorized real event references only; outage/circuit-breaker/recovery tests; and no loss of ordinary care or pickup functionality while video is unavailable. A pickup record may later reference a verified external event under consent, but its current human identity and handover evidence must remain independently usable.

External LLM, WhatsApp Business Platform and payment-provider integration are separate optional milestones. Current LEO is explicitly sourced deterministic retrieval; WhatsApp is staff-approved manual copy/open; payments retain verified manual references. None is represented as provider-connected.
