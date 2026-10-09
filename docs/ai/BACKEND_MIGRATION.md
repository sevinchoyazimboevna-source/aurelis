# Backend Migration

## Current status — STEP 17 (2026-10-09)

Final cleanup and actual isolated local MongoDB/Redis/API/GraphQL/Socket.IO/private chat verification are recorded in [STEP_17_REPORT.md](STEP_17_REPORT.md), with the complete [API inventory](STEP_17_API_INVENTORY.md) and pre-deletion [candidate decisions](STEP_17_CLEANUP_CANDIDATES.md). Safe deletions/dependency removal preserve all prior STEP 16 work and all tests. GraphQL variable errors no longer reflect credential/contact inputs; getBrokerProfiles now has optional pagination (1/20 defaults, maximum 50) while retaining list/Float total and argument-free calls.

Verified: both no-emit app compiler checks; 47 unit suites/1,162 tests; 14 API HTTP suites/556 tests; batch 1/1. Real local two-instance private messages/read/unread, historical broker authorization, live indexes/unique constraints/counters, cache/TTL/quotas/presence/typing and Redis outage fail-closed behavior pass. Twelve material/new TS files and the standalone verification utility lint clean; two minimally adjusted old fixtures retain 169 errors/8 warnings, and repository lint retains 1,046 errors/56 warnings/zero fatal errors.

Next: FRONTEND INTEGRATION in the separate repository. Live successful Google login and production indexes/config/data/performance/multihost rollout remain UNVERIFIED. No builds, product feature expansion, frontend, Management Request, production database operation or migration/reconciliation invocation occurred. Earlier no-live-operation statements describe their historical steps.


## Historical status — STEP 16 (2026-10-08)

Verified on 2026-10-08: API/batch TypeScript no-emit checks; 46 unit suites / 1,147 tests; 13 API e2e suites / 544 tests; batch 1/1; all 14 changed TypeScript files and standalone utility focused lint clean. Repository lint: 1,150 errors / 61 warnings / zero fatal errors outside focused files. Local read-only Redis PING and isolated two-server pub/sub delivery passed; live Mongo and production Redis recovery/TTL/concurrency/deployment remain UNVERIFIED. Sanitized bootstrap logging suppresses framework exception details. Full evidence: [STEP_16_REPORT.md](STEP_16_REPORT.md).

The backend feature roadmap is complete. The next task is **FRONTEND INTEGRATION** in the separately located frontend repository, not another backend feature step. See [STEP_16_REPORT.md](STEP_16_REPORT.md) for the final audit, validation, contracts and categorized deployment assumptions. Older roadmap entries below are historical and do not reopen completed steps.

MongoDB owns permanent application data; GraphQL owns persistent APIs; Socket.IO owns authenticated private realtime delivery; Redis owns bounded caches, rate limits, presence/typing TTL state and adapter pub/sub. No frontend, Management Request, builds, migrations or live MongoDB operations were performed.

Private chat persists customer/yacht/broker-profile relationships and immutable brokerMemberId. Profile relinking never transfers history. ADMIN has explicit read-only history access even when recorded as a participant; new ADMIN customer starts and newly linked ADMIN broker participation are rejected. Both transports share ChatService and the per-member 30/60s message quota. See the report for same-profile relinking/reuse semantics and production index requirements.


## Step 10 sales / purchase inquiry workflow (2026-10-06)

Added submitSalesInquiry(CreateSalesInquiryInput!) as a contact-only facade returning the existing YachtInquiry. InquiryService.createSales validates/normalizes the input and delegates to the canonical create path with SALES; that path forces NEW, verifies PUBLISHED through YachtService and checks listing mode SALE. Guests and verified optional Member links use the existing OptionalInquiryAuthGuard. Generic submission, charter behavior and ADMIN list/detail/status/filter/page contracts remain compatible.

No new persistence model/output/admin query, schema/index change, price snapshot or budget/currency field. Yacht.salePrice remains canonical. No migration/database/frontend/Step 11+ work. Both TypeScript checks/builds pass, 902 unit tests, 398 API e2e tests and batch health pass; focused Inquiry lint is clean. Deployment/live MongoDB/index acceptance remains PENDING. See [the 55-point report](STEP_10_REPORT.md).

## Step 9 charter inquiry workflow (2026-10-06)

Existing YachtInquiry/yachtInquiries remains canonical with SALES/CHARTER and NEW/CONTACTED/CLOSED. submitCharterInquiry facade forces CHARTER/NEW and shares normalization/validation/persistence with preserved submitYachtInquiry. Public YachtService verifies PUBLISHED; shared submission checks listing mode and charter dates/optional guest capacity. Contact/message/date names and past-date acceptance are retained. Optional verified CurrentMember links are additive; guest access stays public and supplied invalid credentials fail through existing auth.

