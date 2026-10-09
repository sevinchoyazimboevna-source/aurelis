# Aurelis Backend

Backend startup repair and frontend readiness verification (2026-10-10) are recorded in the [readiness report](docs/ai/FRONTEND_READINESS_REPORT.md). The next task is **frontend integration**. The [complete API inventory](docs/ai/STEP_17_API_INVENTORY.md) documents the preserved contracts; successful external Google sign-in and production deployment remain unverified.

NestJS GraphQL backend for a global yacht sales and charter catalog. This repository does not contain the customer facing website.

## Services

- `aurelis-api`: GraphQL catalog, broker, inquiry, member authentication, and staff operations.
- `aurelis-batch`: retained as a health endpoint for future maintenance jobs. No scheduled jobs run currently.

The API uses MongoDB through Mongoose and generates its GraphQL schema at runtime. The GraphQL playground is available outside production.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI`, a long random `JWT_SECRET`, and `GOOGLE_CLIENT_ID` for Google sign-in.
3. Run the API with `npm run start:dev` or the batch health app with `npm run start:dev:batch`.

The API listens on `AURELIS_API_PORT` (default `3000`); the batch health app listens on `AURELIS_BATCH_PORT` (default `3001`). Legacy `PORT_API` and `PORT_BATCH` remain supported as fallbacks. The GraphQL endpoint remains `/graphql`.

Startup validates the required `MONGODB_URI` and `JWT_SECRET`, MongoDB/Redis URI formats and port bounds. `MONGO_DEV`, `MONGO_PROD` and `SECRET_TOKEN` are obsolete configuration names: explicitly copy the intended URI to `MONGODB_URI` and the existing signing secret to `JWT_SECRET`, preserving the database and credentials. Do not rename an external database as part of repository cleanup. `GOOGLE_CLIENT_ID` is required when using `googleLogin`; missing it does not prevent other features from starting.

In development (or when `NODE_ENV` is unset), Nest error logs retain messages and stacks after credential/URI/token/contact redaction. Production keeps generic error logs. Errors still fail startup. Build both apps with `npm run build` and `npm run build:batch`; the corresponding production scripts start their compiled artifacts.

No file upload endpoint, storage provider, multipart configuration or static `/uploads` route is wired. Image fields contain existing URL/path strings. Use already hosted image URLs for frontend integration; an upload workflow requires separate implementation.

## Member authentication and admin access

Public registration creates an active `USER`; clients cannot select a role. Members can use `register`, `login`, `googleLogin`, `getMe`, and `logout` through GraphQL. Passwords are hashed and excluded from the GraphQL Member type. Authentication failures expose stable `extensions.code` values.

Create a new administrator offline with the provisioning command below; provide its password through the environment, never a committed file:

```powershell
$env:MONGODB_URI = 'your-mongodb-uri'
$env:AURELIS_ADMIN_EMAIL = 'admin@example.com'
$env:AURELIS_ADMIN_PASSWORD = 'use-a-strong-unique-password'
node scripts/create-admin.js
```

Admins use the shared `login` mutation. Only active members with the `ADMIN` role can manage yacht inventory, broker profiles, or inquiry status. To migrate existing legacy admin records, supply an explicit JSON mapping from member `_id` to email in `AURELIS_LEGACY_ADMIN_EMAILS`; `scripts/migrate-legacy-members.js` is dry-run by default and requires `--apply` to update records and replace obsolete unique indexes. Existing documents and legacy fields are retained.

```powershell
$env:MONGODB_URI = 'your-mongodb-uri'
$env:AURELIS_LEGACY_ADMIN_EMAILS = '{"507f1f77bcf86cd799439011":"admin@example.com"}'
node scripts/migrate-legacy-members.js
node scripts/migrate-legacy-members.js --apply
```

## GraphQL operations

- Public catalog: `getYachts`, `getFeaturedYachts`, `getYacht`, `getBrokerProfiles`, `getBrokerProfile`.
- Public lead capture: `submitYachtInquiry` with `SALES` or `CHARTER`. Charter inquiries require start and end dates.
- Admin inventory: `getYachtsForStaff`, `createYacht`, `updateYacht`, `saveBrokerProfile`.
- Admin inquiry operations: `getYachtInquiries`, `updateYachtInquiry`.

Listing prices retain their original currency. Price filtering or sorting requires a listing mode and ISO currency code; the API does not perform foreign exchange conversion.

## Yacht catalog contract

`getYachts(input: YachtCatalogInput!)`, `getFeaturedYachts(input: YachtCatalogInput)`, and the ADMIN-only `getYachtsForStaff(input: YachtCatalogInput!)` return the existing `Yachts` wrapper. It retains `list: [Yacht!]!` and the existing `total: Float!`; optional `page: Int`, `limit: Int`, and `totalPages: Int` provide pagination metadata. No separate paginated query is introduced.

The input uses `filter`, `sortBy`, `descending`, `page`, and `limit`. Defaults remain page 1, limit 20, and FEATURED sorting; the maximum limit is 50. Invalid bounds are rejected. Filters include `listingMode` (or legacy `mode`), status, text, builder, model, country, location, featured, year, length, price, cabins, and guests. Public queries always enforce PUBLISHED; staff may filter all three statuses. Featured queries additionally enforce featured=true.

Sort options include NEWEST, PRICE_ASC, PRICE_DESC, NAME_ASC, NAME_DESC and the existing FEATURED, PRICE, LENGTH, YEAR, CREATED options. Fixed ASC/DESC options ignore `descending`; legacy options retain that flag. All sorts include an ID tie-breaker. Names use MongoDB's default case-sensitive ordering. Monetary filters and sorts require SALE or CHARTER plus a currency: SALE uses `salePrice`, CHARTER uses `charterPrice`. Missing prices retain MongoDB's established missing/null ordering; no currency conversion occurs.

`charterPrice` is canonical storage. GraphQL also accepts legacy `charterRate`; one shared service-boundary helper normalizes it. Equal aliases are accepted, conflicts are rejected, and omitted fields remain untouched on partial updates. Output `charterRate` is deprecated and resolves from `charterPrice`. Yacht modes are SALE/CHARTER; inquiry type SALES is unchanged. Optional builder, build year and length follow the current schema; broker, location, country, name and nonempty listing modes remain required on create.

### Legacy yacht migration

With `MONGODB_URI` configured, review a dry run using `node scripts/migrate-legacy-yachts.js`. Only an explicitly requested `node scripts/migrate-legacy-yachts.js --apply` writes changes. The script maps SALES to SALE, deduplicates modes, copies legacy charterRate only when charterPrice is absent, and removes equal/copied aliases. Invalid/conflicting prices are reported and the whole affected document is skipped. Optimistic predicates protect concurrent changes. No collections or indexes are dropped and no yachts are deleted. This script was not executed during Step 3; legacy database contents remain unverified.

## Crew profiles

Crew is a separate professional profile feature; the Yacht numeric crew capacity stays unchanged. One `CrewProfile` model in `crewProfiles` supports CAPTAIN and CHEF. Public queries are `getCrews(input: CrewCatalogInput!)`, `getCrew(id: ID!)`, and `getFeaturedCrews(input: CrewCatalogInput)`. ADMIN-only operations are `getCrewsForStaff(input: CrewCatalogInput!)`, `createCrewProfile(input: CreateCrewProfileInput!)`, and `updateCrewProfile(input: UpdateCrewProfileInput!)`, using the shared Member/Auth guards.

Collection responses are `Crews { list, total: Int!, page, limit, totalPages }`. Public reads always require PUBLISHED; featured reads also force featured=true. DRAFT and ARCHIVED remain stored but hidden. Defaults are page 1 / limit 20 and NEWEST sorting; maximum limit 50. All filtering, sorting, skip/limit and count execute in MongoDB through a shared service path.

Filters: role, status (staff only; overridden publicly), nationality, location, featured, minExperienceYears/maxExperienceYears, and language. Nationality/language match a whole value case-insensitively; language matches array membership. Location uses a literal case-insensitive substring. Regex syntax is escaped. Sorts: NEWEST, EXPERIENCE_ASC/DESC, NAME_ASC/DESC, with descending _id tie-breakers. Name sort uses explicit displayName or firstName/lastName fallback; the fallback is derived in MongoDB and at the GraphQL output boundary, not persisted. Default MongoDB case-sensitive name ordering and missing-experience ordering apply.

Create requires firstName and role. LastName/displayName and the remaining professional fields are optional; status defaults DRAFT, featured=false, languages/images=[]. Experience must be an integer >=0. Names and string-array entries are trimmed; blank names/language/image entries and duplicate languages are rejected. Images remain simple path/URL strings. Updates are partial, with omitted fields unchanged and explicit zero/false/empty arrays supported. Explicit null mutation values are rejected; no unlink or delete workflow is introduced. Archive by updating status to ARCHIVED; featured=true never publishes automatically.

MemberId is optional, format-validated, and must reference an existing Member. ADMIN-curated links can reference any current Member role and do not grant self-service permissions or change role/status. A partial unique memberId index enforces one linked profile per Member across statuses; unlinked profiles are excluded. Service prechecks and unique-index race handling return normal validation errors. Member credentials are never fetched or exposed. Any future self-service must separately require CREW role and ownership.

Three schema indexes are declared: unique linked memberId, publication/newest order, and publication/featured/newest order. No database or index migration was executed; actual data/index deployment remains unverified. No repository Crew legacy model was found, so no migration script was needed. Verify duplicate links before provisioning the unique index in any pre-existing external collection. See [Step 4 report](docs/ai/STEP_4_REPORT.md).

## Destinations and Yacht discovery

One `Destination` model in `destinations` supports REGION, COUNTRY and AREA with a self-referencing optional parentId. Names are trimmed (1-120 characters); slugs are globally unique across all statuses. One helper generates a slug from name on create or normalizes explicit slugs to lowercase hyphen-separated ASCII. Unsafe URL characters are rejected; generated names that cannot produce a valid ASCII slug require an explicit slug. A name-only update preserves the public slug. Duplicate slugs return validation errors without random suffixes.

Public queries: `getDestinations(input: DestinationCatalogInput!)`, `getDestination(slug: String!)`, and `getFeaturedDestinations(input: DestinationCatalogInput)`. All independently enforce PUBLISHED; featured additionally enforces featured=true. ADMIN-only operations: `getDestinationsForAdmin`, `createDestination`, and `updateDestination`, with shared AuthGuard/RolesGuard. DRAFT/ARCHIVED remain stored, and featured does not publish automatically. Archive through a status update; there is no delete or cascade API.

`Destinations { list, total: Int!, page, limit, totalPages }` follows the existing collection convention. Defaults: page 1, limit 20, maximum 50, FEATURED sort. Filters: type, status (admin only; overridden publicly), parentId, country, region, featured and search. Explicit parentId=null selects roots; a parent ID selects direct children. Country/region match a literal whole value case-insensitively; search matches escaped literal substrings in name/country/region. Sorting/count/pagination execute in MongoDB. FEATURED sorts featured descending, then sortOrder/name/_id ascending; SORT_ORDER uses sortOrder/name/_id ascending; NAME_ASC/DESC use name with ascending _id; NEWEST uses createdAt/_id descending. Names follow MongoDB default case-sensitive ordering; sortOrder defaults to 0 and need not be unique.

Parent writes verify the current ancestor chain, rejecting missing parents, self-parenting, direct and deeper cycles. Updates preserve omitted fields; parentId=null explicitly detaches a child. Other optional mutation nulls are rejected. Country/region and descriptions remain simple strings; images are existing path/URL strings. No recursive parent field is exposed; child discovery uses the existing parentId filter.

Yacht adds optional `destinationIds: [ID!]` inputs and an additive `[ID!]!` output. New records default to an empty array; older records missing the field resolve to [] without rewriting stored documents. Supplied IDs must be valid, distinct (case-insensitive ObjectId identity), and reference existing Destinations of any status. An omitted update preserves tags; [] explicitly clears them. Existing location/country, prices, charterRate alias, listing modes, filters and Yachts wrapper/Float total remain unchanged.

Use `getYachts(input: { filter: { destinationId: "..." } })` for discovery. The existing public/staff/featured Yacht aggregation matches BSON array membership directly. There is no descendant expansion: tag a Yacht with both parent and child IDs to match both. Archiving a Destination hides its catalog record while retaining Yacht tags and their membership filtering.

Declared indexes: global unique slug; status/parentId/sortOrder/name/_id; status/featured/sortOrder/name/_id; and Yacht status/destinationIds/createdAt, alongside existing Yacht indexes. No migration or database/index operation was executed. Before rollout, verify target collection/index state, duplicate slugs and real MongoDB query performance. Ancestor validation is a read-before-write check; simultaneous cross-document reparenting is not serialized. See [Step 5 report](docs/ai/STEP_5_REPORT.md).

## Offices and global contact network

One `Office` model in `offices` represents dynamically managed business locations. Public operations are `getOffices(input: OfficeCatalogInput!)`, `getOffice(slug: String!)`, and `getFeaturedOffices(input: OfficeCatalogInput)`. Each independently enforces PUBLISHED; featured also forces featured=true. ADMIN-only `getOfficesForAdmin`, `createOffice`, and `updateOffice` reuse shared Member/Auth guards. DRAFT and ARCHIVED remain stored; archive by status update, without deletion or cascading.

`Offices { list, total: Int!, page, limit, totalPages }` defaults to page 1 / limit 20, maximum 50, FEATURED sorting. Filters: status (admin only; overridden publicly), country, city, featured, search. Country/city are case-insensitive literal whole-string matches; escaped search covers name/country/city. MongoDB executes sorting, count, skip and limit. FEATURED orders featured descending, then sortOrder/name/_id ascending; SORT_ORDER uses sortOrder/name/_id ascending; NAME_ASC/DESC uses name with ascending _id; NEWEST uses createdAt/_id descending. Names follow default MongoDB case-sensitive ordering.

Create requires trimmed name/country/city/addressLine1; optional addressLine2/postalCode, public phone/email, timezone, descriptions, heroImage/images and curated featured/sortOrder are simple display metadata. Email trims and lowercases; phone accepts international display strings. Images reuse existing path/URL strings. Status defaults DRAFT, featured=false, sortOrder=0, images/businessHours=[]. Slugs are globally unique and generated from name or normalized by one helper; explicit unsafe URL characters are rejected. Name-only updates preserve slugs, and explicit changes have no redirect history.

Business hours are embedded `{ day, openTime, closeTime, closed }` entries for MONDAY through SUNDAY. Each weekday may appear once; open days require 24-hour HH:mm and openTime < closeTime. Closed days have absent/null times. Overnight and split shifts are unsupported. Optional timezone is checked by runtime `Intl.DateTimeFormat`, without timezone arithmetic; accepted names/aliases depend on runtime ICU data. Updates preserve omitted fields, reject optional mutation nulls, and validate supplied schedules as complete replacements; [] clears schedules/images.

Optional `BrokerProfile.officeId` is additive and requires a valid existing Office when supplied to the existing `saveBrokerProfile`. Omission preserves existing links; unlinked legacy brokers remain valid. Any Office status may be referenced. Archiving an Office leaves brokers, links and public active-broker reads intact. Existing broker reads have no filter input, so office-based broker discovery is future work; no Broker redesign or officeId index was added.

Three Office indexes are declared: unique slug, status/featured/sortOrder/name/_id, and status/sortOrder/name/_id. No migration, database/index operation, seed content or automatic relationship inference was performed. Verify target data, unique indexes and real MongoDB performance before rollout. See [Step 6 report](docs/ai/STEP_6_REPORT.md).

## Articles, news and insights

One `Article` model in `articles` supports NEWS, INSIGHT and GUIDE with DRAFT/PUBLISHED/ARCHIVED status. Public `getArticles(input: ArticleCatalogInput!)`, `getArticle(slug: String!)` and `getFeaturedArticles(input: ArticleCatalogInput)` enforce PUBLISHED plus absent/null `publishAt` or `publishAt <= now`. Featured additionally forces true. ADMIN `getArticlesForAdmin`, `createArticle` and `updateArticle` use shared active-member guards; staff reads include scheduled and hidden records. Archive is a status update.

`Articles` returns list, Int total and nullable page/limit/totalPages. Defaults are 1/20, maximum 50, PUBLISHED_NEWEST. Filters: type/status/featured/authorMemberId/yachtId/destinationId/search; public status is overridden. Search escapes regex punctuation across title/excerpt/authorName. MongoDB handles count/pagination and stable NEWEST/OLDEST/TITLE_ASC/TITLE_DESC/PUBLISHED_NEWEST/FEATURED sorts with ID tie-breakers.

Title/type are required; title trims and has a 200-character maximum. Excerpt is optional (maximum 1,000); plain-string content is optional for drafts and required for publication (maximum 200,000). Images are existing path/URL strings; optional authorName is display metadata. Slugs use one normalizer and global uniqueness; title-only edits preserve URLs. Omitted fields persist, optional mutation nulls are rejected, and [] clears arrays.

`publishAt` requests availability without a scheduler. Service-controlled `publishedAt` records the first PUBLISHED transition, including scheduled records; it is not the time a scheduled article first became publicly readable. It survives edits, draft/archive and republication, with a conditional first-stamp write. Optional Member/Yacht/Destination links require existing records of any status; IDs only are returned, duplicates rejected, and no related data or permissions change. Six indexes are declared, not provisioned by this task. See [the Step 7 report](docs/ai/STEP_7_REPORT.md); rollout and real MongoDB performance remain PENDING.

## Personal wishlist / favorites

Active USER, OWNER, CREW and ADMIN members can use `getMyWishlist(input: WishlistCatalogInput)`, `addYachtToWishlist(yachtId: ID!)`, `removeYachtFromWishlist(yachtId: ID!)`, `toggleYachtWishlist(yachtId: ID!)` and `isYachtWishlisted(yachtId: ID!)`. Shared authentication derives ownership from the current member; there is no memberId input or admin-wide access.

`WishlistItems` returns list, Int total and nullable page/limit/totalPages. Entries expose `_id`, `yachtId`, `createdAt` and `updatedAt` only. Defaults are page 1/limit 20, cap 50, newest saved first with descending ID ties. MongoDB filters current PUBLISHED Yacht references before count/pagination. Hidden and broken saves remain stored but are omitted from results; republishing a yacht makes its retained save visible again. No cascade or automatic cleanup.

Add validates a public Yacht and returns an existing/new item idempotently, preserving timestamps. Unique member+yacht identity arbitrates concurrent upserts; duplicate errors are handled safely. Remove returns true when the member's relation was deleted, otherwise false, including valid hidden/missing yacht IDs. Toggle returns `{ yachtId, wishlisted }`, removing an existing save or adding only a public yacht. Concurrent toggles are not serialized and may coalesce; use add/remove when an explicit desired state is needed. `isYachtWishlisted` checks only the member's save and requires a public Yacht; hidden/missing yachts use the existing not-found behavior.

One `wishlistItems` collection stores only relations/timestamps, with two declared indexes: unique memberId/yachtId and memberId/createdAt/_id. No Member/Yacht data rewrite or reverse links. No nested Yacht, Yacht.isWishlisted, sharing/folders, social likes or frontend work. No migration/database operations were run; verify target MongoDB/indexes before rollout. See [the 50-point Step 8 report](docs/ai/STEP_8_REPORT.md).

## Charter inquiry workflow

`submitCharterInquiry(input: CreateCharterInquiryInput!)` reuses the canonical `YachtInquiry` model/service and forces CHARTER/NEW. Existing `submitYachtInquiry` remains for SALES and CHARTER; SALES is separate from Yacht listing mode SALE. Guests can submit. Supplied credentials must pass shared authentication; optional memberId derives only from CurrentMember, while inquiry contact details remain independently supplied. Invalid/blocked/deleted credentials are rejected instead of silently treated as guest.

Name/email/message remain required; trim name/message (2..120 and 10..4000 characters) and normalize valid email. Phone remains optional, trimmed broad international display text up to 40 characters. Charter uses existing startDate/endDate names, requiring valid end > start. Prior past-date acceptance is retained; dates are preferences, not confirmed availability. Guest count remains optional; when supplied it is a positive integer and cannot exceed a valid positive integer Yacht.guests. Unknown/invalid legacy capacity is not invented. Yacht must be PUBLISHED and CHARTER-capable; charterPrice/charterRate stay on Yacht, with no inquiry price snapshot.

Shared ADMIN guards protect `getYachtInquiries`, new `getYachtInquiriesPage`, new `getYachtInquiry(id: ID!)` and status-only `updateYachtInquiry`. Filters support type/status/yachtId/memberId/exact email and inclusive createdFrom/createdTo. Both list paths sort createdAt/_id descending and use MongoDB paging/count. Existing YachtInquiries list/total and Float total remain compatible, adding nullable page/limit/totalPages. Legacy list retains max-100 clamping; the new optional-input page query defaults 1/20 and rejects limits above 50. Detail/history remains readable if the Yacht is later hidden/missing.

No public inquiry lists, customer history endpoint, arbitrary repeat-submission cooldown, email/CRM/notifications, booking/payment/calendar or frontend work. Existing duration-only logging is unchanged. One type/status/createdAt/_id index is declared alongside the two existing indexes; no migration/database operation was executed. See [Step 9 report](docs/ai/STEP_9_REPORT.md) for local validation and unverified rollout assumptions.

## Sales / purchase inquiry workflow

`submitSalesInquiry(input: CreateSalesInquiryInput!)` returns the existing `YachtInquiry` and forces `InquiryType.SALES` / `InquiryStatus.NEW`. Its input contains yachtId/name/email/message and optional phone; no client type, status, memberId, charter fields or price. The shared Inquiry service performs the same contact normalization as generic submission and requires a PUBLISHED Yacht supporting `YachtListingMode.SALE`. SALE-only and dual-mode yachts are eligible; CHARTER-only, draft, archived and missing yachts are rejected.

Guests can submit; supplied credentials must pass the existing optional authentication. Verified CurrentMember supplies memberId without replacing the buyer's contacts. `submitYachtInquiry` remains compatible for SALES/CHARTER, including its optional dates/guest fields, and charter behavior is unchanged. Shared ADMIN list/detail/status-only management and paging/filter contracts apply to sales too. No public PII lists or customer history API.

Yacht.salePrice remains the canonical listing price, with no client price requirement or inquiry snapshot. Budget/currency/offer fields are intentionally deferred; message captures buyer interest. No purchase, payment, escrow, KYC, CRM, notifications, frontend or Step 11+ workflows were added. No schema/index changes, migrations or database operations. See [the 55-point Step 10 report](docs/ai/STEP_10_REPORT.md) for validation and pending rollout checks.

## Checks (no builds)

```bash
node --preserve-symlinks --preserve-symlinks-main node_modules/typescript/bin/tsc -p apps/aurelis-api/tsconfig.app.json --noEmit
node --preserve-symlinks --preserve-symlinks-main node_modules/typescript/bin/tsc -p apps/aurelis-batch/tsconfig.app.json --noEmit
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run test:e2e:batch -- --runInBand
```

`npm run lint` is non-mutating. Use `npm run lint:fix` only for an intentional autofix pass. Type-aware ESLint uses `tsconfig.eslint.json` to cover source and tests in both apps; application builds retain their existing exclusions. Lint dependencies are aligned with the current TypeScript compiler. The repaired toolchain reports existing code/style findings; see [the Step 1 handoff](docs/ai/COMPLETED_TASK.md) for validation details.

See `AGENTS.md` for domain and implementation conventions.

STEP 11 owner intake: public submitSellYachtRequest and ADMIN list/detail/status management use a dedicated sellYachtRequests domain. No automatic inventory creation, broker assignment or account role change. See [STEP 11 report](docs/ai/STEP_11_REPORT.md) for validation and deferred uploads/rollout.

## Yacht engagement contract

- Yacht.viewsCount/likesCount are canonical denormalized number counters, schema defaults 0, integer/min0; GraphQL Int output resolves missing legacy values to zero without writes. Inputs do not expose engagement counters.
- Public recordYachtView(yachtId) performs an atomic PUBLISHED-filtered increment and returns the new count; detail/catalog/internal reads remain side-effect free. Events are raw, not unique visitors.
- WishlistItem remains the member/yacht source of truth. Upsert result metadata gates +1 on actual insert; deletion results gate -1 with likesCount>0. Unique-index losers and duplicate adds do not increment. Hidden/broken relation behavior and private ownership remain unchanged.
- Cross-document writes are not transactional; failures and interleaved add/remove can drift and require separately scoped reconciliation. Overlapping toggles remain unserialized. Deployed unique-index/concurrency behavior is unverified.
- MOST_VIEWED/MOST_LIKED descend by their counter then createdAt/_id; POPULAR descends by likesCount/viewsCount/createdAt/_id. Missing values normalize to zero for deterministic legacy ties. Existing featured default, wrappers and pricing aliases remain intact.
- STEP 12 added no indexes or reconciliation script; STEP 16 adds the standalone dry-run utility below. Representative plans, actual historical repair and production rollout remain PENDING. See docs/ai/STEP_12_REPORT.md.

## STEP 13 Redis runtime

Set `REDIS_URL=redis://localhost:6379` in local configuration (see `.env.example`). The API uses one shared RedisService with bounded commands, automatic reconnect, no offline queue, sanitized error handling and shutdown cleanup. MongoDB remains the permanent source of truth. The idle batch app does not consume Redis.

