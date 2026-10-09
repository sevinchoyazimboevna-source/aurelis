# STEP 17 — cleanup, actual local verification and backend sign-off

Date: 2026-10-09 (Asia/Tashkent). Final status: validation evidence below; production deployment is a separate acceptance task.

## Scope and safety

Read all six required handoff docs and AGENTS.md before editing. Recorded incoming git status/diff in .tmp/step17/baseline-status.txt and baseline.diff. Preserved all incoming STEP 16 code, reports, untracked utilities and two pre-existing skill deletions. No reset/restore/checkout, build, frontend edit, Management Request, migration, reconciliation invocation, production connection, collection drop, bulk delete, Redis flush or index drop occurred. Local synthetic records remain for inspection.

The user explicitly authorized isolated local persistence/index/Redis verification in STEP 17; earlier reports' no-live-operation statements remain historical. No sub-agents were used. The default shell helper failed before execution, so file reads used Node and authorized direct compiler/Jest/ESLint/subprocess commands ran outside the failing helper. No automatic approval rejection occurred.

## Cleanup evidence

The pre-deletion [candidate decisions](STEP_17_CLEANUP_CANDIDATES.md) record path, reason, import/export/module/script/test/docs/dynamic references, risk and KEEP/DELETE decision. Searched repository source, tests, configuration, scripts and documentation; excluded dependency/generated caches from product-code searches. Dependency manifests/lock were reviewed separately. Reran the reference/debug search after cleanup.

Deleted only test.ts (comment-only scratch notes, outside Jest roots) and SKILLS.md (obsolete Nestar catalog pointing to the two already-deleted project skills). No folder or spec was deleted. Removed StatisticModifier and its sole ObjectId import from common.ts; retained T because YachtService uses it. Removed DatabaseModule's unused injected Connection constructor and redundant console startup/debug messages; kept MongooseModule registration and the existing module structure.

Removed eight proven-unused direct declarations: @nestjs/axios, @nestjs/platform-ws, @nestjs/schedule, graphql-upload, moment, uuid, ws, and dev @types/ws. npm uninstall --package-lock-only --ignore-scripts --no-audit --no-fund updated only manifests/lock; required transitive packages remain. Root lock dependencies/devDependencies match package.json. Installed node_modules was not destructively pruned. No upload or scheduler was wired and no alternate raw-ws gateway remains.

Preserved legacy member-index references in scripts/migrate-legacy-members.js and its auth regression because they support an explicit standalone operational tool. Preserved migrate-legacy-yachts.js, reconcile-yacht-likes.*, all specs/e2e/fixtures/mocks, Redis helpers, adapter duplicates, auth/chat authorization helpers, configs, .env.example and historical reports. sayHello remains an active Aurelis GraphQL greeting. Pattern matches on PropertyDecorator/hasOwnProperty are language/test constructs, not real-estate domains. No active Property, Agent, Follow, generic social, old staff auth, memberNick login, global chat, messagesList, permanent clientsAuthMap or parallel socket system was found.

Final structure: apps/aurelis-api (Auth/Member, Yacht, Broker, Crew, Destination, Office, Article, Wishlist, Inquiry, SellYachtRequest, Chat; Redis; Realtime; database and libs DTO/enums/schemas/validators/interceptors), apps/aurelis-batch (idle health), scripts (protected operational utilities plus opt-in local verification), docs/ai. Conversation/Message are Chat's Mongo models, not duplicated domains.

## Bugs and regression fixes

| Severity | Reproduction/root cause | Files/fix | Regression |
|---|---|---|---|
| MEDIUM | Submit register with variables containing password/confirmPassword and an undeclared role/status. GraphQL variable-coercion errors echoed the entire object into the public error message. | auth-errors.ts sanitizes variable BAD_USER_INPUT messages to Invalid request input. while retaining the code. Typed unknown-record extraction replaces unsafe any access; existing AUTH/rate-limit/internal-error contracts remain. | Four unit cases and two actual HTTP forged-registration cases; live spoof rejection verifies no credential reflection. |
| MEDIUM | getBrokerProfiles read every active broker into one public response; no paging/cap existed. | Existing operation accepts optional BrokerCatalogInput (page 1/limit 20/max 50), Mongo skip/limit plus total count, stable name/_id sorting. Existing list and total: Float! preserved; nullable pagination fields additive. No filter/office discovery/new query. | Eleven focused units, ten dedicated HTTP cases, existing Office/Yacht compatibility tests and complete live pagination audit. |

