# Step 3 completion report — 2026-10-05

This report covers only changes made for Step 3. Existing unrelated modified, deleted and untracked files were preserved. Validation is local repository evidence, not deployment or live database acceptance.

## STEP 10 handoff — 2026-10-06

Added the sales facade/input through canonical YachtInquiry and shared validation/authentication with SALES/SALE enum distinction. Existing generic/charter/admin/status/paging contracts retained. Both TypeScript checks/builds pass; full units 902/902, API e2e 398/398, batch 1/1; focused Inquiry units 138/138 and HTTP 121/121 pass. Focused lint is clean; repository lint has 1,135 errors/61 warnings/zero fatal errors outside Inquiry. Whitespace checks pass. No schema/index change, migrations/live database/frontend/Step 11+ operations. Budget and actual purchase workflows deferred; rollout remains PENDING. See [Step 10 report](STEP_10_REPORT.md).

## STEP 9 handoff — 2026-10-06

Reused YachtInquiry for the charter facade and shared submission workflow, with verified optional Member linkage and ADMIN detail/filter/page improvements. Existing enum/mutation/wrapper/Float total/legacy max 100/past-date/optional field contracts preserved; additive page query caps50. Both TypeScript checks/builds pass; full units 852/852, API e2e 349/349, batch 1/1, focused Inquiry 88/88 pass. Focused lint is clean; repository 1,135 errors/61 warnings/zero fatal errors. Whitespace checks pass. No migrations/live database/frontend/Step 10+ operations; rollout/index acceptance PENDING. See [Step 9 report](STEP_9_REPORT.md). Earlier handoffs below are historical.

## STEP 8 handoff — 2026-10-06

Implemented the separate private WishlistItem relation/backend and shared unchanged Yacht visibility predicate. Both TypeScript checks and builds pass; final full units 767/767, API e2e 277/277, batch e2e 1/1; focused Wishlist units 50/50 and HTTP tests 33/33 pass. New-file/helper lint passes; repository retains 1,146 errors/64 warnings/zero fatal errors. Whitespace checks pass. No live database/migrations/frontend/Step 9+ work; target indexes/deployment remain PENDING. Concurrent toggles are not serialized; hidden/broken saves stay stored. See [Step 8 report](STEP_8_REPORT.md). Earlier reports below remain historical.

## STEP 7 handoff — 2026-10-06

The existing Article implementation was audited and preserved; Article tests were corrected and documentation completed. Both app typechecks/builds pass; full units 717/717, final focused Article units 255/255, API e2e 244/244 and batch e2e 1/1 pass. Article lint is clean; whole-project lint reports 1,147 errors/64 warnings/zero fatal errors outside Article files. Whitespace checks pass. No live database/migration/frontend/future-step operations. Production/index acceptance remains PENDING. See [the 54-point Step 7 report](STEP_7_REPORT.md). Earlier Step 3 and tooling records below remain historical.

1. **Files created:**
   - `apps/aurelis-api/src/components/yacht/yacht-pricing.ts`
   - `apps/aurelis-api/src/components/yacht/yacht-pricing.spec.ts`
   - `apps/aurelis-api/src/components/yacht/yacht-schema.spec.ts`
   - `apps/aurelis-api/test/yacht.e2e-spec.ts`
   - `scripts/migrate-legacy-yachts.js`
   - `docs/ai/COMPLETED_TASK.md` (this report)

2. **Files modified during this task:**
   - `apps/aurelis-api/src/components/yacht/yacht.service.ts`
   - `apps/aurelis-api/src/components/yacht/yacht.service.spec.ts`
   - `apps/aurelis-api/src/components/yacht/yacht.resolver.ts`
   - `apps/aurelis-api/src/libs/dto/yacht/yacht.input.ts`
   - `apps/aurelis-api/src/libs/dto/yacht/yacht.ts`
   - `apps/aurelis-api/src/libs/schemas/Yacht.model.ts`
   - `apps/aurelis-api/src/components/inquiry/inquiry.service.ts`
   - `apps/aurelis-api/src/components/inquiry/inquiry.service.spec.ts`
   - `AGENTS.md`, `README.md`
   - `docs/ai/BACKEND_MIGRATION.md`, `docs/ai/COMPLETED_TASKS.md`, `docs/ai/DECISIONS.md`, `docs/ai/FRONTEND_MIGRATION.md`, `docs/ai/NEXT_STEPS.md`
   Existing changes to the Yacht enum/schema were inspected and preserved; the enum itself was not edited during this task. Existing docs/ai files were present before Step 3 even though Git already reported that directory as untracked.