For a disposable development Redis instance, run `docker compose -f compose.redis.yml up -d` when authorized locally. The compose service binds only localhost, disables persistence and is not a production deployment template. It was not started during STEP 13 implementation. Production must provision Redis separately, use appropriate authentication/TLS/network controls, and avoid eviction of active limiter keys.

Popularity pages (MOST_VIEWED/MOST_LIKED/POPULAR) cache ordered IDs and totals for 30 seconds; MongoDB supplies current published records and brokers on every hit. Views, actual wishlist changes, and yacht create/update invalidate all popularity generations. Staff and ordinary catalog reads bypass this cache. Non-critical cache/state failures bypass safely; ranks/totals may remain stale for the remaining TTL if invalidation fails.

Limits apply per server-observed IP, shared across API instances: password/Google login share 10 attempts/60 seconds; views allow 60/60 seconds; generic/charter/sales inquiries share 5/600 seconds; SellYachtRequest allows 5/600 seconds separately. Counters use an atomic fixed-window Lua operation with expiry, starting at the first attempt. Rejected authentication/validation attempts consume quota once they reach the guard. Public reads remain available.

**Rate limiting fails closed:** when Redis is unavailable, protected mutations return GraphQL `RATE_LIMIT_UNAVAILABLE` with `retryAfterSeconds: 5`; exhausted quotas return `RATE_LIMITED` with the remaining retry interval. No in-memory fallback silently weakens distributed limits. HTTP GraphQL responses retain the existing envelope. Express proxy trust stays disabled; forwarded headers are ignored. A future deployment behind a proxy must explicitly scope trusted proxy addresses before changing this behavior; users behind one NAT/proxy currently share quota.

