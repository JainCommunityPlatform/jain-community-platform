## Latest verified state — PR #180 merged; PR #181 maker-checker audit regression in progress (13 October 2026)

- **Merged:** [PR #180 — donor self-service history tenant and identity scope](https://github.com/JainCommunityPlatform/jain-community-platform/pull/180), merge commit [7f3b572a20d58c61e0cf5c6d27984594d018fb1a](https://github.com/JainCommunityPlatform/jain-community-platform/commit/7f3b572a20d58c61e0cf5c6d27984594d018fb1a).
- **Initial CI failure:** [run #792](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38346537917) failed backend integration because the first version incorrectly expected a 403 for donor self-service based only on a membership mismatch. The contract is to return the authenticated donor's history scoped by the active tenant and donor identity.
- **Corrected exact-head CI:** [run #794](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38352904588) passed Flutter analyze/tests, backend lint/unit/integration/Firestore emulator/build, repository validation and merge gate on corrected head `e5a2c6e5f9d39e5b9964532c8b4e9b123e07aa13`. Android AAB was skipped by design.
- **Post-merge CI for #180:** **UNKNOWN**. The available commit-run lookup did not return a push-triggered run for merge commit `7f3b572a20d58c61e0cf5c6d27984594d018fb1a`; exact-head PR CI is not proof of post-merge CI.
- **Current work:** PR #181, branch `qa/finance-maker-checker-http-audit`, adds an HTTP E2E regression for denied approvals/rejections of payments, expenses and adjustments. It asserts HTTP 403 and no corresponding success audit event. Existing service/emulator tests cover the underlying self-approval invariants.
- **Evidence boundary:** the new HTTP test mocks GivingService to force maker-checker denials and checks controller/audit behavior. It does not replace Firestore emulator or staging evidence.
- **Next:** monitor exact-head CI, repair real failures without weakening assertions, merge only when all required checks pass and the PR is mergeable, verify push-triggered default-branch CI where accessible, and immediately continue the next highest-priority P0 gap. Android build/upload remains manual/on-demand.

# JCP Autonomous QA Checkpoint

Date: 13 October 2026
Repository: [JainCommunityPlatform/jain-community-platform](https://github.com/JainCommunityPlatform/jain-community-platform)

## Latest verified state — PR #178 merged; next P0 regression in progress

- **Merged:** [PR #178 — tenant-scoped finance reports](https://github.com/JainCommunityPlatform/jain-community-platform/pull/178), merge commit [07ba1c49cdc09e51e1eeea42cf6924babeadeefc](https://github.com/JainCommunityPlatform/jain-community-platform/commit/07ba1c49cdc09e51e1eeea42cf6924babeadeefc).
- **Exact-head CI:** [run #788](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38333465838) passed repository validation, backend lint/unit/integration/Firestore-emulator/build, Flutter analyze/tests, and merge gate on head `a2bac0c7386f4a6b5e9a20b46ca090f97412839c`. Android AAB was skipped by design.
- **Post-merge CI for PR #178:** **UNKNOWN**. The connected workflow-run lookup exposes PR-triggered runs only and returned no push-triggered run for merge commit `07ba1c49cdc09e51e1eeea42cf6924babeadeefc`. Do not infer a post-merge pass from PR CI.
- **Previous verified post-merge state:** [PR #177's default-branch CI #785](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38332211061) passed on merge commit `ec0ac60e67660c4372b17e54e2a077d9bbd5a513`.
- **Current work:** branch `qa/finance-read-routes-tenant-isolation`, based on PR #178's merge commit. Adds an HTTP integration test denying a cross-tenant finance operator access to tenant-wide receipts, pledges, payments, expenses, adjustments, summary and reconciliation routes; asserts each protected service is not called. Updates the coverage inventory and behavioural specification.
- **Evidence boundary:** this is mocked-identity/membership HTTP integration coverage. It proves the API authorization boundary and no-service-call behavior in the test harness; it does not establish production membership resolution or persisted Firestore isolation.
- **Next:** finish the focused PR, inspect CI on its exact head, fix any real failures without weakening assertions, merge only when all required checks pass and it is mergeable, then verify push-triggered default-branch CI and continue the P0 route matrix. Android build/upload remains manual/on-demand.

---


## Latest merged change — post-merge gate is red

- **Merged:** [PR #175 — initial session restoration failure](https://github.com/JainCommunityPlatform/jain-community-platform/pull/175), merge commit [6c5a703afa1bf7d6bb2c4a902275ad05a6996008](https://github.com/JainCommunityPlatform/jain-community-platform/commit/6c5a703afa1bf7d6bb2c4a902275ad05a6996008).
- **Exact PR-head CI:** [run #778](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38304250367) passed all applicable required jobs on the PR head. Android AAB was skipped by design.
- **Post-merge default-branch CI:** [run #779](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38323486041) completed with **failure** on the merge commit. Flutter analyze/tests and repository validation passed. Backend lint and unit tests passed; the Firestore emulator integration job failed, so backend build was skipped and the merge gate failed. Android AAB remained skipped as intended.
- **Root cause from job log:** the existing emulator test `allows only one concurrent approval of a refund and creates one approval notification` exceeded Jest's default 5,000 ms per-test timeout. The same test passed in PR-head CI #778 in 3,210 ms; neighboring emulator concurrency tests also take about 3 seconds. The pledge idempotency regression passed in #779. This is consistent with emulator contention/test timeout sensitivity; no failed financial assertion was reported.
- **Fix in this branch:** adds an explicit 15-second timeout to this one emulator-heavy concurrency test. All outcome, persisted-balance, single-notification, and single-winner assertions remain unchanged. Exact-head CI must prove the fix.
- **Evidence boundary:** Firestore emulator only; no production Firebase or staging behavior is claimed.

## Next action

Open a focused PR for the timeout fix, inspect every exact-head CI job, repair any genuine failure without weakening functional assertions, and merge only when all required checks are green and the PR is mergeable. Then verify the push-triggered default-branch run through the Actions API. Keep Android build/upload manual/on-demand. Once the post-merge baseline is green, resume the next highest-priority uncovered P0 from the coverage inventory.


## Execution checkpoint — PR #176 merged; PR #177 in progress (13 October 2026)

- **Merged:** [PR #176 — concurrent refund approval emulator timeout](https://github.com/JainCommunityPlatform/jain-community-platform/pull/176), merge commit [4dff229d0911318848f78aee1232969dcfe061bb](https://github.com/JainCommunityPlatform/jain-community-platform/commit/4dff229d0911318848f78aee1232969dcfe061bb).
- **Exact-head CI:** [CI #780](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38330587537) passed repository validation, Flutter analyze/tests, backend lint/tests/Firestore emulator/build and merge gate. Android AAB was skipped as intended.
- **Post-merge CI:** **unknown**. The available commit-run lookup returns PR-triggered runs only and does not expose the push-triggered default-branch run for merge commit `4dff229d0911318848f78aee1232969dcfe061bb`; no post-merge pass is claimed. Verify via the GitHub Actions UI or a workflow-runs endpoint that includes push events.
- **Current PR:** [#177 — cross-tenant admin profile contact denial](https://github.com/JainCommunityPlatform/jain-community-platform/pull/177), branch `qa/profile-admin-contact-tenant-isolation`, head `97c69c6a27c1f7d2a360408cfa13c9eb51756994`.
- **Test added:** `apps/api/test/app.e2e-spec.ts` now exercises `PATCH /api/profile/:userId/contact` for a tenant administrator whose membership belongs to another tenant; it asserts HTTP 403 and that `ProfileService.adminSetContact` is not called. `docs/qa/coverage-inventory.md` records the gap and evidence boundary.
- **CI:** [run #783](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38331902002) is pending; the jobs endpoint has not yet returned jobs. Do not merge until all required checks on the current exact head are green and the PR is mergeable. If CI fails, inspect logs and fix the cause without weakening assertions.
- **Evidence boundary:** mocked identity/membership HTTP integration test; persisted production membership and the remaining media/export/admin route matrix remain open.
- **Next:** finish PR #177's exact-head CI and post-merge verification, then continue with the next uncovered P0 from the inventory. Android build/upload remains manual/on-demand.


## Execution checkpoint — PR #177 merged; finance-report tenant-scope regression in progress (13 October 2026)

- **Merged:** [PR #177 — cross-tenant admin profile contact denial](https://github.com/JainCommunityPlatform/jain-community-platform/pull/177), merge commit [ec0ac60e67660c4372b17e54e2a077d9bbd5a513](https://github.com/JainCommunityPlatform/jain-community-platform/commit/ec0ac60e67660c4372b17e54e2a077d9bbd5a513).
- **Exact-head CI:** [run #784](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38331949766) passed repository validation, Flutter analyze/tests, backend lint/unit/integration/Firestore-emulator/build, and merge gate on head `f403b3f9b0b0b595ae6c8baf3218658dc28d5e44`. Android AAB was skipped by design.
- **Post-merge CI:** **unknown**, not marked green. The connected workflow-run lookup only returns PR-triggered runs and the combined status endpoint has no checks for this merge commit. The default-branch push run still needs verification through an Actions endpoint that includes push events.
- **Next regression:** branch `qa/finance-report-tenant-scope` adds an HTTP integration scenario allowing a finance viewer to read summary and reconciliation reports while asserting both service calls receive only the resolved tenant ID. The existing cross-tenant summary denial remains in place.
- **Evidence boundary:** the new scenario uses mocked identity, membership, and report-service outputs. It proves HTTP authorization and tenant argument propagation only; it does not prove persisted report correctness, export behavior, or production membership.
- **Next steps:** run exact-head CI, repair failures without weakening assertions, merge only if green/mergeable, then verify post-merge CI and continue the P0 inventory/authorization work. Android build/upload remains manual/on-demand.


## CI failure and repair — PR #178 (13 October 2026)

- **CI #786 failed:** [workflow run](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38332292446). Repository validation and Flutter analysis/tests passed. Backend lint, unit tests, and integration tests passed. Firestore emulator integration failed because `allocates unique receipt numbers when separate pledges are approved concurrently` exceeded Jest's default 5-second timeout; 41 other emulator tests passed.
- **Repair:** the concurrency test now has a 15-second timeout, preserving all receipt uniqueness, count, and payment assertions. This is a targeted timeout adjustment for emulator transaction contention, not a skipped test or weakened assertion.
- **Next:** wait for the new exact-head CI run. Do not merge until all required jobs pass. The post-merge run for PR #177 remains unknown because the connected commit-run/status methods do not expose the push-triggered run.