No reproducible CRITICAL or HIGH authorization/privacy code bug remained or was found. No critical/high fix is claimed. Initial verification-only corrections (Broker memberId deliberately absent from public output; removing incompatible prices from single-mode fixtures; degraded health contract; preserving normal HTTP headers in a typed assertion) did not change production behavior or weaken assertions. All resulting regressions pass.

## Local infrastructure and final restart

MongoDB: loopback 127.0.0.1:27018 in the dedicated mongo:8.0 test container. Redis: loopback 127.0.0.1:6380, redis:7-alpine, dedicated nonzero logical databases. API instances: http://127.0.0.1:4317 and :4318, actual AppModule/DI/global validation/guards and Socket.IO, started directly from TypeScript with ts-node transpile-only, not Nest build/watch. Final inspection targets use database aurelis_step17_20261009_recovery and Redis DB 14; both API test instances remain running. Fresh aurelis_step17_* databases and synthetic offline ADMIN provisioning only; ignored .env values were never printed or used as database credentials. Test-only JWT/Google placeholders were local and not production secrets.

Index builds initially failed because the disposable Mongo data filesystem had about 310 MB free while indexBuildMinAvailableDiskSpaceMB required 500 MB. Diagnosed actual model.init rejections; temporarily lowered only this local test-server threshold to 64 MB. Fresh test indexes then initialized and were enumerated. Restored the setting to 500 MB after verification. This is environment evidence, not a code failure or production index rollout.

Restarted the isolated Mongo/Redis containers and both API instances after cleanup. One Redis helper deadline check failed when heavy Jest/compiler/lint jobs competed for the same local resources; independent quota diagnosis accepted exactly 3/10, and the full idle run passed without changing command deadlines or weakening assertions. Earlier failed runs remain in ignored local evidence. A disposable Redis container originally had AutoRemove behavior and disappeared on the outage stop; restored the loopback-only test container and repeated the outage/recovery checks successfully. The existing port-6379 Redis was untouched.

Actual outage checks: Redis-down view mutation returned RATE_LIMIT_UNAVAILABLE and left Mongo views unchanged; popularity browsing fell back to Mongo; health reported degraded without secrets; socket handshake failed closed. Restarted Redis and both APIs, then reran the full live flow. Adapter recovery requiring API restart remains the accepted terminal failure contract.

The final live suite covers signup/login/getMe, yacht catalog/views, wishlist add/remove, guest/member Charter and Sales, Sell Yacht intake, start chat, GraphQL/socket messages, recipient reads and logout. Mongo/Redis/API/GraphQL/socket health and actual two-instance private delivery passed. No unhandled promise rejection or secret/contact/chat-body leakage appeared in actual API logs. Synthetic exception traces from offline tests use the test harness logger, not production SanitizedLogger.

## API and schema evidence

[Complete API inventory](STEP_17_API_INVENTORY.md) lists every generated operation: 34 Queries, 28 Mutations and all 12 socket event names plus handshake. Every GraphQL operation had a successful live invocation except googleLogin, which has a successful invalid-token rejection but remains UNVERIFIED for external successful Google sign-in. No implemented operation is omitted. PASS is scoped to the exercised local assertions, not all possible inputs or deployment.

Runtime schema was introspected, rebuilt and validated; no duplicate/invalid or orphan Nestar types were found. Password is absent from Member output; no legacy memberNick/memberPhone/MemberType/staffLogin fields. Yachts and YachtInquiries retain Float! total; BrokerProfiles retains Float! total; new-domain wrappers use Int. Required/nullable fields and aliases were reviewed against DTOs. Explicit null for optional BrokerCatalogInput is normalized to the same defaults as omitted input; null page/limit values remain invalid. All ADMIN domain writes/reads tested reject USER; ADMIN chat history remains explicitly read-only. Broker memberId is deliberately an input/server-side historical authorization link and is not public BrokerProfile output.