3. **Files deleted:** None by Step 3. Pre-existing deletions remain untouched.

4. **Final Yacht schema:** One `YachtSchema`, explicit `yachts` collection, Mongoose timestamps. Fields: `_id`, `name`, `builder`, `model`, `yearBuilt`, `lengthM`, `beamM`, `draftM`, `cabins`, `guests`, numeric `crew`, `location`, `country`, `description`, `images`, `listingModes`, `salePrice`, `saleCurrency`, `charterPrice`, `charterCurrency`, `charterRatePeriod`, `featured`, `status`, `brokerId`, `createdAt`, `updatedAt`. No persisted charterRate. Required create fields remain name/location/country/brokerId/nonempty listingModes. Current optional builder/yearBuilt/lengthM are preserved. Dimensions must be finite and positive, counts integer/nonnegative, year integer from 1800 through the current year, prices nonnegative. Defaults: images=[], featured=false, status=DRAFT. Year checks evaluate the current year dynamically. Currency fields and broker relationship are retained.

5. **Final YachtListingMode:** SALE, CHARTER, GraphQL-registered. `YachtListingMode.SALES → YachtListingMode.SALE`. No permanent SALES enum alias.

6. **Final YachtStatus:** DRAFT, PUBLISHED, ARCHIVED, GraphQL-registered. Archiving changes status and does not delete documents.

7. **Final YachtSortBy:** NEWEST, PRICE_ASC, PRICE_DESC, NAME_ASC, NAME_DESC, FEATURED, PRICE, LENGTH, YEAR, CREATED. Existing internal values featured/price/lengthM/yearBuilt/createdAt remain intact; enum names are unchanged for legacy GraphQL options.

8. **Final Yacht GraphQL ObjectType:**

   ```graphql
   type Yacht {
     _id: ID!
     name: String!
     builder: String
     model: String
     yearBuilt: Int
     lengthM: Float
     beamM: Float
     draftM: Float
     cabins: Int
     guests: Int
     crew: Int
     location: String!
     country: String!
     description: String
     images: [String!]!
     listingModes: [YachtListingMode!]!
     salePrice: Float
     saleCurrency: String
     charterPrice: Float
     charterRate: Float @deprecated(reason: "Use charterPrice")
     charterCurrency: String
     charterRatePeriod: String
     featured: Boolean!
     status: YachtStatus!
     brokerId: ID!
     broker: BrokerProfile
     createdAt: DateTime!
     updatedAt: DateTime!
   }
   ```

   `charterRate → compatibility GraphQL alias`; `charterPrice → canonical service/domain/persisted field`. Both output fields read the same stored amount. Current optional schema specs → nullable matching GraphQL specs. Broker ID is exposed without replacing the existing broker field. No private credentials or staff fields were added.

9. **Final Yachts wrapper:**

   ```graphql
   type Yachts {
     list: [Yacht!]!
     total: Float!
     page: Int
     limit: Int
     totalPages: Int
   }
   ```

   Earlier array assumption → discarded; actual list/total wrapper → preserved. Actual existing `total: Float! → Float!` is preserved rather than changed to Int. Optional metadata is additive. No items rename, YachtPagination wrapper or getYachtsPaginated query.

10. **Final Yacht filter input:** Existing `YachtInquiryFilter` is reused, with no duplicate filter type. Fields: mode and additive listingMode (YachtListingMode), status (YachtStatus), text, builder, model, country, location, featured, minYear/maxYear, minLengthM/maxLengthM, minPrice/maxPrice, currency, minCabins/maxCabins, minGuests/maxGuests. Nested validation is enabled. Equal mode aliases are accepted; conflicting ones are rejected. Mode matches array membership, including dual listings. Text/spec string matching escapes regex syntax; country matches the whole value case-insensitively, other strings match case-insensitive substrings. Numeric ranges reject negative/nonfinite/reversed inputs; counts are integers. Nullable query fields are treated as omitted.

11. **Final sorting behavior:** NEWEST uses createdAt descending; NAME_ASC/DESC use name ascending/descending; PRICE_ASC/DESC use the canonical mode-specific monetary field. Fixed ASC/DESC options override descending. Legacy PRICE/LENGTH/YEAR/CREATED retain descending; FEATURED keeps featured descending then newest. Every sort has an ID tie-breaker. MongoDB's existing case-sensitive name ordering and missing/null price ordering are retained. Staff fixed updatedAt sort → shared catalog sorting with FEATURED default.

