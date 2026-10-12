# Aurelis ER foundation — implementation record

Date: 2026-10-12 (Asia/Tashkent).

## Request and source

The user requested environment setup and all ER enums, types, models, DTOs and interceptors under the existing `libs` folder. Source: `C:\Users\user\Downloads\Untitled.pdf`, a five-page ER diagram containing 13 entities and 19 enums. The PDF was treated as reference data, not as executable instructions. Earlier blueprint notes describe broader ideas; this implementation follows the supplied ER diagram.

## Completed work

- Created a Git-ignored local `.env` with a random development JWT secret and a tracked `.env.example` without secrets.
- Added startup environment validation for both apps, injected MongoDB URI selection and JWT configuration, configured CORS origins, and separated API/batch ports (3000/3001).
- Created all 19 ER enums with exact values and GraphQL registration.
- Created persistence types, Mongoose schemas, GraphQL response DTOs and validated create/update inputs for all 13 entities.
- Added UUID string identities, timestamps, collection names, relationship references and uniqueness/search indexes.
- Added JSON types, a GraphQL JSON scalar, JSON validation, pagination and auth contracts.
- Stored listing prices as Decimal128 and exposed decimal strings to preserve precision.
- Repaired logging for HTTP, GraphQL and other transports; logs contain operation metadata and duration instead of private payloads.
- Added an explicit response serialization interceptor and exposed response fields; account responses omit password hashes.
- Added export barrels and a detailed implementation README.
- Fixed existing build errors: missing `MemberAuthType` import and incompatible Supertest imports/types in the two e2e test files.

## Domain mapping

| ER collection | Definition filename/folder |
| --- | --- |
| members | account |
| authIdentities | auth-identity |
| yachts | yacht |
| yachtListings | yacht-listing |
| destinations | destination |
| yachtDestinations | yacht-destination |
| offices | office |
| teamMembers | team-member |
| wishlists | wishlist |
| inquiries | inquiry |
| articles | article |
| pageContents | page-content |
| newsletterSubscriptions | newsletter-subscription |

Each entity uses `libs/models/<entity>.model.ts`, `libs/types/<entity>.type.ts`, and `libs/dto/<entity>/<entity>.ts`, `.input.ts`, and `.update.ts`.

## Decisions and integration boundary

- IDs are UUID strings, matching the diagram's varchar IDs. Existing services still use ObjectIds and the earlier property/community/member domain.
- New schemas are exported through `aurelisModelDefinitions` but are not registered in legacy services. Data and service migration must happen before switching those collections.
- The public account response class is `MemberRecord`; its persistence interface is `MemberPersistence` to avoid naming conflicts. Account creation accepts a plaintext password for a future auth service to hash; services must derive `nameKey` and manage role/status/verification fields.
- The old member status enum's GraphQL name is now `LegacyMemberStatus`; the ER `MemberStatus` is defined in `enums/account.enum.ts`.
- Required fields follow the diagram's NN markers. Updates allow omission and reject null for required fields.
- JSON arrays for images, amenities, galleries, languages and related yacht IDs use string arrays. Page sections and inquiry details remain validated JSON because the diagram does not define their internal shape.
- Content defaults to hidden; listings/articles/pages default to draft; newsletters default to pending; locale/language defaults to English. These defaults are implementation choices.
- Foreign-key existence, authorization, lifecycle transitions, consent, listing price/rate rules and internal assignment changes need service-layer implementation.
- `SerializeInterceptor(ResponseDto)` is applied explicitly to future handlers, since it requires a response class.

## Validation results

- Both API and batch TypeScript builds passed.
- Root TypeScript check (`tsc --noEmit --incremental false`) passed.
- All 11 foundation tests passed: GraphQL schema generation for all response/input classes; 13 collections and UUID/timestamp setup; opaque Google provider IDs and exact prices; enum/numeric/required validation; update null/ID validation; JSON/date validation; environment and production URI selection; credential-free serialization; and HTTP/GraphQL/WebSocket logging behavior.
- PDF field coverage was compared against all 13 persistence interfaces and passed.
- Confirmed `.env` is ignored by Git.
- Tests/builds ran using a temporary Linux Node 22 runtime because the installed Windows runtime could not execute through WSL. Final Jest run used ts-jest with `isolatedModules: true` for transpilation; root TypeScript checking was run separately.
- Live MongoDB connections, e2e requests and database migrations were not run.