`GET /health/redis` reports `ok/up` or `degraded/down`, plus the fail-closed policy, without URLs or credentials. HTTP 200 allows inspection of degradation independently of process liveness; monitor the JSON status. The existing root health greeting is preserved.

RedisService provides JSON TTL/cache helpers, namespaced temporary get/set/delete helpers, and per-member/per-session presence touch/read/clear helpers (60-second default). These helpers are internal foundations; SocketStateService now uses verified session identity and aggregate leases, while Socket.IO uses dedicated pub/sub connections. No public presence roster or permanent Redis business storage is implemented. See [STEP 13 report](docs/ai/STEP_13_REPORT.md).

## STEP 14 realtime infrastructure

The API serves Socket.IO at the default /socket.io path using WebSocket transport only on the API port. Authenticate with handshake auth: { token: accessToken }; query-string tokens are ignored. Wait for socket:ready before sending events. Every reconnect reauthenticates and creates a new session; authorized conversation rooms must be joined again. Message history is persisted in MongoDB and recoverable through GraphQL; Socket.IO does not replay missed events.

RealtimeModule reuses AuthService and global RedisService. Two dedicated ioredis clients use REDIS_URL for the Redis adapter; the shared command connection handles TTL presence, typing and rate limits. GET /health/socket returns readiness/degradation without secrets. Redis/adapter outages fail socket operations closed while HTTP health and existing API behavior remain available.