ADMIN getYachtInquiry detail and getYachtInquiriesPage are added; existing list/update persist. Filters and nullable pagination metadata are additive; total Float and legacy list max-100 clamp remain. New page query defaults 1/20, cap 50, stable createdAt/_id descending. One index declaration added; no migrations/live database/frontend/Step 10+ work. See [the 54-point report](STEP_9_REPORT.md).

## Step 8 personal wishlist (2026-10-06)

WishlistModule adds one wishlistItems relation schema, DTOs, resolver/service and shared authentication for active members of all current roles. getMyWishlist/addYachtToWishlist/removeYachtFromWishlist/toggleYachtWishlist/isYachtWishlisted derive ownership from CurrentMember; no arbitrary memberId or admin-wide query. Public Yacht visibility is shared with the existing catalog/detail paths without changing their contract. The IDs-only wishlist wrapper uses Int total and MongoDB newest-first filtering/count/pagination, defaults 1/20, cap 50; hidden/missing yachts are excluded before paging while saves remain stored. Add is idempotent with unique-index/upsert race handling and preserved timestamps; remove returns true if deleted, false if absent and permits explicit stale-save removal. Toggle-off permits saved stale records; toggle-on and saved-state lookup require a PUBLISHED Yacht. Two indexes declared, no migration/database/frontend/Step 9+ operations. Overlapping toggles are not serialized. See [Step 8 report](STEP_8_REPORT.md).

## Step 7 editorial backend (2026-10-06)

ArticleModule is registered in ComponentsModule with one articles schema, DTOs, resolver and service. NEWS/INSIGHT/GUIDE share storage and discovery. Public getArticles/getArticle/getFeaturedArticles reuse the shared PUBLISHED plus absent/null or elapsed publishAt filter. Shared ADMIN guards protect getArticlesForAdmin/createArticle/updateArticle. Articles uses Int total, MongoDB filters/search/sorts/count/pagination, defaults 1/20 and cap 50. Unique slug generation preserves URLs on title-only updates. Optional Member/Yacht/Destination links validate existing records and return IDs only. Content is a simple string and required for publication. publishedAt stamps the first PUBLISHED transition and is preserved thereafter; scheduling independently controls public visibility. No scheduler, migration, live database operation, frontend or future-step feature was added. See [the complete report](STEP_7_REPORT.md).

> Snapshot of code and configuration visible in this repository. This document does not establish deployment, data migration, or release acceptance.

## Current architecture

- `aurelis-api` is a NestJS 10 application. It serves Apollo GraphQL at `/graphql`, generates its schema at runtime, and enables the GraphQL playground outside production. The root HTTP route is a health greeting.
- `aurelis-batch` currently serves a root health response with `status: idle` and `scheduledJobs: 0`. No scheduled job is registered.
- Both applications use MongoDB/Mongoose where needed. The API reads `MONGODB_URI`; authentication requires `JWT_SECRET` and Google sign-in requires `GOOGLE_CLIENT_ID`.
- There is no frontend application in this repository. See [Frontend Migration](FRONTEND_MIGRATION.md).

## Implemented backend capabilities

- The public yacht catalog supports sales and charter listings, featured results, detail queries, text and specification filters, pagination, sorting, and per-listing currencies. Price filters and sorting are scoped by listing mode and currency; the API does not convert currencies.
- Broker profiles have public read operations and an admin-only save operation.
- Public users can submit yacht inquiries without an account. Sales and charter inquiries are persisted; charter submissions require dates. Admins can list inquiries and update their status.
- Member authentication provides email registration/login, verified Google ID-token login, current-member lookup, and stateless logout. Public registration and new Google accounts receive `USER` and `ACTIVE`; passwords are hashed and excluded from GraphQL. Admins use the same email login and are provisioned offline with `scripts/create-admin.js`.
- Yacht inventory, broker writes, and inquiry review require the `ADMIN` role. Auth and role failures return stable `AUTH_*` GraphQL extension codes.

## Persistence and interfaces

| Collection | Purpose |
| --- | --- |
| `yachts` | Sales and charter inventory |
| `brokerProfiles` | Broker information associated with yachts |
| `yachtInquiries` | Sales and charter leads and their staff status |
| `members` | Customer and staff accounts, roles, and status |

GraphQL operations currently include `register`, `login`, `googleLogin`, `getMe`, `logout`, `getYachts`, `getFeaturedYachts`, `getYachtsForStaff`, `getYacht`, broker reads, `submitYachtInquiry`, admin inventory writes, and admin inquiry review. The batch app's HTTP health route remains `/`.

