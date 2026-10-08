# Aurelis Backend Agent Instructions

Aurelis is a global yacht sales and charter platform. This repository contains the NestJS backend only. Public catalog browsing and yacht inquiries do not require an account; internal inventory and inquiry operations require an active `ADMIN` member.

## Read First

Before changing code , read the current AI handoff docs:

- `docs/ai/BACKEND_MIGRATION.md`
- `docs/ai/COMPLETED_TASKS.md`
- `docs/ai/DECISIONS.md`
- `docs/ai/FRONTEND_MIGRATION.md`
- `docs/ai/NEXT_STEPS.md`
- `docs/ai/PROMPTS.md`

Use those files as the sourse of truth for AI Agent related migration history, accepted decisions, remaining work and validation status.

## Project Shape

-Backend apps are `aurelis-api` and `aurelis-batch`.
-Keep the existing NestJS resolver/service/module pattern based on MVC and DI.
-Keep DTOs, enums, schemas under `apps/aurelis-api/src/libs`.

## WorkFlow

1. Analyze before editing.
2. Keep changes small and consistent with existing project patterns.
3. Do not remove working logic unless it is replaced safely.
4. Update `docs/ai/COMPLETED_TASK.md` after major complete work.
5. Add or update focused tests when behavior changes.

## Validation

Use these checks for backend work:

```bash
npx tsc -p apps/aurelis-api/tsconfig.app.json --noEmit
npx tsc -p apps/aurelis-batch/tsconfig.app.json --noEmit
npm run build
```

`npm run lint` checks backend source and tests without rewriting files. Use `npm run lint:fix` only when file rewriting is acceptable. Type-aware lint uses `tsconfig.eslint.json`, which includes tests without changing either app's build scope.

Run `npm run test:e2e -- --runInBand` for API HTTP tests and `npm run test:e2e:batch -- --runInBand` for the separate batch health test. The API e2e command does not include the batch suite.

## Architecture and conventions

- Keep the NestJS monorepo apps under `apps/`. `aurelis-api` serves the GraphQL API; `aurelis-batch` is a maintenance app and currently has no scheduled jobs.
- Organize API code by feature: Nest module, resolver, service, GraphQL DTOs, enums, and Mongoose schema.
- Use GraphQL DTO decorators and `class-validator` for input validation. Keep public reads and inquiry submission separate from admin-only operations.
- Use Mongoose schemas with timestamps and explicit collection names. Store monetary values with their ISO 4217 currency code; do not silently convert prices.
- Never commit `.env` or credentials. Use `.env.example` as the configuration template.
- Update this file and `README.md` when architecture or operational workflows change.

## Current product boundaries

- Yacht listings support sales, charter, or both, with per-listing currencies.
- Inquiry submission is a lead capture workflow; booking, payment, and customer accounts are out of scope.
- Staff accounts are provisioned offline and must have the `ADMIN` role.

## Yacht compatibility contract

- Preserve `getYachts`, `getFeaturedYachts`, and `getYachtsForStaff` as `Yachts { list, total }`; optional `page`, `limit`, and `totalPages` metadata is additive. Preserve the existing `total: Float!` scalar.
- Reuse `YachtCatalogInput` / `YachtInquiryFilter`; default page 1, limit 20, maximum limit 50. Public collection and detail queries always require PUBLISHED.
- `charterPrice` is the only persisted charter amount. Both create/update paths call `normalizeYachtPricingInput` at the service boundary; `charterRate` is an input compatibility alias and an output field resolved from `parent.charterPrice`.
- Yacht modes are SALE/CHARTER. `InquiryType.SALES` remains separate and unchanged.
- `scripts/migrate-legacy-yachts.js` is a standalone dry-run-first migration with explicit `--apply`; never invoke it at startup or automatically during agent work.

## Crew profile contract

- `CrewProfile` is the single professional profile model in `crewProfiles`; CrewRole is CAPTAIN/CHEF and is separate from MemberRole.CREW. Yacht.crew remains a numeric capacity field.
- Crew public collection/detail/featured reads enforce PUBLISHED. ADMIN manages profiles and staff reads through the existing AuthGuard/RolesGuard. No self-service or separate Crew authentication is implemented.
- Optional memberId links verify an existing Member and are unique across all profile statuses; no account is created or role mutated. Admin-curated links do not grant permissions and may reference any existing Member role. Future self-service must explicitly enforce MemberRole.CREW and ownership.
- Use CrewCatalogInput and Crews { list, total: Int, page, limit, totalPages }; defaults page 1 / limit 20, maximum 50, NEWEST sort. Do not change the legacy Yacht wrapper or total Float scalar.
- Profile name sorting uses the explicit displayName or derives firstName/lastName in MongoDB; output fallback is resolved separately without persisting derived names. Optional mutation fields reject null, and undefined fields are omitted from updates.

