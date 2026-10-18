## Latest execution — PR #197 merged; website tenant-boundary regression in progress (14 October 2026)

- **Merged:** [PR #197 — cross-tenant finance approver decisions](https://github.com/JainCommunityPlatform/jain-community-platform/pull/197), merge commit `8b73a6d81e71c447e925c193fd62044bdac4da74`.
- **Exact-head CI:** [CI #858](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38513835626) passed backend lint/unit/integration/Firestore-emulator/build, Flutter analyze/tests, repository validation and merge gate.
- **Post-merge CI:** [CI #859](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38552926706) passed the same applicable checks on the default branch. Android AAB was skipped by design.
- **Current branch:** `qa/website-config-tenant-boundary` adds HTTP integration regressions for a content manager from tenant B attempting to update or reset tenant A's website configuration, and for a finance viewer attempting an unauthorized website update. Each must return 403 before the website service is invoked.
- **Evidence boundary:** mocked membership and WebsiteService HTTP tests; persisted website configuration, actual Storage upload and staging identity checks remain open.
- **Next:** inspect exact-head CI, repair genuine failures without weakening assertions, merge only when all required checks pass and the PR is mergeable, verify post-merge CI, then continue P0 route inventory and persisted donation lifecycle. Android build/upload remains manual/on-demand.

---


## Latest execution — PR #194 merged; finance revocation matrix in progress (14 October 2026)

- **Merged:** [PR #194 — cross-tenant expense and adjustment rejection denial](https://github.com/JainCommunityPlatform/jain-community-platform/pull/194), merge commit `1cf74488f16e643aca4835c222102d3b0f63a867`.
- **Exact-head CI:** [run #853](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38505114157) passed backend lint/unit/integration/Firestore-emulator/build, Flutter analyze/tests, repository validation and merge gate on head `caf88ebaa0d8455b77871c1fe5fe102bab2b91a0`. Android AAB was skipped by design.
- **Post-merge CI:** UNKNOWN. Commit workflow lookup returned no run for the merge commit; do not infer post-merge success from PR-head CI.
- **Current branch:** `qa/finance-role-revocation-protected-route-matrix` extends QA-006 so revoking finance access is checked against seven tenant-scoped read routes: expenses, payments, adjustments, pledges, receipts, summary, and reconciliation. Each request must return 403 and avoid calling its read service.
- **Evidence boundary:** the HTTP test models the membership role transition in memory. Persisted Firestore revocation, token/session propagation, and staging verification remain open.
- **Next:** run exact-head CI, repair genuine failures without weakening assertions, merge only if green/mergeable, verify post-merge CI, then continue the P0 route matrix and persisted donation lifecycle. Android build/upload remains manual/on-demand.

---

## Latest execution — cross-tenant expense/adjustment rejection route coverage in progress (14 October 2026)

- **Previous P0 item merged:** [PR #193 — deny cross-tenant payment rejection](https://github.com/JainCommunityPlatform/jain-community-platform/pull/193), merge commit `daf2a43d8f1c0d3209fc3afae1a505d6063f7927`; exact-head [CI #851](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38504621506) passed.
- **Current branch:** `qa/cross-tenant-expense-adjustment-rejection-denial` adds two route-matrix cases to the existing cross-tenant financial-write regression: rejecting an expense and rejecting an adjustment must return 403 before invoking the decision service or emitting a success audit event.
- **Scenario evidence:** executable in `apps/api/test/app.e2e-spec.ts`; behavioural specification and QA inventory updated in this branch. These are HTTP tests with mocked membership/service/audit; persisted Firestore isolation remains separately covered and staging/device verification is still open.
- **CI status:** new branch CI not yet confirmed. Do not merge before every required check passes on the exact latest head and mergeability is confirmed. Post-merge CI for PR #193 is not exposed by the available commit-run lookup, so it remains UNKNOWN until directly verified.
- **Next:** close this route gap, then continue the P0 persisted UI → API → Firestore donation lifecycle and finish the complete role × protected-route inventory. Android build/upload remains manual/on-demand.

---

## Latest execution — PR #192 merged; cross-tenant payment rejection denial in progress (14 October 2026)

- **Merged:** [PR #192 — deny cross-tenant payment recording](https://github.com/JainCommunityPlatform/jain-community-platform/pull/192), merge commit `a071ebb6ab88f33178d09fe44aa98b65293cd9ea`.
- **Exact-head CI:** [CI #846](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38504152722) passed backend lint/unit/integration/Firestore-emulator/build, Flutter analyze/tests, repository validation and merge gate on `d89f826d3d1248c2136d3db177e54b9947bd4608`; Android AAB was skipped by design.
- **Post-merge CI:** [CI #847](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38504392374) completed successfully on the merge commit. Backend lint/unit/integration/Firestore-emulator/build, Flutter analyze/tests, repository validation and merge gate passed; Android AAB was skipped by design.
- **Current P0:** [PR to be opened] — deny a finance approver whose membership belongs to another tenant from rejecting a payment; assert HTTP 403, no rejection-service call and no success audit.
- **Evidence boundary:** HTTP test uses mocked membership, GivingService and audit. Persisted Firestore cross-tenant payment decision isolation is covered separately by emulator tests; staging/device verification remains open.
- **Release policy:** Android build/upload remains manual/on-demand.

---

## Latest execution — PR #191 merged; cross-tenant payment recording denial in progress (14 October 2026)

- **Merged:** [PR #191 — deny cross-tenant payment approval](https://github.com/JainCommunityPlatform/jain-community-platform/pull/191), merge commit `a3918a09fe7a8cd64d5259a2511ab76e05209acf`.
- **Exact-head CI:** [CI #842](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38503605901) passed backend lint/unit/integration/Firestore-emulator/build, Flutter analyze/tests, repository validation and merge gate on `48bb1a356f040ae4b9f29afa050b550b0d7e70fd`; Android AAB was skipped by design.
- **Post-merge CI:** [CI #843](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38503917818) completed successfully on the merge commit. Backend lint/unit/integration/Firestore-emulator/build, Flutter analyze/tests, repository validation and merge gate passed; Android AAB was skipped by design.
- **Current P0:** [PR to be opened] — deny a finance operator whose membership belongs to another tenant from recording a payment in the active tenant; expect HTTP 403, no payment service call and no success audit.
- **Evidence boundary:** HTTP test uses mocked membership, GivingService and audit. Persisted Firestore cross-tenant payment/pledge isolation is covered separately by emulator tests; staging/device verification remains open.
- **Release policy:** Android build/upload remains manual/on-demand.

---

## Latest execution — PR #190 merged; cross-tenant payment approval denial in progress (14 October 2026)

- **Merged:** [PR #190 — donor receipt after approval refresh](https://github.com/JainCommunityPlatform/jain-community-platform/pull/190), merge commit `56e8d986b96ac48027881148475dc98f9d6ad590`.
- **Exact-head CI:** [CI #835](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38502664984) passed on `2ea0fa41264a2979de8be50e16932df717e57205`; backend, Flutter analyze/tests, repository validation and merge gate passed. Android AAB was skipped by design.
- **Post-merge CI:** [CI #836](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38503267430) completed successfully on the merge commit. Backend lint/tests/build, Flutter analyze/tests, repository validation and merge gate passed; Android AAB was skipped by design.
- **Current P0:** [PR #191 — deny cross-tenant payment approval](https://github.com/JainCommunityPlatform/jain-community-platform/pull/191) denies a finance approver whose membership belongs to another tenant from approving a payment. New HTTP regression in `apps/api/test/app.e2e-spec.ts` asserts HTTP 403, no approval-service call and no success audit.
- **Evidence boundary:** HTTP authorization test uses mocked membership, GivingService and audit; persisted cross-tenant denial is covered separately by Firestore-emulator tests. Production/staging verification remains open.
- **Release policy:** Android build/upload remains manual/on-demand.

---

## Latest execution — PR #189 merged; donor receipt refresh regression in progress (14 October 2026)

- **Merged:** [PR #189 — Flutter donor pledge journey](https://github.com/JainCommunityPlatform/jain-community-platform/pull/189), merge commit `88adb21d0330d2cc03d45b1b0c1b07ca3b759147`.
- **Exact-head CI:** [CI #822](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38435636205) passed on `ebd3c0aade33e0aa11e687bfa347d06a58053213`.
- **Post-merge CI:** [CI #823](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38495571718) completed successfully: repository validation, backend lint/unit/integration/Firestore-emulator/build, Flutter analyze/tests, and merge gate all passed on merge commit `88adb21d0330d2cc03d45b1b0c1b07ca3b759147`; Android AAB was skipped by design.
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

# JCP Autonomous QA Checkpoint\n\n## Consolidated P0 closure MR — 16 October 2026\n\n- Branch: `qa/p0-consolidated-authorization-closure`.\n- Scope: add the missing finance-viewer HTTP denial matrix for all nine financial write/decision routes; assert 403 and no financial service or success-audit side effects.\n- Closure gate: exact-head CI and post-merge default-branch CI must both pass. Reconcile the P0 inventory after evidence is available.\n- Explicitly not claimed: production/staging Firebase identity and device/session verification, external UPI/bank settlement, or full P1/P2 roadmap completion. Android AAB remains manual/on-demand.\n\n

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


- **PR #190 CI #832 failure and repair (14 October 2026):** [run #832](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38499891701) again failed only the receipt widget's exact date-label assertion; 73 Flutter tests passed and one failed. Backend checks and repository validation passed; merge gate correctly failed. Moving the fixture from midnight to noon UTC did not resolve the assertion, so the test now derives the expected medium-date string from `MaterialLocalizations` and the same fixed instant, while still asserting the actual rendered subtitle exactly equals `UPI • <localized issue date>`. Receipt visibility, receipt number and amount assertions remain. Await fresh exact-head CI.


## Current execution — platform tenant administration route matrix (14 October 2026)

- Previous PR #198 post-merge CI #861 completed successfully on merge commit `10eb9f1fc69a0b75637ff6feb5be28eb39e436ef`: repository validation, backend lint/unit/integration/Firestore emulator/build, Flutter analyze/tests and merge gate passed; Android AAB skipped by policy.
- Current branch: `qa/platform-tenant-admin-route-authorization`. Adds HTTP denials for non-platform users across tenant list/create/get/update, tenant-admin list/add and custom-domain verification routes. It also updates the coverage inventory, behavioral specification and roadmap.
- Required next: inspect exact-head CI, fix any real failures without weakening assertions, merge only if all required checks pass and the PR is mergeable, then record post-merge CI when available. Do not wait for post-merge CI to start the next task.
- Evidence boundary: mocked identity/Firestore in the NestJS HTTP pipeline; persisted tenant onboarding and production/staging identity remain open. Android build/upload stays manual/on-demand.


## Current execution — website media upload authorization (14 October 2026)

- PR #199 merged as `785e0164c64fd348cf42e69d35dff7194cbb2eab`; exact-head CI #862 passed repository validation, backend lint/unit/integration/Firestore emulator/build, Flutter analyze/tests, and merge gate. Android AAB skipped as intended.
- Current branch `qa/website-media-upload-authorization` adds route-level denials for cross-tenant content managers and finance-only viewers uploading website media; assert HTTP 403 and no Storage or audit side effects.
- Evidence boundary: mocked identity, Storage and audit in the real NestJS route/guard pipeline. Actual Firebase Storage and staging identity remain open.
- Required next: inspect exact-head CI, fix genuine failures without weakening assertions, merge only if all required jobs pass and PR is mergeable; record post-merge CI when available, but do not wait to begin the next task. Android build/upload remains manual/on-demand.


## Execution checkpoint — website media MIME security merged; empty multipart validation in progress (14 October 2026)

- PR #209 merged as `c59f75163cf99e46d1996b16ccb28d32c51f8010` to reject MIME-spoofed non-image payloads. Post-merge [CI #882](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38596476095) passed repository validation, backend lint/tests/build, Flutter analyze/tests and merge gate; Android AAB was skipped by design.
- Current branch `qa/reject-empty-multipart-website-image` adds HTTP-level validation for zero-byte multipart website image uploads, asserting 400 before Storage and audit side effects.
- Evidence boundary: mocked Storage/audit route integration. Real Firebase Storage and staging/device behavior remain open.
- Next: verify exact-head CI and merge only with all required checks green and mergeability confirmed; verify post-merge CI and continue the P0 persisted donation-to-receipt connected journey. Android build/upload remains manual/on-demand.


## Execution checkpoint — donor UI rejection receipt regression (15 October 2026)

- PR #215 merged as `6b8333fee554f19b2807bb57810f29ff235cbd51`; exact-head CI #892 and post-merge default-branch CI #893 passed backend, Flutter, repository validation and merge gate. Android AAB was skipped as intended.
- New regression branch `qa/donor-rejected-payment-no-receipt` adds a donor widget test for the rejection-side display contract: after finance rejects a payment, refreshing donor receipt history must continue to show “No receipts yet”, with no receipt number or paid amount.
- Evidence boundary: this is a Flutter widget test using mocked HTTP; backend HTTP→Firestore emulator rejection persistence is covered separately by PR #215. Connected Flutter→live API and staging/device verification remain open.
- Next: inspect exact-head CI, merge only if all required checks pass and GitHub confirms mergeability, record post-merge CI, then continue the next P0 in the connected donor journey. Android build/upload remains manual/on-demand.


## Execution checkpoint — donor receipt retry regression (15 October 2026)

- PR #216 merged as `3bf60e3c04f48158a349dc82a72bb6a54b35de17`. Exact-head CI #896 passed backend lint/tests/build, Flutter analyze/tests, repository validation and merge gate; Android AAB was skipped by design. Post-merge CI #897 is pending at this checkpoint and must be verified.
- Current branch `qa/donor-receipt-load-retry` adds a Flutter workflow regression for receipt history returning HTTP 503 once and succeeding on retry.
- Assertions cover visible recoverable error, no receipt before retry, a second receipt request, receipt number and amount after retry, and no widget exception.
- Evidence boundary: mocked HTTP in Flutter widget tests. Backend emulator coverage and live connected Flutter→API→Firestore/staging/device verification are separate.
- Android build/upload remains manual/on-demand.


## Latest execution — PR #217 merged; post-merge CI pending (15 October 2026)

- **Merged:** [PR #217 — test donor receipt-history retry](https://github.com/JainCommunityPlatform/jain-community-platform/pull/217), merge commit `339f30cefe7d6cfbc9abe7bd65ee01b7831662f0`.
- **Exact-head CI:** [run #898](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38676951380) passed all required checks on head `25e3264318b9599f3b5c10af1017deb481e62ed6`. Android AAB was skipped as designed.
- **Post-merge:** [run #899](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38679831894) started on the merge commit; all three applicable jobs were queued when checked. Continue polling and record the actual terminal result.
- **Completed coverage:** donor rejection + refresh keeps receipt history empty; temporary HTTP 503 shows a recoverable error, and retry renders the receipt number and amount. Both are Flutter widget tests with mocked HTTP.
- **Next P0:** establish a connected Flutter→NestJS API→Firestore-emulator donor receipt journey, then perform controlled staging/device verification. Keep evidence layers separate and do not infer live connectivity from mocks.
- **Release policy:** Android build/upload remains manual/on-demand.


## Latest execution — connected donor UI/API/emulator journey in progress (15 October 2026)

- **Current PR:** [#219](https://github.com/JainCommunityPlatform/jain-community-platform/pull/219) adds a test-only NestJS server using the Firestore emulator and a Flutter widget test using real HTTP rather than `MockClient`.
- **Expected path:** create campaign and pledge, record and approve payment through API routes, persist receipt in Firestore emulator, then load and render the receipt in the Flutter donor UI.
- **CI gate:** exact-head CI is authoritative; do not merge if the connected test is skipped or failing. Fix the underlying issue, then verify post-merge CI.
- **Evidence boundary:** local emulator only. Staging/device and production Firebase remain unverified. Android build/upload remains manual/on-demand.



## Current execution — Bearer authentication header parsing (15 October 2026)

- **Current branch:** `qa/bearer-scheme-case-insensitive` updates `AuthenticationGuard` to parse the Bearer authentication scheme case-insensitively, matching HTTP authentication scheme semantics.
- **Tests added:** reject missing token, unsupported authorization scheme and empty Bearer credentials before verifier calls; accept mixed-case Bearer scheme and pass the trimmed token to the existing verifier.
- **Exact-head CI:** pending. Do not merge until focused tests and all required CI checks pass on the latest head SHA.
- **Evidence boundary:** code-level guard unit tests only. Real Firebase token expiry/revocation, staging/device login and membership/session propagation remain open. Android build/upload remains manual/on-demand.



## Verified post-merge — connected donor receipt journey (15 October 2026)

- **Merged:** [PR #219](https://github.com/JainCommunityPlatform/jain-community-platform/pull/219) as `268bcf9a80574baa254e14683e5c8919279ca69e`.
- **Exact-head CI:** [#910](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38690852215) passed backend lint/tests/build, Flutter analyze/tests, repository validation and merge gate. Connected test “renders a Firestore-persisted receipt from the live NestJS API” ran and passed (1 test).
- **Post-merge CI:** [#911](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38691150536) passed on merge commit `268bcf9a80574baa254e14683e5c8919279ca69e`; backend, Flutter, repository validation and merge gate succeeded. Android AAB was skipped as intended.
- **Current P0:** [PR #220](https://github.com/JainCommunityPlatform/jain-community-platform/pull/220) adds case-insensitive Bearer scheme parsing and guard tests for missing, empty and unsupported credentials. Exact-head CI is running/pending.
- **Still open:** Firebase emulator/staging/device authentication, token expiry/revocation, membership/session propagation and device restart. Android build/upload remains manual/on-demand.


## Latest execution — Firebase revoked-token rejection merged (15 October 2026)

- **Merged:** [PR #222](https://github.com/JainCommunityPlatform/jain-community-platform/pull/222) as `708887ebe75f70675dc89adbd370c32ddd9da679`.
- **Exact-head CI:** [run #917](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38712069443) passed on `aee8799630a563543e6c9942dfd1e118ff4929e0`.
- **Change:** Firebase ID-token verification now calls `verifyIdToken(token, true)` so revoked tokens are rejected; unit tests assert the revocation-check flag and 401 behavior for a revoked token.
- **Post-merge CI:** [run #918](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38743276237) passed on merge commit `708887ebe75f70675dc89adbd370c32ddd9da679`; Flutter analyze/tests, backend lint/tests/build, repository validation passed. Android AAB was skipped by design.
- **Remaining P0:** controlled staging/device verification of sign-in, restart/session restore, expired/revoked token handling, role/membership propagation, tenant routing and donor receipt history. Unit tests do not prove live Firebase behavior. Android AAB build/upload remains manual/on-demand.


## Verified execution — restored Firebase session rejection handled (15 October 2026)

- **Merged:** [PR #225](https://github.com/JainCommunityPlatform/jain-community-platform/pull/225) as `1c93a488308840ee160ecec8c89d308ef22a660b`.
- **Exact-head CI:** [run #927](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38745451933) passed backend lint/tests/build, Flutter analyze/tests, repository validation and merge gate.
- **Post-merge CI:** [run #928](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38745904260) passed on the merge commit; Android AAB skipped by design.
- **Behavior:** if Firebase restores a cached user but backend session loading returns HTTP 401 (including revoked credentials), the controller signs Firebase out and ends in the signed-out state. Non-401 failures retain recoverable error handling.
- **Next P0:** controlled staging/device verification of Firebase sign-in, token expiry/revocation, app restart/session restoration, role/membership propagation, tenant routing and donor receipt history. Unit tests and emulator tests are not production/device evidence. Android build/upload remains manual/on-demand.


## Verified execution — persisted finance-role revocation (15 October 2026)

- **Merged:** [PR #229](https://github.com/JainCommunityPlatform/jain-community-platform/pull/229) as `b1f06fa5f066b800ad8a6c5cbf074b0623708404`.
- **Exact-head CI:** [#934](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38747984088) passed all applicable checks, including backend, Flutter, repository validation and merge gate.
- **Post-merge CI:** [#935](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38748409681) passed on merge commit `b1f06fa5f066b800ad8a6c5cbf074b0623708404`; backend, Flutter, repository validation and merge gate passed; Android AAB skipped by design.
- **Change:** the Firestore-emulator HTTP suite now uses the real `MembershipService`; it persists removal of `FINANCE_OPERATOR` while retaining `CONTENT_MANAGER`, then proves the next protected expenses request returns 403 before finance data access.
- **Next P0:** production/staging identity and device verification of role/session propagation remains blocked on controlled Firebase configuration and a test device/session. Do not use production donor/financial data. Android build/upload remains manual/on-demand.


## Verified execution — refund adjustment and reconciliation (15 October 2026)

- **Merged:** [PR #231](https://github.com/JainCommunityPlatform/jain-community-platform/pull/231) as `b92f06a5940c913ad65f6db82802e725add17212`.
- **Exact-head CI:** [#938](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38749529638) passed; **post-merge CI:** [#939](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38749980056) passed on the merge commit.
- **Coverage:** the Firestore-emulator HTTP journey creates and approves a payment, requests and independently approves a refund adjustment, verifies the persisted adjustment, confirms the donor balance decreases while the original receipt remains unchanged, and checks net reconciliation totals.
- **Next P0:** persisted rejected-adjustment, over-adjustment and reversal paths; external UPI/bank settlement and production/staging/device verification remain separate evidence gates. Android build/upload remains manual/on-demand.


## Verified execution — expense maker-checker and reconciliation (15 October 2026)

- **Merged:** [PR #235](https://github.com/JainCommunityPlatform/jain-community-platform/pull/235) as `76dbbacf375b1e95ba96a7f7b09f44d9b13d4fbe`.
- **Exact-head CI:** [#945](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38752045254) passed; **post-merge CI:** [#946](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38752615989) passed on the merge commit.
- **Coverage:** the Firestore-emulator HTTP suite verifies expense creation, maker-checker self-approval denial, independent approval, rejection, persisted states and reconciliation that subtracts only approved expenses.
- **Next P0:** finish remaining protected-route/write authorization matrix and preserve controlled staging/device verification as a separate gate. Operational finance reports are not a general ledger; external UPI/bank settlement remains unverified. Android build/upload remains manual/on-demand.


## Consolidated P0 route audit — follow-up MR (16 October 2026)

- **Baseline:** PR #239 merged as `5749f9016fe51ac649764a0af97f233878ee784f`; exact-head CI #952 and post-merge CI #953 passed. Android AAB was skipped by design.
- **Audit finding:** the dedicated `TenantMembershipController` endpoints for listing, assigning-by-email, and updating roles had unit tests but lacked an explicit HTTP-level authorization/escalation matrix.
- **Current work:** branch `qa/p0-membership-role-http-authorization` adds route-level denials for finance viewers and cross-tenant tenant administrators; prevents financial-role grants or replacement through the general membership endpoints; and verifies an authorized non-financial assignment remains successful and audited.
- **Next:** inspect exact-head CI and fix genuine failures; do not weaken assertions. Merge only when required checks pass and GitHub confirms mergeability, then verify post-merge CI and continue the P0 route audit. Production/staging Firebase/device and external UPI/bank settlement remain environment/provider gates. Android build/upload stays manual/on-demand.


## P0 route-audit follow-up — internal profile migration token (16 October 2026)

- **Finding:** `ProfileMigrationController` unit tests verified the token check, but the HTTP pipeline did not explicitly prove that the `x-jcp-internal-token` header is bound and enforced for both provisioning and activity-recording routes.
- **Current MR:** branch `qa/p0-internal-migration-token-http-coverage` adds missing/wrong-token 401 assertions and valid-token success assertions for both routes, with service side-effect checks.
- **Validation:** run exact-head CI and fix any genuine failures without weakening assertions. Merge only with all required checks green and mergeability confirmed; verify post-merge CI. Deployment secret management/rotation, Firebase/device verification and external UPI/bank settlement remain separate environment/provider gates. Android AAB stays manual/on-demand.


## Consolidated profile and notification route audit — in progress (16 October 2026)

- **Prior verified merges:** PR #239 exact-head CI #952/post-merge #953; PR #240 exact-head CI #954/post-merge #955; PR #241 exact-head CI #957/post-merge #958 all passed. Android AAB remained skipped by policy.
- **Current branch:** `qa/p0-profile-identity-route-closure` adds HTTP integration tests for profile registration-context and contact-linking identity boundaries, rejects caller-supplied profile identity fields, and covers all four notification HTTP routes for authenticated-user and active-tenant scoping.
- **Tests use mocked identity/services:** they prove HTTP guard/interceptor/controller argument scoping, not persisted profile/notification delivery or production Firebase/device behavior.
- **Next:** run exact-head CI, repair genuine failures without weakening assertions, then reconcile the P0 route inventory and record any remaining environment-gated items. Keep Android AAB manual/on-demand.


## Persisted cross-tenant finance isolation — in progress (16 October 2026)

- Baseline: PR #242 merged as ab4c3f83a062595fff0aa5c884f1b944d6464544; exact-head CI #961 and post-merge CI #962 passed. Android AAB skipped by policy.
- Current branch: qa/p0-persisted-cross-tenant-finance-isolation adds a Firestore-emulator HTTP regression using real persisted memberships: a finance operator assigned only to tenant B must be denied tenant A's payments read and expense creation before the financial service is invoked.
- Evidence boundary: controlled tenant resolver plus Firestore emulator; production Firebase/staging/device identity remains unverified. This strengthens, but does not claim to exhaust, every possible cross-tenant data query.
- Next: exact-head CI, repair genuine failures without weakening assertions, merge only when green/mergeable, verify post-merge CI, then reconcile the final deterministic P0 route and persisted-isolation coverage.


## Finance console critical widget coverage — in progress (16 October 2026)

- **Baseline:** PR #243 merged as `9e49119740ceb3479a9e0b6ff7e50352188a7198`; exact-head CI #963 and post-merge CI #964 passed. Android AAB skipped by policy.
- **Current branch:** `qa/p0-finance-console-widget-coverage` adds Flutter widget tests for finance overview loading and refresh, recoverable report failure/retry, and valid expense submission with paise conversion and an idempotency key.
- **Evidence boundary:** fake API client only; these tests do not prove persisted finance state, approval/rejection decisions, or staging/device behavior.
- **Next:** run exact-head CI and repair failures without weakening assertions; then decide from evidence whether additional finance-console widget scenarios belong in the same bounded P0 UI closure.


## Finance-console decision interactions — in progress (17 October 2026)

- **Merged baseline:** PR #244 — finance overview/refresh, report error/retry, and valid expense submission; exact-head CI #965 and post-merge CI #966 passed.
- **Current branch:** `qa/p0-finance-console-decision-journeys` adds Flutter widget tests for payment verify/reject, expense approve/reject, and adjustment approve/reject, including rejection reasons and exact API decision paths.
- **Evidence boundary:** fake API client only. Backend authorization, persisted maker-checker decisions/reconciliation, production/staging identity and external UPI/bank settlement remain separate evidence gates.
- **Next:** exact-head CI, repair real failures without weakening assertions, merge only when required checks are green/mergeable, then verify post-merge CI and reconcile the remaining P0 inventory. Android AAB remains manual/on-demand.


## Consolidated finance-console decision resilience — 17 October 2026

- **Baseline:** PR #246 merged as `217f2ee5137bed17b9206afd056f6b113e38a825`; the available workflow-run/status lookup did not expose post-merge CI for that merge commit, so post-merge CI is **UNKNOWN**, not assumed green.
- **Current branch:** `qa/p0-finance-console-decision-resilience` extends the existing finance-console widget suite with three grouped scenarios: required rejection reason and cancel/no-submit behavior across payments, expenses and adjustments; decision API failure shows recoverable error without false success; successful approval reloads finance lists.
- **Evidence boundary:** fake API client/widget tests only; no claim of persisted decision state, maker-checker authorization, staging/device behavior or external UPI/bank settlement.
- **Next:** inspect exact-head CI, fix genuine failures without weakening assertions, merge only when all required checks pass and the PR is mergeable; verify post-merge CI if the run is exposed, otherwise record UNKNOWN. Then reconcile the P0 inventory and batch remaining related P1 workflow tests into a single appropriately scoped MR. Android AAB remains manual/on-demand.


## Consolidated website save/reload persistence — 17 October 2026

- **Previous merged work:** [PR #247](https://github.com/JainCommunityPlatform/jain-community-platform/pull/247) merged as `1e40a10ce1f211957eff90b53a73d530f466bb69`; exact-head CI [#970](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38999591669) passed backend, Flutter, connected giving emulator journey, repository validation and merge gate. Android AAB skipped by policy.
- **Post-merge CI:** UNKNOWN. The connected commit-run and combined-status methods returned no run/status for the merge commit; PR-head CI is not proof of default-branch post-merge CI.
- **Current branch:** `qa/p1-website-save-reload-persistence` adds grouped website tests: partial updates preserve unrelated existing content and increment version; a failed persistence write must not emit a success audit; and Firestore-emulator save/reload keeps two tenant website configurations isolated.
- **Evidence boundary:** the emulator test proves Firestore config round-trip and tenant isolation, not the full Flutter editor upload/publish/refresh journey, real Firebase Storage, or staging/device rendering.
- **Next:** inspect exact-head CI, repair genuine failures without weakening assertions, merge only when all required checks pass and the PR is mergeable, record post-merge status accurately, then continue the remaining P1 editor/media UI workflow. Controlled Firebase staging/device and external UPI/bank settlement remain separate environment/provider gates. Android AAB remains manual/on-demand.


## Website media upload failure-path tests — 17 October 2026

- **PR #248:** merged as `dc13bdd740f9fe9bc56f039190142f29d3305d10`; exact-head CI [#972](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39001107290) passed backend lint/unit/integration/Firestore emulator/build, Flutter analyze/tests/connected giving journey, repository validation, and merge gate. Android AAB skipped by policy.
- **Post-merge CI:** UNKNOWN; the workflow-run and combined-status lookups returned no entries for the merge commit.
- **Current branch:** `qa/p1-website-media-upload-failure-paths` strengthens controller regressions for missing/empty files, storage failure without a success audit, tenant-scoped upload context, and deterministic tenant mock reset between tests.
- **Evidence boundary:** controller unit tests only. Real Firebase Storage, MIME/size enforcement through the HTTP multipart pipeline, retry/progress UI, and device rendering remain open.
- **Next:** exact-head CI; fix genuine failures without weakening assertions; merge only when all required checks pass and mergeability is confirmed. Then continue the grouped P1 website editor/media journey and retain environment verification as an explicit gate. Android AAB remains manual/on-demand.


## Website multipart upload size regression — 17 October 2026

- **Previous item merged:** [PR #249](https://github.com/JainCommunityPlatform/jain-community-platform/pull/249), merge commit `88f02e79c633989fdcba81f492999a982ff8b43a`; exact-head CI [#974](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39001358277) passed Flutter analysis/tests and connected giving journey, backend lint/unit/integration/Firestore emulator/build, repository validation, and merge gate. Android AAB was skipped by design.
- **Post-merge CI:** UNKNOWN; commit workflow lookup returned no PR-triggered runs for the merge SHA.
- **Current branch:** `qa/p1-website-multipart-size-rejection` adds an HTTP multipart integration regression sending a file one byte above the 10 MB limit; expects HTTP 413 and asserts neither Storage nor success audit is invoked.
- **Evidence boundary:** HTTP pipeline test uses mocked Storage. Existing storage unit tests cover image-signature validation and the 10 MB service limit; real Firebase Storage, client retry/progress and device rendering remain open.
- **Next:** verify exact-head CI, fix genuine failures without weakening assertions, merge only after all required checks pass and mergeability is confirmed, verify post-merge CI where exposed, then continue the next highest-priority uncovered website/editor workflow. Android AAB remains manual/on-demand.


## Website multipart limit merged; editor publish recovery next — 17 October 2026

- **Merged:** [PR #250](https://github.com/JainCommunityPlatform/jain-community-platform/pull/250), merge commit `5c85faf4816faa23312300bc6eade5ab2e6d2839`.
- **Exact-head CI:** [run #976](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39002602406) passed backend lint/unit/integration/Firestore-emulator/build, Flutter analysis/tests/connected giving journey, repository validation and merge gate.
- **Post-merge CI:** [run #977](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39002795266) passed the same applicable checks on the default branch. Android AAB was skipped by design.
- **Current branch:** `qa/p1-website-editor-save-failure-reopen` adds a Flutter widget regression: after a successful publish, a simulated later save failure must not replace persisted output; reopening the editor must load the last successful title.
- **Evidence boundary:** the new test uses a stateful fake repository. Backend service and Firestore-emulator persistence tests are separate evidence; this does not prove the complete real Flutter → API → Firestore journey or staging/device rendering.
- **Next:** exact-head CI, fix genuine failures without weakening assertions, merge only when required checks pass and the PR is mergeable, verify post-merge CI, then continue remaining website/media UI gaps. Android AAB remains manual/on-demand.


## Website editor failure recovery merged; gallery upload retry next — 17 October 2026

- **Merged:** [PR #251](https://github.com/JainCommunityPlatform/jain-community-platform/pull/251), merge commit `ab3df2b1a83f54769748c63fe3431e1b42b20260`.
- **Exact-head CI:** [run #984](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39003839801) passed Flutter analysis/tests/connected giving journey, backend lint/unit/integration/Firestore-emulator/build, repository validation and merge gate.
- **Post-merge CI:** [run #985](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39004013801) passed the same applicable checks on the default branch. Android AAB was skipped by design.
- **Current branch:** `qa/p1-website-gallery-upload-retry` adds a widget regression for a failed gallery image upload followed by a successful retry, asserting the item can be saved and published with one successful URL.
- **Evidence boundary:** fake-repository widget coverage only. Real Storage networking, delayed progress rendering, URL reachability and staging/device behavior remain open.
- **Next:** inspect exact-head CI, fix genuine failures without weakening assertions, merge only when required checks pass and the PR is mergeable, verify post-merge CI, then continue the remaining website/media UI gaps. Android AAB remains manual/on-demand.


## Website gallery pre-upload validation — 18 October 2026

- **Previous item merged:** [PR #252](https://github.com/JainCommunityPlatform/jain-community-platform/pull/252), merge commit `aa2c8bc7cf87f447dc9a06f9b8de0f74546b4119`; exact-head CI #990 and post-merge CI #991 must be confirmed from Actions before reporting final state.
- **Current branch:** `qa/p1-website-gallery-preupload-validation` adds widget regressions for rejecting a gallery image larger than 10 MB, rejecting a selected file with no bytes, and safely handling picker cancellation; asserts no upload attempt and no widget exception.
- **Evidence boundary:** uses a fake repository and injected picker. Real device picker behaviour, delayed upload progress, Firebase Storage networking, public URL reachability, and staging/device rendering remain open.
- **Next:** inspect exact-head CI, repair genuine failures without weakening assertions, merge only after all required checks pass and the PR is mergeable, verify post-merge CI, then continue the remaining website/media UI gaps. Android AAB remains manual/on-demand.


## Website gallery pre-upload validation merged; upload progress guard next — 18 October 2026

- **Merged:** [PR #254](https://github.com/JainCommunityPlatform/jain-community-platform/pull/254), merge commit `b9273b12f38dc74cd07296f2809f625341616b0a`.
- **Exact-head CI:** [run #988](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39063564738) passed Flutter analyze/tests and connected giving journey, backend lint/unit/integration/Firestore-emulator/build, repository validation and merge gate. Android AAB was skipped by design.
- **Post-merge CI:** UNKNOWN; commit-workflow lookup returned no run for the merge commit. Exact-head CI is not being presented as post-merge evidence.
- **Current branch:** `qa/p1-website-upload-progress-guard` adds a delayed-upload widget regression asserting visible progress, disabled upload/cancel/save controls while the request is pending, one upload attempt, and successful completion recovery.
- **Evidence boundary:** fake repository with a controlled future; it verifies UI state, not network percentage, actual Firebase Storage, URL reachability, or device/staging behavior.
- **Next:** inspect exact-head CI, fix genuine failures without weakening assertions, merge only after all required checks pass and the PR is mergeable, verify post-merge CI where exposed, then continue remaining website/media UI gaps. Android AAB remains manual/on-demand.


## Verified execution — website gallery upload progress guard (18 October 2026)

- **Merged:** [PR #255](https://github.com/JainCommunityPlatform/jain-community-platform/pull/255), merge commit `f51d29457190ee2a1216e3e386005da0619bb6f4`.
- **Exact-head CI:** [run #990](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39063829260) passed Flutter analysis/tests and connected giving journey, backend lint/unit/integration/Firestore emulator/build, repository validation, and merge gate. Android AAB was skipped by design.
- **Post-merge CI:** UNKNOWN; the commit-workflow lookup returned no workflow runs for the merge commit.
- **Coverage:** delayed-upload widget regression verifies uploading feedback, progress indicator, disabled upload/cancel/save controls while pending, one upload attempt, and successful completion feedback.
- **Current branch:** `qa/p1-website-invalid-upload-url` validates upload URLs as HTTPS with a non-empty host before assigning them to the gallery field; a widget regression uses a `javascript:` URL and expects recoverable error feedback.
- **Evidence boundary:** controlled fake repository; actual Firebase Storage/network progress, public URL reachability, and staging/device behavior remain open.
- **Next:** inspect exact-head CI for invalid URL validation, fix genuine failures without weakening assertions, merge only when required checks pass and PR mergeability is confirmed, verify post-merge CI independently, then continue the next website/media gap. Android AAB remains manual/on-demand.


## Verified execution — website gallery upload URL validation (18 October 2026)

- **Merged:** [PR #256](https://github.com/JainCommunityPlatform/jain-community-platform/pull/256), merge commit `238718e05e00319c3cb10e0ef5c5934bb3ff934e`.
- **Exact-head CI:** [run #992](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39064179750) passed Flutter analyze/tests and connected giving journey, backend lint/unit/integration/Firestore-emulator/build, repository validation, and merge gate. Android AAB skipped by design.
- **Post-merge CI:** [run #39087779879](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39087779879) passed on the default branch, including Flutter tests/connected giving journey, backend lint/unit/integration/Firestore-emulator/build, repository validation and merge gate. Android AAB was skipped by design.
- **Coverage:** upload results must parse as HTTPS URLs with a non-empty host; the widget regression rejects a `javascript:` URL and verifies recoverable failure feedback without an uncaught UI exception.
- **Evidence boundary:** fake repository/widget test only. Real Firebase Storage networking, public URL reachability and staging/device behavior remain unverified.
- **Current branch:** `qa/p1-gallery-upload-url-recovery-batch` groups the remaining URL validation matrix (HTTP, relative, empty and hostless HTTPS results), asserts invalid URLs are not written into the image field, and verifies recovery after a failed upload response. This is grouped with related gallery URL tests rather than split into separate MRs.
- **Next:** verify exact-head CI, fix genuine failures without weakening assertions, merge only when required checks pass and PR mergeability is confirmed, check post-merge CI independently, then reassess the remaining P1 inventory. Android AAB remains manual/on-demand.


## Post-merge verification — website gallery URL validation (18 October 2026)

- **Default-branch CI:** [run #39087779879](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39087779879) passed after PR #256 merge commit `238718e05e00319c3cb10e0ef5c5934bb3ff934e`.
- Flutter tests and the connected giving journey passed; backend lint, unit/integration tests, Firestore-emulator tests and build passed; repository validation and merge gate passed. Android AAB was skipped by design.
- **Current work:** [PR #257](https://github.com/JainCommunityPlatform/jain-community-platform/pull/257) groups invalid gallery URL variants and retry recovery into one MR. Exact-head CI #39087830219 is still running; repository validation and Flutter unit/widget tests, backend tests and build have passed so far, while the connected Flutter → NestJS → Firestore journey remains in progress at last observation.
- **Next:** wait for the exact PR-head connected journey and merge gate; fix any real failure without weakening tests, then merge only if every required check passes and GitHub confirms mergeability. Android AAB remains manual/on-demand.


## Verified execution — grouped gallery URL validation and retry recovery (18 October 2026)

- **Merged:** [PR #257](https://github.com/JainCommunityPlatform/jain-community-platform/pull/257), merge commit `ea45df4972dc21dfe29f3a9dea94019acfae55f8`.
- **Exact-head CI:** [run #39087984656](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39087984656) passed Flutter analysis/tests and connected giving journey, backend lint/unit/integration/Firestore-emulator/build, repository validation and merge gate. Android AAB skipped by design.
- **First CI attempt:** [run #39087830219](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39087830219) failed the connected-giving widget journey while the new gallery widget tests passed. The updated exact-head run passed without weakening the test.
- **Post-merge CI:** [run #39088157001](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39088157001) is in progress at the latest check; do not mark it green until all required jobs and merge gate pass.
- **Coverage:** grouped regressions reject HTTP, relative, empty and hostless HTTPS upload URLs; verify invalid values do not populate the image URL field; and verify valid retry recovery after an invalid URL response.
- **Evidence boundary:** fake repository/widget tests only. Real Firebase Storage networking, public URL reachability and staging/device behavior remain open.
- **Current branch:** `qa/p1-profile-contact-ui-regressions-batch` groups profile cancel/no-save, trimmed save/read-only recovery, save-failure retry, load retry/refresh, and contact-link validation/loading/failure recovery. This addresses QA-009 as one coherent UI regression MR rather than one-case MRs.
- **Next:** exact-head CI for the profile/contact batch, repair genuine failures without weakening assertions, merge only when required checks pass and mergeability is confirmed, then verify post-merge CI separately. Android AAB remains manual/on-demand.


## Verified execution — grouped profile/contact-linking UI tests (18 October 2026)

- **Merged:** [PR #258](https://github.com/JainCommunityPlatform/jain-community-platform/pull/258), merge commit `46a332a4b345b150aeb84cf991fcc721911ed45b`.
- **Exact-head CI:** [run #39088411925](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39088411925) passed Flutter analysis/tests and connected giving journey, backend lint/unit/integration/Firestore-emulator/build, repository validation and merge gate. Android AAB was skipped by design.
- **Post-merge CI:** [run #39088624672](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39088624672) failed the connected-giving receipt journey; the widget could not find the seeded campaign. Backend and repository validation passed. This is an existing integration-test reliability gap, not evidence that PR #258's profile tests failed.
- **Coverage:** profile edit cancel/no-save, trimmed save and read-only recovery, save failure/retry, load failure/retry, pull-to-refresh; contact-link invalid mobile validation, duplicate-submission prevention while pending and recoverable callback failure.
- **Evidence boundary:** fake repository/callback UI tests only. Full persisted UI/API round-trip and staging/device session behavior remain open.
- **Current branch:** `qa/p1-admin-members-ui-workflow-batch` groups add-member validation/create retry, contact validation/update, role change, removal and list refresh into one MR. QA-010 is addressed as a coherent UI workflow batch, not single-test MRs.
- **Next:** verify exact-head CI, repair real failures without weakening assertions, merge only when all required checks pass and PR mergeability is confirmed, then verify post-merge CI separately. Android AAB remains manual/on-demand.


## CI failure triage — tenant member UI batch (18 October 2026)

- **First exact-head run:** [CI #39088711839](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39088711839) passed repository validation but failed five newly added member-administration widget cases.
- **Root cause evidence:** Add-member and contact dialogs disposed their `TextEditingController` from the `showDialog(...).whenComplete` callback while the route transition could still rebuild the `TextFormField`. This produced "TextEditingController was used after being disposed" and subsequent widget-tree assertions. The role/remove cases also used immediately completing fake mutations, causing state changes while popup routes were being removed.
- **Fix in current branch:** dialog controllers now belong to dedicated StatefulWidget lifecycles and are disposed by widget `dispose()`; add/contact buttons disable while their callback is pending; fake mutation responses now yield asynchronously to model the real repository.
- **Status:** fix is committed on `qa/p1-admin-members-ui-workflow-batch`; exact-head CI for the updated head must verify it. Do not merge until all required checks pass.
- **Post-merge #258 CI:** the default-branch run failed only the connected-giving integration journey; its exact-head PR run #39088411925 had passed. Track this separately and fix the shared readiness/tenant-context reliability issue if it reproduces on the current PR head.


## Connected-giving CI readiness fix — 18 October 2026

- **Observed failure:** post-merge [CI #39088624672](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39088624672) and PR-head [CI #39089123588](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39089123588) failed the connected-giving journey; Flutter could not render the seeded campaign.
- **Log evidence:** the readiness loop repeatedly failed to connect to port 4317 and the background `npx ts-node` process exited before the API became ready. The readiness check only verified the receipt endpoint, not the campaign endpoint the widget first renders.
- **Fix in current branch:** launch the API through the installed `./node_modules/.bin/ts-node` executable so the tracked PID is the server process; readiness now requires both the seeded receipt and campaign endpoints to return the expected data with the same tenant header used by the Flutter API client.
- **Member UI fixes:** add/contact dialogs now own their controllers in StatefulWidget lifecycles; create retry uses a mutable list fixture; fake mutations yield asynchronously. The latest pre-readiness-fix widget run had one remaining fixture failure, corrected before this workflow change.
- **Status:** the updated workflow and tests require fresh exact-head CI. Do not merge until Flutter tests, connected journey, backend checks, repository validation and merge gate all pass.


## Verified execution — tenant member administration and CI readiness (18 October 2026)

- **Merged:** [PR #259](https://github.com/JainCommunityPlatform/jain-community-platform/pull/259), merge commit `86ac65e75b6ee94d15ca8d29f0a1447b6b271b1e`.
- **Exact-head CI:** [run #39089408184](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39089408184) passed Flutter analysis/tests, connected giving journey, backend lint/unit/integration/Firestore-emulator/build, repository validation and merge gate. Android AAB was skipped by design.
- **Post-merge CI:** [run #39089595905](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39089595905) passed on the default branch, including Flutter tests and connected giving journey, backend lint/unit/integration/Firestore-emulator/build, repository validation and merge gate. Android AAB was skipped by design.
- **Coverage delivered:** add-member required ID/create/retry, contact validation/update, role change, remove and pull-to-refresh; dialog controllers now follow widget lifecycle; connected-giving readiness starts the API via the installed ts-node executable and checks both campaign and receipt endpoints.
- **Next branch:** `qa/p1-notification-delivery-retry-batch` groups blank-destination opt-out, failed-delivery retry with stable provider idempotency, tenant-scoped delivery IDs, and non-blocking event dispatch when a provider rejects/times out.
- **Evidence boundary:** notification provider tests use mocked fetch and Firestore; no real provider delivery or production webhook verification is claimed. Android AAB remains manual/on-demand.


## Verified execution — notification delivery retry and tenant idempotency (18 October 2026)

- **Previous merge verified:** PR #259 exact-head [CI #39089408184](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39089408184) passed; default-branch [CI #39089595905](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39089595905) also passed all applicable checks after the connected-giving readiness fix. Android AAB skipped by design.
- **Current PR:** [#260](https://github.com/JainCommunityPlatform/jain-community-platform/pull/260), branch `qa/p1-notification-delivery-retry-batch`, groups blank destination skipping, failed-delivery retry with stable provider idempotency, tenant-scoped delivery IDs, and non-blocking dispatch on provider rejection.
- **Exact-head CI:** [run #39089740194](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39089740194) passed backend lint/unit/integration/Firestore-emulator/build, Flutter analysis/tests and connected giving journey, repository validation and merge gate. Android AAB skipped by design.
- **Post-merge CI:** pending; update after the default-branch run completes. Do not mark PR #260 merged or post-merge verified until the exact-head run and mergeability conditions are met.
- **Evidence boundary:** notification delivery tests mock provider fetch and Firestore. Real provider delivery, production webhook handling and persisted delivery state remain unverified.


## Verified execution — notification delivery retry/idempotency (18 October 2026)

- **Merged:** [PR #260](https://github.com/JainCommunityPlatform/jain-community-platform/pull/260), commit `793aff1ad9d208f685191d970ddb35b9d54629ed`.
- **Exact-head CI:** [run #39089935044](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39089935044) passed backend lint/unit/integration/Firestore-emulator/build, Flutter analysis/tests and connected giving journey, repository validation and merge gate. Android AAB skipped by design.
- **Post-merge CI:** [run #39090197145](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39090197145) passed on the default branch, including Flutter tests and connected giving journey, backend lint/unit/integration/Firestore-emulator/build, repository validation and merge gate. Android AAB was skipped by design.
- **Current branch:** `qa/p1-public-directory-recovery-batch` groups directory empty/search feedback, API failure/retry across Home and Temples tabs, search by location, pull-to-refresh reload, and anonymous public landing/sign-in navigation. QA-012 coverage is still in progress.


## Post-merge verification — notification delivery retry/idempotency (18 October 2026)

- PR #260 merge commit `793aff1ad9d208f685191d970ddb35b9d54629ed`.
- Exact-head CI #39089935044 passed; default-branch [CI #39090197145](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39090197145) also passed Flutter tests/connected giving journey, backend lint/unit/integration/Firestore-emulator/build, repository validation and merge gate. Android AAB skipped by design.
- Current PR #261 exact-head [CI #39090348627](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39090348627) is in progress; the latest documentation commit triggers a fresh run. Merge only after the latest head's required checks pass.


## Public directory CI failure triage — 18 October 2026

- First run [CI #39090394205](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39090394205) passed repository validation and the three new directory tests, but the public landing test could not find the bottom CTA before it had been built in the lazy ListView.
- This is a test viewport issue, not a missing product CTA. The test now scrolls the public landing ListView to the bottom before asserting and tapping “Sign in to continue”.
- PR #260 post-merge [CI #39090197145](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39090197145) has now passed all applicable checks, including connected giving and merge gate; Android AAB skipped by design.
- The latest PR #261 head needs a fresh exact-head run after the CTA test correction and checkpoint update; do not merge until every required check passes.


## Next grouped P1 work — localization, accessibility and responsive layout (18 October 2026)

- PR #261 merged as `ecffd12c20d15ca36375b6080ebed640abe624b0`; exact-head CI #39090600461 passed. Post-merge CI #39090790721 was in progress at the last check.
- Current branch `qa/p1-localization-accessibility-responsive-batch` groups supported-locale string coverage, dynamic English-to-Hindi contact-link validation, semantic labels for input/button, and narrow-screen/larger-text layout checks for public directory and public tenant landing.
- Evidence boundary: responsive tests use MockClient and test widgets; these do not replace device testing, contrast measurement, keyboard/focus audit, or localization completeness for all public website content.


## Post-merge verification — public directory and tenant landing (18 October 2026)

- PR #261 merge commit `ecffd12c20d15ca36375b6080ebed640abe624b0`.
- Exact-head CI #39090600461 passed; default-branch [CI #39090790721](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39090790721) also passed Flutter tests/connected giving journey, backend lint/unit/integration/Firestore-emulator/build, repository validation and merge gate. Android AAB skipped by design.
- PR #262 localization/accessibility/responsive tests are in progress on branch `qa/p1-localization-accessibility-responsive-batch`; exact-head [CI #39090937905](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39090937905) must be checked again after this checkpoint update.


## Localization/accessibility/responsive CI triage — 18 October 2026

- First full PR #262 run [CI #39090967002](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39090967002) passed repository validation and unrelated existing tests, but the new locale/semantics and narrow-layout tests exposed test-harness assumptions.
- The semantics test failed with a leaked `SemanticsHandle` when an assertion failed before teardown; it now disposes the handle in `finally` and uses label patterns for semantic matching.
- Narrow-screen tests assumed lazily built content was present before scrolling. They now use `dragUntilVisible` to scroll to the directory card and public landing CTA before asserting.
- PR #261 post-merge [CI #39090790721](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39090790721) passed all applicable checks, including connected giving and merge gate.
- Latest PR #262 head requires fresh exact-head CI after these test fixes; no merge until all required checks pass.


## Follow-up static-analysis correction — localization test (18 October 2026)

- Exact-head run #39091208599 failed Flutter analysis because a text replacement corrupted the locale test's raw RegExp string and left duplicate widget setup. This was a test-source syntax error, not a product issue.
- The test file has been rewritten cleanly with one widget setup and a `try/finally` that always disposes the semantics handle.
- Fresh exact-head CI is required for the latest branch head before merge; do not treat the previous run as a test pass.


## Semantics assertion refinement — localization test (18 October 2026)

- Latest code-only run #39091376820 passed Flutter analysis and both responsive layout tests, but the locale test's button semantics finder matched two framework nodes for the same accessible CTA.
- The assertion now requires one or more semantic matches rather than exactly one widget node; it still verifies the localized Hindi label and validation text, and does not weaken the actual translation assertion.
- Fresh exact-head CI is required for the latest branch head before merge.



## Connected-giving CI tenant identity mismatch — 18 October 2026

- PR #262 exact-head CI run [#39091500794](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39091500794) failed only in the connected Flutter → NestJS → Firestore receipt journey; backend lint/unit/integration/emulator/build and repository validation passed.
- Failure evidence: the server seeds a unique tenant ID per run (`connected-giving-${suffix}`), while the CI script and Flutter client sent the hard-coded `connected-giving-test` header. The campaign lookup therefore could not find the campaign created for the server's generated tenant. This is a deterministic fixture/tenant-context mismatch, not a localization assertion failure.
- The current PR batch also fixes the harness to read the server's ready JSON and pass its actual tenant ID to the readiness checks and Flutter integration test. The integration test accepts the tenant ID through `JCP_CONNECTED_TENANT_ID`; the existing fallback remains for local/manual runs.
- **Merge gate:** fresh exact-head CI must verify this harness fix and the localization/accessibility/responsive cases. Do not merge while the connected journey fails. Android AAB remains manual/on-demand.



## Connected journey follow-up diagnosis — 18 October 2026

- Fresh exact-head CI [#39118114093](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39118114093) still failed the connected widget journey even after the workflow's curl preflight found the seeded campaign and receipt using the server-emitted tenant ID. Backend lint/unit/integration/Firestore-emulator/build and repository validation passed.
- Therefore the tenant-header alignment alone is not yet a verified fix. The Flutter page loads campaigns, pledges, receipts and notifications concurrently; the current test now probes those live API endpoints individually before mounting the page, so a failing dependency is reported at its own call site rather than only as a missing campaign card. Request timeout is raised to 15 seconds to accommodate emulator-backed cold startup without skipping requests or assertions.
- **Current state:** PR #262 remains open. Fresh exact-head CI must verify the diagnosis and all localization/accessibility/responsive cases. Do not merge until connected journey and merge gate pass.


## Verified execution — grouped localization/accessibility/responsive batch (18 October 2026)

- **Merged:** [PR #262](https://github.com/JainCommunityPlatform/jain-community-platform/pull/262), merge commit `91146da0b479a976f19219a9370e21d6545d1579`.
- **Exact-head CI:** [run #39118457894](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39118457894) passed Flutter analysis/tests, connected Flutter → NestJS → Firestore-emulator receipt journey, backend lint/unit/integration/Firestore-emulator/build, repository validation and merge gate.
- **Post-merge CI:** [run #39118764541](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39118764541) passed all applicable checks on master, including connected giving and merge gate. Android AAB skipped by design.
- **Next grouped MR:** `qa/p1-api-dto-validation-failure-matrix` adds an API DTO validation/failure matrix for campaign creation, pledges, expenses and notification preferences. Invalid amounts, date, evidence count, non-boolean preferences and caller-supplied tenant fields must return 400 before service or audit calls.
- **Evidence boundary:** HTTP E2E tests use mocked services and verify validation/side-effect contracts; Firestore persistence and staging identity remain separate evidence. Android AAB remains manual/on-demand.


## Verified execution — grouped API DTO validation matrix (18 October 2026)

- **Merged:** [PR #263](https://github.com/JainCommunityPlatform/jain-community-platform/pull/263), merge commit `21867d8b95200ca4c67f8a3eb0d4e25d4e4d05af`.
- **Exact-head CI:** [run #39119173399](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39119173399) passed Flutter analysis/tests, connected giving, backend lint/unit/integration/Firestore-emulator/build, repository validation and merge gate.
- **Post-merge CI:** [run #39119374068](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39119374068) passed all applicable checks on master. Android AAB skipped by design.
- **Next P0 batch:** `qa/p0-connected-donor-pledge-e2e-batch` extends the connected donor journey with UI amount validation, no-persist on invalid amount, successful pledge submission through real NestJS HTTP, Firestore-backed read-after-write assertion, and existing receipt visibility.
- **Evidence boundary:** Firestore Emulator with real NestJS HTTP, not production donor data; staging/device identity and external settlement remain open.


## Verified execution — P0 connected donor pledge journey (18 October 2026)

- **Merged:** [PR #264](https://github.com/JainCommunityPlatform/jain-community-platform/pull/264), commit `cd4b6a3082880cc0b7fe3ccf93bac60db3ac7add`.
- **Exact-head CI:** [run #39119641541](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39119641541) passed Flutter analysis/tests, connected giving, backend lint/unit/integration/Firestore-emulator/build, repository validation and merge gate.
- **Post-merge CI:** [run #39119849096](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39119849096) passed all applicable checks on master, including the expanded UI-to-API-to-Firestore pledge journey. Android AAB skipped by design.
- **Next P0 batch:** `qa/p0-persisted-cross-tenant-donor-isolation-batch` adds a second tenant hostname to the Firestore-emulator HTTP fixture and verifies tenant A's donor pledge/receipt stay invisible in tenant B, while a tenant B pledge using tenant A's campaign is rejected and no tenant B pledge/receipt is persisted.
- **Evidence boundary:** real NestJS HTTP and Firestore Emulator; controlled staging identity and production/device behavior remain open.


## PR #265 CI triage — isolate cross-tenant fixture data (18 October 2026)

- Exact-head [CI #39120170312](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39120170312) found the new test created an approved receipt in the suite's shared tenant, causing two later reconciliation assertions to observe one extra receipt. The new isolation assertions themselves passed; the failures were test-order contamination.
- The test now uses a dedicated tenant pair and adds operator/approver memberships only in its isolated tenant. Existing exact-count reconciliation scenarios remain unchanged; no assertions are weakened.
- PR #265 remains open pending fresh exact-head CI. Merge only after the entire Firestore-emulator suite, connected journey and all required checks pass.
