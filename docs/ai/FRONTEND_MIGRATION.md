# Frontend Migration

## Current status — STEP 17 (2026-10-09)

Final cleanup and actual isolated local MongoDB/Redis/API/GraphQL/Socket.IO/private chat verification are recorded in [STEP_17_REPORT.md](STEP_17_REPORT.md), with the complete [API inventory](STEP_17_API_INVENTORY.md) and pre-deletion [candidate decisions](STEP_17_CLEANUP_CANDIDATES.md). Safe deletions/dependency removal preserve all prior STEP 16 work and all tests. GraphQL variable errors no longer reflect credential/contact inputs; getBrokerProfiles now has optional pagination (1/20 defaults, maximum 50) while retaining list/Float total and argument-free calls.

Verified: both no-emit app compiler checks; 47 unit suites/1,162 tests; 14 API HTTP suites/556 tests; batch 1/1. Real local two-instance private messages/read/unread, historical broker authorization, live indexes/unique constraints/counters, cache/TTL/quotas/presence/typing and Redis outage fail-closed behavior pass. Twelve material/new TS files and the standalone verification utility lint clean; two minimally adjusted old fixtures retain 169 errors/8 warnings, and repository lint retains 1,046 errors/56 warnings/zero fatal errors.

Next: FRONTEND INTEGRATION in the separate repository. Live successful Google login and production indexes/config/data/performance/multihost rollout remain UNVERIFIED. No builds, product feature expansion, frontend, Management Request, production database operation or migration/reconciliation invocation occurred. Earlier no-live-operation statements describe their historical steps.


## Historical status — STEP 16 (2026-10-08)

The backend feature roadmap is complete. The next task is **FRONTEND INTEGRATION** in the separately located frontend repository, not another backend feature step. See [STEP_16_REPORT.md](STEP_16_REPORT.md) for the final audit, validation, contracts and categorized deployment assumptions. Older roadmap entries below are historical and do not reopen completed steps.

MongoDB owns permanent application data; GraphQL owns persistent APIs; Socket.IO owns authenticated private realtime delivery; Redis owns bounded caches, rate limits, presence/typing TTL state and adapter pub/sub. No frontend, Management Request, builds, migrations or live MongoDB operations were performed.

Private chat persists customer/yacht/broker-profile relationships and immutable brokerMemberId. Profile relinking never transfers history. ADMIN has explicit read-only history access even when recorded as a participant; new ADMIN customer starts and newly linked ADMIN broker participation are rejected. Both transports share ChatService and the per-member 30/60s message quota. See the report for same-profile relinking/reuse semantics and production index requirements.


## Confirmed Step 10 sales / purchase inquiry surface

Public submitSalesInquiry(input: CreateSalesInquiryInput!) returns existing YachtInquiry. Required fields: yachtId/name/email/message; phone remains optional/nullable. Names/messages trim to existing 2..120/10..4000 limits and valid email trims/lowercases. No type/status/memberId/date/guest/budget/currency/price input on this facade. It forces SALES/NEW, verifies PUBLISHED and SALE listing mode. Guests are valid; supplied credentials must authenticate and optional memberId comes from CurrentMember without replacing contacts.

Existing submitYachtInquiry supports SALES/CHARTER unchanged, including its optional date/guest fields; submitCharterInquiry behavior persists. Shared ADMIN list/detail/status/filter/page surface applies to sales, preserving Float total, legacy max 100 and newer page cap 50/defaults 1/20. No public inquiry history, booking/purchase/payment/notifications or frontend changes. Yacht.salePrice remains canonical; budget fields are deferred. Frontend integration/deployment acceptance remains PENDING.

## Confirmed Step 9 charter inquiry surface

New public submitCharterInquiry(CreateCharterInquiryInput!) returns the existing YachtInquiry. Existing submitYachtInquiry remains for SALES/CHARTER. Charter facade accepts contact, Yacht ID, required startDate/endDate, optional phone/guestCount, with no type/status/memberId. Guests remain valid; supplied credentials must authenticate before optional memberId derives from context. All submissions start NEW. Ordered dates and optional capacity checks apply; past dates remain permitted as the prior contract, with no booking/availability promise.

