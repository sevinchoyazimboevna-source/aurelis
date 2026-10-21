# Aurelis development guide

## Project conventions

- Keep the API in `apps/aurelis-api` and background jobs in `apps/aurelis-batch`.
- Use TypeScript and NestJS modules, services, resolvers, and DTOs consistently with the existing structure.
- Put sensitive configuration only in environment variables; do not hard-code credentials or tokens.
- Run `npm run build` after changes that affect application configuration, imports, or types.

## Environment variables

`NODE_ENV`, `MONGO_DEV`, `MONGO_PROD`, `SECRET_TOKEN`, `PORT_API`, and `PORT_BATCH` are defined in `.env.example`. Add new variables there with a safe placeholder and document their purpose in the README when they are required for local setup.

## Naming

Use `aurelis` for repository, application, and user-facing product names. The Nest application identifiers are `aurelis-api` and `aurelis-batch`.

## AURELIS yacht contract conventions

- Keep yacht-domain contracts in `apps/aurelis-api/src/libs/dto/yacht` and `apps/aurelis-api/src/libs/enums/yacht.enum.ts`.
- Use `YachtType`, `YachtStatus`, `YachtListingType`, `YachtCurrency`, and `YachtPricePeriod` for new yacht contracts. A sale or charter listing must use `YachtListingType`; charter pricing may additionally use `YachtPricePeriod`.
- Yacht DTOs use `yacht*` keys: identity/content, technical specifications, capacity, pricing, location/media, status, and listing type. Preserve `page`, `limit`, `sort`, `direction`, counters, favorites, likes, views, and follows when extending those contracts.
- `BROKER`, `YACHT`, and `JOURNAL` aliases bridge AURELIS language to existing persisted `AGENT`, `PROPERTY`, and `ARTICLE` values. Do not remove the legacy values until the corresponding data migration is complete.
- The active property resolver/service/schema currently access `property*` keys directly. Do not attach a yacht DTO to those endpoints, or rename their live fields, without a coordinated resolver, service, schema, database, and client migration.
- Chat is outside the yacht domain. Do not alter the WebSocket gateway, events, socket modules, or chat payload types as part of this work.