The API listens on `AURELIS_API_PORT` (default `3000`) and still accepts `PORT_API` as a fallback. The batch app listens on `AURELIS_BATCH_PORT` (default `3001`) and accepts `PORT_BATCH` as a fallback. See [.env.example](../../.env.example) and the [README](../../README.md); do not copy secret values into this document.

## Migration and rollout status

- The current source contains the Aurelis yacht, broker, staff-authentication, and inquiry features described above.
- Whether these features have been deployed, accepted, or populated with production data: **PENDING**.
- Whether any legacy real-estate data exists elsewhere or requires archival: **PENDING**. The confirmed product plan is a fresh Aurelis launch without property-data migration; this is not evidence that an external database has been changed.
- Original linked migration documents were not available in the workspace or conversation. Their contents and historical task status: **PENDING**.

For repository conventions, follow [`AGENTS.md`](../../AGENTS.md). For recorded choices, see [Decisions](DECISIONS.md).

## Step 3 yacht contracts

The existing collection wrapper remains `Yachts` with `list` and `total` (the existing Float scalar); nullable page/limit/totalPages metadata is additive. All three collection paths share a MongoDB aggregation with filtering, sorting, skip/limit, broker lookup and total count. Public reads require PUBLISHED; staff reads retain STEP 2 ADMIN guards. Defaults remain page 1/limit 20, with a validated maximum 50.

CHARTER queries and persistence use `charterPrice`; GraphQL `charterRate` is a compatibility alias. Inputs are reconciled once in a shared YachtService-boundary helper. SALE/CHARTER are Yacht modes; InquiryType.SALES is unchanged. Partial updates preserve omitted amounts, broker and featured. Existing indexes were retained, with no database operations or migrations executed. See [Step 3 report](COMPLETED_TASK.md) and the repository README for the migration review workflow.

## Step 4 Crew backend

A canonical CrewProfile model in crewProfiles supports CAPTAIN/CHEF and DRAFT/PUBLISHED/ARCHIVED. CrewRole is distinct from MemberRole.CREW and the numeric Yacht.crew field. The new Crew module follows DTO/resolver/service/Mongoose DI and is registered in ComponentsModule.

Public getCrews/getCrew/getFeaturedCrews independently enforce PUBLISHED; featured adds featured=true. ADMIN getCrewsForStaff/createCrewProfile/updateCrewProfile reuse shared AuthGuard/RolesGuard. Crews has list/Int total and nullable page/limit/totalPages metadata; existing Yachts and its Float total are unchanged. Defaults page 1 / limit 20, maximum 50, with shared MongoDB-level filters, stable sorts, page skip/limit and total count.

Optional member links validate format/existence/uniqueness without fetching credentials or changing accounts. Admin-curated links may reference any Member role and grant no self-service access. A partial unique memberId index plus publication/newest and featured/newest indexes are declared. No live database operations, migrations, frontend or future-step workflows were performed. See [Step 4 report](STEP_4_REPORT.md) for local validation and remaining assumptions.

## Step 5 Destinations and Yacht discovery

One canonical Destination schema in destinations supports REGION/COUNTRY/AREA and an optional self-referencing parentId. Public collection/detail-by-slug/featured queries enforce PUBLISHED; ADMIN catalog/create/partial update use shared guards. Names are trimmed; slugs are globally unique and generated/normalized through one helper. Name-only updates preserve slugs. Current ancestor chains are checked for missing parents and cycles; parentId=null detaches explicitly.

Destinations uses an Int-total list wrapper with the established page 1 / limit 20 / maximum 50. MongoDB handles escaped search, filters, stable sorting, pagination and count. Country/region/descriptions/images are simple presentation metadata. Archive is status-only and does not delete or cascade.

Yacht gains optional destinationIds and a destinationId membership filter through its existing service. Existing location/country, Yachts Float total, charterPrice/charterRate compatibility and all prior filters remain intact. Old missing tags resolve to []; omitted update tags are preserved. Discovery uses explicit tags only, without descendant expansion. Archived Destination associations remain valid. Three Destination indexes and one additional Yacht index are declared, not deployed by this task. No migration, database, frontend or Step 6+ work was performed. See [Step 5 report](STEP_5_REPORT.md).

## Step 6 Offices and global contact network

One Office model in offices supports DRAFT/PUBLISHED/ARCHIVED. Public catalog/detail-by-slug/featured services enforce PUBLISHED; ADMIN catalog/create/update reuse shared guards. Offices uses Int total and page/limit/totalPages, defaults 1/20, maximum 50, escaped search/filtering, deterministic sorting and MongoDB pagination/count. Addresses/contact metadata, canonical unique slugs, runtime timezone validation and embedded same-day business hours are implemented.

