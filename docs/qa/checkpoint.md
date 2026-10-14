## Latest execution — PR #189 merged; donor receipt refresh regression in progress (14 October 2026)

- **Merged:** [PR #189 — Flutter donor pledge journey](https://github.com/JainCommunityPlatform/jain-community-platform/pull/189), merge commit `88adb21d0330d2cc03d45b1b0c1b07ca3b759147`.
- **Exact-head CI:** [CI #822](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38435636205) passed on `ebd3c0aade33e0aa11e687bfa347d06a58053213`.
- **Post-merge CI:** [CI #823](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38495571718) was still in progress at checkpoint creation. Repository validation and Flutter analyze/tests passed; backend checks were still running; Android AAB was skipped by design. Verify final run status before calling post-merge CI green.
- **Current branch:** `qa/donor-receipt-after-approval-refresh`. Adds a donor widget regression: receipts are absent before the API reflects an approved payment, then appear with receipt number, method/date and amount after refresh.
- **Evidence boundary:** mocked HTTP/widget state transition only; no claim of approval API execution, persisted Firestore receipt issuance, or staging/device verification.
- **Next:** exact-head CI on this branch, fix real failures without weakening assertions, merge only when required checks are green and mergeable, verify default-branch CI, update issue #162, and continue the remaining persisted payment-to-receipt P0. Android build/upload remains manual/on-demand.

---

## CI failure and repair — PR #189 Flutter donor pledge journey (13 October 2026)

- **Failed exact-head run:** [CI #820](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38432132112) on head `1039c6d4e9dae1701deb462833fe3f12fe902b20`. Backend lint/unit/integration/Firestore-emulator/build, Flutter analyze, and repository validation passed; Flutter tests failed and the merge gate failed. Android AAB was skipped by design.
- **Root cause:** the new widget test expected `₹500.00` twice in “My pledges”; the actual UI renders one amount label. The remaining 72 Flutter tests passed, including the negative inactive-donor case. This is a test expectation mismatch, not a product defect indicated by the observed failure.
- **Repair committed:** [`4b4f5e7f0e0b52fc02d71e493184a98561732064`](https://github.com/JainCommunityPlatform/jain-community-platform/commit/4b4f5e7f0e0b52fc02d71e493184a98561732064) changes the amount-label assertion to exactly one visible match. The pledge request body, idempotency-key, success feedback, visible pledge status, and negative-path assertions remain intact.
- **Current status:** rerun CI on the new head and inspect every required job. PR #189 remains open; do not merge until all required checks are green and it is mergeable. Post-merge CI must be verified separately or recorded UNKNOWN. Android build/upload remains manual/on-demand.

---

## Latest verified state — PR #188 merged; Flutter donor pledge journey regression in progress (13 October 2026)

- **Merged PR #188:** [donor pledge creation HTTP contract](https://github.com/JainCommunityPlatform/jain-community-platform/pull/188), merge commit `a2761bcdd4c5b23909a474928ad37802e38fc8fe`.
- **Exact-head CI:** [run #818](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38422723605) passed on head `3e632fc142afbe26f2535515dfde21260132e250`. The API test verifies resolved tenant, authenticated donor, campaign, amount, idempotency key and success audit; inactive tenant-donor rejection returns 403 without success audit.
- **Post-merge CI for PR #188:** **UNKNOWN**. The available commit workflow lookup does not expose push-triggered default-branch runs for merge commit `a2761bcdd4c5b23909a474928ad37802e38fc8fe`; PR-head CI is not a substitute.
- **Merged PR #179:** [cross-tenant finance read denial](https://github.com/JainCommunityPlatform/jain-community-platform/pull/179), merge commit `e0a8a5eb5f5a3429e13b6ecaded64c118cb61f43`; exact-head [CI #790](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38342494756) passed. Post-merge CI is **UNKNOWN** from the available run/status endpoints.
- **Current branch:** `qa/flutter-donor-pledge-journey`. New widget tests exercise the real `DonorGivingPage` and `ApiClient` with a mocked HTTP client: successful campaign → pledge submission → refreshed “My pledges” view, plus inactive-donor API failure feedback without a false success message. The BDD specification and QA inventory were updated on this branch.
- **Evidence boundary:** Flutter widget tests with mocked HTTP verify request method/path/body/idempotency header and visible state transitions. They do not establish live API connectivity, Firebase identity, persisted Firestore behavior, or staging/device verification.
- **Next:** inspect exact-head CI for this branch, fix real failures without weakening assertions, merge only if required checks pass and the PR is mergeable, verify push-triggered default-branch CI where available (otherwise record UNKNOWN), update issue #162, and continue the P0 donation lifecycle / payment-to-receipt UI integration gap. Android build/upload remains manual/on-demand.

---

## Latest verified state — PR #182 merged; startup session restoration test completed (13 October 2026)

- **Merged:** [PR #182 — startup session restoration regression](https://github.com/JainCommunityPlatform/jain-community-platform/pull/182), merge commit [3033dacd16f13bf9b5ad830d978c39c84270bd0e](https://github.com/JainCommunityPlatform/jain-community-platform/commit/3033dacd16f13bf9b5ad830d978c39c84270bd0e).
- **Exact-head CI:** [run #800](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38379823621) passed backend lint/unit/integration/Firestore-emulator/build, Flutter analyze/tests, repository validation, and merge gate on head `7c5a3bc870b8e82fd6ac3d671fb7e9e4b1b5e546`. Android AAB was skipped by design.
- **Post-merge CI for #182:** **UNKNOWN**. The available commit-run lookup did not return a push-triggered run for merge commit `3033dacd16f13bf9b5ad830d978c39c84270bd0e`; exact-head PR CI is not proof of post-merge CI.
- **Completed:** the unique startup restoration test from stale branch `qa/session-restore-on-startup` was ported onto current master and merged. It verifies one backend session load and restoration of user, tenant, admin status, and permission roles using mocked Firebase auth and backend session services.
- **Superseded branch:** `qa/session-signout-route-refresh` was 37 commits behind master; its sign-out redirect behavior is already covered by `apps/flutter/test/widget_test.dart` test `redirects an open protected route to login when Firebase signs out`. Do not merge the stale branch.
- **Next:** continue to the next highest-priority unfinished P0 gap in issue #162 and the QA inventory. Device/emulator restart and production API verification remain open. Android build/upload remains manual/on-demand.

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
