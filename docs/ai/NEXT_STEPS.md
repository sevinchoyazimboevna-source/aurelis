# Next Steps

## After STEP 10

- Verify production configuration/deployment/release acceptance, existing yachtInquiries data and deployed indexes. Step 10 added no schema/index/migration and ran no database operations. Validate real BSON relationships, filter/count/page query plans and legacy SALES/CHARTER records against the target MongoDB separately.
- Integrate submitSalesInquiry's contact-only input when frontend work is authorized. Keep generic SALES/CHARTER consumers compatible; no frontend implementation occurred. Distinguish InquiryType.SALES from YachtListingMode.SALE.
- Scope retention/privacy, edge rate limiting/CAPTCHA and explicit idempotency separately. Legitimate repeat interest remains allowed; validation and existing auth/logging protections do not constitute deployed anti-spam infrastructure.
- Budget/currency/offer intent, purchase/payment/escrow/contracts/finance/KYC/AML/ownership transfer, CRM/email/SMS/notifications, Sell Your Yacht/Management/Crew requests and Step 11+ remain deferred. Sales submissions capture interest without commitments. See [Step 10 report](STEP_10_REPORT.md).

## After STEP 9

- Verify target yachtInquiries data and actual type/status/createdAt/_id index provisioning alongside retained indexes. No migration/database operations were run. Validate real MongoDB filter/count/paging plans and optional Member BSON links with representative legacy data.
- Coordinate admin consumers: legacy getYachtInquiries keeps Float total/max100; use new getYachtInquiriesPage for default1/20/cap50 and nullable metadata. Past-date acceptance and optional guest count are deliberately retained. Supplied credentials now authenticate on both public submission paths.
- Decide retention/privacy, edge rate limits/CAPTCHA, explicit submission idempotency requirements and any date-policy change separately. Legitimate repeat inquiries currently create separate records; no arbitrary cooldown/dedup or real spam infrastructure.
- New submissions validate current public Yacht/mode/capacity but no transaction freezes Yacht state; inquiries retain history if inventory changes. Verify production configuration/deployment/acceptance separately. Local tests use offline/mocked persistence/authentication.
- Booking/payment/calendar/email/SMS/CRM/notifications/frontend and Step 10+ request workflows remain deferred. See [Step 9 report](STEP_9_REPORT.md).

## After STEP 8

- Verify target wishlistItems data and provision the unique memberId/yachtId and newest-saved browsing indexes through deployment. No database/index operations were performed locally. Unique-index race protection requires the deployed index; inspect any external duplicate data before provisioning.
- Validate actual MongoDB lookup pipelines, visibility filtering before count/pagination, BSON identity and query plans with representative data. Local tests use offline/mocked persistence, not live MongoDB or deployed-index concurrency.
- Decide any future stale/broken relation cleanup or account-deletion retention policy explicitly; none runs automatically. Republishing restores visible saved entries without re-adding.
- Overlapping toggles are not serialized; use explicit add/remove for desired-state requests. Cross-document yacht publication changes can race with saving; read-time visibility remains enforced. Future stronger transaction/locking semantics require separately scoped work.
- Deployment/configuration/release acceptance and frontend integration remain PENDING. Optional Yacht.isWishlisted, nested wishlist Yacht output, folders/sharing/social features and STEP 9+ request workflows remain deferred. See [Step 8 report](STEP_8_REPORT.md).

## After STEP 7

- Verify target articles data/global slug uniqueness and provision the six declared indexes through the deployment workflow; no database/index operations were executed locally.
- Validate real MongoDB visibility predicates, BSON association matching, count/pagination and query plans with representative data. publishAt and authorMemberId have no dedicated indexes; review workload before adding them. Escaped substring search is not indexed full-text search.
- Populate original editorial content through ADMIN operations. No production articles were seeded. publishedAt is first-PUBLISHED-transition metadata, not actual scheduled release execution time.
- Deployment/configuration/acceptance and frontend integration remain PENDING. Existing shared not-found formatting remains unchanged. Optional scalar nulls are rejected; clearing a schedule or author link needs separately agreed semantics.
- STEP 8+ request workflows, comments/reactions/newsletter/email/CMS/SEO and frontend remain outside this scope. See [Step 7 report](STEP_7_REPORT.md).