Pagination exercises first/custom/last/empty pages, stable full totals/totalPages, page 0/negative and limit 0/>50. Broker now joins the bounded catalogs. Legacy ADMIN getYachtInquiries retains its deliberate max-100 clamp; getYachtInquiriesPage caps 50. No public unbounded collection remains.

Input adversarial cases include invalid BSON IDs/enums/emails, blank/oversized contact/message fields, negative numeric values, inverted ranges, duplicate BSON IDs, forged identities/status/roles, wrong yacht listing modes and hidden yachts. Scoped local HTTP test quota keys are reset only between isolated validation scenarios to prove service rejection; real exhaustion scenarios do not reset their window. The utility never flushes Redis.

## Required 64-point results

| # | Area | Result/evidence |
|---:|---|---|
| 1 | Nestar files discovered | Obsolete SKILLS.md wording and operational/historical references only; no active legacy domain. |
| 2 | Nestar files deleted | SKILLS.md; no active Nestar implementation existed to delete. |
| 3 | References preserved | Standalone legacy member-index helper/test and historical/security docs, as explained above. |
| 4 | Other files deleted | test.ts comment-only notes. |
| 5 | Folders deleted | None. |
| 6 | Dependencies removed | Eight direct declarations; lock consistent; transitive socket/auth dependencies retained. |
| 7 | Dead imports | Connection/InjectConnection and StatisticModifier's ObjectId. |
| 8 | Dead code | Unused StatisticModifier and redundant DB constructor logging. |
| 9 | Old socket status | Absent; only Socket.IO/Redis adapter/private Chat persists. |
| 10 | Old auth status | Absent; email/password/Google, current MemberRole/Status and JWT identity remain. |
| 11 | Tests preserved | All pre-existing specs/e2e/helpers/fixtures retained; focused regressions added. |
| 12 | Structure | Canonical Aurelis domains/apps/libs described above. |
| 13 | Startup | PASS: actual no-build API startup, including final clean restart and complete final smoke. |
| 14 | Mongo local | PASS: actual persistence, BSON queries, indexes, duplicate-key constraint, paging and atomic counters. |
| 15 | Redis local | PASS: PING, JSON/get/set/TTL/expiry, temporary state, increments/Lua quotas, leases, pub/sub/cache/adapter. |
| 16 | GraphQL | PASS for all 61 non-Google-success operations; complete 62-operation inventory. |
| 17 | Socket.IO | PASS: actual authenticated clients, all events and two actual API instances. |
| 18 | Signup | PASS: normalized email, USER/ACTIVE, hash/no password output, duplicate/invalid/mismatch/spoof rejection, JWT. |
| 19 | Login | PASS: valid/wrong/unknown/invalid email, blocked/deleted, JWT rejection/expiry, shared quota; same unknown/wrong message. |
| 20 | Google | Live success UNVERIFIED; actual invalid token rejected, offline config/verified-email/conflict/link tests pass. |
| 21 | getMe/logout | PASS: current identity and guarded stateless logout; token remains usable by contract. |
| 22 | Yacht APIs | PASS: public/admin CRUD, all requested filters/sorts/wrapper metadata, charterPrice storage and charterRate alias, SALE enum. |
| 23 | Engagement | PASS: atomic concurrent views, legacy zeros, hidden rejection, quota rejection does not increment. |
| 24 | Wishlist | PASS: eight duplicate/concurrent adds coalesce, likes +1 once, removal/toggle/multiple members/hidden/republication/privacy. |
| 25 | Crew | PASS: CAPTAIN/CHEF, list/detail/featured/staff CRUD, filters/paging/status/member uniqueness/fallback name. |
| 26 | Destination | PASS: REGION/COUNTRY/AREA, parent/cycle/missing validation, detach, slug preservation, tag discovery. |
| 27 | Office | PASS: public/admin, schedule validation, slug/filter/paging, archive retaining Broker link. |
| 28 | Article | PASS: three types, all reads/admin edits, search, publishAt future hiding and preserved first publishedAt. |
| 29 | Charter | PASS: guest/verified member identity, CHARTER/public restrictions, ordered/past dates, capacity, NEW, quota/privacy/admin. |
| 30 | Sales | PASS: guest/member, SALE/public restrictions, SALES/NEW, quota/admin, no price snapshot. |
| 31 | Sell Yacht | PASS: required-field/range/price-currency validation, persistence/admin status, no Yacht/broker/account-role side effects. |
| 32 | Cache | PASS: three popularity sorts, modes/pages/filters, miss/hit/TTL/generation invalidation, Mongo outage bypass. |
| 33 | Rate limits | PASS: HTTP login/view/inquiry/sell, socket connect/packet, shared member chat; fail closed during live Redis outage. |
| 34 | Presence | PASS: two sockets across servers, one disconnect keeps online, final disconnect offline; TTL/crash lease expiry. |
| 35 | Typing | PASS: private joined room start/stop, actual 5s expiry, unauthorized denial, no global broadcast. |
| 36 | Conversation | PASS: server-derived relationship and persisted immutable historical broker identity. |
| 37 | Message | PASS: Mongo persistence, server-derived sender, trimmed text validation, $max lastMessageAt. |
| 38 | Realtime delivery | PASS: customer/broker on separate API processes; unrelated socket receives nothing. |
| 39 | Read/unread | PASS: recipient counts, sender exclusion, Mongo readAt, decreases and private realtime receipt. |
| 40 | ADMIN chat | PASS: history readable; start/send/mark-read/join/type denied. |
| 41 | Rooms/security | PASS: unrelated access/read/send/join/type denied, forged inputs rejected/ignored identity safely. |
| 42 | Reconnect | PASS: fresh authentication and explicit rejoin; delivery after reconnect. |
| 43 | Broker reassignment | PASS: new assigned profile creates distinct relationship; new broker cannot read old history. |
| 44 | Member relink | PASS: same profile reuses original brokerMemberId; newly linked Member inherits nothing. |
| 45 | Hidden yacht history | PASS: DRAFT/ARCHIVED preserves participants' old history, blocks new public starts. |
| 46 | Shared quota | PASS: interleaved GraphQL/socket, exactly 30 persisted customer messages, both transports eventually limited. |
| 47 | Concurrency | PASS: actual view increments, concurrent duplicate saves/unique index, rapid sends with nonregressing lastMessageAt. |
| 48 | Inventory | Complete linked inventory, explicit PASS/UNVERIFIED; zero final FAIL. |
| 49 | Schema | Validated actual generated schema; compatibility/credentials/auth protections reviewed. |
| 50 | Bugs discovered | Two MEDIUM fixes; local environment and verification-fixture corrections listed separately. |
| 51 | CRITICAL fixed | None discovered; zero remaining reproducible critical bug. |
| 52 | HIGH fixed | None discovered; zero remaining reproducible high authorization/privacy bug. |
| 53 | Remaining medium/low | Historical lint debt; documented nontransactional likes drift and unserialized toggles; no new blocker. |
| 54 | Regressions | Four auth units/two HTTP; eleven Broker units/ten HTTP; opt-in complete real-stack utility. |
| 55 | TypeScript | PASS API and batch noEmit. |
| 56 | Unit suite | PASS 47 suites / 1,162 tests. |
| 57 | API e2e | PASS 14 suites / 556 tests. |
| 58 | Batch e2e | PASS 1 suite / 1 test. |
| 59 | Focused lint | Twelve material/new TS files clean; JS utility clean. Two minimally adjusted old fixtures retain 169 errors/8 warnings (baseline 170/8). |
| 60 | Repository lint | 1,046 errors / 56 warnings / zero fatal errors, retained historical rule debt; no suppression or unrelated mass fixes. |
| 61 | git diff --check | PASS, including final documentation and explicit new-file whitespace check. |
| 62 | Production assumptions | UNVERIFIED: production indexes/data/query plans, real Google token/config, TLS/secrets/CORS/proxies, multihost networks/failover and release acceptance. |
| 63 | Cleanliness | No active Nestar backend, parallel auth/socket/Redis setup, dead debug imports or accidentally removed tests. Historical lint debt remains explicit. |
| 64 | Readiness | Ready for client/admin frontend integration on exercised code/local contracts; production rollout remains separate. |

