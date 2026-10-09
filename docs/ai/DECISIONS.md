# Decisions

## STEP 17 cleanup/verification decisions (2026-10-09)

- User authorized actual safe local stack/persistence/index testing; no production target or destructive database work. Earlier step constraints are historical.
- Preserve all prior changes/tests and protected standalone utilities; delete only reference-audited dead notes/catalog/imports/dependencies.
- Sanitize GraphQL variable input reflection while keeping error codes.
- Bound the existing Broker query with additive optional paging and nullable metadata; list/Float total and no-input syntax remain. No office/search filters or new query/domain.
- Record actual local tests separately from external Google login/production rollout, which remain UNVERIFIED. Keep historical lint debt explicit; never suppress it to claim a green repository.
- Frontend integration is next. See [Step 17 report](STEP_17_REPORT.md) and [API inventory](STEP_17_API_INVENTORY.md).

## Final backend decisions — STEP 16 (2026-10-08)

- Frontend integration is next. No new backend product scope or Management Request was introduced.
- Preserve the implemented STEP 15 uniqueness key customerId/yachtId/brokerId. brokerMemberId is an immutable snapshot; restarting after the same profile is relinked reuses its historical conversation, without transferring access. A different assigned profile creates a separate relationship. No destructive identity/index redesign.
- ADMIN history access is read-only regardless of historical participant status. Existing links may reference any Member role, but a newly selected ADMIN broker cannot provide participant chat and is unavailable for new starts. No account role is mutated.
- Contain unawaited adapter publish/subscription failures and stop the affected adapter connections; this terminal fail-closed state requires API restart after Redis recovery. Ordinary reconnects without command rejection retain the existing lifecycle.
- Keep existing AUTH_* codes, stateless logout and explicit signup duplicate-email disclosure. Login failures for unknown/wrong credentials remain identical. Strict non-enumeration for signup conflicts with that accepted code/message contract and is a recommended separately agreed policy change.
- Reconciliation is standalone/dry-run by default; apply additionally requires --writes-paused, count rechecking and optimistic counter matching. It never deletes or changes indexes. No database invocation occurred.
- Local Redis PING and an isolated two-server adapter delivery check passed; production recovery, TTL concurrency and Mongo/index deployment remain unverified.

See [the final report](STEP_16_REPORT.md). Earlier decisions are historical where superseded here.

## Step 10 sales inquiry choices (2026-10-06)

- Reuse YachtInquiry/yachtInquiries, the existing output and one shared service create path. Add a dedicated sales facade consistent with charter; keep InquiryType.SALES separate from YachtListingMode.SALE and force NEW. No material discrepancy or parallel persistence needed.
- The sales facade accepts only yachtId/contact fields; it omits type and charter dates/guest count. Generic SALES continues to accept its historical optional charter fields, including the existing validation when supplied. Preserve phone nullability/optionality and contact limits; do not overwrite user contacts with account data.
- Reuse optional verified authentication and PUBLISHED YachtService lookup plus SALE mode check. No login requirement, client ownership link, account enumeration or inquiry price snapshot. Budget/currency/offer intent remain deferred; message supports buyer interest without expanding the domain.
- Reuse shared ADMIN collection/detail/status management with immutable type/ownership on status updates, original transitions/paging/filtering/sorting, no customer inquiry history. Existing indexes suffice for this additive facade; no schema/index change or database/migration operation.
- No arbitrary repeat cooldown or spam infrastructure. Privacy retention, deployment/index/query-plan verification and frontend acceptance remain PENDING. Purchase/payment/escrow/KYC/CRM/notifications/Sell Your Yacht and Step 11+ work are separately scoped.

## Step 9 charter inquiry choices (2026-10-06)

- Reuse the existing YachtInquiry model; no separate CharterRequest. Preserve InquiryType.SALES and original status enum. Dedicated charter input removes client type and requires existing date names; shared service validation prevents discriminator/status/member spoofing and forces NEW.
- Preserve generic public mutation, optional phone/guestCount, required name/message limits and existing past-date acceptance. New ordered-date/member/public-mode/capacity validation applies at the service boundary; valid positive integer capacity only. No availability inference or pricing snapshot.
- Public optional authentication accepts guests but verifies supplied credentials with AuthService; invalid/blocked/deleted identities fail. Member link is context-derived, additive and permission-free; contact details need not match account email. Both public submission paths use this behavior.
- Existing inquiry list already has YachtInquiries wrapper with total Float and limit clamping up to 100. Preserve that contract; add getYachtInquiriesPage with validated 50 cap rather than lower the legacy cap. Filters/nullable metadata and stable ID ties are additive. No sorting enum needed.
- Add ADMIN-only detail, keep status-only updates and all simple existing status transitions. No public/email/customer inquiry history API. Legacy inquiries without member link and old SALES/CHARTER data remain readable without rewrite.
- No arbitrary dedup/cooldown: one create per submission, legitimate repeats remain valid. Strong validation and no client-controlled workflow/ownership; real spam controls/retention/notifications remain deferred. No migration/database operation; indexes/deployment acceptance remain PENDING.