## Destination and Yacht discovery contract

- One Destination model in destinations uses REGION/COUNTRY/AREA and DRAFT/PUBLISHED/ARCHIVED. Public catalog/detail/featured reads enforce PUBLISHED; shared ADMIN guards protect management. No new authentication or delete API.
- Slugs are globally unique, generated/normalized through one helper. Name-only updates preserve slugs. Parent writes check existing ancestors for missing records and cycles; explicit parentId=null detaches. Other mutation nulls are rejected.
- Destinations uses list/Int total/page/limit/totalPages, defaults 1/20, maximum 50 and FEATURED sorting. Children use parentId filtering; no recursive public hierarchy resolver is introduced.
- Yacht.destinationIds is optional and additive; preserve location/country, pricing/aliases and Yachts Float total. Validate distinct existing IDs only when supplied; omitted updates preserve them, [] clears. Old records resolve missing tags as [] without database writes.
- Yacht destinationId filters use BSON array membership in existing aggregation. Parent discovery requires explicit parent tags; no descendant expansion or inferred geography. Archived references remain; no cascades.
- Index declarations do not prove deployed indexes. No Step 5 migration or live database operation was executed. Check rollout evidence in docs/ai/STEP_5_REPORT.md and NEXT_STEPS.md.

## Office and global contact contract

- One Office model in offices; DRAFT/PUBLISHED/ARCHIVED. Public list/detail-by-slug/featured reads independently enforce PUBLISHED. ADMIN catalog/create/update reuse shared AuthGuard/RolesGuard; archive is status-only, with no delete or cascade API.
- OfficeCatalogInput and Offices use list/Int total/page/limit/totalPages, defaults 1/20, maximum 50 and FEATURED sorting. Slugs are globally unique through one helper; name-only updates preserve slugs. Required name/country/city/addressLine1 are trimmed. Optional mutation nulls are rejected.
- Business hours are embedded unique weekdays with same-day HH:mm open < close; closed days omit or use null times. Supplied schedules replace the complete value; [] clears. Timezone uses runtime Intl validation, without conversion services.
- BrokerProfile.officeId is optional, validates Office format/existence on supplied writes, and grants no permissions. Omitted links are preserved. Offices of any status may be linked; archiving retains broker links and visibility. Existing broker queries have no filter input; office-based broker discovery remains future work.
- Office index declarations are not rollout evidence. No migration or live database operation was performed; see docs/ai/STEP_6_REPORT.md and NEXT_STEPS.md.

## Article editorial contract

- One Article model in articles uses NEWS/INSIGHT/GUIDE and DRAFT/PUBLISHED/ARCHIVED. Public list/detail-by-slug/featured reuse a shared PUBLISHED and publishAt absent/null or <= now condition. ADMIN management reuses AuthGuard/RolesGuard. No scheduler, delete API or cascades.
- Articles uses list/Int total/page/limit/totalPages, defaults 1/20, maximum 50 and PUBLISHED_NEWEST sorting. Shared slug normalization generates from title on create; title-only updates preserve URLs. Optional mutation nulls are rejected; omitted updates preserve fields; [] clears arrays.
- Content is plain text, optional for drafts but required when the merged status is PUBLISHED. publishedAt is service-controlled first-PUBLISHED-transition metadata, including future-scheduled records, and survives edits/draft/archive/republication. publishAt controls availability separately.
- Optional authorMemberId/yachtIds/destinationIds verify existing records of any status without granting permissions or changing related documents. Array IDs are distinct by BSON identity. Return IDs only; no nested hidden entities or Member credentials.
- Article indexes are declarations only. No live database or migration operations were executed. See docs/ai/STEP_7_REPORT.md for validation and rollout limits.

## Personal wishlist contract

