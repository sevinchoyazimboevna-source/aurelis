# Frontend Migration

## Current state

No frontend app or frontend package is present in this repository. The repository instructions and planning choices scope this repo to the backend. The external frontend repository and its current migration state are **PENDING**.

The requested browsing inspiration is Fraser Yachts. Treat that as product direction only; the exact pages, interactions, content, design assets, and acceptance criteria have not been supplied and remain **PENDING**.

## Backend integration surface

The current customer-facing data surface is Apollo GraphQL at `/graphql`:

- Public catalog and broker reads: `getYachts`, `getFeaturedYachts`, `getYacht`, `getBrokerProfiles`, `getBrokerProfile`.
- Public lead capture: `submitYachtInquiry` for `SALES` and `CHARTER`; charter requests require a start and end date.
- Prices remain in each listing's own currency. Price filters and sorting require a listing mode and currency; there is no currency conversion.
- Customer browsing and inquiry submission do not require an account. `staffLogin` is for staff access; admin operations are not customer-facing.

See [Backend Migration](BACKEND_MIGRATION.md) for the backend snapshot and [Decisions](DECISIONS.md) for confirmed scope.

## Proposed discovery sequence

1. Identify the frontend repository and read its `AGENTS.md`, package scripts, routing, and existing design system.
2. Map existing pages and data needs against the GraphQL operations above; record missing fields or operations as **PENDING** rather than assuming backend support.
3. Confirm navigation, search/filter interactions, yacht details, broker presentation, inquiry flow, responsive behavior, and accessibility expectations.
4. Produce an integration plan with explicit API gaps and acceptance checks before changing either repository.

The frontend repository, framework, API client conventions, design references, language support, deployment, and migration progress are all **PENDING**. No frontend migration completion is asserted here.
