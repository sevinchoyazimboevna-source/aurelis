# STEP 12 ? Yacht views, likes count & popularity

Completed backend implementation on 2026-10-07; deployment and production acceptance remain PENDING. No material conflicting engagement implementation was found. Pre-existing tracked/untracked/deleted work was inspected and preserved.

1. **Files created.** apps/aurelis-api/src/components/yacht/yacht-engagement.spec.ts; docs/ai/STEP_12_REPORT.md.

2. **Files modified.** Yacht schema/DTO/enum/service/resolver; Wishlist service/test fixture/service tests; Yacht HTTP tests; AGENTS.md; README.md; docs/ai/BACKEND_MIGRATION.md, COMPLETED_TASK.md, COMPLETED_TASKS.md, DECISIONS.md, FRONTEND_MIGRATION.md, NEXT_STEPS.md. Paths are relative to the repository; these are this task?s edits, not the full pre-existing dirty tree.

3. **Files deleted.** None by STEP 12. Prior deletions were preserved.

4. **viewsCount.** Persisted Yacht number; integer, min 0; GraphQL Int!; raw accepted event count.

5. **likesCount.** Persisted Yacht number; integer, min 0; GraphQL Int!; denormalized count of stored favorites independent of publication.

6. **Defaults.** Both schema defaults are 0. Resolver fallback for missing/null legacy values is 0. No historical backfill was executed.

7. **Source of truth.** WishlistItem in wishlistItems remains the authoritative member/yacht relation. No Like model or user ownership is added to Yacht.

8. **Add.** includeResultMetadata upsert result lastErrorObject.upserted gates the atomic likesCount +1. Existing saved timestamps remain unchanged.

9. **Duplicate add.** Existing relation returns idempotently without increment. Upsert uniqueness requires the deployed memberId/yachtId unique index.

10. **Remove.** deleteOne.deletedCount >0 gates decrement. Absent relation returns false without counter update; hidden/missing yacht removal remains allowed.

11. **Toggle.** Actual findOneAndDelete result gates decrement/false; otherwise reuses add and returns true. Return represents that operation?s relation outcome; another overlapping request may subsequently change it.

12. **Non-negative.** Decrement uses {_id, likesCount: {$gt: 0}} plus $inc:-1. Missing/zero values do not decrement. Schema rejects negative/fractional new values; corrupt external records are not silently repaired.

13. **Concurrency.** Atomic per-document $inc; actual insert/delete results prevent duplicate add/add and remove/remove deltas. No mandatory transactions or distributed locks introduced; no existing transaction infrastructure found.

14. **Duplicate race.** 11000 loser rereads the winning private relation without increment; vanished winner produces the existing retry error. Offline mocked path tested; real cross-process behavior not verified.

15. **View definition.** One accepted explicit detail-view event, including repeated events. Not unique visitors; no IP/session/fingerprint/history persistence.

16. **View API.** Public mutation recordYachtView(yachtId: ID!): Int! delegates to YachtService.recordView and returns updated count, not a large Yacht payload.

17. **View visibility.** Strict 24-hex ID validation. Atomic write matches shared PUBLISHED predicate. Draft/archive/missing targets use existing Yacht not-found behavior without returning hidden data.

18. **View concurrency.** findOneAndUpdate with $inc:{viewsCount:1}, new:true, timestamps:false. Publication predicate and increment are one document operation. Detail/internal reads do not increment.

19. **GraphQL output.** Every Yacht list/detail output can select viewsCount/likesCount without per-card Wishlist queries. Counter fields are absent from mutation inputs.

20. **Legacy compatibility.** Missing counters resolve to 0 on lean/aggregation outputs; only engagement sorts add $ifNull normalization before sorting. No persistence writes on reads.

21. **Sort additions.** MOST_VIEWED, MOST_LIKED, POPULAR are additive; all existing enum values are retained.

22. **MOST_VIEWED.** viewsCount DESC, createdAt DESC, _id DESC, regardless of descending flag.

23. **MOST_LIKED.** likesCount DESC, createdAt DESC, _id DESC, regardless of descending flag.

24. **POPULAR.** likesCount DESC, viewsCount DESC, createdAt DESC, _id DESC. No hidden weighted score.

25. **getYachts.** Existing filters/PUBLISHED/pagination/defaults/caps and Yachts list/Float total/nullable metadata preserved. New sorting uses persisted counters, not wishlist lookup counts.

26. **getYacht.** Existing public visibility, pricing aliases and broker handling unchanged; no view side effect.

27. **getFeaturedYachts.** Still requires featured=true and PUBLISHED; default FEATURED order unchanged. Explicit new sort modes work through the existing input.

28. **Wishlist privacy.** Shared authentication/current member ownership unchanged; no public memberId or list of liking users.

29. **Hidden favorites.** Unpublishing does not decrement or remove relations. getMyWishlist filters hidden/broken references before count/pagination. Republication exposes stored relations and retains count.

30. **Reconciliation.** Deferred tooling, explicitly permitted by STEP 12 scope. Historical relations are not backfilled by defaults. Before rollout compare count(WishlistItem by yachtId) with stored counters for all statuses; separately authorize a dry-run-first utility and coordinated repair. No automatic repair.

