# STEP 13 — Redis infrastructure, rate limiting and cache foundation

Completed locally on 2026-10-07. Backend implementation is complete; deployment and live Redis/MongoDB acceptance remain **PENDING**.

## Implementation

- Added `ioredis` to runtime dependencies and updated the lockfile. Added `REDIS_URL=redis://localhost:6379` to `.env.example`; the same URL is the development fallback. Existing `.env` and credentials were not read, changed or committed. `redis:` and `rediss:` protocols are accepted; invalid URL configuration fails explicitly.
- Added global API `RedisModule`, shared injectable `RedisService`, and a global metadata-driven `RateLimitGuard`. Existing resolver/service/module patterns, authentication, DTOs, enums, schemas and permanent MongoDB models remain in place. The idle batch app has no Redis consumer and does not gain an unnecessary Redis dependency.
- Added `compose.redis.yml` for a disposable local Redis 7.4 instance bound to `127.0.0.1:6379`, with a healthcheck and persistence disabled. No container was started. This is development infrastructure, not production rollout evidence or a production security configuration.
- Redis connects in the background, reconnects with bounded backoff, disables offline queueing, uses zero per-request retries and 1-second connection/command timeouts, handles error events with sanitized logs, and catches connection/command rejections. API startup does not await Redis availability. API shutdown hooks disconnect the client and stop reconnect work.
- JSON cache helpers support get/set/delete/remember with explicit positive integer TTLs. Invalid JSON is a miss; disconnected Redis and command failures return safe unavailable/false results. `remember` propagates authoritative loader errors while suppressing non-critical cache-write failures. Undefined or unserializable values are not cached. Generic JSON helpers return JSON values; callers needing BSON/Date values should hydrate from MongoDB.
- Temporary storage helpers namespace and hash namespace/identity components, require TTLs and provide get/set/delete. Redis is never the permanent source of member, yacht, inquiry or request data.
- Presence foundation provides hashed per-member/per-session keys and `touchPresence`, `getPresence`, `clearPresence`; heartbeat state contains `lastSeenAt` and defaults to a 60-second TTL. Separate sessions do not overwrite each other. These are internal helpers, with no public presence API or permissions. STEP 14 must derive verified identities and drive heartbeats; future socket pub/sub must use separate Redis connections. No Socket.IO or chat was implemented.

## Popularity cache

- Public `MOST_VIEWED`, `MOST_LIKED` and `POPULAR` pages cache ordered yacht IDs and total only, for **30 seconds**. Keys include the complete catalog input and featured-only flag under a hashed query key. Ordinary sorts and staff catalog reads bypass this cache; existing featured defaults and all Yacht wrapper/pricing aliases remain compatible.
- Cache hits fetch current records and broker information from MongoDB using the original filter plus the cached IDs. PUBLISHED visibility is independently enforced; output order follows the cached ranking, and Dates/BSON values come from MongoDB rather than serialized snapshots. If page references are hidden/missing or cache data fails validation, the full authoritative aggregation recomputes the page and count.
- Cache shape validation checks valid string ObjectIds, unique IDs, page size and a valid total. Existing pagination, filters and deterministic popularity sort ties are retained.
- Accepted views, actual wishlist insert/delete/toggle changes, and successful yacht create/update rotate a shared UUID generation. Duplicate saves, absent removals and rejected views do not create artificial engagement changes. Wishlist invalidation also runs when the counter write fails after a relation change; the MongoDB error remains visible.
- Generation invalidation avoids Redis key scans. An in-flight fill targeting the old generation cannot become the active generation after a concurrent invalidation; unreachable pages expire normally. Generation keys expire after 24 hours, much longer than cached pages.
- Cache operations fail gracefully to MongoDB. Failed invalidation, external writes or concurrent publication changes can leave ranking/count metadata stale until cached pages expire, including a possible late stale fill. Current page records still pass MongoDB visibility checks. This is an eventually consistent cache, not transactional ordering/counting. Existing wishlist/counter cross-document drift and concurrent toggle limits remain unchanged.

## Rate limits and explicit failure policy

All quotas use **server-observed IP**, shared through Redis across API instances. Identities are SHA-256 hashes in keys; no email, token or contact data is stored in limiter keys. Express proxy trust remains disabled and supplied forwarded headers do not change identity. Users behind one NAT or proxy share quota; production proxy trust must be configured narrowly in a separate deployment decision.

| Operations | Shared scope | Limit | Window |
| --- | --- | --- | --- |
| `login`, `googleLogin` | login | 10 attempts | 60 seconds |
| `recordYachtView` | view | 60 attempts | 60 seconds |
| `submitYachtInquiry`, `submitCharterInquiry`, `submitSalesInquiry` | inquiry | 5 attempts | 600 seconds |
| `submitSellYachtRequest` | sell | 5 attempts | 600 seconds |