Items below are recommendations from the current repository snapshot. They are not claims of work already completed.

1. **Confirm local runtime configuration.** The ignored local `.env` currently uses legacy database/secret variable names, while the API requires `MONGODB_URI` and `JWT_SECRET`. Set the new values locally without documenting or committing secrets. The correct database and credentials are **PENDING**.
2. **Review existing lint findings.** The Step 1 tooling repair (2026-10-06) replaces the undeclared `typescript-eslint` import, aligns lint dependencies with the existing compiler, and includes backend tests through `tsconfig.eslint.json`. `npm run lint` is now non-mutating; `lint:fix` is explicit. The toolchain runs, but existing code/style violations remain. Scope their cleanup separately; see [the Step 1 handoff](COMPLETED_TASK.md). Step 2 business/error handling changes require a separate user instruction.
3. **Locate the frontend project.** Obtain its repository/path, current migration status, framework, and instructions. These are **PENDING**; see [Frontend Migration](FRONTEND_MIGRATION.md).
4. **Resolve product and operations unknowns.** Confirm locales, currency display/conversion, yacht inventory source and publication process, inquiry notifications/CRM/retention, production hosting, and release acceptance. See [Decisions](DECISIONS.md); all are **PENDING**.
5. **Plan frontend integration.** Compare confirmed frontend requirements to the backend GraphQL operations, identify any API gaps, and agree on acceptance checks before implementation.
6. **Record rollout evidence.** When deployment, data setup, and acceptance occur, add dated evidence here and to [Completed Tasks](COMPLETED_TASKS.md). Until then, migration and rollout status remain **PENDING**.

## After Step 3

- Review actual legacy yacht data before applying `scripts/migrate-legacy-yachts.js`; the script has not been run. SALES modes and legacy stored charterRate values require explicit migration before relying on canonical reads. Conflicting values require manual resolution.
- Coordinate consumers using limits above 50 and the former fixed staff updatedAt ordering. Choose explicit catalog sorts and canonical charterPrice for new clients; existing price alias and collection wrapper stay supported.
- Validate catalog aggregation and index performance against representative MongoDB data. Step 3 tests use mocked persistence/offline schema validation, not a live database.

## After Step 4

- Verify the new crewProfiles collection/index state in the target environment before rollout, including duplicate member links in any pre-existing external collection. No migration or database operations were executed locally.
- Validate Crew MongoDB aggregation/index performance with representative data; unit/schema tests and API e2e use offline or mocked persistence.
- If a future step enables self-service, explicitly define CREW-role, ownership, member status and link/unlink rules; current admin-curated links are not an authorization relationship.
- The existing shared GraphQL formatter masks NotFoundException as an internal error; a future separately scoped error-contract change may improve that across features. Step 4 retained its existing behavior.

## After Step 5

- Verify destinations collection and required global slug uniqueness index in the target environment; inspect existing external records for duplicates before provisioning. Verify the two curated browsing indexes and new Yacht destination membership index. No database operations were executed during Step 5.
- Exercise actual MongoDB aggregation, BSON membership, sorting, counts and pagination against representative data and inspect query plans. Local unit/schema/e2e checks use offline or mocked persistence.
- Populate destination content and explicit parent/child Yacht tags through ADMIN management; no seed data, string-based inference or automatic backfill was applied. Public discovery does not expand descendants.
- Validate deployment/configuration and acceptance separately. Slug changes have no redirect history. Current-chain validation rejects cycles during normal writes, but simultaneous cross-document reparenting can race; serialize operational edits or define a separately scoped concurrency control if needed.

## After STEP 6

- Verify target Office data, actual slug/index provisioning and representative MongoDB catalog plans before rollout. No database/index operations or migrations were executed; production acceptance remains PENDING.
- Populate Office content through existing ADMIN operations. Office archiving retains BrokerProfile.officeId links; profiles without links remain valid.
- Office-based Broker discovery/filtering remains future work. It was NOT added because the existing Broker read API has no filter input and a new Broker query/filter architecture is outside STEP 6 scope. Do not introduce it without a separate user instruction.
- Preserve the historical STEP 6 missing-typescript-eslint lint blocker in the report while using the later tooling handoff for current lint status. Do not conflate backend completion roadmap Step 1 with product migration STEP 6.
- No frontend or STEP 7+ work was performed. See [the final 50-point STEP 6 report](STEP_6_REPORT.md).

