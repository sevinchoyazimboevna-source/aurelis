# Completed Tasks and Verified Repository State

## STEP 10 — Sales / purchase inquiry workflow (2026-10-06)

Added contact-only CreateSalesInquiryInput and public submitSalesInquiry facade, forcing SALES/NEW through the existing InquiryService create path and canonical YachtInquiry persistence/output. Reused PUBLISHED YachtService visibility, SALE mode checks, contact normalization and optional verified Member links. Generic submission, charter behavior, ADMIN list/detail/status transitions, filters, Float total, defaults/caps and ordering remain compatible. No price snapshots or budget/currency fields, schema/index changes or parallel sales domain.

Verified: both TypeScript checks and Nest builds; 32 unit suites / 902 tests (new Sales suite: 50), 9 API e2e suites / 398 tests (49 new sales cases), batch health 1/1. Focused Inquiry: 6 unit suites / 138 tests and 1 HTTP suite / 121 tests; focused lint has zero errors/warnings. Repository lint runs but retains 1,135 errors/61 warnings/zero fatal errors outside Inquiry. git diff --check and scoped new-file whitespace checks pass. One HTTP command hit an automatic approval-review timeout before execution; the allowed retry completed successfully.

No migrations/live database/frontend/Step 11+ operations; prior dirty/deleted/untracked work preserved. Real MongoDB/index performance, deployment/configuration/acceptance and retention/spam controls remain PENDING. See [the 55-point report](STEP_10_REPORT.md). Earlier step reports below are historical.

## STEP 9 — Charter inquiry workflow (2026-10-06)

Extended existing YachtInquiry safely, without parallel CharterRequest persistence. Added public charter facade forcing CHARTER/NEW, shared normalization/public Yacht/mode/date/optional capacity validation, optional verified Member linkage, ADMIN detail and a cap 50 page query. Preserved generic SALES/CHARTER submission, existing wrapper/Float total/max 100 list semantics, optional phone/guest count, past-date policy and status-only management. Filters/nullable metadata are additive. No public inquiry list/getMyInquiries, arbitrary cooldown or PII logging.

Verified: API/batch TypeScript checks and both builds pass; full units 31 suites/852 tests, API e2e 9 suites/349 tests, batch 1 suite/1 test pass. Final focused Inquiry5 suites/88 tests and new HTTP72 tests pass. Focused lint zero errors/warnings; repository lint1,135 errors/61 warnings/zero fatal errors outside Inquiry files. Whitespace checks pass. All earlier Auth/Yacht/Inquiry/Broker/Crew/Destination/Office/Article/Wishlist regressions pass.

No migrations/live database/index/frontend/Step 10+ operations. Existing unrelated work preserved. One index declaration added, two retained; deployed indexes/MongoDB/performance/acceptance remain PENDING. See [the 54-point report](STEP_9_REPORT.md).

## STEP 8 — Personal wishlist / favorites (2026-10-06)

Implemented a separate WishlistItem relation model, GraphQL DTOs/resolver/service/module and five private current-member operations. All active roles use shared auth; no supplied memberId/admin-wide access. MongoDB listing filters public Yacht references before count/pagination while preserving hidden/broken saves. Add is idempotent with compound uniqueness/upsert race handling and preserved timestamps. Owner removal is true-if-deleted/false-if-absent and permits stale saves; toggle reuses removal/add. Dedicated saved-state lookup requires a public Yacht. Shared Yacht visibility helper preserves existing public semantics. No nested Yacht or Yacht.isWishlisted added.

Verified: both app TypeScript checks and builds pass; final full units 27 suites/767 tests pass; API e2e 8 suites/277 tests pass; batch 1 suite/1 test passes. New Wishlist units 3 suites/50 tests and HTTP suite/33 tests pass. Focused new-file lint is clean; repository lint retains 1,146 errors/64 warnings/zero fatal errors outside Wishlist/helper. Whitespace checks pass. Previous auth/Yacht/Inquiry/Broker/Crew/Destination/Office/Article regressions pass.

No migrations/live database/index/frontend/Step 9+ operations. Unrelated changes preserved. Target indexes/MongoDB/deployment acceptance remain PENDING; overlapping toggles are not serialized. See [the 50-point report](STEP_8_REPORT.md).

## STEP 7 — Editorial backend finalization (2026-10-06)

Inspected and preserved the pre-existing untracked Article backend and registration; completed the contract audit, corrected an Article e2e slug collision and scoped test lint findings, and updated architecture/handoff documentation. One articles model supports NEWS/INSIGHT/GUIDE, shared publish-time public visibility, ADMIN management, stable unique slugs, plain content, metadata and validated IDs-only links. publishedAt records the first PUBLISHED transition, including future schedules; publishAt independently controls availability.

