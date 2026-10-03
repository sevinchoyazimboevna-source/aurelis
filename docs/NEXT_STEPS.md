# Next Steps

Items below are recommendations from the current repository snapshot. They are not claims of work already completed.

1. **Confirm local runtime configuration.** The ignored local `.env` currently uses legacy database/secret variable names, while the API requires `MONGODB_URI` and `JWT_SECRET`. Set the new values locally without documenting or committing secrets. The correct database and credentials are **PENDING**.
2. **Repair the lint toolchain.** `eslint.config.mjs` imports `typescript-eslint`, but the package manifest and lockfile list only `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser`. Decide whether to add the missing package or update the flat config; then run lint without auto-fixing unrelated files.
3. **Locate the frontend project.** Obtain its repository/path, current migration status, framework, and instructions. These are **PENDING**; see [Frontend Migration](FRONTEND_MIGRATION.md).
4. **Resolve product and operations unknowns.** Confirm locales, currency display/conversion, yacht inventory source and publication process, inquiry notifications/CRM/retention, production hosting, and release acceptance. See [Decisions](DECISIONS.md); all are **PENDING**.
5. **Plan frontend integration.** Compare confirmed frontend requirements to the backend GraphQL operations, identify any API gaps, and agree on acceptance checks before implementation.
6. **Record rollout evidence.** When deployment, data setup, and acceptance occur, add dated evidence here and to [Completed Tasks](COMPLETED_TASKS.md). Until then, migration and rollout status remain **PENDING**.
