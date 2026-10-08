# STEP 14 — Socket.IO realtime infrastructure, Redis adapter and presence

Implemented 2026-10-07. Scope: STEP 14 only. Deployment and live multi-instance acceptance: **PENDING**.

## Files

Created:
- apps/aurelis-api/src/realtime/realtime.module.ts
- apps/aurelis-api/src/realtime/socket.gateway.ts
- apps/aurelis-api/src/realtime/socket-adapter.service.ts
- apps/aurelis-api/src/realtime/socket-state.service.ts
- apps/aurelis-api/src/realtime/socket-health.controller.ts
- apps/aurelis-api/src/realtime/socket.constants.ts
- apps/aurelis-api/src/realtime/room-policy.ts
- apps/aurelis-api/src/realtime/socket-foundation.spec.ts
- apps/aurelis-api/src/realtime/socket-heartbeat.spec.ts
- apps/aurelis-api/test/socket.e2e-spec.ts
- docs/ai/STEP_14_REPORT.md

Modified:
- apps/aurelis-api/src/app.module.ts — register RealtimeModule.
- apps/aurelis-api/src/redis/redis.service.ts — dedicated pub/sub duplication and bounded safe Lua state execution.
- apps/aurelis-api/src/redis/redis.service.spec.ts — test the new Redis service seams.
- package.json and package-lock.json — socket dependencies.
- README.md and AGENTS.md — realtime operational and compatibility contract.
- docs/ai/BACKEND_MIGRATION.md, COMPLETED_TASK.md, COMPLETED_TASKS.md, DECISIONS.md and NEXT_STEPS.md — implementation, validation and pending dependencies.

Deleted: **none**. Existing dirty, deleted and untracked work from STEP 2–13 was preserved. Local validation logs under tmp/step14 are tooling artifacts, not runtime infrastructure.

## Packages

Added runtime declarations: @socket.io/redis-adapter ^8.3.0 and socket.io ^4.8.1. Added dev dependency socket.io-client ^4.8.1 for real network tests. Existing @nestjs/websockets, @nestjs/platform-socket.io and ioredis are reused. Installation used --ignore-scripts; no build scripts were run. No dependency audit remediation or unrelated upgrades were attempted.

## Gateway and Redis adapter architecture

RealtimeModule imports existing AuthModule and RedisModule and registers one SocketGateway with its state, adapter, policy and health services. Default Socket.IO path /socket.io shares the API HTTP port and root namespace. Transport is WebSocket only; polling is intentionally disabled. maxHttpBufferSize is 16 KiB. Batch has no gateway or Redis dependency added.

SocketAdapterService obtains two dedicated ioredis connections through RedisService.createPubSubClient. They inherit the STEP 13 REDIS_URL, bounded command/connect timeouts, no offline command queue, caught errors and reconnect policy. The command client is never subscribed. Adapter activation waits for both dedicated clients to be ready before subscribing, using aurelis:socket.io channel prefix and a 1-second adapter request timeout. Ready listeners permit activation after initial connection failures; ioredis restores subscriptions on reconnect. Both connections disconnect on shutdown. A subscriber proxy catches unsubscribe/punsubscribe rejections because the upstream adapter fires these teardown promises without awaiting them; offline shutdown does not create unhandled rejections. Initialization and adapter error events are caught without logging credentials or payloads.

The adapter transports ephemeral events through Redis Pub/Sub. It stores no messages. MongoDB remains the future permanent chat authority. No Chat, Conversation or Message model was added.

## Authentication handshake and safe errors

Clients connect with auth: { token: accessToken }. URL query tokens, member IDs, role assertions and legacy memberNick are not authentication sources. Token input is bounded to 8 KiB and must be a nonblank string without whitespace. AuthService.authenticateRequest verifies the current Aurelis JWT and loads the current Member. Missing, invalid, expired, blocked, deleted or missing-record identities receive a sanitized connect_error with SOCKET_UNAUTHENTICATED. No raw auth error or JWT is emitted/logged.

After successful verification, the token is removed from retained handshake auth and context contains only memberId, role, expiry and readiness. The expiry is read only after shared JWT verification. Current status is checked through AuthService.getMe for incoming packets and server heartbeats; expiry is checked independently. No alternate Member status/authentication model exists.

Connection initialization joins the verified member's own private room, records presence, then emits socket:ready. Packet middleware is installed before async initialization so packets arriving before readiness cannot bypass enforcement. Clients must wait for socket:ready. Unavailable infrastructure during initialization emits sanitized socket:error and disconnects.