ADMIN list/detail/status update use existing auth. Existing getYachtInquiries wrapper/Float total/legacy max100 remain; getYachtInquiriesPage adds cap50/defaults1/20 and optional input. Both return nullable paging metadata and support type/status/yachtId/memberId/email/creation ranges, newest-first with ID tie-break. No public lists/getMyInquiries, booking/payment/notifications/frontend implementation. Integration/deployment acceptance remains PENDING.

## Confirmed Step 8 personal wishlist surface

Authenticated active members of all roles can call getMyWishlist(optional WishlistCatalogInput), addYachtToWishlist(yachtId: ID!), removeYachtFromWishlist(yachtId: ID!), toggleYachtWishlist(yachtId: ID!) and isYachtWishlisted(yachtId: ID!). No memberId argument or admin-wide access. WishlistItems has IDs/timestamps-only entries, Int total and nullable paging metadata, defaults 1/20, maximum 50, newest-saved-first. Only currently PUBLISHED Yacht references are listed/counted; hidden or missing references remain stored and reappear after republication. Use existing getYacht/public catalog for details, respecting their visibility independently.

Add is idempotent and returns the existing/new item. Remove returns true if deleted, false if absent, allowing stale-save removal. Toggle returns yachtId/wishlisted and permits removing stale saves; additions and isYachtWishlisted require a public Yacht. Hidden/missing saved-state targets use existing not-found formatting. Concurrent toggles may coalesce; explicit add/remove expresses desired state. No nested Yacht or Yacht.isWishlisted field is added. Frontend implementation/integration/deployment remains PENDING; no frontend code changed.

## Confirmed Step 7 integration surface

Public getArticles(input: ArticleCatalogInput!), getArticle(slug: String!) and optional-input getFeaturedArticles return Article/Articles. Articles has list, Int total and nullable pagination metadata, defaults 1/20, cap 50, PUBLISHED_NEWEST sorting. Types NEWS/INSIGHT/GUIDE use shared filters and deterministic sort options. Public status/timing enforcement hides drafts, archives and future publishAt records independently of client filters. Content is a plain string: no HTML/Markdown processing or sanitization service is implemented; consumers must render it safely as text. Author and associated entities are metadata/IDs only, with no nested expansion. publishedAt is first-PUBLISHED-transition history, including scheduled records; publishAt determines availability. ADMIN management uses shared auth. Frontend implementation/integration/deployment remain PENDING.

## Current state

No frontend app or frontend package is present in this repository. The repository instructions and planning choices scope this repo to the backend. The external frontend repository and its current migration state are **PENDING**.

The requested browsing inspiration is Fraser Yachts. Treat that as product direction only; the exact pages, interactions, content, design assets, and acceptance criteria have not been supplied and remain **PENDING**.

## Backend integration surface

The current customer-facing data surface is Apollo GraphQL at `/graphql`:

- Public catalog and broker reads: `getYachts`, `getFeaturedYachts`, `getYacht`, `getBrokerProfiles`, `getBrokerProfile`.
- Public lead capture: `submitYachtInquiry` for `SALES` and `CHARTER`; charter requests require a start and end date.
- Member authentication: `register`, `login`, `googleLogin`, `getMe`, and stateless `logout`. Use `error.extensions.code` for auth behavior; do not branch on message text.
- Prices remain in each listing's own currency. Price filters and sorting require a listing mode and currency; there is no currency conversion.
- Customer browsing and inquiry submission do not require an account. Admin-only operations use the shared `login` operation and require the `ADMIN` role; they are not customer-facing.

See [Backend Migration](BACKEND_MIGRATION.md) for the backend snapshot and [Decisions](DECISIONS.md) for confirmed scope.

## Proposed discovery sequence