One Lua operation atomically increments and expires the counter and returns its remaining TTL. Windows start at the first attempt, not wall-clock boundaries. Only the first increment sets expiry; later attempts do not extend the window. Attempts reaching the guard consume quota before authentication/validation/persistence. Aliases share scopes to prevent facade switching from bypassing quotas. Unrelated reads/writes have no new limiter policy.

**Redis rate-limit failures fail closed.** Protected mutations stop before resolver work and return GraphQL `RATE_LIMIT_UNAVAILABLE` with `retryAfterSeconds: 5`. Exhaustion returns `RATE_LIMITED` with the remaining retry interval. There is no process-local fallback and no silent fail-open path. This deliberately makes protected writes temporarily unavailable during Redis outages while public reads continue against MongoDB. The existing GraphQL HTTP envelope remains; the formatter preserves these two codes and retry metadata without changing existing auth/error behavior.

Redis disconnection, timeouts, script rejection or an invalid script result count as limiter unavailability. Cache/presence/temporary operations remain non-critical and bypass safely. Redis command and initial connection rejections are caught; an unavailable Redis server does not crash the API through an unhandled rejection.

## Health and operations

`GET /health/redis` returns HTTP 200 with `{ status: 'ok' | 'degraded', redis: { status: 'up' | 'down' }, rateLimitPolicy: 'fail-closed' }`. Health uses an actual bounded PING when the client is ready. It exposes no URL, credentials or keys. Monitor the JSON status; this endpoint distinguishes dependency degradation from process liveness. The existing root API greeting and batch health contract remain unchanged.

README, AGENTS.md and the AI migration/completion/decision/next-step handoffs now document configuration, policy, limitations and future presence usage. Existing unrelated working-tree changes were preserved. No migration/index/backfill/reconciliation, live database or live Redis operation, frontend, Management Request, socket/chat implementation, or build command was executed.

## Validation

| Check | Result |
| --- | --- |
| `npx tsc -p apps/aurelis-api/tsconfig.app.json --noEmit` | PASS, final implementation |
| `npx tsc -p apps/aurelis-batch/tsconfig.app.json --noEmit` | PASS; batch source unchanged |
| Focused Redis/engagement/wishlist unit run | PASS initially: 5 suites / 90 tests; subsequent new module test included in full regression |
| `npm test -- --runInBand` | PASS final: **40 suites / 1,079 tests** |
| `npm run test:e2e -- --runInBand` | PASS final: **11 suites / 498 tests** |
| `npm run test:e2e:batch -- --runInBand` | PASS: **1 suite / 1 test** |
| Focused ESLint on Redis source/tests, new HTTP suite, Auth/Inquiry/Sell resolvers and Wishlist service | PASS: **0 errors / 0 warnings / 0 fatal errors** |
| `npm run lint -- --format json ...` | Report only: **1,136 errors / 61 warnings / 0 fatal errors**, remaining existing source/test debt; no repo-wide cleanup |
| `git diff --check` | PASS; existing CRLF normalization notices are Git warnings, not whitespace failures |
| New STEP 13 file whitespace inspection | PASS |
| Builds, migrations, live Redis/MongoDB operations | **Not run**, as instructed |

The new Redis-focused suites add 44 unit tests over the STEP 12 baseline. Coverage includes module DI, bounded connection setup/shutdown and rejection containment, health, cache hits/misses/corrupt data, TTL validation, loader failure propagation, safe cache-write failures, limiter script invocation/result checks, namespaced temporary/presence helpers, generation/query isolation, all operation policy metadata, trusted IP handling, fail-closed/exhaustion codes, popularity cache fill/hydration/visibility/bypass and view/wishlist invalidation. Six new HTTP cases exercise real resolvers and the global guard with offline adapters: view exhaustion and header spoofing, combined password/Google login quota, shared generic/charter/sales quota, sell quota, outage behavior with public-read availability, and dependency health.

All API HTTP tests use mocked/offline persistence and Redis adapters. No result establishes live Redis Lua execution, actual TTL expiry timing, multiple-process concurrency, deployed MongoDB indexes/query plans or production acceptance. Expected error-path test logs are intentional. The sandbox command runner initially failed before starting commands; the approved execution fallback completed the checks.

## Rollout limits and STEP 14 handoff

Provision production Redis and verify REDIS_URL, authentication/TLS/network controls, script permissions, reconnect/shutdown, real expiry and concurrent limiter behavior separately. Configure a capacity/eviction policy that does not silently evict active limiter keys; Redis loss/flush/eviction can reset quotas. Tune fixed thresholds using measured traffic and decide narrow proxy trust explicitly. Monitor dependency degradation and fail-closed errors.

MongoDB remains permanent authority. Popularity cache is disposable and eventually consistent; high engagement invalidation can reduce hit rate. No historical likes repair, transactions, distributed toggle serialization, unique visitor tracking, CAPTCHA, account lockout or analytics history is introduced. Generic temporary state is unsuitable for durable/critical workflow data without a separately agreed failure policy. Presence has no online-user aggregate or heartbeat transport yet. STEP 14/socket pub/sub/chat and frontend integration remain separately authorized future work.