Each socket renews a 60-second Redis presence lease every 20 seconds; multiple sockets keep a member online until the last live lease disappears. Typing leases expire after 5 seconds. Presence notifications stay in the verified member's private room; conversation:presence permits only an authorized historical participant to look up their counterpart. room:join, room:leave, typing:start and typing:stop accept { conversationId }. Strict conversation:<24-hex-ObjectId> room names and RoomPolicy enforce current Mongo-backed historical participant authorization. No global public chat exists.

Connection attempts share 20/60 seconds per server IP; all incoming event packets share 120/60 seconds per verified member across sockets/instances. No forwarded-header trust or local limiter fallback. Outage errors use SOCKET_UNAVAILABLE or RATE_LIMIT_UNAVAILABLE; auth failures use SOCKET_UNAUTHENTICATED and limits use RATE_LIMITED with retryAfterSeconds. A server-disconnected client must explicitly reconnect with a valid token after service recovery.

Run both TypeScript checks, unit/API/batch regressions, focused Socket/Redis lint and git diff --check for this step. Do not infer deployed multi-instance pub/sub or actual TTL behavior from offline tests. See docs/ai/STEP_14_REPORT.md for validation and rollout dependencies.

## Final private chat and operations

MongoDB stores Member, Yacht, BrokerProfile, CrewProfile, Destination, Office, Article, WishlistItem, YachtInquiry, SellYachtRequest, Conversation and Message, including permanent engagement counters. Redis stores caches, atomic quotas and temporary presence/typing state and transports Socket.IO pub/sub. GraphQL serves persistent application operations; Socket.IO delivers authenticated private events. Batch remains idle.

