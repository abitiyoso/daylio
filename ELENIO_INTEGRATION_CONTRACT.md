# Elenio Existing Backend — Integration Discovery Checklist

**Do not implement a new CCTV/RTSP/ONVIF stack, video gateway or analytics algorithms.** Elenio already owns those systems behind `demo.elenio.id`. The link is a UI reference, **not** an authenticated API specification.

## Required existing-service facts (verify in Elenio repository, docs, or with Dafin)
1. Repository/service name and internal API base URL/environment(s), Swagger/OpenAPI if available.
2. Auth method and scopes for server-to-server calls; whether service issues short-lived view tokens.
3. Elenio org/site/camera IDs, tenancy model and branch-to-camera mapping.
4. List cameras + room/site metadata + online status endpoint (or method).
5. Browser compatible playback mechanism (HLS, WebRTC, another) and secure token creation/expiry/revocation flow.
6. Analytics event list/search, event metadata, stream subscription/webhook and event ID semantics.
7. Existing LEO API and whether its tools/runtime can consume Daylio scoped data.
8. Concurrency, bandwidth, quotas, logging, data-retention and video access policies.

## Daylio-to-Elenio boundaries
- Elenio owns: camera provisioning, ONVIF/RTSP ingest, edge/local gateway, stream distribution, analytics processing and event source of truth.
- Daylio owns: daycare/branch/child/guardian/staff records, daily care activities, parent permissions, viewing consent, user-facing video UI, incident workflow, enrollment funnel, daycare-scoped AI tools.
- Daylio stores only camera references + authorization policy, not video devices' raw passwords or streams.
- Never stream to parents until Elenio can issue and enforce restricted time-limited playback access, or another approved security approach has been implemented and validated.

## Proposed adapter shape (illustrative; NOT asserted existing API)
- `listAuthorizedCameras(tenantId, branchId) -> { cameraId, roomId, displayName, status }[]`
- `createPlaybackSession(cameraId, guardianContext) -> { playbackUrlOrSession, expiresAt }`
- `stopPlaybackSession(sessionId) -> void`
- `listAnalyticsEvents(cameraIds, period) -> Event[]`
- `getLeoClient()` or provider adapter to Daylio-scoped LEO toolchain

Implement adapters to *confirmed* routes/protocols only. If unconfirmed, document blockers, mock only in isolated development fixtures, and continue completing daycare workflows.
