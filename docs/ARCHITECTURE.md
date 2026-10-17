# Architecture and security boundaries

Next.js App Router serves the preserved v4 marketing document and a separate authenticated workspace. REST endpoints live under `/api/v1`; browser sessions use HttpOnly cookies, with a server-side verification request to Supabase Auth on each API call. Separate clients can send a Supabase access token as Bearer authorization. No service token is included in client components.

PostgreSQL contains relational tenant, membership, branch, class, child, invitation, guardian and assignment tables. The `records` table holds explicitly constrained domain kinds and validated JSON documents. Composite tenant foreign keys prevent cross-tenant child/class references. This is an intentional shared workflow storage model, not 42 independent CRUD backends. `record_history` preserves immutable before/after documents; `audit_logs` records the actor/action/resource without copying request prompts into logs.

The API verifies identity and membership, then starts a transaction, sets the user/tenant context and switches to restricted `daylio_app`. Every ordinary domain query executes under RLS. The connection's privileged role is used only for narrowly coded account bootstrap, verified invitation acceptance, public intake, workers and platform administration. Do not give `DATABASE_URL` to a browser or mobile client. A production migration account must grant the runtime login permission to `SET ROLE daylio_app`.

Parents see linked children and published care/media. Caregivers see assigned children and permitted handovers. Membership, assignment and guardian revocation take effect on the next request. An owner cannot become a platform admin through a tenant route. Support requests expose health metadata only after an owner approves a 30-minute grant; no child impersonation endpoint exists.

Media is kept under a persistent private volume, outside `public`. The server decodes images, bounds pixel count and size, strips metadata and produces WebP. A 60-second HMAC grant binds retrieval to a verified user, tenant and media ID. RLS is rechecked on download, including already-issued grants. Back up the volume together with the database. File writes and SQL are not a distributed transaction: a failed SQL commit can leave an inaccessible orphan file; maintenance should remove orphan files after a conservative grace period. Use a shared private object-storage implementation before scaling across hosts.

Auth/cookie mutations enforce same-origin checks; Bearer clients do not use ambient cookie authority. Input validation uses Zod; idempotency keys store a request hash and transactionally committed response. Tour, enrollment, plan caps and pickup workflows take advisory locks. Public intake and identity operations use persisted rate limits. Production ingress must replace, never pass through, client-provided `X-Real-IP`.

The sandbox uses PGlite's actual PostgreSQL engine and a separate synthetic identity fixture bound to localhost. The database flag is rejected when `NODE_ENV=production`. Synthetic users and assets are not real customer records. Sandbox verification is evidence for the application and RLS, not evidence that Supabase email delivery or any Elenio service works.

Known release gaps are maintained function by function in `IMPLEMENTATION_STATUS.md`. Do not infer release readiness from a passing build.