Chat GraphQL operations: startYachtConversation, getMyConversations, getConversation, getConversationMessages, sendMessage and markConversationRead. Conversation.unreadCount is recipient-specific; ADMIN history returns null for this field. Lists/history default to 1/20, maximum 50. A customer starts from a PUBLISHED Yacht and its assigned active BrokerProfile with an active non-ADMIN memberId. This optional link is curated through ADMIN saveBrokerProfile and never changes Member roles.

Conversation snapshots brokerMemberId at creation. Access does not follow future yacht broker reassignment or profile member relinking. The existing customerId/yachtId/brokerId unique key reuses historical conversations when the same profile is relinked; a different assigned profile creates a separate relationship. Existing authorized history remains available after yacht/profile hiding or deletion. ADMIN may inspect explicit GraphQL history and cannot start, send, join, type or mark participant messages read, including after promotion of a historical participant.

Use WebSocket handshake auth.token; wait for socket:ready, then explicitly room:join with conversationId. Both GraphQL sendMessage and socket message:send use ChatService and the shared per-member Redis quota (30 messages/60s). text is trimmed and bounded to 1..4000. Sender identity is server-derived. message:new/message:read go only to conversation rooms. Reconnect reauthenticates/rejoins; recover missed history through GraphQL. typing:start/typing:stop require authorized joined rooms (5s leases). conversation:presence derives the other historical participant from an authorized conversation, with no public roster. Presence leases last 60s; each socket is removed independently. Account/room revocation is checked on events and every 20s, so it is not instantaneous across API instances.

