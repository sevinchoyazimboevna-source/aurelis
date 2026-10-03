# Aurelis Backend

NestJS GraphQL backend for a global yacht sales and charter catalog. This repository does not contain the customer facing website.

## Services

- `aurelis-api`: GraphQL catalog, broker, inquiry, staff authentication, and staff operations.
- `aurelis-batch`: retained as a health endpoint for future maintenance jobs. No scheduled jobs run currently.

The API uses MongoDB through Mongoose and generates its GraphQL schema at runtime. The GraphQL playground is available outside production.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` and a long random `JWT_SECRET`.
3. Run the API with `npm run start:dev` or the batch health app with `npm run start:dev:batch`.

The API listens on `AURELIS_API_PORT` (default `3000`); the batch health app listens on `AURELIS_BATCH_PORT` (default `3001`). Legacy `PORT_API` and `PORT_BATCH` remain supported as fallbacks. The GraphQL endpoint remains `/graphql`.

## Staff access

Customers can browse the public catalog and submit inquiries without accounts. The API intentionally exposes no public customer signup. Create the first staff account offline using the provisioning command below; provide its password through the environment, never a committed file:

```powershell
$env:MONGODB_URI = 'your-mongodb-uri'
$env:AURELIS_ADMIN_NICK = 'staff-admin'
$env:AURELIS_ADMIN_PHONE = '+10000000000'
$env:AURELIS_ADMIN_PASSWORD = 'use-a-strong-unique-password'
node scripts/create-admin.js
```

Staff authenticate through the `staffLogin` GraphQL mutation. Only active members with the `ADMIN` role can manage yacht inventory, broker profiles, or inquiry status.

## GraphQL operations

- Public catalog: `getYachts`, `getFeaturedYachts`, `getYacht`, `getBrokerProfiles`, `getBrokerProfile`.
- Public lead capture: `submitYachtInquiry` with `SALES` or `CHARTER`. Charter inquiries require start and end dates.
- Admin inventory: `getYachtsForStaff`, `createYacht`, `updateYacht`, `saveBrokerProfile`.
- Admin inquiry operations: `getYachtInquiries`, `updateYachtInquiry`.

Listing prices retain their original currency. Price filtering or sorting requires a listing mode and ISO currency code; the API does not perform foreign exchange conversion.

## Build and checks

```bash
npm run build
npm test -- --runInBand
```

See `AGENTS.md` for domain and implementation conventions.