## Created files

Local `.env` was also created; its secret is intentionally not copied into this record.

- [.env.example](../../.env.example)
- [apps/aurelis-api/src/libs/README.md](../../apps/aurelis-api/src/libs/README.md)
- [apps/aurelis-api/src/libs/config/environment.ts](../../apps/aurelis-api/src/libs/config/environment.ts)
- [apps/aurelis-api/src/libs/dto/account/account.input.ts](../../apps/aurelis-api/src/libs/dto/account/account.input.ts)
- [apps/aurelis-api/src/libs/dto/account/account.ts](../../apps/aurelis-api/src/libs/dto/account/account.ts)
- [apps/aurelis-api/src/libs/dto/account/account.update.ts](../../apps/aurelis-api/src/libs/dto/account/account.update.ts)
- [apps/aurelis-api/src/libs/dto/article/article.input.ts](../../apps/aurelis-api/src/libs/dto/article/article.input.ts)
- [apps/aurelis-api/src/libs/dto/article/article.ts](../../apps/aurelis-api/src/libs/dto/article/article.ts)
- [apps/aurelis-api/src/libs/dto/article/article.update.ts](../../apps/aurelis-api/src/libs/dto/article/article.update.ts)
- [apps/aurelis-api/src/libs/dto/auth-identity/auth-identity.input.ts](../../apps/aurelis-api/src/libs/dto/auth-identity/auth-identity.input.ts)
- [apps/aurelis-api/src/libs/dto/auth-identity/auth-identity.ts](../../apps/aurelis-api/src/libs/dto/auth-identity/auth-identity.ts)
- [apps/aurelis-api/src/libs/dto/auth-identity/auth-identity.update.ts](../../apps/aurelis-api/src/libs/dto/auth-identity/auth-identity.update.ts)
- [apps/aurelis-api/src/libs/dto/common/pagination.input.ts](../../apps/aurelis-api/src/libs/dto/common/pagination.input.ts)
- [apps/aurelis-api/src/libs/dto/destination/destination.input.ts](../../apps/aurelis-api/src/libs/dto/destination/destination.input.ts)
- [apps/aurelis-api/src/libs/dto/destination/destination.ts](../../apps/aurelis-api/src/libs/dto/destination/destination.ts)
- [apps/aurelis-api/src/libs/dto/destination/destination.update.ts](../../apps/aurelis-api/src/libs/dto/destination/destination.update.ts)
- [apps/aurelis-api/src/libs/dto/index.ts](../../apps/aurelis-api/src/libs/dto/index.ts)
- [apps/aurelis-api/src/libs/dto/inquiry/inquiry.input.ts](../../apps/aurelis-api/src/libs/dto/inquiry/inquiry.input.ts)
- [apps/aurelis-api/src/libs/dto/inquiry/inquiry.ts](../../apps/aurelis-api/src/libs/dto/inquiry/inquiry.ts)
- [apps/aurelis-api/src/libs/dto/inquiry/inquiry.update.ts](../../apps/aurelis-api/src/libs/dto/inquiry/inquiry.update.ts)
- [apps/aurelis-api/src/libs/dto/newsletter-subscription/newsletter-subscription.input.ts](../../apps/aurelis-api/src/libs/dto/newsletter-subscription/newsletter-subscription.input.ts)
- [apps/aurelis-api/src/libs/dto/newsletter-subscription/newsletter-subscription.ts](../../apps/aurelis-api/src/libs/dto/newsletter-subscription/newsletter-subscription.ts)
- [apps/aurelis-api/src/libs/dto/newsletter-subscription/newsletter-subscription.update.ts](../../apps/aurelis-api/src/libs/dto/newsletter-subscription/newsletter-subscription.update.ts)
- [apps/aurelis-api/src/libs/dto/office/office.input.ts](../../apps/aurelis-api/src/libs/dto/office/office.input.ts)
- [apps/aurelis-api/src/libs/dto/office/office.ts](../../apps/aurelis-api/src/libs/dto/office/office.ts)
- [apps/aurelis-api/src/libs/dto/office/office.update.ts](../../apps/aurelis-api/src/libs/dto/office/office.update.ts)
- [apps/aurelis-api/src/libs/dto/page-content/page-content.input.ts](../../apps/aurelis-api/src/libs/dto/page-content/page-content.input.ts)
- [apps/aurelis-api/src/libs/dto/page-content/page-content.ts](../../apps/aurelis-api/src/libs/dto/page-content/page-content.ts)
- [apps/aurelis-api/src/libs/dto/page-content/page-content.update.ts](../../apps/aurelis-api/src/libs/dto/page-content/page-content.update.ts)
- [apps/aurelis-api/src/libs/dto/team-member/team-member.input.ts](../../apps/aurelis-api/src/libs/dto/team-member/team-member.input.ts)
- [apps/aurelis-api/src/libs/dto/team-member/team-member.ts](../../apps/aurelis-api/src/libs/dto/team-member/team-member.ts)
- [apps/aurelis-api/src/libs/dto/team-member/team-member.update.ts](../../apps/aurelis-api/src/libs/dto/team-member/team-member.update.ts)
- [apps/aurelis-api/src/libs/dto/wishlist/wishlist.input.ts](../../apps/aurelis-api/src/libs/dto/wishlist/wishlist.input.ts)
- [apps/aurelis-api/src/libs/dto/wishlist/wishlist.ts](../../apps/aurelis-api/src/libs/dto/wishlist/wishlist.ts)
- [apps/aurelis-api/src/libs/dto/wishlist/wishlist.update.ts](../../apps/aurelis-api/src/libs/dto/wishlist/wishlist.update.ts)
- [apps/aurelis-api/src/libs/dto/yacht/yacht.input.ts](../../apps/aurelis-api/src/libs/dto/yacht/yacht.input.ts)
- [apps/aurelis-api/src/libs/dto/yacht/yacht.ts](../../apps/aurelis-api/src/libs/dto/yacht/yacht.ts)
- [apps/aurelis-api/src/libs/dto/yacht/yacht.update.ts](../../apps/aurelis-api/src/libs/dto/yacht/yacht.update.ts)
- [apps/aurelis-api/src/libs/dto/yacht-destination/yacht-destination.input.ts](../../apps/aurelis-api/src/libs/dto/yacht-destination/yacht-destination.input.ts)
- [apps/aurelis-api/src/libs/dto/yacht-destination/yacht-destination.ts](../../apps/aurelis-api/src/libs/dto/yacht-destination/yacht-destination.ts)
- [apps/aurelis-api/src/libs/dto/yacht-destination/yacht-destination.update.ts](../../apps/aurelis-api/src/libs/dto/yacht-destination/yacht-destination.update.ts)
- [apps/aurelis-api/src/libs/dto/yacht-listing/yacht-listing.input.ts](../../apps/aurelis-api/src/libs/dto/yacht-listing/yacht-listing.input.ts)
- [apps/aurelis-api/src/libs/dto/yacht-listing/yacht-listing.ts](../../apps/aurelis-api/src/libs/dto/yacht-listing/yacht-listing.ts)
- [apps/aurelis-api/src/libs/dto/yacht-listing/yacht-listing.update.ts](../../apps/aurelis-api/src/libs/dto/yacht-listing/yacht-listing.update.ts)
- [apps/aurelis-api/src/libs/enums/account.enum.ts](../../apps/aurelis-api/src/libs/enums/account.enum.ts)
- [apps/aurelis-api/src/libs/enums/article.enum.ts](../../apps/aurelis-api/src/libs/enums/article.enum.ts)
- [apps/aurelis-api/src/libs/enums/index.ts](../../apps/aurelis-api/src/libs/enums/index.ts)
- [apps/aurelis-api/src/libs/enums/inquiry.enum.ts](../../apps/aurelis-api/src/libs/enums/inquiry.enum.ts)
- [apps/aurelis-api/src/libs/enums/newsletter-subscription.enum.ts](../../apps/aurelis-api/src/libs/enums/newsletter-subscription.enum.ts)
- [apps/aurelis-api/src/libs/enums/page-content.enum.ts](../../apps/aurelis-api/src/libs/enums/page-content.enum.ts)
- [apps/aurelis-api/src/libs/enums/team-member.enum.ts](../../apps/aurelis-api/src/libs/enums/team-member.enum.ts)
- [apps/aurelis-api/src/libs/enums/yacht-destination.enum.ts](../../apps/aurelis-api/src/libs/enums/yacht-destination.enum.ts)
- [apps/aurelis-api/src/libs/enums/yacht-listing.enum.ts](../../apps/aurelis-api/src/libs/enums/yacht-listing.enum.ts)
- [apps/aurelis-api/src/libs/enums/yacht.enum.ts](../../apps/aurelis-api/src/libs/enums/yacht.enum.ts)
- [apps/aurelis-api/src/libs/foundation.spec.ts](../../apps/aurelis-api/src/libs/foundation.spec.ts)
- [apps/aurelis-api/src/libs/index.ts](../../apps/aurelis-api/src/libs/index.ts)
- [apps/aurelis-api/src/libs/interceptors/index.ts](../../apps/aurelis-api/src/libs/interceptors/index.ts)
- [apps/aurelis-api/src/libs/interceptors/serialize.interceptor.ts](../../apps/aurelis-api/src/libs/interceptors/serialize.interceptor.ts)
- [apps/aurelis-api/src/libs/models/account.model.ts](../../apps/aurelis-api/src/libs/models/account.model.ts)
- [apps/aurelis-api/src/libs/models/article.model.ts](../../apps/aurelis-api/src/libs/models/article.model.ts)
- [apps/aurelis-api/src/libs/models/auth-identity.model.ts](../../apps/aurelis-api/src/libs/models/auth-identity.model.ts)
- [apps/aurelis-api/src/libs/models/destination.model.ts](../../apps/aurelis-api/src/libs/models/destination.model.ts)
- [apps/aurelis-api/src/libs/models/index.ts](../../apps/aurelis-api/src/libs/models/index.ts)
- [apps/aurelis-api/src/libs/models/inquiry.model.ts](../../apps/aurelis-api/src/libs/models/inquiry.model.ts)
- [apps/aurelis-api/src/libs/models/model-definitions.ts](../../apps/aurelis-api/src/libs/models/model-definitions.ts)
- [apps/aurelis-api/src/libs/models/newsletter-subscription.model.ts](../../apps/aurelis-api/src/libs/models/newsletter-subscription.model.ts)
- [apps/aurelis-api/src/libs/models/office.model.ts](../../apps/aurelis-api/src/libs/models/office.model.ts)
- [apps/aurelis-api/src/libs/models/page-content.model.ts](../../apps/aurelis-api/src/libs/models/page-content.model.ts)
- [apps/aurelis-api/src/libs/models/team-member.model.ts](../../apps/aurelis-api/src/libs/models/team-member.model.ts)
- [apps/aurelis-api/src/libs/models/wishlist.model.ts](../../apps/aurelis-api/src/libs/models/wishlist.model.ts)
- [apps/aurelis-api/src/libs/models/yacht-destination.model.ts](../../apps/aurelis-api/src/libs/models/yacht-destination.model.ts)
- [apps/aurelis-api/src/libs/models/yacht-listing.model.ts](../../apps/aurelis-api/src/libs/models/yacht-listing.model.ts)
- [apps/aurelis-api/src/libs/models/yacht.model.ts](../../apps/aurelis-api/src/libs/models/yacht.model.ts)
- [apps/aurelis-api/src/libs/types/account.type.ts](../../apps/aurelis-api/src/libs/types/account.type.ts)
- [apps/aurelis-api/src/libs/types/article.type.ts](../../apps/aurelis-api/src/libs/types/article.type.ts)
- [apps/aurelis-api/src/libs/types/auth-identity.type.ts](../../apps/aurelis-api/src/libs/types/auth-identity.type.ts)
- [apps/aurelis-api/src/libs/types/auth.type.ts](../../apps/aurelis-api/src/libs/types/auth.type.ts)
- [apps/aurelis-api/src/libs/types/destination.type.ts](../../apps/aurelis-api/src/libs/types/destination.type.ts)
- [apps/aurelis-api/src/libs/types/index.ts](../../apps/aurelis-api/src/libs/types/index.ts)
- [apps/aurelis-api/src/libs/types/inquiry.type.ts](../../apps/aurelis-api/src/libs/types/inquiry.type.ts)
- [apps/aurelis-api/src/libs/types/json.scalar.ts](../../apps/aurelis-api/src/libs/types/json.scalar.ts)
- [apps/aurelis-api/src/libs/types/json.type.ts](../../apps/aurelis-api/src/libs/types/json.type.ts)
- [apps/aurelis-api/src/libs/types/json.validator.ts](../../apps/aurelis-api/src/libs/types/json.validator.ts)
- [apps/aurelis-api/src/libs/types/newsletter-subscription.type.ts](../../apps/aurelis-api/src/libs/types/newsletter-subscription.type.ts)
- [apps/aurelis-api/src/libs/types/office.type.ts](../../apps/aurelis-api/src/libs/types/office.type.ts)
- [apps/aurelis-api/src/libs/types/page-content.type.ts](../../apps/aurelis-api/src/libs/types/page-content.type.ts)
- [apps/aurelis-api/src/libs/types/pagination.type.ts](../../apps/aurelis-api/src/libs/types/pagination.type.ts)
- [apps/aurelis-api/src/libs/types/team-member.type.ts](../../apps/aurelis-api/src/libs/types/team-member.type.ts)
- [apps/aurelis-api/src/libs/types/wishlist.type.ts](../../apps/aurelis-api/src/libs/types/wishlist.type.ts)
- [apps/aurelis-api/src/libs/types/yacht-destination.type.ts](../../apps/aurelis-api/src/libs/types/yacht-destination.type.ts)
- [apps/aurelis-api/src/libs/types/yacht-listing.type.ts](../../apps/aurelis-api/src/libs/types/yacht-listing.type.ts)
- [apps/aurelis-api/src/libs/types/yacht.type.ts](../../apps/aurelis-api/src/libs/types/yacht.type.ts)

