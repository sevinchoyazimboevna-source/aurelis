# Reusable Aurelis Prompts

For every prompt below, read the repository [`AGENTS.md`](../../AGENTS.md) first. Keep verified facts separate from assumptions, use **PENDING** for unknowns, and do not infer migration progress from the presence of code. Do not expose `.env` values or credentials.

## Repository discovery

> Inspect this repository read-only. Follow `AGENTS.md`. Summarize apps, API surface, persistence, authentication, frontend presence, and checks using file-backed evidence. Distinguish implemented code from deployed or accepted functionality. Mark anything not established by the repository **PENDING**. Do not edit files.

## Documentation update

> Update the relevant files in `docs/` using current repository evidence and explicit decisions from the conversation. Preserve the distinction between confirmed decisions, current implementation, recommendations, and unknowns. Mark unknowns **PENDING**. Do not claim completed migration or rollout without dated evidence. Validate relative links and report changed files.

## Frontend integration planning

> First locate the frontend repository and read its `AGENTS.md` and project configuration. Map existing pages and design conventions to the Aurelis backend operations documented in `docs/ai/BACKEND_MIGRATION.md`. Keep Fraser Yachts as inspiration only unless concrete requirements are supplied. List API gaps and product choices as **PENDING**; return a decision-complete implementation plan without editing code.

## Next task: FRONTEND INTEGRATION

> Locate the frontend repository and read its instructions. Use docs/ai/STEP_17_REPORT.md, docs/ai/STEP_17_API_INVENTORY.md and the current GraphQL DTO/resolver/socket contracts. Integrate existing APIs without reopening backend feature steps. Wait for socket:ready, reauthenticate/rejoin on reconnect, recover history from Mongo-backed GraphQL, handle fail-closed rate limits and keep ADMIN chat history read-only. Production deployment assumptions remain separate acceptance work. Do not add Management Request.

## Implementation and validation

> Implement only the approved scope. Preserve existing API and database contracts unless explicitly changed in the approved plan. Add or update checks for the stated acceptance criteria. Run typechecks and non-mutating lint where available; if a check is blocked, report the exact cause instead of claiming success. Update `docs/ai/COMPLETED_TASKS.md` only with verifiable evidence, and leave unresolved work **PENDING**.

See [Next Steps](NEXT_STEPS.md) for current repository follow-ups and [Decisions](DECISIONS.md) for confirmed scope.

## Explicit local verification

> Follow STEP_17_REPORT.md and run scripts/verify-local-backend.js only with explicit --run, loopback URLs, a fresh aurelis_step17_* test database and dedicated nonzero Redis DB. Start the actual TypeScript API without build/watch; use local-only secrets, preserve synthetic records for inspection, and do not target production, flush Redis, run migrations or reconcile utilities. Report Google/production assumptions separately.