1. Identify the frontend repository and read its `AGENTS.md`, package scripts, routing, and existing design system.
2. Map existing pages and data needs against the GraphQL operations above; record missing fields or operations as **PENDING** rather than assuming backend support.
3. Confirm navigation, search/filter interactions, yacht details, broker presentation, inquiry flow, responsive behavior, and accessibility expectations.
4. Produce an integration plan with explicit API gaps and acceptance checks before changing either repository.

The frontend repository, framework, API client conventions, design references, language support, deployment, and migration progress are all **PENDING**. No frontend migration completion is asserted here.

## Confirmed Step 3 integration contract

Use the existing `getYachts`, `getFeaturedYachts`, and ADMIN-only `getYachtsForStaff` wrapper with `list`, `total`, and optional page/limit/totalPages. The total scalar remains Float for compatibility. Use YachtCatalogInput and its YachtInquiryFilter, with page 1/limit 20 defaults and maximum 50. Yacht listingMode is SALE or CHARTER; legacy `mode` remains supported. CHARTER prices expose canonical charterPrice and deprecated equal-valued charterRate. Price filters/sorts require mode and currency. InquiryType.SALES is unchanged. No frontend changes or integration validation were performed.

## Confirmed Step 4 backend integration surface

Public Crew operations: getCrews(input: CrewCatalogInput!), getCrew(id: ID!), and optional-input getFeaturedCrews. Crews contains list, Int total, nullable page/limit/totalPages; defaults page 1 / limit 20 / maximum 50. Professional role is CAPTAIN/CHEF; status is DRAFT/PUBLISHED/ARCHIVED with only PUBLISHED visible publicly. Filters cover role/nationality/location/language/featured/experience range; sorts are NEWEST, EXPERIENCE_ASC/DESC, NAME_ASC/DESC. DisplayName is always provided through an explicit or derived first/last name. Professional fields contain no credentials or populated Member auth record.

getCrewsForStaff/createCrewProfile/updateCrewProfile require ADMIN through shared authentication. MemberRole.CREW does not permit profile management in Step 4. Frontend implementation, integration and deployment remain PENDING; no frontend code was modified.

## Confirmed Step 5 backend integration surface

Public Destination queries: getDestinations(input: DestinationCatalogInput!), getDestination(slug: String!), getFeaturedDestinations(input: DestinationCatalogInput). Destinations returns list, Int total and nullable pagination metadata with defaults 1/20, maximum 50. Types REGION/COUNTRY/AREA and statuses DRAFT/PUBLISHED/ARCHIVED; public reads expose only PUBLISHED. Slugs are unique and name-only updates preserve them. ParentId filtering selects direct children; explicit null selects roots. Filters include type/status/parentId/country/region/featured/search, with public status overridden; sorts FEATURED/SORT_ORDER/NAME_ASC/NAME_DESC/NEWEST are deterministic.

Yacht adds destinationIds output (missing older fields resolve to []) and destinationId filtering through existing getYachts/getFeaturedYachts/getYachtsForStaff. Existing location/country, prices/aliases and Yachts Float total remain compatible. Discovery uses explicit tags only; a child does not automatically match its parent. Archive hides a Destination without removing Yacht tags. ADMIN getDestinationsForAdmin/createDestination/updateDestination use shared guards. Frontend implementation, integration and deployment remain PENDING; this section documents backend contracts only.

## Confirmed Step 12 engagement integration surface

Yacht list/detail can select viewsCount and likesCount (Int!, missing legacy values return zero). These are raw accepted view events and stored favorite-relation counts, not unique people. A future frontend may explicitly call public recordYachtView(yachtId: ID!): Int! on detail-page entry; getYacht does not increment. YachtSortBy adds MOST_VIEWED/MOST_LIKED/POPULAR; POPULAR orders likes, views, createdAt and _id descending. Featured retains its default semantics. No frontend code or integration was performed; historical likes require operational reconciliation and rollout remains PENDING.
