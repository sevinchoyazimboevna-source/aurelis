# Aurelis Backend Agent Instructions

Aurelis is a global yacht sales and charter platform. This repository contains the NestJS backend only. Public catalog browsing and yacht inquiries do not require an account; internal inventory and inquiry operations require an active `ADMIN` member.

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
