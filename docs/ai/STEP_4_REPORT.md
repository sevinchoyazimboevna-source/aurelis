# Step 4 completion report - 2026-10-05

This report covers Step 4 changes only. Prior Auth/Yacht/Inquiry/Broker implementation, pre-existing working-tree changes and deletions were preserved. Local validation does not establish database provisioning, deployment or release acceptance.

1. **Files created:**
   - `apps/aurelis-api/src/components/crew/crew.module.ts`
   - `apps/aurelis-api/src/components/crew/crew.resolver.ts`
   - `apps/aurelis-api/src/components/crew/crew.service.ts`
   - `apps/aurelis-api/src/components/crew/crew.module.spec.ts`
   - `apps/aurelis-api/src/components/crew/crew.service.spec.ts`
   - `apps/aurelis-api/src/components/crew/crew-schema.spec.ts`
   - `apps/aurelis-api/src/libs/enums/crew.enum.ts`
   - `apps/aurelis-api/src/libs/dto/crew/crew.ts`
   - `apps/aurelis-api/src/libs/dto/crew/crew.input.ts`
   - `apps/aurelis-api/src/libs/schemas/CrewProfile.model.ts`
   - `apps/aurelis-api/test/crew.e2e-spec.ts`
   - `docs/ai/STEP_4_REPORT.md` (this report)

2. **Files modified:**
   - `apps/aurelis-api/src/components/components.module.ts`: only added CrewModule import/registration relative to the Step 4 starting state. Earlier staff-auth removal was already present.
   - `AGENTS.md`, `README.md`: added Crew architecture, contract and operational conventions.
   - `docs/ai/BACKEND_MIGRATION.md`, `docs/ai/COMPLETED_TASKS.md`, `docs/ai/COMPLETED_TASK.md`, `docs/ai/DECISIONS.md`, `docs/ai/FRONTEND_MIGRATION.md`, `docs/ai/NEXT_STEPS.md`: updated the handoff with Step 4 facts/choices/validation/unknowns. Existing Step 3 report content was preserved in COMPLETED_TASK.md. Related root-file links in touched handoffs were corrected for docs/ai placement.
   Existing docs/ai files were present before Step 4, although Git already reported that directory as untracked.

3. **Files deleted:** None by Step 4; all pre-existing deletions were left intact.

4. **Final CrewProfile schema:** One canonical CrewProfileSchema, model name CrewProfile, explicit collection crewProfiles, Mongoose timestamps. Stored fields are _id, optional memberId ObjectId ref Member, required role and firstName, status, optional lastName/displayName/nationality/location/bio/experienceYears/profileImage, languages/images arrays, featured, createdAt/updatedAt. Status defaults DRAFT, featured=false, arrays=[]. Experience is integer >=0. Names and simple string entries are trimmed; blank required names and blank optional names/image/language entries are rejected. Languages are unique after trimming (case preserved). DisplayName is persisted only when explicitly supplied; no derived duplicate value is stored. No Member credentials or separate Captain/Chef models.

5. **Final CrewRole:** CAPTAIN and CHEF only; registered as a GraphQL enum. No deckhand/engineer/stewardess/first-officer options.

6. **Final CrewStatus:** DRAFT, PUBLISHED, ARCHIVED; registered as a GraphQL enum. DRAFT/ARCHIVED remain stored, never publicly visible. Featured does not change status.

7. **Member/CrewProfile relationship:** Optional memberId uses an existing Member ID. If supplied, DTO validates ObjectId format and service uses Member.exists({_id}) without fetching a populated auth record or credentials. No member account creation, role mutation, status mutation or separate Crew authentication. Profiles may remain unlinked. No safe existing self-service workflow was found, so only ADMIN management is implemented.

8. **Final Crew GraphQL ObjectType:**

   ```graphql
   type CrewProfile {
     _id: ID!
     memberId: ID
     role: CrewRole!
     status: CrewStatus!
     firstName: String!
     lastName: String
     displayName: String!
     nationality: String
     location: String
     bio: String
     experienceYears: Int
     languages: [String!]!
     profileImage: String
     images: [String!]!
     featured: Boolean!
     createdAt: DateTime!
     updatedAt: DateTime!
   }
   ```

   DisplayName resolves the explicit stored name or joins first/last name. It is always a presentation string in GraphQL. There is no populated Member object, password, email/login copy, JWT, Google ID, auth status or sensitive metadata field.

9. **Final collection wrapper:**

   ```graphql
   type Crews {
     list: [CrewProfile!]!
     total: Int!
     page: Int
     limit: Int
     totalPages: Int
   }
   ```

   This new collection follows the successful list/total convention with explicitly typed Int total. Existing Yachts {list,total} and its actual Float total remain untouched. No unnecessary data/payload/result nesting.