## Operational limits and next task

Permanent records/counters/history live in Mongo. Redis contains bounded caches, quota counters, UUID generations, expiring session leases/typing and transient pub/sub only. No permanent Member/Yacht/Message business record is stored there. Current popularity rank/count staleness is bounded by 30s if invalidation fails; visibility hydrates fresh Mongo records. Likes across documents remain nontransactional and can drift during failed/interleaved writes; overlapping toggle calls remain unserialized. The standalone protected reconciliation utility was not executed. Indexes demonstrated only on fresh local test data do not certify target production indexes or representative performance.

Existing 20s heartbeats bound authorization revocation; instantaneous distributed revocation is not claimed. Actual local two-process delivery is stronger than mocks but does not establish separate-host production topology or all Redis reconnect/subscription failure permutations. Successfully recovering this tested outage by restarting dependencies/API does not change the terminal-failure restart contract. No real Google ID token was supplied; full external successful Google login remains UNVERIFIED. Google provider semantics retain passing offline regression coverage.

Next task: FRONTEND INTEGRATION in the separate frontend repository. Preserve existing API contracts; broker consumers that need more than the default 20 now page through optional BrokerCatalogInput, maximum 50. Read the inventory and shared error codes. Do not auto-run scripts/verify-local-backend.js; it requires explicit --run, loopback-only URLs, aurelis_step17_* database names, dedicated nonzero Redis DB, synthetic accounts and local-only JWT configuration. It creates and retains test records and resets only scoped HTTP test quota identities between validation scenarios, never flushes Redis or runs migrations.