## Event contract

All custom event names live in SOCKET_EVENTS. No send-message or public-chat event exists.

| Event | Direction | Behavior |
| --- | --- | --- |
| socket:ready | server to client | Verified memberId and fresh sessionId; initialization complete |
| socket:error | server to client | Sanitized code, optional retryAfterSeconds |
| presence:heartbeat | client to server | Refresh own presence, acknowledge ok/online |
| presence:status | server to own member room | Derived memberId and online flag |
| room:join | client to server | Authorize conversationId, then join; acknowledge result |
| room:leave | client to server | Authorize, clear own typing session, leave; acknowledge result |
| typing:start | client to server and authorized peers | Authorize and require joined room, renew temporary typing lease |
| typing:stop | client to server and authorized peers | Authorize and require joined room, remove own typing lease |

Join/leave/typing accept { conversationId }, never arbitrary room names. Acknowledgments use ok and safe code fields. Typing peer events contain conversationId/memberId and ttlSeconds (5 for active state, 0 for inactive state). No contact details, credentials or message bodies are published.

## Presence

SocketStateService uses atomic single-key Lua and Redis sorted sets keyed by verified member ID. Socket IDs are session members with 60-second expiry scores. Redis TIME supplies the clock, avoiding API-instance skew. Each operation prunes expired scores, optionally touches/removes the current session, counts remaining sessions and gives the containing key a TTL or deletes it when empty. This is Redis authority across instances; no process-local presence Map is used.

Server heartbeats run every 20 seconds even for quiet clients; an optional client heartbeat also renews state. Disconnect removes only that socket session. Other sockets keep the member online until their leases expire or disconnect. Failed cleanup/process crashes fall back to the lease expiry. Reads distinguish unavailable (undefined) from offline (false), avoiding false offline assertions during outages. Heartbeats that race with disconnect remove the renewed lease after discovering that the connection has closed.

Presence notifications are restricted to the verified member's own private room, with no global roster or arbitrary public lookup. A last-socket disconnect leaves no connected same-member recipient, but Redis state becomes offline. STEP 15 must define authorization for observing other conversation participants and sending offline notices to them. Expiry is state-derived; there is no Redis keyspace subscription or guaranteed broadcast at the instant of a crash lease expiring.

## Typing

Temporary typing is a Redis sorted set per conversation/member, with socket-specific 5-second leases. Multiple sockets are aggregated: stopping one socket keeps typing active if another has a live lease. Repeated start renews the lease; stop removes the session; leave clears it before departure. Disconnecting snapshots joined conversation rooms and requests cleanup. Crashes/outages still expire within five seconds of the last successful write. Peers must honor ttlSeconds; TTL expiry itself does not generate a separate server stop event. There is no durable typing history.

Conversation access policy and current joined-room membership are required for every typing operation. Production RoomPolicy denies access, so this infrastructure is exercised using an explicit authorized test policy and becomes usable only after STEP 15 membership implementation.

## Room foundation and reconnect

safeId accepts only strict 24-character hexadecimal BSON IDs and normalizes lowercase. conversationRoom returns conversation:<conversationId>; memberRoom returns member:<verifiedMemberId>. Client room strings, path fragments and spoofed member rooms are rejected. Automatic joins are limited to the authenticated member room.

RoomPolicy is an injectable authorization seam whose default denies all conversations. STEP 15 must replace it with current database membership checks. No speculative Conversation lookup, role-based bypass or allow-all fallback was introduced.

Reconnect performs a fresh JWT/current-Member check, gets a new Socket.IO session ID, restores its own member room and presence, and requires explicit authorized conversation joins. Old session state is removed or expires. There is no packet replay, room restoration bypass, connection-state recovery or message history. The classic Redis adapter does not support connection-state recovery; this follows the documented adapter constraint. After server-forced disconnect, the client must explicitly reconnect with valid auth once infrastructure is ready.

## Socket rate limits

Existing RedisService.consumeRateLimit supplies atomic counter/expiry and hashed identities:
- socket-connect: 20 attempts per 60 seconds per handshake server IP, before token verification.
- socket-event: 120 incoming packets per 60 seconds per verified member, shared across sockets and instances. Includes known and unknown custom events; not per-event independent quotas.