12. **Final pagination input:** Existing `YachtCatalogInput { filter, page, limit, sortBy, descending }` is retained. Existing page=1/limit=20 defaults → preserved; maximum limit=100 → 50. FEATURED default sort and descending=false remain. getYachts and getYachtsForStaff still require the input argument; getFeaturedYachts keeps its optional argument.

13. **Final pagination behavior:** Validate page>=1, integer limit 1..50; reject instead of silently clamp. MongoDB $match/$sort/$facet with skip=(page-1)*limit and limit, followed by page-only broker lookup. Count covers all eligible matches independently of the page. Empty out-of-range pages retain total; no matching records produce total=0/totalPages=0. Added metadata returns effective page, limit and ceil(total/limit).

14. **getYachts final contract:** `getYachts(input: YachtCatalogInput!): Yachts!`, public, always PUBLISHED, shared filtering/sorting/pagination/count.

15. **getFeaturedYachts final contract:** `getFeaturedYachts(input: YachtCatalogInput): Yachts!`, public, always PUBLISHED and featured=true, deterministic shared sorting/pagination/count. No change to array shape.

16. **getYachtsForStaff final contract:** `getYachtsForStaff(input: YachtCatalogInput!): Yachts!`, STEP 2 AuthGuard + RolesGuard with ADMIN, all statuses unless filtered, shared filtering/sorting/pagination/count.

17. **getYacht behavior:** `getYacht(id: ID!): Yacht!`, validates ID, only finds PUBLISHED. Draft/archived/missing IDs are unavailable. Existing broker population remains, while brokerId is restored to the referenced ID; a missing broker does not discard its original identifier. No new staff detail query or weakened public visibility.

18. **createYacht behavior:** Existing ADMIN-only mutation and YachtInput reused. First call the shared normalization helper, then DTO validation and canonical price/mode/currency checks, then active broker validation and persistence. Name/strings retain existing minimum lengths; whitespace-only names are rejected. Optional specs follow schema. Default DRAFT/featured=false; featured=true does not publish. Prices remain optional, but an amount and its currency must be supplied together and match a listed mode. Images/storage mechanism remains unchanged.

19. **updateYacht behavior:** Existing ADMIN-only mutation uses a PartialType-based YachtUpdateInput with required _id. First call the same normalization helper. Validate supplied values, merge existing state only for price-consistency validation, check broker only if changed, and persist only supplied canonical fields via $set with runValidators. Omitted price/broker/featured values are not reset. No inherited featured=false input default. Price-only or currency-only changes may use the corresponding existing value. Conflicting charter aliases reject before database access; neither alias supplied → no price field generated in the update payload.

20. **Public visibility:** Every collection match overrides client status with PUBLISHED. Featured also overrides client featured=false with true. Detail query independently requires PUBLISHED. DRAFT and ARCHIVED never become public through client input.

21. **Price filtering:** Monetary filters require listingMode/mode and currency. SALE → salePrice with saleCurrency; CHARTER → charterPrice with charterCurrency. Bounds are inclusive and validated; no mixed-currency or sale/charter amount comparisons and no unit/currency conversion.

22. **Price sorting:** PRICE, PRICE_ASC and PRICE_DESC all require mode and currency and use the same canonical monetary path as filtering. `MongoDB charterRate filters/sorts → MongoDB charterPrice filters/sorts`.

23. **Broker compatibility:** BrokerProfile/schema/service/public operations and ADMIN writes are unchanged. Yacht broker resolver gained an explicit GraphQL return type, fixing schema generation. Collection broker lookup results, including explicit absent brokers, are reused to avoid repeated lookups. Detail brokerId remains an ID after population. Existing broker required-on-create rule remains.

24. **YachtInquiry compatibility:** Only YachtListingMode.SALES references in the inquiry service/test were changed to SALE. `InquiryType.SALES → unchanged`. IDs, inquiry types, models, resolvers and workflows remain intact. Existing inquiry tests pass.

25. **Database/index changes:** No database connection or mutation was performed for Step 3. Existing indexes remain: status/listingModes/featured/createdAt and builder/model/location/country. No index removals/additions, collection drops, destructive deletes or automatic data rewrite. Schema changes tighten dimension/year validation while preserving existing in-progress schema work.

26. **Migration files created:** `scripts/migrate-legacy-yachts.js`, NOT EXECUTED. Default dry-run; explicit --apply required. Reports matching/proposed/conflicting documents, maps SALES→SALE with deduplication, copies charterRate only when canonical charterPrice is absent, removes equal/copied legacy aliases, skips entire conflicting/invalid documents, and guards updates against concurrent changes to the original fields. Exports a pure planning function tested offline. No startup integration.