31. **Indexes.** No new indexes. Existing Yacht indexes and unique Wishlist index preserved. Legacy zero normalization before sort prevents a simple counter index from directly supplying order; representative query plans/backfill strategy are required before speculative indexes.

32. **Migration scripts.** None created or changed by this step. Existing migration scripts are untouched.

33. **Migration execution.** None; no live database/index operations, seeds, destructive commands or startup reconciliation.

34. **Security.** Existing auth/ADMIN guards preserved. Public views expose count only and use current public not-found formatting; no Member data. No sensitive auth logging added.

35. **Abuse.** Raw calls may inflate views. Unique visitors/rate-limit infrastructure/Redis/IP/fingerprints/bots deferred. GraphQL Int is 32-bit; overflow policy for very large counters remains an operational follow-up.

36. **Tests.** New 12-case engagement suite; Wishlist fixture models insertion metadata and counters; wishlist upsert-option expectation updated; real GraphQL HTTP test covers output defaults, repeated views and invalid/hidden/missing rejection. Sort tests inspect exact MongoDB ordering/tie-break/zero-normalization pipeline; actual database execution remains unverified.

37. **Auth regression.** Existing auth/service/validation/Google/guard unit and HTTP suites pass.

38. **Yacht regression.** Existing service/pricing/schema/destination unit suites and Yacht HTTP suite pass.

39. **Inquiry regression.** Existing generic inquiry service/schema/module/optional auth and HTTP tests pass.

40. **Broker regression.** Existing Broker unit tests and Yacht HTTP Broker compatibility tests pass.

41. **Crew regression.** Existing Crew service/schema/module and HTTP suites pass; CAPTAIN/CHEF unchanged.

42. **Destination regression.** Existing Destination service/schema/module and HTTP suites pass; hierarchy and explicit yacht tagging unchanged.

43. **Office regression.** Existing Office service/schema/module and HTTP suites pass; Broker office association unchanged.

44. **Article regression.** Existing Article service/schema/module and HTTP suites pass; publishAt/publishedAt unchanged.

45. **Wishlist regression.** Existing service/schema/module/HTTP suites pass. Final focused engagement/wishlist tests: 2 suites/47 tests.

46. **Charter regression.** Existing charter suite and inquiry HTTP tests pass; CHARTER enum/date behavior unchanged.

47. **Sales regression.** Existing sales suite and inquiry HTTP tests pass; InquiryType.SALES distinct from YachtListingMode.SALE.

48. **Sell Yacht regression.** Existing service/schema/module and HTTP suites pass. No owner-request changes.

49. **TypeScript.** npx tsc -p apps/aurelis-api/tsconfig.app.json --noEmit and batch equivalent: exit 0. Initial sandbox EPERM Node path resolution was overcome with approved local execution outside the sandbox.

50. **Builds.** npm run build and npx nest build aurelis-batch: exit 0; both webpack builds successful.

51. **Units.** Full suite: 36 suites/1035 tests pass. Final focused engagement suite 12/12 and engagement/wishlist 47/47 pass. One intermediate new test failed due to dynamic import in Jest; replaced with static import and verified.

52. **API e2e.** 10 suites/492 tests pass. Final focused Yacht HTTP suite 29/29 passes. Tests use offline/mocked persistence, not live Mongo.

53. **Batch e2e.** 1 suite/1 health test passes.

54. **Whitespace.** git diff --check exit 0; scoped new/edited-file trailing whitespace verified. Existing dirty work/deletions preserved.

55. **Focused lint.** New engagement test, Wishlist counter implementation/fixture/tests and Yacht schema/DTO/enum are clean. Broad focused Yacht service/resolver/HTTP lint still contains historical type-safety debt; no unrelated cleanup performed. Final counts recorded below.

56. **Repository lint.** Non-mutating npm run lint and final eslint JSON checks run; existing lint debt remains, recorded below. No lint:fix or broad formatting.

57. **Live Mongo/index concerns.** Actual deployed unique index, old relation counts, BSON persistence, query plans, aggregation memory/sort performance and production configuration/acceptance are PENDING.

58. **Concurrency limits.** No cross-document atomicity. A crash/error after relation write can leave a stale counter; retries of idempotent add cannot repair it. Interleaved add/remove can decrement at zero before delayed +1 and drift. Concurrent toggles are not serialized. Reconciliation is required for repair; stronger guarantees require separately scoped deployment-supported transaction/outbox/locking design.

59. **Compatibility OLD ? NEW.** Missing engagement output ? additive Int fields with zero fallback; existing Yacht sorts ? same values plus three options; insert-only private Wishlist upsert ? same relations/output/timestamps plus insertion metadata and counter delta. Side-effect-free detail, Float total, charterPrice/charterRate, SALE versus SALES, all STEP 2?11 feature contracts stay unchanged.

60. **Deferred.** STEP 13+, frontend, analytics dashboard, public user likes/social features/comments, visitor tracking, cleanup/cascades, stronger transactional guarantees, reconciliation tooling and rollout acceptance. Only STEP 12 backend code completed.


Final repository lint: 1135 errors, 61 warnings, 0 fatal errors. New engagement suite and Wishlist/schema/DTO/enum edits have zero findings. Broad focused Yacht service/resolver/HTTP findings are retained historical debt. No automatic broad fixes applied.
