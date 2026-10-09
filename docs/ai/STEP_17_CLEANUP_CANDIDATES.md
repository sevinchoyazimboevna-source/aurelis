# Step 17 cleanup candidate decisions (before deletion)

2026-10-09. Searched source, imports/exports, Nest modules, dynamic require/import, scripts, tests and documentation using rg and a full text reference scan. package-lock entries describe installation, not usage. Existing Step 16 working changes preserved.

| Path | Why unused | Import/export/module/script/test/docs references | Risk | Decision |
|---|---|---|---|---|
| test.ts | Comment-only scratch notes outside test runners | None; Jest roots apps only | Low | DELETE |
| SKILLS.md | Catalog refers exclusively to two skills already deleted in incoming working tree; obsolete Nestar wording | No readers or references | Low | DELETE |
| libs/types/common.ts StatisticModifier + ObjectId import | Old generic statistic shape | Only its own declaration; T remains used by YachtService | Low | DELETE declaration/import; KEEP file/T |
| database/database.module.ts constructor logging | Redundant injection and console startup/debug output; Mongoose owns connection lifecycle | No consumer of constructor; module registration retained | Low | DELETE constructor/imports; KEEP module |
| package.json @nestjs/axios, @nestjs/platform-ws, @nestjs/schedule, graphql-upload, moment, uuid, ws, dev @types/ws | No active imports, adapters, dynamic loads, scripts/tests or supported upload/scheduling feature | Only root manifest and lock; transitive ws/uuid retained where required | Low | DELETE direct declarations and update lock |
| app.resolver.ts sayHello | Active legacy-pattern greeting | Registered AppModule provider and GraphQL query | Compatibility risk | KEEP |
| scripts/migrate-legacy-members.js | Operational explicit legacy index helper | README/package operations; legacy unique-index regression test | High | KEEP, never execute |
| scripts/migrate-legacy-yachts.js and reconcile-yacht-likes.* | Protected standalone dry-run utilities | Docs and tests | High | KEEP, never execute |
| all specs, e2e specs, fixtures, mocks | Current regression coverage | Jest and test imports | High | KEEP all |
| RedisService/createPubSubClient | Shared command client plus intentional adapter duplicates | RedisModule, realtime consumers/tests | High | KEEP |
| tmp/step14/*, tmp/step15-focused-lint.running | Incoming ignored historical artifacts | Not product code; possible external operator work | Unknown ownership | KEEP untouched |

No obsolete Property/Agent/Follow/social schemas, auth paths or global socket gateway were found. Useful compatibility/security comments and historical docs are retained. No folder is scheduled for deletion.

## Audit-discovered fixes (no additional feature domain)

- KEEP the shared auth error formatter; sanitize GraphQL variable-coercion error messages that reflect credentials/contact input. Add focused unit and HTTP regression coverage.
- KEEP getBrokerProfiles and BrokerProfiles list/total Float. Replace the unbounded query with optional page/limit input, 1/20 defaults and maximum 50, stable name/_id order and separate total count. No office/search filter or new query. Update existing two fixtures minimally and add dedicated pagination regressions.
- Keep all active domain schemas, helpers and test files. No additional deletion after the final reference audit.