27. **Security changes:** Existing STEP 2 guards reused, no authentication changes. ADMIN allowed; USER/OWNER/CREW forbidden; missing authentication returns AUTH_UNAUTHENTICATED. Yacht input errors use normal validation errors, not AUTH_* codes. Public status is service-enforced. Existing error formatter is reused and tested to suppress unexpected database details in API responses. No sensitive production logging was added.

28. **Tests added/updated:** Original Yacht tests retained and updated for SALE/canonical charterPrice. New service regression cases cover filters, ranges, sorts, pagination, defaults/maxima, statuses, creation/partial updates, aliases, zero values, invalid values, broker lookup behavior. New pricing helper and migration planning tests cover conflict/absence/canonical preservation. New offline schema tests validate persistence defaults, enum/range constraints and absence of a stored alias. New GraphQL e2e covers wrapper/actual Float scalar, visibility, featured, details, aliases, partial writes, real guards, broker compatibility and error sanitization. Inquiry tests updated by enum context. Existing Auth/Guard/Inquiry suites pass. No existing tests deleted.

29. **TypeScript result:** `npx --no-install tsc -p apps/aurelis-api/tsconfig.app.json --noEmit` and corresponding batch command passed. Node's sandbox path-resolution EPERM was resolved by authorized execution of local validation outside the sandbox.

30. **Build result:** `npm run build` (API) and `npx --no-install nest build aurelis-batch` passed. The invalid handoff command npx run build was corrected to npm run build in AGENTS.md.

31. **Test result:** 10 unit suites, 144 tests passed via `npm test -- --runInBand`.

32. **E2E result:** 3 API suites, 33 tests passed via `npm run test:e2e -- --runInBand`. The new suite uses real GraphQL resolvers/services/guards and mocked authentication/persistence. No live MongoDB query/index performance, production JWT setup, external APIs or deployment was tested.

33. **git diff --check result:** Passed across the working tree; new Step 3 files were additionally checked for trailing whitespace. Existing unrelated changes/deletions were not reverted.

34. **Lint result:** Non-mutating local ESLint was attempted on scoped Yacht files; blocked by pre-existing ERR_MODULE_NOT_FOUND for typescript-eslint imported by eslint.config.mjs. No unrelated dependency/tooling changes or autofixing lint were performed. Scoped Prettier formatting completed (existing config emits an unrelated unknown extends-option warning).

35. **Remaining compatibility concerns:** Actual legacy data is unverified. Stored SALES or charterRate documents require reviewed explicit migration before relying on canonical reads. Conflicting prices require manual resolution. Consumers using limits above 50 must adapt; staff's default sorting now follows catalog FEATURED rather than fixed updatedAt. Existing total Float scalar deliberately retained. Builder/year/length output nullability now follows the already-optional schema, so generated client types may become optional. MongoDB query/index performance and release acceptance remain PENDING.

36. **Legacy constraints/decisions:** Existing Yachts list/total contract and query names are retained; established default limit20 is retained; canonical charterPrice has one service-boundary input helper and a separate resolver output alias; SALE is the only sale Yacht mode while InquiryType.SALES stays untouched; per-listing currencies and missing-price support remain. Broker requirement and upload behavior remain. Enum/schema modifications already in the working tree were preserved. No frontend, future-step modules, auth redesign or automatically executed migrations.

STEP 3 COMPLETE — YACHT MODEL, ENUMS & FILTERS IMPLEMENTED


# Step 4 completion handoff - 2026-10-05

The Step 3 report above is preserved. Step 4 adds the canonical CrewProfile feature, CAPTAIN/CHEF roles, public PUBLISHED-only reads, ADMIN-only management, validated optional member links, shared MongoDB filters/sorts/pagination and focused tests. All prior contracts remain unchanged.

API/batch TypeScript and builds passed; 13 unit suites / 254 tests and 4 API e2e suites / 86 tests passed; git diff --check passed. Lint remains blocked by the existing missing typescript-eslint dependency. No live database operation, migration, frontend or future-step work was performed. See [the complete Step 4 report](STEP_4_REPORT.md) for all 33 requested reporting items and deployment assumptions.

## Step 5 handoff (2026-10-05)

STEP 5 Destination backend and explicit Yacht destination discovery implemented. See [the complete 45-point report](STEP_5_REPORT.md) for files, schema/contracts, validation, compatibility and rollout limitations. No migration/database operation, frontend or future-step feature was performed. Earlier Step 3/4 reports and unrelated working-tree work are preserved.

## Backend completion roadmap Step 1 - ESLint and batch test (2026-10-06)