GET /health/redis and /health/socket return ok/degraded without secrets; both currently return HTTP 200, so monitoring must inspect the body. Root health is liveness, not dependency readiness. API bootstrap uses SanitizedLogger to suppress raw framework exception text/stacks while preserving fixed safe auth configuration diagnostics. MongoDB is required at API initialization but has no separate runtime Mongo readiness endpoint. Cache outages bypass to MongoDB; login/views/inquiries/sell/chat quotas fail closed with RATE_LIMIT_UNAVAILABLE (or RATE_LIMITED for exhaustion). Socket adapter command rejection stops pub/sub connections and requires API restart after Redis recovers; ordinary disconnected connections retain their bounded reconnect policy. Persisted messages survive missed realtime delivery.

### Likes reconciliation (operator-only)

scripts/reconcile-yacht-likes.js is never run by startup. Set MONGODB_URI explicitly in a separately authorized operator session; the utility does not load .env. With no flags it streams mismatches and orphan relation counts read-only. --help does not connect. Optional --apply --writes-paused repairs only likesCount, disables automatic collection/index creation, rechecks relation counts and matches the observed counter before writing; conflicts are skipped and exit code 2 reports them. Errors are sanitized; partial applies can be retried through a new dry-run.

Before an authorized apply, drain API requests/in-flight cache fills and pause all wishlist writers/external writers throughout the comparison and repair. Wait at least 30s for existing popularity pages to expire before resuming. The flag is an operator acknowledgment, not a distributed lock. There is no cross-document transaction; MongoDB 4.4+ is required by the utility's $unionWith pipeline. It never deletes orphan/history records, upserts yachts or changes indexes. No dry-run database connection or apply was executed during STEP 16.