Verified: API/batch TypeScript checks and both Nest builds pass; full unit run 24 suites/717 tests passes; final focused Article run 3 suites/255 tests passes; final API e2e 7 suites/244 tests passes (Article 71, existing 173); batch 1 suite/1 test passes. Final repository lint exits 1 with 1,147 errors/64 warnings/zero fatal errors, all outside Article files. Article files have zero errors/warnings. Historical missing-package blockers are not the current result. git diff --check and explicit new-file whitespace checks pass.

No migrations/live database/index operations/frontend/STEP 8+ work. Existing unrelated changes and historical reports retained. Production/index/query-plan acceptance remains PENDING. See [the full 54-point report](STEP_7_REPORT.md).

> This is an evidence-backed snapshot of code and checks, not a claim that Aurelis has completed production migration or rollout. The working tree may contain uncommitted changes.

## Present in the repository

- Nest projects and folders are named `aurelis-api` and `aurelis-batch`; package metadata uses `aurelis-backend`.
- The API contains yacht catalog, broker profile, staff authentication, and inquiry modules with Mongoose schemas and GraphQL DTOs.
- The batch app is an idle health endpoint; no scheduled jobs are currently configured.
- Admin account provisioning is implemented as an offline script. Public email signup and Google sign-in are implemented in the API.
- Member authentication now uses email/password registration and login, verified Google ID tokens, stable GraphQL auth error codes, and an explicit non-destructive legacy-admin mapping script. The migration script was not run against a database.
- The six original source documents were not found; the documentation source contents are **PENDING**.

## Checks observed

- TypeScript no-emit checks for both app projects passed during the app-identifier rename.
- Earlier ESLint checks were blocked by an undeclared `typescript-eslint` import. The tooling issue was repaired on 2026-10-06; existing code/style findings remain. See the Step 1 entry below.
- Step 2 validation: API and batch TypeScript checks and Nest build passed; 8 unit suites (53 tests) and 2 API GraphQL e2e suites (5 tests) passed on 2026-10-05.

## Not verified

- Production deployment, production data, and release acceptance: **PENDING**.
- Any external legacy-data archival or cleanup: **PENDING**.
- Frontend implementation or migration progress: **PENDING**.
- Historical task completion beyond the source files and checks listed above: **PENDING**.

See [Backend Migration](BACKEND_MIGRATION.md), [Decisions](DECISIONS.md), and [Next Steps](NEXT_STEPS.md).

## Step 3 ? Yacht model, enums and filters (2026-10-05)

Implemented the approved compatibility decisions while preserving pre-existing working-tree changes. Existing Yachts list/total wrapper and total Float scalar remain intact; optional pagination metadata was added. Public/staff collections share query construction, public visibility is fixed to PUBLISHED, filters and deterministic sorts are expanded, and pagination rejects invalid bounds with the established limit 20 default and maximum 50.

CharterPrice is canonical storage. Create/update share one charterRate input-normalization helper; output charterRate reads charterPrice. Updates are partial and preserve omitted prices/broker/featured. Yacht-specific SALES references were changed to SALE; InquiryType.SALES remains unchanged. The broker field resolver now declares its GraphQL return type explicitly, collection broker lookups are reused, and brokerId remains an ID on populated detail reads.

Validation: API and batch TypeScript no-emit checks passed; API and batch Nest builds passed; 10 unit suites / 144 tests passed; 3 API e2e suites / 33 tests passed; git diff --check passed. Non-mutating lint remains blocked by the existing missing typescript-eslint package. E2e uses real GraphQL resolvers, services and guards with mocked persistence/authentication. Offline schema validation and migration planning tests do not connect to MongoDB or external APIs.

The standalone legacy yacht migration was created and NOT executed. No indexes/collections were changed in a database, no yachts were deleted, and no frontend or future-step feature was implemented. Production/legacy data and deployment acceptance remain PENDING. See [the complete Step 3 report](COMPLETED_TASK.md).

## Step 4 - Crew model, Captain/Chef profiles and queries (2026-10-05)

Implemented the canonical CrewProfile backend for CAPTAIN/CHEF with independent DRAFT/PUBLISHED/ARCHIVED statuses. Public list/detail/featured services enforce PUBLISHED; ADMIN-only staff reads/create/partial update use existing STEP 2 guards. Collection filtering, stable sorting, pagination/count use MongoDB with defaults page 1 / limit 20 / maximum 50 and an Int-total Crews wrapper.

Optional member links verify format/existence and one-profile-per-member uniqueness without fetching credentials or changing roles. Admin-curated links support any existing account role and grant no self-service access. DisplayName derives first/last name when absent without storing a derived duplicate; names sort on the same MongoDB-computed presentation key. Three schema indexes are declared, not provisioned against a database during this task.