## Exact validation and reproduction

No build commands were run. From the repository root:

~~~powershell
node --preserve-symlinks --preserve-symlinks-main node_modules/typescript/bin/tsc -p apps/aurelis-api/tsconfig.app.json --noEmit
node --preserve-symlinks --preserve-symlinks-main node_modules/typescript/bin/tsc -p apps/aurelis-batch/tsconfig.app.json --noEmit
node --preserve-symlinks --preserve-symlinks-main node_modules/jest/bin/jest.js --runInBand
node --preserve-symlinks --preserve-symlinks-main node_modules/jest/bin/jest.js --config apps/aurelis-api/test/jest-e2e.json --runInBand
node --preserve-symlinks --preserve-symlinks-main node_modules/jest/bin/jest.js --config apps/aurelis-batch/test/jest-e2e.json --runInBand
node --preserve-symlinks --preserve-symlinks-main node_modules/eslint/bin/eslint.js "apps/**/*.ts" --format json --output-file .tmp/step17/repository-lint-final.json
node --preserve-symlinks --preserve-symlinks-main -r ts-node/register/transpile-only apps/aurelis-api/src/main.ts
node --preserve-symlinks --preserve-symlinks-main scripts/verify-local-backend.js --help
# Set STEP17_API_URL, STEP17_SECOND_API_URL, STEP17_MONGODB_URI,
# STEP17_REDIS_URL and STEP17_JWT_SECRET to isolated local test values, then:
node --preserve-symlinks --preserve-symlinks-main scripts/verify-local-backend.js --run
git diff --check
~~~

Ignored local evidence: .tmp/step17/*-final.log, live-signoff.log, live-recovery-final.log, live-results.json (case/API/event/index metadata, no tokens), final-smoke.log, schema.graphql, outage-results.json, focused/repository/legacy-fixture lint JSON and baseline snapshots. The committed inventory/report retain portable conclusions without committing logs, synthetic credentials or test database contents.

STEP 17 COMPLETE — AURELIS BACKEND CLEAN, VERIFIED & READY FOR CLIENT/ADMIN FRONTENDS