## STEP 11 finalization — 2026-10-07

Dedicated SellYachtRequest owner intake is implemented; no prior owner-request model existed. YachtInquiry remains unchanged, and submission creates no Yacht listing, assigns no broker and never promotes a Member to OWNER. Required phone/builder/yearBuilt/lengthM/location/country and askingPrice-with-currency validation are enforced. Image intake/upload is deferred because no wired upload mechanism exists. No migrations/live database operations, frontend or STEP 12+ work were performed.

Both app TypeScript checks/builds pass; full unit regression 35 suites/1023 tests, API e2e 10 suites/491 tests and batch e2e 1/1 pass. Focused SellYachtRequest units 121/121 and e2e 93/93 pass. Full validation, focused lint and separately recorded historical repository lint debt are in [STEP_11_REPORT.md](STEP_11_REPORT.md). Deployment/live MongoDB/index/acceptance remain PENDING. Earlier step deferrals are historical.

## After STEP 12

- Before rollout, audit existing wishlistItems and compare counts by yachtId with persisted likesCount, including hidden yachts. Missing counters render zero but do not reflect historical saves. Reconciliation tooling is deferred; design a separately authorized dry-run-first utility with explicit apply and coordinate writes during repair. No repair runs automatically.
- Verify the existing unique memberId/yachtId index is deployed. Test concurrent add/add, remove/remove, add/remove, failure between writes and overlapping toggles against real MongoDB; no transaction or distributed serialization guarantee exists. Relations remain authoritative if counters drift.
- Inspect engagement aggregation query plans with representative data. Missing-to-zero normalization precedes sorting and prevents direct counter-index sorting; no speculative indexes were added. Consider reviewed backfill/index optimization separately.
- Raw public view events can be repeated/inflated. Unique visitors, anti-abuse infrastructure, analytics/history, GraphQL Int overflow policy, frontend integration and STEP 13+ remain deferred. See [STEP_12_REPORT.md](STEP_12_REPORT.md).

## After STEP 13

- Provision and verify Redis separately before rollout; no live service was started or queried. Verify REDIS_URL, authentication/TLS, Redis Lua permissions, limiter-key eviction policy, real expiry/concurrency/reconnect/shutdown and representative MongoDB query plans.
- Monitor GET /health/redis and protected mutation failures. Cache/state failures bypass; rate limits fail closed. Tune documented quotas against traffic explicitly and configure narrowly trusted proxies before accepting forwarded client IPs; shared NAT users currently share quota.
- Failed cache invalidation or external database writes can leave ranks/totals stale for at most the cache TTL after the last stale fill; MongoDB hydration still enforces publication. Existing cross-document likes drift/reconciliation remains separately scoped.
- STEP 14 may consume internal per-session presence TTL helpers with verified identity and dedicated future Redis pub/sub clients. No Socket.IO, chat, Management Request or frontend work was implemented. Deployment and real-database acceptance remain PENDING. See [STEP_13_REPORT.md](STEP_13_REPORT.md).

## After STEP 14

- STEP 15 must supply MongoDB Conversation/Message persistence and replace RoomPolicy deny-all with current conversation membership authorization. Add participant presence privacy/subscriptions, revoked-member room removal and message history/reconnect recovery explicitly. No messages are persisted or replayed by STEP 14.
- Verify real Redis Lua/session expiry, pub/sub subscription recovery, multi-instance delivery, auth/TLS/ACLs, eviction/rate-limit behavior and shutdown before rollout. Network e2e uses real Socket.IO/JWT with offline Redis/member stores, not live infrastructure.
- Monitor GET /health/socket; clients wait for socket:ready, use handshake auth.token and explicitly reconnect after server disconnect. WebSocket-only transport avoids polling routing; review sticky sessions if polling is introduced. Tune quotas/proxy trust and current-member query load separately.
- No build, migration, live database, frontend or Management Request operations occurred. Deployment/acceptance remain PENDING. See [STEP_14_REPORT.md](STEP_14_REPORT.md).