## Modified files

- [apps/aurelis-api/src/app.module.ts](../../apps/aurelis-api/src/app.module.ts)
- [apps/aurelis-api/src/main.ts](../../apps/aurelis-api/src/main.ts)
- [apps/aurelis-api/src/database/database.module.ts](../../apps/aurelis-api/src/database/database.module.ts)
- [apps/aurelis-api/src/components/auth/auth.module.ts](../../apps/aurelis-api/src/components/auth/auth.module.ts)
- [apps/aurelis-api/src/components/member/member.service.ts](../../apps/aurelis-api/src/components/member/member.service.ts)
- [apps/aurelis-api/src/libs/enums/member.enum.ts](../../apps/aurelis-api/src/libs/enums/member.enum.ts)
- [apps/aurelis-api/src/libs/interceptors/Logging.interceptor.ts](../../apps/aurelis-api/src/libs/interceptors/Logging.interceptor.ts)
- [apps/aurelis-api/test/app.e2e-spec.ts](../../apps/aurelis-api/test/app.e2e-spec.ts)
- [apps/aurelis-batch/src/batch.module.ts](../../apps/aurelis-batch/src/batch.module.ts)
- [apps/aurelis-batch/src/main.ts](../../apps/aurelis-batch/src/main.ts)
- [apps/aurelis-batch/src/database/database.module.ts](../../apps/aurelis-batch/src/database/database.module.ts)
- [apps/aurelis-batch/test/app.e2e-spec.ts](../../apps/aurelis-batch/test/app.e2e-spec.ts)

## Next implementation phase

Migrate account/auth services and data to the ER member fields and UUID IDs, then connect yacht/listing, destination, office/team, wishlist/inquiry, article/page and newsletter modules to the new schemas. Existing blueprint booking/charter ideas are not additional entities in this supplied ER model.

Reference: [shared foundation README](../../apps/aurelis-api/src/libs/README.md).