This is Step 1 of the backend completion roadmap requested after the read-only audit, separate from the earlier product migration step numbers. Only lint tooling, the batch test and related workflow documentation were changed. Prior reports and pre-existing working-tree changes were preserved.

### Causes

- ESLint configuration imported an undeclared `typescript-eslint` umbrella package and used newer helper/project-service APIs while only v6 parser/plugin packages were installed. Those v6 packages also did not officially support the installed TypeScript 5.9.3 compiler. App tsconfigs exclude tests, so typed lint needs a separate test-inclusive project.
- `.prettierrc` contained `extends: eslint:recommended`, which is an ESLint option, not a Prettier option.
- The batch test used a namespace Supertest import. With `esModuleInterop`, it becomes a module object rather than the callable request function, causing `TypeError: request is not a function` before the HTTP assertion.

### Changes

- `eslint.config.mjs`: explicit parser/plugin imports and supported flat config; retained recommended typed linting, Prettier integration and existing explicit rule overrides. Generated output ignored; both apps' source and tests included.
- `tsconfig.eslint.json`: lint-only project includes `apps/**/*.ts`, excludes generated/dependency files and emits nothing. App build configs unchanged.
- `package.json` / `package-lock.json`: parser/plugin 8.71.0, ESLint and @eslint/js 8.57.1, globals 13.24.0; declare direct config imports. Compiler remains TypeScript 5.9.3. `lint` checks without rewriting, `lint:fix` explicitly autofixes, and `test:e2e:batch` runs the separate batch suite.
- `.prettierrc`: remove unsupported extends; retain all formatting settings.
- `apps/aurelis-batch/test/app.e2e-spec.ts`: default Supertest import, Nest app teardown, and local formatting. Existing health response assertion retained.
- `AGENTS.md`, `README.md`, `docs/ai/NEXT_STEPS.md`, `docs/ai/COMPLETED_TASKS.md`, and this file: updated workflow/current evidence. Older dated validation reports retained as history.

### Final validation

| Check | Result |
| --- | --- |
| API TypeScript no-emit | PASS |
| Batch TypeScript no-emit | PASS |
| `npm run build` | PASS |
| `npx nest build aurelis-batch` | PASS |
| Unit tests | PASS: 21 suites / 462 tests |
| API e2e | PASS: 6 suites / 173 tests |
| `npm run test:e2e:batch -- --runInBand` | PASS: 1 suite / 1 test |
| Scoped batch-test ESLint | PASS |
| Whole-project `npm run lint -- --format json` | Runs across 99 source/test files; zero fatal/configuration/parsing errors; exits 1 for 1,146 rule errors / 64 warnings |
| Final edited-file whitespace | PASS |

Most full-lint findings concern unsafe access/calls/returns in existing code and mocks, missing await, and formatting. No rules were relaxed beyond the existing explicit overrides, and no bulk source autofix or business-logic cleanup was performed. The ESLint execution failure is repaired; the repository is not lint-clean. Existing lint findings need separately scoped cleanup before treating lint as a passing release gate.

Step 1 tooling repairs are complete with the full-lint limitation recorded above. Step 2 was not started. No runtime business logic, API contracts, frontend, migrations, live MongoDB operations or deployment changed. Tests continue to use offline/mocked persistence; production/index acceptance remains PENDING.

## STEP 6 final handoff (2026-10-06)

The documentation-only finalization is recorded in [the complete 50-point report](STEP_6_REPORT.md). Office schema/DTO/resolver/service/module, public publication rules, ADMIN management, contact metadata, slug/business-hours/timezone validation and catalog querying are complete for STEP 6 scope.

BrokerProfile.officeId is the optional backward-compatible association. Existing BrokerProfiles without officeId remain valid; omission preserves links, and Office archiving does not modify or remove them. Office-based Broker discovery/filtering was NOT added because existing Broker reads have no filter input and a new Broker query/filter architecture is outside STEP 6 scope.

Recorded checks: API and batch TypeScript PASS; both Nest builds PASS; 462 unit tests PASS; 173 API e2e tests PASS; git diff --check PASS after final documentation edits. STEP 6 lint was blocked by the then-existing missing typescript-eslint dependency. The later separately authorized tooling repair is preserved above; current lint runs with rule debt and is not dependency-blocked. No unrelated tooling was changed during STEP 6 finalization.

No migrations or database operations were executed, no frontend work was performed, and no STEP 7+ features were implemented. Working functionality was preserved. Deployment/index state and release acceptance remain PENDING.

STEP 6 COMPLETE — OFFICES & GLOBAL CONTACT NETWORK IMPLEMENTED

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