10. **Final filters:** CrewFilterInput exposes role, status, nationality, location, featured, minExperienceYears, maxExperienceYears and language. CrewCatalogInput nests this validated filter. Nationality and language use escaped, whole-value, case-insensitive matching; language matches array membership in MongoDB. Location is an escaped literal case-insensitive substring. Experience bounds are inclusive integer/nonnegative and reject reversed ranges. Public status is overridden; staff status is honored. Nullable query fields are treated as omitted. Empty filter strings are rejected after trimming.

11. **Final sorting:** CrewSortBy = NEWEST, EXPERIENCE_ASC, EXPERIENCE_DESC, NAME_ASC, NAME_DESC. NEWEST sorts createdAt descending; experience sorts the numeric field in the requested direction. Name sorts use a MongoDB-computed transient key from explicit displayName or the same first/last-name fallback used by GraphQL. That key is projected out before response. Every sort includes _id descending for stable ties. Default MongoDB case-sensitive name ordering and missing-experience ordering are retained. No JavaScript collection sorting in production.

12. **Final pagination:** CrewCatalogInput defaults page=1, limit=20, sortBy=NEWEST; maximum limit=50. Page/limit must be integers with page>=1 and limit1..50; invalid input is rejected, not silently clamped. Shared MongoDB aggregation uses match/sort/facet, page skip=(page-1)*limit, limit, and independent total count. All paths return page/limit/ceil(total/limit). Empty out-of-range pages retain total; no eligible matches give total 0 / totalPages 0. No unlimited query or in-memory pagination.

13. **getCrews behavior:** `getCrews(input: CrewCatalogInput!): Crews!`. Public, independent PUBLISHED enforcement, filters/sorting/pagination/count. The required input argument follows current Yacht query conventions; `{}` selects defaults.

14. **getCrew behavior:** `getCrew(id: ID!): CrewProfile!`. Validate ID, find only PUBLISHED, return normal service NotFoundException for missing/draft/archived. Existing shared formatter currently renders that exception as a generic internal-error GraphQL response, as it does for existing Yacht detail. No new error architecture was introduced. Invalid IDs use normal BadRequest validation. No weak admin override in the public query.

15. **getFeaturedCrews behavior:** `getFeaturedCrews(input: CrewCatalogInput): Crews!`. Optional input keeps default pagination. Public service forces PUBLISHED and featured=true, even if the client supplies DRAFT/ARCHIVED or featured=false. Uses the same stable sorts, filters and count/page logic.

16. **Admin Crew query behavior:** `getCrewsForStaff(input: CrewCatalogInput!): Crews!`. Retains existing Staff naming used by getYachtsForStaff, but authorization is the shared ADMIN Member architecture. AuthGuard + RolesGuard + MemberRole.ADMIN. All statuses are eligible unless filtered; all collection query-building logic is shared with public/featured paths.

17. **createCrewProfile behavior:** Existing Nest resolver/service/DI pattern; ADMIN-only mutation accepts CreateCrewProfileInput. Requires role and nonblank firstName. Optional fields validate primitive types without numeric coercion; strings/array entries trim; defaults DRAFT/false/empty arrays. Member link is checked only when supplied. Undefined DTO properties are removed before persistence. Featured=true never automatically publishes. No Member account/role creation, hiring workflow or upload/storage pipeline.

18. **updateCrewProfile behavior:** ADMIN-only mutation accepts PartialType-based UpdateCrewProfileInput with required _id. Validate changed fields, omit undefined fields, and persist only $set fields with new=true/runValidators=true. No inherited defaults reset featured/status/images/languages/names/experience/memberId. Explicit zero/false/empty arrays are supported. Explicit null mutation values are rejected, and no unlink workflow is added. Changed member links validate existence/uniqueness excluding the current profile; unchanged/omitted links incur no member lookup. Missing records raise the normal service NotFoundException.

19. **Public visibility rules:** Service-level collection matches and detail findOne independently enforce PUBLISHED. Client status filters cannot bypass it. Featured additionally forces featured=true. Archiving is a status update, never a physical deletion; archived profiles retain their member uniqueness reservation.

20. **Member-role validation behavior:** MemberRole.CREW is an authentication role, not CrewRole. No self-managed Crew convention exists in the repository. For ADMIN-curated Step 4 profiles, any existing Member role may be linked; there is intentionally no role/status change or implicit management permission. Existing CREW/USER/ADMIN link cases are tested. This is an implementation choice documented for compatibility; future self-service must explicitly require Crew membership/ownership/status rules rather than relying on this link alone.

21. **Duplicate-profile behavior:** One linked CrewProfile per Member across all statuses. Service performs an existence precheck excluding the current ID on update. A partial unique memberId index handles races when deployed; duplicate-key code11000 is converted to a clear ordinary BadRequest relationship validation message without exposing key values/database internals. Unlinked profiles are excluded from the unique constraint. Live database index enforcement was not exercised; race errors are mocked in tests.

