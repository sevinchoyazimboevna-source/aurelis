# Aurelis

Aurelis is a NestJS monorepo containing a GraphQL API and a scheduled batch worker for a luxury-yacht platform.

## Applications

- `aurelis-api` — GraphQL API, WebSocket support, authentication, and file uploads.
- `aurelis-batch` — scheduled jobs that recalculate listing and broker rankings.

## AURELIS yacht contracts

The migration-ready yacht DTO and enum contracts live under `apps/aurelis-api/src/libs/dto/yacht` and `apps/aurelis-api/src/libs/enums/yacht.enum.ts`. They define the yacht fields (`yachtName`, specifications, capacity, price, location, media, lifecycle, and listing type), yacht search/pagination inputs, and these GraphQL enums:

- `YachtType`
- `YachtStatus`
- `YachtListingType` (`SALE`, `CHARTER`)
- `YachtCurrency` (`EUR`, `USD`, `GBP`)
- `YachtPricePeriod` (`DAY`, `WEEK`)

`BROKER`, `YACHT`, and `JOURNAL` compatibility enum aliases were added for member roles and the existing like/view/comment/notification groups. `User`, `Broker`, and Journal TypeScript aliases are available alongside the existing DTOs.

### Current compatibility boundary

The active API still has a property-prefixed resolver, service, and Mongo schema. Those layers directly query and persist `property*` keys, so renaming their live DTO fields to `yacht*` without a mapping/migration layer would make the API return undefined yacht fields and persist data that its queries do not read. Per the scope of this change, those files are unchanged; therefore the new yacht classes are abstract GraphQL contracts, ready to be wired during a dedicated resolver/service/schema migration.

Pagination, filters, sorting, likes, views, favorites, and follows remain represented in the yacht contracts and retain the existing API conventions. The WebSocket chat gateway and all chat behavior are intentionally untouched.

## Setup

1. Install dependencies: `npm install`
2. Review `.env` and provide MongoDB connection strings and a strong `SECRET_TOKEN`.
3. Run the API: `npm run start:dev`
4. Run the batch worker separately: `npm run start:dev:batch`

The API listens on `PORT_API` (default `3000`); the batch worker uses `PORT_BATCH` (default `3001`).

## Commands

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
npm run start:prod
npm run start:prod:batch
```

## Environment

Copy the supplied values in `.env.example` into `.env` when setting up another environment. Never commit real database URIs or signing secrets.