## Step 8 wishlist choices (2026-10-06)

- No existing wishlist/favorite/like implementation was found. Use one separate relation model, not snapshots/embedded arrays/reverse links. Shared CurrentMember/AuthGuard derive ownership and enforce existing active status; all four existing roles may use personal operations.
- IDs-only output follows the existing Article association pattern and avoids nested Yacht/auth resolver coupling or N+1 reads. Optional Yacht.isWishlisted deferred. MemberId is neither exposed in wishlist output nor accepted as client input.
- A shared Yacht visibility helper is extracted and reused by Yacht public catalog/detail and wishlist existence/join checks; existing PUBLISHED rule is unchanged. getMyWishlist counts/pages only visible relations, leaving hidden/broken records untouched so republication restores discovery.
- Add uses insert-only upsert with explicit creation timestamps and timestamp rewriting disabled, backed by compound uniqueness; duplicate-index losers return the winning relation. If a winning relation vanishes before reread, return a safe retry validation error.
- Remove returns true if an owner relation was deleted, false if absent, and does not require current Yacht existence/publication. Toggle-off similarly permits saved hidden/broken records; toggle-on requires current public existence. isYachtWishlisted requires a current public Yacht and follows existing NotFoundException/GraphQL formatting for hidden/missing records. IDs are validated on every yacht operation.
- Concurrent toggles can coalesce; no distributed lock/transaction/parity guarantee. Concurrent add uniqueness depends on the actual deployed compound index. Cross-document visibility checks and writes are not transactional; list visibility is reevaluated at read time.
- No migrations, database operations, cascade cleanup or Step 9+ features. Target index/data/performance/deployment acceptance remains PENDING.

## Step 7 editorial choices (2026-10-06)

- Preserve the existing working-tree Article implementation after inspection; one canonical model supports NEWS/INSIGHT/GUIDE. No separate News/Insight services or content copied from external sites.
- Public availability is query-driven: PUBLISHED and publishAt absent/null or <= now. Public client status cannot override it; search keeps a separate conjunction so its OR cannot bypass timing.
- publishedAt is first PUBLISHED-transition metadata, not an observed scheduler execution/public-read timestamp. Future-scheduled publications stamp now; edits, draft/archive and republication preserve history. Inputs cannot set it. A conditional timestamp write protects competing first publications.
- Draft content may be omitted; published merged state requires nonblank plain-string content. Optional mutation nulls are rejected consistently with Office; omitted fields persist and [] replaces arrays with empty arrays. Scalar unlink/schedule-clearing is not introduced.
- Existing accounts of any role and Yacht/Destination records of any status may be linked by ADMIN. Links grant no access, return IDs only and require distinct BSON identities. No reverse references or cascade behavior.
- New Articles total is Int; legacy Yachts total remains Float. Default article sort is PUBLISHED_NEWEST with stable ID ties. Index declarations are not provisioning evidence; target data/query plans and rollout remain PENDING.

This log records decisions explicitly captured during Aurelis planning. Code that happens to implement a behavior is not, by itself, treated as a product decision.

## Confirmed

| Decision | Choice |
| --- | --- |
| Repository scope | This repository is backend-only; the customer-facing frontend is outside this repo. |
| Launch data | Treat Aurelis as a fresh launch; do not migrate the existing real-estate data. |
| Initial services | Launch yacht sales and charter together. |
| Customer conversion | Capture qualified inquiries; do not include online booking, offers, deposits, or payment in the first release. |
| Inventory ownership | Aurelis staff manage yacht inventory in the first release. |
| Market scope | Target a global market. |
| Inquiry handling | Persist inquiries for Aurelis staff review. |
| Currency behavior | Store listing amounts with their currency code; do not silently convert prices. This is also stated in [`AGENTS.md`](../../AGENTS.md) and implemented in the backend. |

The frontend browsing direction is inspired by Fraser Yachts, as stated in the planning conversation. Detailed interaction requirements remain **PENDING**; see [Frontend Migration](FRONTEND_MIGRATION.md).

## Step 3 compatibility decisions (2026-10-05)

- Earlier array audit assumption ? discarded. Actual `Yachts { list, total }` wrapper ? preserved for all three collection queries. The actual total scalar remains Float, with additive nullable Int page/limit/totalPages metadata.
- `charterRate` ? GraphQL compatibility alias; `charterPrice` ? canonical service/domain/persistence amount. Create and update share one normalization helper at the GraphQL DTO ? YachtService boundary. Output aliases read the same stored value; no second persisted field.
- `YachtListingMode.SALES` ? `YachtListingMode.SALE`; `InquiryType.SALES` ? unchanged. A separate dry-run-first migration is supplied, not executed.
- Established page 1 / limit 20 defaults ? retained; maximum 100 ? 50 with validation instead of silent clamping. Shared public/staff query construction uses the same filters and deterministic sorts. Staff's formerly fixed updatedAt order ? explicit catalog sort options and FEATURED default.
- Current optional schema builder/yearBuilt/lengthM ? nullable matching GraphQL fields; updates ? partial DTO without inherited featured defaults. Existing broker requirement is retained.
- Currency-scoped monetary comparisons ? preserved; missing monetary amounts remain permitted. No data conversion or new inquiry architecture.

