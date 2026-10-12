# Aurelis ER foundation

Definitions follow `Untitled.pdf` (13 collections and 19 enums). This folder is the shared foundation for the API and batch apps.

| Folder | Purpose |
| --- | --- |
| `config/environment.ts` | Validated application environment and database URI selection |
| `enums` | Exact ER enum values, registered for GraphQL |
| `types` | Persistence records, auth contracts, pagination and JSON value types |
| `dto` | GraphQL response classes and validated create/update inputs |
| `models` | Mongoose schemas, references, indexes and model definitions |
| `interceptors` | HTTP/GraphQL operation logging and explicit DTO serialization |

## Entities

`account` represents the ER `members` collection. The remaining entities are `auth-identity`, `yacht`, `yacht-listing`, `destination`, `yacht-destination`, `office`, `team-member`, `wishlist`, `inquiry`, `article`, `page-content`, and `newsletter-subscription`.

Each entity has a persistence type, schema, response DTO, create input and update input. `MemberPersistence` includes the optional password hash; the public `MemberRecord` response never includes it. Account creation accepts plaintext `password` for a future auth service to hash, and does not accept privileged role/status or verification fields. Services must derive `nameKey` from the account name. Inquiry assignment and newsletter confirmation/status changes also belong to services rather than public create inputs.

## Environment

A local `.env` is generated with a random development JWT secret, ports 3000/3001, and MongoDB at `mongodb://127.0.0.1:27017/aurelis`. It is ignored by Git. `.env.example` documents all settings; replace its blank secret when setting up another machine. `.env.local` overrides `.env`.

Both apps validate configuration at startup. Production requires `MONGO_PROD`. JWT configuration uses Nest's injected `ConfigService` after environment loading. Run MongoDB separately before starting either application.

## Storage conventions

- ER `varchar` IDs use UUID strings, including references. The old services use ObjectIds and require explicit migration before using these schemas.
- Required fields follow the diagram's `NN` markers. Missing update fields leave values unchanged; null is rejected for required fields.
- `createdAt` and `updatedAt` are managed by Mongoose timestamps.
- Listing `price` is stored as MongoDB Decimal128 and exposed/accepted as a decimal string, such as `"125000.50"`, to preserve precision. Measurements use finite JavaScript numbers.
- JSON image/amenity/gallery/language/yacht-ID arrays are modeled as string arrays. Inquiry details and page sections retain validated JSON values because the PDF does not specify their internal structure.
- Defaults (hidden content, draft listings/articles/pages, pending newsletter subscriptions, English locale) are implementation choices. Enum values come directly from the PDF.
- Indexes enforce unique slugs, normalized account names, provider identities, wishlist pairs, yacht/destination/season triples, page/locale pairs, newsletter emails and optional one-to-one staff accounts.
- Mongoose references do not enforce foreign-key existence. Migrated services must enforce relationships, authorization, consent, listing price/rate rules and valid lifecycle transitions.

## Integration boundary

Existing `schemas`, property/community DTOs, and member services still implement the earlier application. New ER schemas are available through `aurelisModelDefinitions` but are deliberately not registered against the running legacy collections. Register the relevant definitions with `MongooseModule.forFeature(...)` when replacing each service. Do not register the old and new member schemas against the same collection until data migration is handled.

The ER enum is exported from `enums/account.enum.ts`. The old member enum remains at `enums/member.enum.ts`, with the GraphQL status name `LegacyMemberStatus` to avoid colliding with the ER `MemberStatus`. Public handlers can use `SerializeInterceptor(ResponseDto)` to strip undeclared response fields; new response DTOs include `@Expose()` metadata. This interceptor is not global because it needs a specific response type.

New endpoint/resolver implementations and database migrations are subsequent work; this phase establishes the requested environment and shared definitions.
