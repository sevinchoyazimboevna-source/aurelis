# Aurelis Project Notes

## Rebrand status

The monorepo was renamed from Nestar to Aurelis.

### Updated project names

- package name: `aurelis`
- app folders:
  - `apps/aurelis-api`
  - `apps/aurelis-batch`
- Nest CLI project names:
  - `aurelis-api`
  - `aurelis-batch`

### Scope of the rebrand

- Updated package metadata in `package.json`
- Updated Nest monorepo configuration in `nest-cli.json`
- Updated TypeScript output folders for both apps
- Updated app module/service references and batch imports
- Updated README to describe the Aurelis yacht backend monorepo

## Project intent

Aurelis is being positioned as a luxury yacht backend monorepo for yacht charter, member operations, inventory, and batch processing workflows.

## ER foundation completed — 2026-10-12

Environment configuration and the shared Aurelis ER foundation have been implemented from the supplied `Untitled.pdf`: 13 entity models/types, 19 enums, validated DTOs, GraphQL responses and interceptors. Both app builds, the root TypeScript check and all 11 foundation tests passed.

See [the complete change record](aurelis-er-foundation-changes.md) for created/modified files, validation results, implementation decisions and remaining integration work. See [the foundation README](../../apps/aurelis-api/src/libs/README.md) for usage.

## Next phase

Migrate the existing services and data to the new ER definitions. The current property/community/member services still use the earlier domain and ObjectId identities; the new ER models use UUID strings. Start with account/auth migration before registering new models against legacy collections, then implement the remaining ER modules.