BrokerProfile.officeId is the optional backward-compatible association. Supplied links validate Office format/existence regardless of status; omitted links are preserved, and existing profiles without officeId remain valid. Office archiving updates status only and does not modify or remove BrokerProfile links. Office-based Broker discovery/filtering was NOT added: current Broker reads have no filter input, and introducing a new Broker query/filter architecture is outside STEP 6 scope.

Both TypeScript checks and Nest builds passed; 462 unit tests and 173 API e2e tests passed. STEP 6 lint was historically blocked by the missing typescript-eslint dependency; the later authorized tooling task repaired that blocker and records current rule debt separately. No migrations/database operations, frontend work or STEP 7+ features were performed. Declared indexes and production acceptance remain unverified. See [the final 50-point STEP 6 report](STEP_6_REPORT.md).

## STEP 11 finalization � 2026-10-07

Dedicated SellYachtRequest owner intake is implemented; no prior owner-request model existed. YachtInquiry remains unchanged, and submission creates no Yacht listing, assigns no broker and never promotes a Member to OWNER. Required phone/builder/yearBuilt/lengthM/location/country and askingPrice-with-currency validation are enforced. Image intake/upload is deferred because no wired upload mechanism exists. No migrations/live database operations, frontend or STEP 12+ work were performed.

Both app TypeScript checks/builds pass; full unit regression 35 suites/1023 tests, API e2e 10 suites/491 tests and batch e2e 1/1 pass. Focused SellYachtRequest units 121/121 and e2e 93/93 pass. Full validation, focused lint and separately recorded historical repository lint debt are in [STEP_11_REPORT.md](STEP_11_REPORT.md). Deployment/live MongoDB/index/acceptance remain PENDING. Earlier step deferrals are historical.

## STEP 12 ? Yacht engagement (2026-10-07)

Yacht exposes viewsCount/likesCount as Int fields with schema zero defaults and legacy output fallback. Public recordYachtView(yachtId: ID!): Int! atomically increments accepted PUBLISHED detail-view events; queries remain side-effect free. WishlistItem remains the relational source of truth. Only confirmed upsert inserts increment likes; only actual deletions decrement with a positive-count predicate. Duplicate adds/losing unique-index races do not increment. Popularity sorts are MOST_VIEWED (views/createdAt/_id descending), MOST_LIKED (likes/createdAt/_id descending), POPULAR (likes/views/createdAt/_id descending). Missing counts normalize to zero in engagement sorts without writes. Existing wrappers, pricing aliases, visibility, featured defaults and member privacy are retained.

Both app typechecks/builds pass; full units 36 suites/1035 tests, API HTTP 10 suites/492 tests, batch health 1/1 pass. Focused engagement/wishlist 47 tests and Yacht HTTP 29 pass. No transactions, migrations, database operations, new indexes, frontend or STEP 13+ implementation. Cross-document failures and interleaved add/remove may cause counter drift; old relations require separately authorized reconciliation before counts are historically complete. Deployed unique index, live Mongo concurrency/query plans and production acceptance remain PENDING. See [the 60-point report](STEP_12_REPORT.md). Earlier deferrals are historical.

## STEP 13 ? Redis infrastructure (2026-10-07)

Implemented API-global RedisService/config/module, bounded failure-safe cache/TTL/temporary/presence helpers, public popularity ID-page caching with current MongoDB hydration and generation invalidation, Redis Lua rate limits on login/view/inquiry/sell submissions, Redis health reporting and shutdown cleanup. MongoDB remains permanent authority. Rate limits fail closed explicitly; cache/state failures bypass safely. No Socket.IO/chat/frontend/Management Request/build/migration/live database work. Implementation and validation evidence, policy thresholds and rollout limits: [STEP_13_REPORT.md](STEP_13_REPORT.md). Earlier STEP 13 deferrals are historical.

## STEP 14 — Socket.IO realtime infrastructure (2026-10-07)

Implemented API RealtimeModule, Socket.IO WebSocket gateway, two dedicated Redis adapter connections, current JWT/AuthService handshake and status rechecks, Redis presence/typing session leases, private room authorization seam (deny-all until STEP 15), reconnect reauthentication, Redis socket rate limits and GET /health/socket. No chat persistence/models, frontend, Management Request, build commands, migrations or live database operations.

Verified: both TypeScript checks; 42 unit suites/1,093 tests; 12 API e2e suites/521 tests; batch health 1/1; focused realtime/shared Redis units 34 and socket network e2e 23; focused Socket/Redis lint clean; git diff --check passes. Repository lint reports 1,136 errors/61 warnings/zero fatal errors outside focused files, left unchanged. Offline tests do not prove deployed pub/sub, Lua TTL/concurrency or release acceptance. See [STEP_14_REPORT.md](STEP_14_REPORT.md) for files, architecture, behavior and STEP 15 dependencies.
