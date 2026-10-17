# Elenio discovery — 17 October 2026

No existing Elenio repository, formal API specification, development credentials, or sandbox camera mapping was supplied in this workspace. The ZIP contains Daylio specifications and static frontend only. `demo.elenio.id` is a UI reference, not an API contract. No network probes against production cameras were performed.

Confirmed external endpoints: **none**. Playback protocol, authentication scopes, session revocation, shared-room consent enforcement, analytics event formats, concurrency limits and LEO runtime remain unknown.

`lib/elenio.mjs` defaults to unavailable for every operation. Changing `ELENIO_ENABLED` alone cannot enable it. The separate `ReliableElenioAdapter` is a tested transport harness with timeouts, bounded read retries and a circuit breaker; it contains no external route assumptions. Playback creation is never blindly retried.

To finish F27–F29 and live F42 verification, provide read access to the existing service repository or formal contract, a nonproduction credential through deployment secrets, external tenant/site/camera IDs, and a sandbox with authorized and unauthorized guardians. Implement only the verified adapter mapping. Execute cross-tenant, cross-child, expired/revoked-grant, consent withdrawal, private-room, offline and analytics-source tests before enabling playback. No gateway, ingest, camera provisioning or analytics engine has been added.

For F30–F32, scoped deterministic record tools work independently. A real LEO runtime remains a separate unverified provider dependency; current responses identify `verified-records` mode and do not claim model-generated answers.