Verified: API/batch no-emit TypeScript checks and both Nest builds passed; 13 unit suites / 254 tests passed (Crew 3 / 110, existing 10 / 144);4 API e2e suites / 86 tests passed (Crew 53, existing 33);git diff --check and new-file whitespace checks passed. Scoped non-mutating lint remains blocked by the existing missing typescript-eslint dependency. Existing Auth/Yacht/Inquiry/Broker regressions pass; no prior tests were removed. Module DI is tested without a database connection, and e2e uses real resolvers/service/guards with mocked persistence/authentication.

No Step 4 migration script was needed or created; no database operations or migrations were executed. No Crew self-service, hiring/future-step workflows, frontend or auth redesign was implemented. Existing Yachts wrapper/Float total, charterPrice/charterRate compatibility, SALE modes, InquiryType.SALES and numeric Yacht.crew remain unchanged. Deployment/index provisioning/live MongoDB performance/legacy external data remain PENDING. See [the complete 33-point Step 4 report](STEP_4_REPORT.md).

## Step 5 - Destinations and Yacht destination discovery (2026-10-05)

Implemented the single Destination model with REGION/COUNTRY/AREA, publication statuses, self-referencing hierarchy, globally unique canonical slugs, presentation fields and curated order. Public catalog/detail-by-slug/featured reads enforce PUBLISHED; ADMIN catalog/create/partial update reuse shared guards. One helper generates/normalizes slugs; name-only updates preserve them. Parent writes check existing ancestors for missing records and cycles. Collections use Int total, established metadata/defaults/cap and MongoDB filtering/search/sorting/pagination/count.

Yacht gained optional destinationIds and existing-query destinationId BSON membership filtering. Existing location/country, pricing aliases, modes, wrapper/Float total and all prior features remain compatible. Omitted update tags stay unchanged; [] clears. Historical archived tags remain; parent discovery requires explicit tags. Three Destination and one Yacht index declarations were added without touching a live database.

Verified: API/batch TypeScript no-emit checks and both Nest builds pass; 17 unit suites / 372 tests pass (new Step 5: 4 suites / 118); 5 API e2e suites / 137 tests pass (new Step 5: 51); git diff --check and new-file whitespace checks pass. Existing Auth/guards/Yacht/Crew/Inquiry/Broker coverage passes. Non-mutating lint remains blocked by missing typescript-eslint. Unit/schema/DI/e2e validation uses offline or mocked persistence/authentication, with no database or external API calls.

No migrations/scripts/database operations, frontend or Step 6+ features were performed. Previous reports and unrelated changes are preserved. Actual index state/MongoDB performance/deployment/acceptance remain PENDING; current-chain parent validation does not serialize concurrent reparenting. See [the complete 45-point report](STEP_5_REPORT.md).

## Backend completion roadmap Step 1 - tooling and batch test (2026-10-06)

Repaired ESLint configuration/dependency alignment and the batch health e2e test. This roadmap Step 1 is separate from the earlier numbered product migration steps. ESLint now uses explicitly declared parser/plugin imports, a test-inclusive lint-only tsconfig, supported lint dependency versions, and non-mutating `npm run lint`; autofixing is explicit via `lint:fix`. Removed the invalid Prettier `extends` option. Batch Supertest uses a default import and closes its Nest app after each test; `test:e2e:batch` exposes the separate suite.

Final whole-project lint runs across 99 backend source/test files with zero fatal/configuration/parsing errors, but exits 1 for 1,146 errors and 64 warnings in existing code/style. These findings are not suppressed or automatically rewritten. The edited batch test passes scoped lint. Both app typechecks/builds pass; 21 unit suites / 462 tests, 6 API e2e suites / 173 tests, and 1 batch suite / 1 test pass. See [the complete Step 1 handoff](COMPLETED_TASK.md) for validation and remaining limitations. No Step 2 business logic, frontend, migration or live database work was performed.

## STEP 6 finalization - Offices and global contact network (2026-10-06)

Finalized [the 50-point STEP 6 report](STEP_6_REPORT.md) and handoff documentation only. Office public/admin catalogs and management, unique slugs, contact/address fields, timezone and embedded business hours are implemented. BrokerProfile.officeId is the optional backward-compatible link; profiles without it remain valid. Office archive changes status only and leaves BrokerProfile links intact.

Office-based Broker discovery/filtering was NOT added: existing Broker read operations have no filter input, and new Broker query/filter architecture is outside STEP 6 scope. Both TypeScript checks and Nest builds passed; 462 unit tests and 173 API e2e tests passed. git diff --check passed after the final documentation edits. STEP 6 lint was historically blocked by missing typescript-eslint; the subsequent authorized tooling repair and current rule debt are recorded separately above.

No migrations/database operations, frontend work or STEP 7+ features were performed; no working functionality or unrelated tooling was modified during finalization. Production/index/deployment acceptance remains PENDING.

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