22. **Indexes added in schema (not executed against a database):**
   - `{memberId:1}`, unique, named crew_member_unique, partial filter memberId BSON objectId.
   - `{status:1, createdAt:-1, _id:-1}` for public/newest collection reads.
   - `{status:1, featured:1, createdAt:-1, _id:-1}` for featured/newest reads.
   These support actual lookup/visibility/order patterns. No blanket indexes on all string fields and no existing index removals. Normal application index provisioning follows existing Mongoose configuration; target index state must be verified before rollout.

23. **Migration scripts created:** None for Step 4. No existing Crew files/models or repository data assumptions were found. A new schema/collection needs no source-level legacy transformation. Unknown external collection data must be reviewed for duplicate links before provisioning uniqueness; no destructive repair or index migration was run. Existing member/yacht migration scripts were not changed or executed.

24. **Security behavior:** Shared STEP 2 guards and active ADMIN request authentication are reused; USER/OWNER/CREW cannot administer profiles. Missing authentication returns AUTH_UNAUTHENTICATED; unauthorized roles return AUTH_FORBIDDEN. Crew validation uses normal non-auth errors. Member existence queries fetch no credentials, and public reads do not populate Members. GraphQL exposes only defined professional fields. Input service validation rejects unknown fields including attempted credentials, and the schema also retains its strict-field convention. Existing error formatter suppresses unexpected persistence details; no request payload or sensitive production logging was added.

25. **Tests added/updated:** Three new Crew unit suites cover schema/defaults/role/status/experience/member IDs/string entries/partial index declarations; service create/update/validation/duplicates/unique-index races/member existence; public/featured/staff constraints, filters, ranges, canonical sorting, pagination/count/empty pages, detail/not-found and presentation name derivation; and actual CrewModule DI with mocked model providers. A new 53-test Crew GraphQL e2e suite uses real resolvers/service/shared guards, mocked persistence/authentication, and synthetic fixtures. It covers schema/types/enums, both professions, all public/staff status behavior, filters, stable sort ties, pagination bounds, featured, details, ADMIN writes, role rejection, partial updates, archiving, links/duplicates/races and error sanitization. Existing tests were not deleted or rewritten.

26. **Regression test result:** All 13 unit suites / 254 tests passed. Crew contributes3 suites / 110 tests; the prior10 suites / 144 tests also pass, including Auth/Guards/Yacht/Inquiry. Existing Broker operations remain tested through the unchanged Yacht GraphQL e2e suite. New Crew e2e also introspects the unchanged Yacht wrapper/Float total/SALE modes/charter fields within the same combined schema. Yacht numeric crew, charterRate compatibility alias, canonical charterPrice and InquiryType.SALES remain unchanged in source.

27. **TypeScript result:** API and batch no-emit checks passed with the installed local TypeScript. Commands: `npx --no-install tsc -p apps/aurelis-api/tsconfig.app.json --noEmit` and corresponding batch project command. Validation ran outside the sandbox to permit local Node workspace path resolution, as already required for previous steps.

28. **Build result:** API `npm run build` and batch `npx --no-install nest build aurelis-batch` both passed (webpack compiled successfully). No dependency/tooling changes.

29. **E2E result:** All 4 API suites / 86 tests passed via `npm run test:e2e -- --runInBand`. Crew 53 plus prior33 tests. Real GraphQL/resolvers/Crew service/guards are exercised with mocked persistence/authentication; no live MongoDB query engine, real JWT identity provider, external APIs or deployment were tested.

30. **git diff --check result:** Passed for the working tree. New Crew source/test/report files were additionally checked for trailing whitespace; newly added handoff links were validated. Existing unrelated modifications/deletions were preserved.

31. **Lint result:** Scoped non-mutating ESLint was attempted and remains blocked by the existing ERR_MODULE_NOT_FOUND for typescript-eslint in eslint.config.mjs. No unrelated toolchain/dependency changes or autofix. Scoped Prettier formatting succeeded, with the existing config's unknown extends-option warning.

32. **Remaining compatibility concerns:** Admin-managed links do not constitute self-service ownership; any future self-service must enforce separate rules. Explicit nulls cannot clear links/optional mutation fields in Step 4. Name sorts use MongoDB default case-sensitive ordering and unknown experience retains MongoDB missing/null ordering. The existing shared formatter masks NotFoundException as a generic internal error; an error-contract improvement would be separately scoped. No existing API contract was changed; all prior Yacht aliases/wrappers/enums, auth and inquiry types remain intact.

33. **Unverified deployment/database assumptions:** Production Crew collection/data, Member existence in target environments, deployed unique index, concurrent index enforcement and query/index performance, representative data volume, release acceptance and frontend integration are PENDING. Schema/DI checks and mocked/offline tests are local evidence only. No database operations, migration execution, collection/index drops, destructive deletion or frontend/future-step implementation was performed.

STEP 4 COMPLETE — CREW MODEL, CAPTAIN/CHEF PROFILES & CREW QUERIES IMPLEMENTED