- One WishlistItem relation in wishlistItems contains memberId/yachtId and timestamps; no embedded Yacht snapshot or Member wishlist array. Unique memberId+yachtId index and memberId/createdAt/_id browsing index are declared, not deployed by agent work.
- All five wishlist operations use shared AuthGuard and CurrentMember for any active USER/OWNER/CREW/ADMIN. No client memberId, impersonation, admin-wide access or second account-status system.
- getMyWishlist returns IDs/timestamps in WishlistItems with Int total/page/limit/totalPages, defaults 1/20, maximum 50, createdAt/_id descending. MongoDB joins current PUBLISHED yachts and excludes hidden/broken references before pagination/count. Relations remain stored and reappear on republication; no automatic cleanup/cascade.
- Add requires a public Yacht, is idempotent with upsert/unique-index race handling and preserves saved timestamps. Remove accepts valid IDs even for hidden/missing yachts and returns true only when an owner relation was deleted. Toggle removes an existing owner relation or performs a public-only add; overlapping toggles are not serialized.
- isYachtWishlisted requires a current public Yacht, throwing the existing not-found error for hidden/missing records; checks only the current member's relation. Yacht.isWishlisted and nested Yacht output are deferred. Shared Yacht visibility helper preserves prior catalog/detail semantics.
- No migrations/live database operations were executed. See docs/ai/STEP_8_REPORT.md and NEXT_STEPS.md for rollout/index and concurrency limitations.

## Charter inquiry workflow contract

- Reuse YachtInquiry in yachtInquiries; InquiryType remains SALES/CHARTER and InquiryStatus remains NEW/CONTACTED/CLOSED. No separate CharterRequest model. Public submitYachtInquiry stays; submitCharterInquiry is a facade forcing CHARTER/NEW through the same service path.
- Guests remain allowed. Supplied credentials go through shared authentication via OptionalInquiryAuthGuard; only verified CurrentMember links optional memberId. No client memberId/status or account lookup, no credentials/populated Member output.
- Preserve startDate/endDate names and prior past-date acceptance. Charter requires valid ordered dates; name/message retain 2..120/10..4000 trimmed limits, email normalizes, phone remains optional broad display string <=40. Guest count stays optional; supplied values are positive integers and cannot exceed valid positive integer Yacht.guests. Missing/invalid legacy capacity is not invented.
- YachtService.getById supplies canonical public visibility; the shared submission path also checks CHARTER/SALE mode. New submissions force NEW and never snapshot prices. Admin update remains status-only; old inquiry documents/links remain readable independently of current Yacht visibility.
- Existing getYachtInquiries/YachtInquiries and total Float stay, with additive filters/nullable metadata and preserved legacy max-100 clamping. New getYachtInquiriesPage caps limit at 50 with defaults 1/20; both sort createdAt/_id descending and use MongoDB paging/count. ADMIN-only detail/list/update reuse shared guards; no public list/getMyInquiries.
- One type/status/createdAt/_id index added, prior indexes preserved. No arbitrary dedup cooldown, booking/payment/availability/notifications or automatic cleanup. No migrations/live database operations; verify rollout evidence in docs/ai/STEP_9_REPORT.md.

## Sales / purchase inquiry contract

- submitSalesInquiry accepts CreateSalesInquiryInput (yachtId/name/email/message, optional phone) and returns the canonical YachtInquiry. It forces InquiryType.SALES and InquiryStatus.NEW through the existing shared submission service. YachtListingMode.SALE remains a separate enum value.
- Require a PUBLISHED, SALE-capable Yacht through YachtService.getById. Guests remain allowed; OptionalInquiryAuthGuard verifies supplied credentials and CurrentMember derives optional memberId. Independent contact details are preserved; no client memberId/status/type on the sales facade.
- Existing submitYachtInquiry still supports SALES/CHARTER with its historical optional date/guest fields. Charter behavior and shared ADMIN list/detail/status-only updates, filters, Float total, paging defaults/caps and ordering remain unchanged. No duplicate sales model/admin API or public inquiry history.
- Yacht.salePrice remains canonical and is neither required from clients nor copied into inquiries. Budget/currency/offer fields are deferred. No schema/index changes, migrations/live database operations or purchase/payment workflows; see docs/ai/STEP_10_REPORT.md for validation and rollout assumptions.

## Sell Yacht Request contract

- Dedicated SellYachtRequest in sellYachtRequests; YachtInquiry is unchanged. Guest submission and verified optional Member links reuse shared authentication; management uses shared ADMIN guards.
- Required phone/builder/yearBuilt/lengthM/location/country; optional askingPrice requires currency. No automatic listing, broker assignment or OWNER promotion. Image upload is deferred: no wired upload mechanism exists.
- List uses Int total, defaults 1/20, maximum 50, createdAt/_id descending; status-only updates. Indexes declared only; no migrations/live database/frontend/STEP 12+ operations. See docs/ai/STEP_11_REPORT.md.

