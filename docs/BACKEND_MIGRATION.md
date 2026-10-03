# Backend Migration

> Snapshot of code and configuration visible in this repository. This document does not establish deployment, data migration, or release acceptance.

## Current architecture

- `aurelis-api` is a NestJS 10 application. It serves Apollo GraphQL at `/graphql`, generates its schema at runtime, and enables the GraphQL playground outside production. The root HTTP route is a health greeting.
- `aurelis-batch` currently serves a root health response with `status: idle` and `scheduledJobs: 0`. No scheduled job is registered.
- Both applications use MongoDB/Mongoose where needed. The API reads `MONGODB_URI`; authentication requires `JWT_SECRET`.
- There is no frontend application in this repository. See [Frontend Migration](FRONTEND_MIGRATION.md).

## Implemented backend capabilities

- The public yacht catalog supports sales and charter listings, featured results, detail queries, text and specification filters, pagination, sorting, and per-listing currencies. Price filters and sorting are scoped by listing mode and currency; the API does not convert currencies.
- Broker profiles have public read operations and an admin-only save operation.
- Public users can submit yacht inquiries without an account. Sales and charter inquiries are persisted; charter submissions require dates. Admins can list inquiries and update their status.
- Staff login accepts active `ADMIN` accounts. Yacht inventory, broker writes, and inquiry review require the `ADMIN` role. The first administrator is provisioned offline with `scripts/create-admin.js`.

## Persistence and interfaces

| Collection | Purpose |
| --- | --- |
| `yachts` | Sales and charter inventory |
| `brokerProfiles` | Broker information associated with yachts |
| `yachtInquiries` | Sales and charter leads and their staff status |
| `members` | Staff account and role data |

GraphQL operations currently include `getYachts`, `getFeaturedYachts`, `getYacht`, broker reads, `staffLogin`, `submitYachtInquiry`, admin inventory writes, and admin inquiry review. The batch app's HTTP health route remains `/`.

The API listens on `AURELIS_API_PORT` (default `3000`) and still accepts `PORT_API` as a fallback. The batch app listens on `AURELIS_BATCH_PORT` (default `3001`) and accepts `PORT_BATCH` as a fallback. See [.env.example](../.env.example) and the [README](../README.md); do not copy secret values into this document.

## Migration and rollout status

- The current source contains the Aurelis yacht, broker, staff-authentication, and inquiry features described above.
- Whether these features have been deployed, accepted, or populated with production data: **PENDING**.
- Whether any legacy real-estate data exists elsewhere or requires archival: **PENDING**. The confirmed product plan is a fresh Aurelis launch without property-data migration; this is not evidence that an external database has been changed.
- Original linked migration documents were not available in the workspace or conversation. Their contents and historical task status: **PENDING**.

For repository conventions, follow [`AGENTS.md`](../AGENTS.md). For recorded choices, see [Decisions](DECISIONS.md).