No forwarded-header trust, client-selected identity or in-memory fallback. RATE_LIMITED includes retryAfterSeconds. A blocked event is rejected without executing its handler; quota exhaustion alone leaves the connection open. Failed limiter execution returns RATE_LIMIT_UNAVAILABLE (retryAfterSeconds 5) and denies connect or disconnects an established socket. Redis application/session state is never treated as message persistence.

## Redis failure behavior and health

Command/adapter outages do not prevent the HTTP application from starting. Socket handshakes fail closed until command Redis and both adapter clients are ready. Established sockets reject events on outage and are disconnected on event or the next 20-second heartbeat; temporary state expires if cleanup is unavailable. No intentional local-only broadcast fallback is provided. A failure racing after the final readiness check may still lose an ephemeral delivery; no exactly-once delivery guarantee is claimed.

GET /health/socket follows the existing health architecture: HTTP 200 with status ok/degraded, ready boolean, adapter up/down, Redis ping up/down, policy fail-closed, and no configuration/credentials. It is a readiness/degradation signal, not proof of real multi-instance delivery. Existing root health and /health/redis remain compatible.

## Validation results

No build command was run. No migration, live Redis/MongoDB operation, frontend change or Management Request implementation occurred.

| Check | Result |
| --- | --- |
| npx tsc -p apps/aurelis-api/tsconfig.app.json --noEmit | PASS, final source |
| npx tsc -p apps/aurelis-batch/tsconfig.app.json --noEmit | PASS |
| Focused realtime/shared Redis units | PASS: 3 suites, 34 tests |
| Full applicable unit regression | PASS: 42 suites, 1,093 tests |
| Focused socket network e2e | PASS: 1 suite, 23 tests |
| Full API e2e | PASS: 12 suites, 521 tests |
| Separate batch e2e | PASS: 1 suite, 1 test |
| Focused Socket/Redis lint, including socket e2e | PASS: zero errors/warnings |
| Repository lint report only | 1,136 errors, 61 warnings, zero fatal errors; focused files clean |
| git diff --check | PASS; repository CRLF conversion notices only |

Full regression includes STEP 2–13 Auth/Yacht/Broker/Inquiry/Crew/Destination/Office/Article/Wishlist/SellYachtRequest/Redis behavior. Network socket tests run a real Nest/Socket.IO server/client and real JWT/AuthService against offline member and Redis doubles. Coverage includes authenticated connect, invalid/expired/query tokens, blocked/deleted/missing records, private context/rooms, disconnect cleanup, online/offline/multiple sockets, lease expiry/heartbeat, typing stop/TTL/multiple sockets, authorized test joins/leaves, room rejection, reconnect auth, packet/connect rate limits, Redis/adapter outages and socket health. Unit tests cover adapter setup/readiness/shutdown/initialization errors, shared Redis failure containment and periodic heartbeat failure/races/timer shutdown.

These tests do not execute Lua in live Redis, prove deployed TTL/concurrency or verify cross-instance delivery. Initial PowerShell combined stderr redirection marked successful Jest output as native-command errors; final runs used direct Jest CLI with captured UTF-8 logs and confirmed exit 0. Repository lint intentionally exits 1 for historical debt; no repo-wide fixes were made. The default shell sandbox launcher failed during environment setup, so authorized commands used the working reviewed elevated shell. No automatic approval rejection left work blocked.

## Remaining STEP 15 and rollout dependencies

1. Add Conversation/Message MongoDB models and permanent message services only in STEP 15; no Redis message storage.
2. Replace RoomPolicy deny-all with current Conversation membership/existence authorization for each join and typing operation. Define observer privacy, revoked-membership room removal, presence subscriptions and participant broadcasts.
3. Add authorized messaging, receipts/history/replay and reconnect recovery semantics separately. Current transport events are ephemeral and can be lost.
4. Verify actual Redis Lua permissions/expiry/eviction behavior, pub/sub ACLs, auth/TLS, subscription recovery, multiple API instances, failure races and shutdown against deployment infrastructure. Configure WebSocket-capable load balancers. Polling is disabled; enabling it later requires reviewing sticky-session requirements.
5. Validate room/member traffic, limits and current-member query costs before production; proxy trust and quota changes require explicit review. Rollout and acceptance remain **PENDING**.

References: [NestJS gateways](https://docs.nestjs.com/websockets/gateways), [Socket.IO Redis adapter](https://socket.io/docs/v4/redis-adapter/). These informed the gateway/pub-sub setup and documented recovery/transport limitations.
