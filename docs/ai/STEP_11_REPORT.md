# STEP 11 — Sell Your Yacht / owner submission workflow

Finalized locally on 2026-10-07. Backend implementation and offline validation only; deployment, live MongoDB, index provisioning and product acceptance remain **PENDING**. No new features were added during finalization. Existing unrelated modified/deleted/untracked work was preserved.

1. **Existing-domain audit:** No existing owner-request model existed. Repository tree and source inspection found YachtInquiry for leads about existing inventory, not owner intake of an unlisted yacht.
2. **Dedicated domain:** Created SellYachtRequest in `sellYachtRequests`, independent of YachtInquiry and inventory.
3. **Architecture:** Nest module/resolver/service with Mongoose DI; registered in ComponentsModule. DTOs, enum, schema and validation helper live under API libs.
4. **Implementation files:** `src/components/sell-yacht-request/` contains module, resolver, service, three unit suites and offline fixture. `src/libs/dto/sell-yacht-request/` contains input/output DTOs; enum, schema and helper are `sell-yacht-request.enum.ts`, `SellYachtRequest.model.ts`, and `validators/sell-yacht-request.ts`. All paths are under `apps/aurelis-api/`.
5. **HTTP tests:** `apps/aurelis-api/test/sell-yacht-request.e2e-spec.ts` exercises the real GraphQL/HTTP surface using offline persistence and authentication doubles.
6. **Finalization edits:** Wrapped the Mongoose build-year validator in a one-argument callback to satisfy its signature and keep the helper's optional test clock separate. Corrected two STEP 11 test lint findings using an unknown generic and removing an unnecessary assertion. No unrelated source changes.
7. **Collection:** Explicit `sellYachtRequests`, timestamps enabled; no embedded inventory snapshot or reverse Member array.
8. **Status:** NEW/CONTACTED/REVIEWING/CLOSED; public submission forces NEW.
9. **Required contacts:** ownerName, email and phone. Phone is required, trimmed, at most 40 characters, and must contain a digit; no national-format conversion.
10. **Required yacht details:** yachtName, builder, yearBuilt, lengthM, location and country. Phone, builder, yearBuilt, lengthM, location and country are not optional.
11. **Names:** ownerName/yachtName/builder are trimmed nonblank strings up to 120 characters.
12. **Email:** Trimmed/lowercase, valid email, maximum 254 characters; independent of optional account contact details.
13. **Year:** Integer from 1800 through current UTC year, evaluated at validation time. Future years and numeric strings rejected at input boundary.
14. **Length:** Positive finite number in metres; no coercion of numeric strings.
15. **Geography:** location trimmed nonblank up to 240, country trimmed nonblank up to 120. No inferred Destination association.
16. **Optional model:** Trimmed nonblank string up to 120 when supplied.
17. **Description:** Optional plain string, trimmed, maximum 4000 characters.
18. **askingPrice:** Optional positive finite owner asking amount; supplying it requires currency. It is separate from canonical Yacht.salePrice.
19. **Currency:** Trimmed uppercase three-letter code format; no exchange conversion or external ISO-code registry lookup. Currency alone is permitted.
20. **Null/omission:** Optional supplied nulls are rejected; omitted optional values are omitted from creation.
21. **Public mutation:** `submitSellYachtRequest(input: CreateSellYachtRequestInput!): SellYachtRequest!`.
22. **Guests:** Allowed without login; no Member record is created.
23. **Optional authentication:** Reuses OptionalInquiryAuthGuard and shared AuthService; supplied invalid/blocked/deleted credentials fail rather than fall back to guest.
24. **Member link:** Optional BSON memberId derives only from verified CurrentMember context. All active roles may submit; no client memberId or account lookup by contact email.
25. **Role safety:** Member role is never auto-changed to OWNER. No Member role/status writes or permissions arise from a lead.
26. **Contact independence:** User-supplied owner contacts are preserved even when different from authenticated Member details.
27. **Inventory safety:** No Yacht listing is automatically created, published or modified; no yachtId is needed for intake.
28. **Broker safety:** No broker is automatically assigned, created or modified.
29. **Other domains:** No Destination, Office, Crew, Article, Wishlist or inquiry side effects.
30. **YachtInquiry:** Remains unchanged by STEP 11. Existing SALES/CHARTER model, enum, submission and management contracts are retained.
31. **Service validation:** class-transformer/class-validator at service boundary with whitelist/forbidNonWhitelisted; errors exclude raw input values.
32. **Spoofing:** Unsupported status/memberId/yachtId/brokerId/destinationIds/salePrice/images/listingModes are rejected on public input.
33. **ADMIN catalog:** `getSellYachtRequestsForAdmin(input: SellYachtRequestCatalogInput)` uses shared AuthGuard/RolesGuard with ADMIN.
34. **ADMIN detail:** `getSellYachtRequest(id: ID!)`; valid IDs required, missing rows use existing NotFoundException/error formatting.
35. **ADMIN status:** `updateSellYachtRequestStatus(input: UpdateSellYachtRequestStatusInput!)` writes status only with validators; no broad contact/specification editing or deletion.
36. **Transitions:** Existing simple enum transitions supported, including repeat status; no new state machine, onboarding or listing conversion.
37. **Filters:** Exact status, trimmed country/builder and normalized email, applied to both MongoDB find and count.
38. **Pagination:** SellYachtRequests has list/Int total/page/limit/totalPages; defaults 1/20, maximum 50; out-of-range pages return empty list with correct total.
39. **Ordering:** MongoDB createdAt descending, _id descending, skip/limit; no service-side in-memory pagination.
40. **Privacy:** No public list/detail/history, getMyRequests, impersonation or nested Member credentials. Submission returns the just-created lead; management remains ADMIN-only.
41. **Logging:** No contact/payload logging added. Existing shared error handling retained; synthetic regression error logs are test fixtures, not evidence of live database access.
42. **Repeats:** Legitimate repeat leads remain valid. No arbitrary cooldown/deduplication or speculative anti-spam subsystem.
43. **Indexes:** Declared createdAt/_id and status/createdAt/_id indexes only. Declarations do not establish deployed indexes or measured performance.
44. **Images:** Image intake/upload is deferred because no wired upload mechanism exists. A package dependency or image strings in other domains do not constitute a working upload pipeline. No image input, storage or upload endpoint added.
45. **No migrations:** No migration created or executed for this step; no live database operations, index provisioning, seed/backfill or app startup against MongoDB.
46. **No frontend:** No frontend work was performed; documenting integration surface is backend handoff only.
47. **No STEP 12+:** No STEP 12+ work was performed. Management/Crew requests, notifications/CRM, uploads, booking/payment and automatic listing conversion remain deferred.
48. **TypeScript:** `npx tsc -p apps/aurelis-api/tsconfig.app.json --noEmit` and batch equivalent pass. Initial API check exposed the validator signature; final recheck passes.
49. **Builds:** `npm run build` (API) and `npx nest build aurelis-batch` pass; final API build rerun after the validator correction also passes.
50. **Focused units:** `npm run test -- --runInBand --testPathPattern=sell-yacht-request`: 3 suites / 121 tests pass. Covers validation, persistence, optional account links, no role/side-effect mutations, filters/paging/status, schema and DI.
51. **Focused e2e:** `npm run test:e2e -- --runInBand --testPathPattern=sell-yacht-request`: 1 suite / 93 tests pass; guest/all-role submission, credential failures, required fields/prices, spoofing, private management, paging and GraphQL shape.
52. **Full regression:** `npm run test -- --runInBand`: 35 suites / 1023 tests pass. Includes all applicable Auth, Yacht, Inquiry, Charter, Sales, Broker, Crew, Destination, Office, Article and Wishlist units, plus STEP 11. No separate Broker HTTP suite exists; its service tests and integrated Yacht HTTP surface are included.
53. **Full HTTP regression:** `npm run test:e2e -- --runInBand`: 10 suites / 491 tests pass; `npm run test:e2e:batch -- --runInBand`: 1 suite / 1 test passes. API command includes all API HTTP suites; batch is separate.
54. **Lint and whitespace:** Focused lint covers every SellYachtRequest component/DTO/enum/schema/helper/HTTP file. Initial focused run found two test errors corrected within STEP 11. Final results and whitespace evidence are recorded below. Repository lint is reported separately; no historical debt was fixed.
55. **Limitations:** Tests use offline schema validation and mocked persistence/authentication, not live MongoDB/index/query-plan/concurrency or deployment acceptance. Sandbox initially prevented Node startup (EPERM); approved execution outside sandbox ran only requested validation. Production provisioning, PII retention/spam policies and release acceptance remain PENDING.

Final focused lint exits 0 with zero errors/warnings across all STEP 11 source/test files. Final repository `npm run lint` exits 1 with **1135 errors / 61 warnings / 0 fatal errors**, all outside STEP 11 files; unrelated historical debt was not fixed. The intermediate focused formatting finding was corrected and the final run is clean. Temporary lint JSON was removed after extracting these totals.

Final `git diff --check` exits 0. Because new STEP 11 files are untracked, an additional explicit trailing-whitespace scan covered their source/tests and this report: zero findings. Both checks were run after the handoff documentation update. Final focused unit rerun after test typing edits passes 121/121; the subsequent edit was whitespace only.

Handoff documentation updated: AGENTS.md, README.md, docs/ai/BACKEND_MIGRATION.md, COMPLETED_TASKS.md, COMPLETED_TASK.md, DECISIONS.md and NEXT_STEPS.md. No files were deleted except temporary lint output. No migration/live database operation, frontend work or STEP 12+ work was performed.