## Step 4 implementation choices (2026-10-05)

- One CrewProfile model for CAPTAIN/CHEF; professional CrewRole is separate from MemberRole.CREW. No self-service architecture existed, so Step 4 uses ADMIN management and public reads only.
- MemberId is optional with an existence check and one linked profile per Member across all statuses. ADMIN-curated links permit any existing account role; no role/status mutation or authorization follows from a link. Future self-service must define CREW-role/ownership rules explicitly.
- FirstName/role are required, lastName/displayName optional. Presentation-name fallback is derived at output and in MongoDB name sorting rather than stored redundantly.
- Reuse collection shape list/total/page/limit/totalPages and defaults page 1 / limit 20 / maximum 50, but the new Crews total is explicitly Int. Preserve existing Yachts Float total and charter aliases unchanged.
- String fields/array entries trim safely without numeric coercion; optional mutation nulls are rejected. Duplicate links use normal BadRequest validation, including unique-index races. NotFoundException is retained for missing/unpublished detail; the existing formatter currently masks that class as a generic internal error, matching the existing Yacht behavior.
- Three declared indexes support linked-member uniqueness and public/newest/featured patterns. No prior Crew files/data assumptions existed in the repository; no migration script or database operation was performed. Actual external data/index state remains PENDING.

## Pending decisions

- Frontend repository, framework, owners, and integration contract: **PENDING**.
- Supported frontend languages and locale behavior: **PENDING**.
- Currency display and whether a future conversion service is wanted: **PENDING**.
- Inventory source, import process, and staff publication workflow: **PENDING**.
- Inquiry notification, CRM, retention, and privacy requirements: **PENDING**.
- Production hosting, domains, environments, operational owner, and release acceptance criteria: **PENDING**.
- Status of any historical migration or production rollout: **PENDING**.

## Source note

The six earlier linked source documents were not present in the workspace or visible conversation. This record uses only choices explicitly captured in the conversation and facts in the current repository; original document contents remain **PENDING**.

## Step 5 implementation choices (2026-10-05)

- No Destination implementation existed. Add one Destination model with REGION/COUNTRY/AREA and optional self-reference; roots use parentId=null. No parallel geographic models or recursive public parent resolver.
- Global unique slug is the public routing identifier; one helper generates/normalizes it. Names need not be unique. Duplicate slug errors use normal BadRequest behavior, including unique-index races. Name-only updates preserve slugs; explicit slug changes are supported without redirect history.
- New Destinations wrapper uses Int total with the established pagination fields/defaults/cap. Existing Yachts Float total and all query names remain unchanged. FEATURED defaults to featured descending then sortOrder/name/_id ascending; sortOrder defaults to 0. Name sorts use MongoDB default case-sensitive ordering.
- Public status is always PUBLISHED regardless of client filter; featured additionally forces true. ADMIN management reuses existing guards. Parent association checks existence and traverses current ancestors iteratively to reject cycles; a parent may have any status. Explicit parentId=null detaches; other mutation nulls are rejected. Concurrent cross-document reparenting is not serialized.
- Yacht location/country -> retained display/legacy fields; optional destinationIds -> additive structured tags. IDs must be distinct (case-insensitive ObjectId identity) and exist, regardless of Destination status. Omitted updates preserve tags; [] clears. Old missing tags -> output [] without data rewriting.
- DestinationId filters -> scalar BSON array membership on all existing Yacht collection paths. Explicit parent tagging only; no inferred geography or recursive descendant expansion. Archived Destination IDs remain on yachts and membership queries remain valid.
- Three Destination index declarations and one Yacht index added; existing indexes retained. No migration script needed, no database/index operations or migrations executed. Actual external collection/index state remains PENDING.

## STEP 6 scope recorded at finalization (2026-10-06)

- One Office model, publication statuses, shared ADMIN guards and catalog conventions; archive is status-only, with no delete or cascade API.
- BrokerProfile.officeId is an optional backward-compatible association. Existing unlinked brokers remain valid; supplied links validate existence regardless of Office status, omitted links persist, and Office archiving does not modify/remove links or change active-broker visibility.
- Office-based Broker discovery/filtering was NOT added because existing Broker reads have no filter input. A new Broker query/filter architecture is outside STEP 6 and requires separately authorized scope.
- No migrations/database operations, frontend work or STEP 7+ features were performed. Schema indexes are declarations, not deployment evidence. See [the final 50-point report](STEP_6_REPORT.md).

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