## Yacht engagement contract

- Yacht.viewsCount/likesCount are canonical denormalized number counters, schema defaults 0, integer/min0; GraphQL Int output resolves missing legacy values to zero without writes. Inputs do not expose engagement counters.
- Public recordYachtView(yachtId) performs an atomic PUBLISHED-filtered increment and returns the new count; detail/catalog/internal reads remain side-effect free. Events are raw, not unique visitors.
- WishlistItem remains the member/yacht source of truth. Upsert result metadata gates +1 on actual insert; deletion results gate -1 with likesCount>0. Unique-index losers and duplicate adds do not increment. Hidden/broken relation behavior and private ownership remain unchanged.
- Cross-document writes are not transactional; failures and interleaved add/remove can drift and require separately scoped reconciliation. Overlapping toggles remain unserialized. Deployed unique-index/concurrency behavior is unverified.
- MOST_VIEWED/MOST_LIKED descend by their counter then createdAt/_id; POPULAR descends by likesCount/viewsCount/createdAt/_id. Missing values normalize to zero for deterministic legacy ties. Existing featured default, wrappers and pricing aliases remain intact.
- No new indexes or reconciliation script were added; representative plans, historical count repair and production rollout remain PENDING. See docs/ai/STEP_12_REPORT.md.

## Redis infrastructure contract (STEP 13)

- REDIS_URL defaults to redis://localhost:6379; the global RedisModule owns one shared RedisService in the API. MongoDB remains permanent authority. Idle batch does not depend on Redis.
- Cache/temporary/presence helpers require positive integer TTLs; Redis commands have bounded latency, no offline queue, caught failures, reconnect and shutdown cleanup. Never log Redis URLs, keys, credentials or request contacts.
- Public popularity caches contain page IDs/counts for 30 seconds; fresh MongoDB hydration enforces visibility. Actual views/wishlist changes and yacht create/update rotate UUID generations. Cache failures bypass; failed invalidation may leave ranks/counts stale until TTL. Staff reads do not cache.
- The global metadata guard protects password/Google login (shared 10/60s), view events (60/60s), all inquiry facades (shared 5/600s), and sell requests (5/600s), per server IP. Atomic Redis counter/expiry; no forwarded-header trust or process-local fallback. Outages fail closed with RATE_LIMIT_UNAVAILABLE; exhaustion returns RATE_LIMITED, both with retryAfterSeconds.
- GET /health/redis reports degradation without secrets; root health stays compatible. Presence is per-member/session TTL state only; no socket/chat/auth changes. Future STEP 14 must use verified identities and separate pub/sub connections.
- No live Redis/MongoDB operations or migrations were executed. Local compose is disposable infrastructure only, not rollout evidence. See docs/ai/STEP_13_REPORT.md.

## Socket.IO realtime contract (STEP 14)

- API RealtimeModule uses Socket.IO WebSocket transport, shared AuthService JWT/current Member validation, and dedicated Redis pub/sub connections from RedisService. Batch remains idle and independent. No legacy memberNick, query-token auth, public chat, Conversation/Message model or persistence.
- Handshake auth.token is verified, removed from retained handshake data, and reduced to memberId/role/expiry. Reconnect always reauthenticates; rooms are rejoined explicitly. JWT expiry and current account status are rechecked on events and 20-second heartbeats.
- Redis sorted-set session leases with server TIME enforce aggregate member presence (60s) and per-conversation/member typing (5s). Disconnect removes this session; other sockets survive. Crashes/outages fall back to expiry. No public presence roster or arbitrary member lookup.
- Central SOCKET_EVENTS and strict BSON room naming prepare conversation:<conversationId>. RoomPolicy denies all conversation joins/leaves/typing until STEP 15 implements membership authorization; typing also requires a joined room. Only verified own member rooms are automatic.
- Atomic Redis rate limits: connects 20/60s per server IP, all event packets 120/60s per member. No forwarded-header trust/in-memory fallback. Socket Redis/adapter failures fail closed, sanitized errors and readiness at GET /health/socket; existing HTTP policy remains unchanged.
- No build/migration/live database/frontend operations were executed. Multi-instance delivery, real Redis subscription recovery/TTL/concurrency and deployment remain PENDING. See docs/ai/STEP_14_REPORT.md.