### Final validation (no builds)

Use node --preserve-symlinks --preserve-symlinks-main with node_modules/typescript/bin/tsc for both app -p checks and --noEmit; use node_modules/jest/bin/jest.js --runInBand for units and --config apps/aurelis-api/test/jest-e2e.json / apps/aurelis-batch/test/jest-e2e.json for the independent e2e suites. Lint is non-mutating; final focused and repository results and the working flat-config route are recorded in the report. Run git diff --check. Production Mongo/index deployment, TLS/ACLs/proxy/CORS setup, real Redis recovery/TTL/concurrency and release acceptance remain separate operational verification.

## Local verification without a build

With explicit safe local MongoDB/Redis/JWT configuration, run the TypeScript API directly:

```powershell
node --preserve-symlinks --preserve-symlinks-main -r ts-node/register/transpile-only apps/aurelis-api/src/main.ts
```

The opt-in `scripts/verify-local-backend.js --help` describes the complete local verification. Explicit `--run` requires loopback API/Mongo/Redis URLs, a fresh `aurelis_step17_*` database, a dedicated nonzero Redis database, and a local-only JWT secret. Two API URLs verify actual Redis-adapter private delivery across processes. The script retains synthetic records, never targets production or runs migrations/reconciliation, and does not flush Redis. See the Step 17 report for exact checks and environmental limits.

`getBrokerProfiles` preserves its existing `list` and `total: Float!` wrapper and accepts optional `BrokerCatalogInput` with page 1/limit 20 defaults and maximum 50. `page`, `limit` and `totalPages` metadata are additive. Clients needing more than the first 20 brokers should page; no office/search filter was introduced.
