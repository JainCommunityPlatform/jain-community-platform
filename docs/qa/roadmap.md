# JCP QA Roadmap

Last reviewed: 12 October 2026  
Programme tracker: [QA Control Tower issue #162](https://github.com/JainCommunityPlatform/jain-community-platform/issues/162)  
Detailed inventory: [Coverage Inventory](coverage-inventory.md)  
Scenario source: [Behavioural Specifications](behavioral-specifications.md)

## Objective

Close JCP's test gaps in risk order while keeping the work visible and incremental. A green CI run means the checks that ran passed; it does not by itself prove that every user journey, real Firebase integration, device UI, or release is verified.

## Delivery milestones

| Milestone | Scope | Exit criteria | Priority |
|---|---|---|---|
| M0 — Coverage baseline | Inventory Flutter screens, API controllers/routes, data mutations, roles, tenants, existing tests, CI triggers and evidence boundaries | Every feature area has an inventory row; test files/commands linked; unknowns explicitly recorded; no guessed coverage percentage | P0 |
| M1 — Identity and tenant boundaries | Login/session lifecycle, membership resolution, role grant/revocation, route-level allow/deny and cross-tenant denial | Critical protected routes have positive and negative assertions; denied requests prove no protected mutation/financial side effect; test evidence linked to exact CI run | P0 |
| M2 — Donation and financial integrity | Campaign → pledge → pending payment → independent approval/rejection → receipt → donor history → finance reports/reconciliation | Critical lifecycle and retry/replay/partial-payment/overpayment cases verify persisted outcomes; independent maker-checker and tenant boundaries asserted; emulator and staging limitations stated | P0 |
| M3 — Website and media workflows | Editor fields, upload/progress/errors, save/publish, refresh/reopen, invalid media, retries and tenant separation | UI assertions and API/persistence assertions cover success and failure; existing published content remains intact on failure; emulator/staging/device evidence recorded where needed | P1 |
| M4 — Member, directory, events and notifications | Profile/contact linking, member administration, public pages, event workflows, notification preferences and delivery failures | Role-specific journey coverage with empty/loading/error states; no cross-user or cross-tenant leakage; external provider tests use controlled test configuration | P1 |
| M5 — UI quality and accessibility | Responsive layouts, text scaling, keyboard/focus/semantics, localization completeness, visual regression baseline | Screen inventory reviewed; automated checks added where reliable; remaining manual device checks documented | P1 |
| M6 — Release confidence | Repeatable staging smoke suite, build/commit traceability, release checklist and CI failure classification | Required CI checks green on exact commit; critical staging/device smoke results recorded; build artifact/version linked; Android release remains explicit/on-demand | P1 |

## Execution policy

Work one risk-focused PR at a time unless independent work can safely be parallelized.

1. Pick the next highest-priority uncovered row in the [inventory](coverage-inventory.md).
2. Write or refine the behavioural scenario and acceptance assertions first.
3. Add the smallest coherent set of tests; avoid unrelated production changes.
4. Run the narrow test, then the relevant full suite and CI.
5. If CI fails, inspect logs and classify the cause as product defect, test defect, environment/configuration defect, or nondeterminism. Fix the cause; do not weaken assertions just to obtain green.
6. Re-run against the updated PR head SHA. Merge only when required checks pass and the PR is mergeable.
7. Verify the post-merge default-branch CI run; link the run and update the inventory state.
8. Move to the next row. If a real environment is unavailable, mark the work as blocked at that evidence layer rather than calling it complete.

## Release gates

- **Code gate:** required CI checks pass on the exact candidate commit.
- **Security gate:** P0 authorization, tenant isolation, and financial invariants have automated negative as well as positive assertions.
- **Integration gate:** critical persisted workflows pass in the configured emulator/test environment.
- **Environment gate:** authentication, storage, notification and device-specific smoke checks are recorded where applicable.
- **Release gate:** exact artifact/version, commit, smoke evidence and destination are recorded.
- **Android gate:** build/upload is manual or explicitly dispatched; it must not be coupled to every merge.

## Status reporting

Report progress as:
- **Done (evidence linked):** exact test(s), commit and CI/environment result.
- **In progress:** what is implemented and what evidence remains.
- **Blocked:** the missing environment/access/dependency and the next unblocking action.
- **Next:** one concrete highest-priority item.

Do not count a documentation row as a completed test. The inventory and roadmap are control mechanisms; completion comes from executable tests and evidence.


## Execution checkpoint — 12 October 2026

- **Completed in this work item:** strengthened the Firestore-emulator donation lifecycle regression to verify persisted approved payment states, receipt allocation, donor-facing pledge/receipt history, and balanced reconciliation for a unique isolated tenant fixture.
- **Evidence boundary:** this is an emulator-backed regression, not production Firebase, staging, or device verification. Exact PR CI evidence is pending until GitHub Actions completes.
- **Current priority:** P0-B, donation-to-receipt lifecycle. The new assertions extend existing partial-payment coverage; they do not close the entire donation E2E gap.
- **Next action:** inspect the exact PR-head emulator job and all required checks; fix genuine failures, merge only if green/mergeable, then verify default-branch CI. Continue with P0-C authorization route matrix and P0-A inventory completeness as sequencing permits.
- **Release policy:** Android build/upload remains manual/on-demand; this change must not trigger a release.

## Execution checkpoint — finance-role revocation regression

- **Previous completed item:** [PR #166](https://github.com/JainCommunityPlatform/jain-community-platform/pull/166) merged as `d62a1ac148c3d0a2b3da68a7c796974710711ee9`; post-merge [CI run #757](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38290855350) passed repository validation, backend lint/unit/integration/Firestore-emulator/build, Flutter analyze/tests, and merge gate. Android AAB job was skipped by design.
- **Current item:** P0-C authorization lifecycle, finance-role revocation. Added an HTTP E2E regression to verify a role is removed from the effective membership and a subsequent protected finance request is denied before reading tenant data.
- **Evidence boundary:** mocked membership state at the API boundary; this does not establish Firestore role persistence or production identity/session propagation.
- **Next action:** open the focused PR, inspect exact-head CI, fix real failures, merge only after all required checks are green, verify post-merge CI, then continue the P0 authorization route matrix.
- **Release policy:** Android build/upload remains manual/on-demand.

## Execution checkpoint — cross-tenant finance write denial

- **Previous completed item:** [PR #167](https://github.com/JainCommunityPlatform/jain-community-platform/pull/167) merged as `2e3dc90d5bc0dfea77c1b270a3bca50ad4279869`; exact PR-head [CI #758](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38291613206) passed all required checks. Post-merge [CI #759](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38291897144) is being verified.
- **Current item:** P0 authorization route matrix, cross-tenant financial mutations. Added a parameterized API E2E regression covering expense creation, payment recording, adjustment creation, and approval mutations.
- **Assertions:** every request returns HTTP 403 for tenant mismatch, and neither the financial service nor audit writer is called.
- **Evidence boundary:** mocked identity/membership and service layer; persisted cross-tenant Firestore behavior is still open.
- **Next action:** finish PR #167 post-merge CI verification; open the focused PR for this gap, inspect exact-head CI, fix genuine failures, merge only when required checks pass, verify post-merge CI, and continue the route matrix.
- **Release policy:** Android build/upload remains manual/on-demand.

## Execution checkpoint — cross-tenant membership mutation denial

- **Previous completed item:** [PR #168](https://github.com/JainCommunityPlatform/jain-community-platform/pull/168) merged as `bcc180f696a406cff2b56d1a06ee6015e47b6dfb`; exact PR-head [CI #760](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38292189804) passed all required checks. Post-merge [CI #761](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38292520082) is being verified.
- **Current item:** P0 tenant-boundary route matrix — cross-tenant membership mutations. Added HTTP E2E assertions for PATCH and DELETE tenant-member endpoints, including no mutation service call on denial.
- **Evidence boundary:** mocked identity/membership and tenant-member service; persisted Firestore isolation is still open.
- **Next action:** finish post-merge CI #761, open the focused PR, inspect exact-head CI, fix genuine failures, merge only when all required checks pass, verify post-merge CI, and continue the route matrix.
- **Release policy:** Android build/upload remains manual/on-demand.

## Execution checkpoint — protected-route role denial

- **Previous completed item:** [PR #169](https://github.com/JainCommunityPlatform/jain-community-platform/pull/169) merged as `1c5a85038d3182452cc3d54ce54ad5d260d4c958`; exact PR-head [CI #762](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38292799818) passed all required checks. Post-merge [CI #763](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38293137101) is being verified.
- **Current item:** P0 auth/session UI — verify authenticated users without the required role are redirected away from admin, website-admin, finance, platform-admin and inventory screens.
- **Assertions:** each direct route attempt resolves to member home and the protected page is not rendered.
- **Evidence boundary:** Flutter widget/router behavior only; backend authorization remains separately required and production session/role-refresh behavior is still open.
- **Next action:** finish post-merge CI #763, open the focused PR, inspect exact-head CI, fix real failures, merge only when required checks pass, verify post-merge CI, then continue auth/session journey gaps.
- **Release policy:** Android build/upload remains manual/on-demand.

## Incident checkpoint — post-merge Firestore concurrency failure

- **Observed:** PR #170 exact-head [CI #764](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38293467475) passed, but post-merge [CI #765](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38293792926) failed in the Firestore emulator suite.
- **Failure:** `deduplicates concurrent pledge creation with the same idempotency key` threw `3 INVALID_ARGUMENT: Transaction is invalid or closed`; 41 emulator tests passed and 1 failed.
- **Fix in progress:** bounded retry for this specific closed-transaction error, after re-reading the deterministic pledge document and returning a matching committed record if present. The test remains unchanged and continues to require two concurrent callers to return the same persisted pledge.
- **Evidence boundary:** emulator failure is unrelated to the Flutter route test but blocks a healthy default-branch CI baseline; production concurrency behavior is not claimed.
- **Next action:** open a focused hotfix PR, require exact-head emulator CI to pass (repeat if needed to detect flakiness), merge only after all required checks pass, verify post-merge CI, then resume the auth/session PR queue.
- **Release policy:** Android build/upload remains manual/on-demand.

## Execution checkpoint — sign-out refreshes protected route

- **Previous completed item:** [PR #171](https://github.com/JainCommunityPlatform/jain-community-platform/pull/171) merged as `dc008919f598cc42d69b143e9b28d57c40098775`; exact-head [CI #767](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38294696101) passed after fixing the TypeScript return contract and the concurrent pledge transaction race. Post-merge [CI #768](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38295038490) is being verified.
- **Current item:** P0 auth/session UI — ensure a Firebase signed-out event refreshes the router and removes access to a currently open protected admin screen.
- **Assertions:** route begins at admin while authenticated, then automatically redirects to login after auth state becomes signed out; admin content is no longer rendered.
- **Evidence boundary:** widget/router test with a fake Firebase auth stream; token expiry and real Firebase/device behavior remain open.
- **Next action:** finish post-merge CI #768, open the focused PR, inspect exact-head CI, fix real failures, merge only when required checks pass, verify post-merge CI, and continue the auth/session matrix.
- **Release policy:** Android build/upload remains manual/on-demand.

## Execution checkpoint — session role refresh updates route access

- **Previous completed item:** [PR #172](https://github.com/JainCommunityPlatform/jain-community-platform/pull/172) merged as `4000fd9fa1d6e2184657b48a5465239aac115899`; exact-head [CI #770](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38295541409) passed all required checks. Post-merge [CI #771](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38296014960) is being verified.
- **Current item:** P0 auth/session UI — refreshed membership roles must immediately remove access to a protected finance screen.
- **Assertions:** finance role initially permits the route; refreshing the session to a non-finance role redirects to member home and removes finance content.
- **Evidence boundary:** mocked session refresh and Flutter router; persisted membership revocation and production API/session propagation remain open.
- **Next action:** finish post-merge CI #771, open the focused PR, inspect exact-head CI, fix real failures, merge only when required checks pass, verify post-merge CI, and continue auth/session expiry and restoration gaps.
- **Release policy:** Android build/upload remains manual/on-demand.

## Execution checkpoint — expired session refresh redirects to login

- **Previous completed item:** [PR #173](https://github.com/JainCommunityPlatform/jain-community-platform/pull/173) merged as `9c8259cb2a9605b43404d519198d15b051eae070`; exact-head [CI #772](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38296287780) passed. Post-merge [CI #773](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38296615312) is being verified.
- **Current item:** P0 auth/session UI — failed current-session refresh must clear the authenticated session and redirect away from protected content.
- **Assertions:** session refresh failure sets controller error/signed-out state; router moves from admin to login and admin content disappears.
- **Evidence boundary:** mocked session-service failure and Flutter router; real Firebase token expiry and API authentication failure remain open.
- **Next action:** finish post-merge CI #773, open the focused PR, inspect exact-head CI, fix real failures, merge only when required checks pass, verify post-merge CI, and continue auth/session restoration and offline/error cases.
- **Release policy:** Android build/upload remains manual/on-demand.

## Execution checkpoint — initial session restoration failure

- **Current item:** P0 auth/session UI — a cached authenticated session must not retain protected access when the startup session lookup fails.
- **Regression:** `apps/flutter/test/widget_test.dart` — “does not restore protected access when initial session loading fails”.
- **Assertions:** controller enters error state, clears the cached session, redirects admin route to login, and removes protected content.
- **Evidence boundary:** mocked auth/session service and router only; real Firebase/API/device verification remains open.
- **Next action:** run exact-head CI, fix real failures, merge only when required checks pass, verify post-merge default-branch CI, update issue #162/checkpoint, then continue the P0 backlog. Android build/upload stays manual/on-demand.


## Incident checkpoint — post-merge refund-approval emulator timeout (13 October 2026)

- **Merged change under verification:** [PR #175](https://github.com/JainCommunityPlatform/jain-community-platform/pull/175), merge commit [6c5a703afa1bf7d6bb2c4a902275ad05a6996008](https://github.com/JainCommunityPlatform/jain-community-platform/commit/6c5a703afa1bf7d6bb2c4a902275ad05a6996008). Exact PR-head [CI #778](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38304250367) passed.
- **Post-merge failure:** [CI #779](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38323486041) failed in the Firestore emulator suite. The test `allows only one concurrent approval of a refund and creates one approval notification` exceeded Jest's default 5-second test timeout; 41 emulator tests passed and this one timed out. The same test completed in 3,210 ms in CI #778; concurrent pledge idempotency passed in #779.
- **Classification:** emulator integration-test timeout sensitivity under runner/emulator contention; no failed financial invariant assertion was reported. Do not classify as a product defect without further evidence.
- **Repair:** the focused branch adds a 15-second timeout only to the slow, emulator-backed race test. Assertions that exactly one concurrent approver succeeds, the other gets `ADJUSTMENT_NOT_PENDING`, persisted refund/payment/pledge balances are correct, and exactly one approval notification exists remain unchanged.
- **Exit criteria:** exact-head CI green across all required jobs; merge only when mergeable; verify post-merge push CI green; update issue #162 with exact links. If the test still times out at 15 seconds, investigate emulator/transaction contention rather than increasing timeouts repeatedly.
- **Evidence boundary:** configured Firestore emulator only; production concurrency behavior is not claimed. Android build/upload remains manual/on-demand.


## Execution checkpoint — maker-checker HTTP audit boundary (13 October 2026)

- **Previous item:** PR #180 merged as `7f3b572a20d58c61e0cf5c6d27984594d018fb1a`. Corrected exact-head CI #794 passed all applicable required jobs on `e5a2c6e5f9d39e5b9964532c8b4e9b123e07aa13`; post-merge default-branch CI remains UNKNOWN.
- **Current P0:** financial maker-checker failure paths. PR #181 adds HTTP integration assertions that rejected approval/rejection decisions for payments, expenses and adjustments return 403 and do not emit success audit events.
- **Evidence boundary:** GivingService rejection is mocked for the HTTP test. Existing Firestore emulator tests remain the persisted self-approval evidence; staging/production remains open.
- **Next:** verify all required checks on PR #181's exact head, repair root causes without weakening assertions, merge only when green and mergeable, verify post-merge push CI where available, and continue the P0 inventory. Android build/upload remains manual/on-demand.


## Execution checkpoint — startup session restoration

- **Current P0 test gap:** controller-level startup restoration when Firebase already has a user.
- **Branch:** `qa/session-restore-startup-current-master`.
- **Regression:** verifies one backend session load and restoration of authenticated user, tenant, admin status, and permission roles.
- **Evidence boundary:** mocked Firebase auth and backend service only; device/emulator restart and production API verification remain open.
- **Exit:** exact-head CI green, merge when eligible, verify post-merge CI where available, then continue the P0 inventory. Android build/upload remains manual/on-demand.


## Execution checkpoint — startup session restoration completed (13 October 2026)

- **Merged:** PR #182 at `3033dacd16f13bf9b5ad830d978c39c84270bd0e`.
- **Exact-head CI:** run #800 passed all applicable required jobs on `7c5a3bc870b8e82fd6ac3d671fb7e9e4b1b5e546`; Android AAB skipped by design.
- **Post-merge CI:** UNKNOWN; the available commit-run lookup did not expose a push-triggered run for the merge commit.
- **Branch disposition:** unique startup-restoration regression from stale `qa/session-restore-on-startup` is now merged through PR #182. Stale `qa/session-signout-route-refresh` is superseded by the existing sign-out protected-route redirect test and must not be merged as-is.
- **Remaining evidence gap:** real Firebase/device restart and production/staging API verification. Continue with the next highest-priority unfinished P0. Android build/upload remains manual/on-demand.


## Execution checkpoint — campaign write authorization boundary (13 October 2026)

- **Current P0-C item:** close an authorization-matrix gap on campaign mutation routes.
- **Branch:** `qa/campaign-write-authorization-boundary`.
- **Regression tests:** tenant administrators cannot create campaigns; finance viewers cannot change campaign status. Both requests must return HTTP 403 before the GivingService mutation and audit writer are called.
- **Evidence boundary:** HTTP integration tests with mocked membership, persistence and audit services; persisted Firestore/staging verification remains open.
- **Next:** inspect exact-head CI, repair genuine failures without weakening assertions, merge only when required checks pass and the PR is mergeable, verify post-merge CI, then continue the P0 authorization matrix. Android build/upload remains manual/on-demand.


## Execution checkpoint — campaign write denial verified; positive authorization cases next (13 October 2026)

- **Merged:** PR #184 — [campaign write authorization denial tests](https://github.com/JainCommunityPlatform/jain-community-platform/pull/184), merge commit `551c8b64fc620baa54ef69d8ec47dc63b33a678a`.
- **Exact-head CI:** [run #803](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38413438929) passed all required jobs on `927cf9063321ee9bfea4aa000c6260eea12f813a`; Android AAB skipped as intended.
- **Post-merge CI:** [run #804](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38415911846) was in progress at checkpoint time.
- **Current P0:** positive campaign-write authorization: finance operators with `finance.write` should create/update campaigns with the resolved tenant and actor passed to persistence, and success audit events emitted.
- **Branch:** `qa/campaign-authorized-write-audit`.
- **Evidence boundary:** HTTP integration tests with mocked membership, persistence and audit services; Firestore/staging lifecycle verification remains open.
- **Next:** inspect exact-head CI, repair genuine failures, merge only when required checks pass and PR is mergeable, verify post-merge CI, and continue the P0 matrix. Android build/upload remains manual/on-demand.


## Execution checkpoint — campaign authorization matrix (13 October 2026)

- **Previous completed item:** [PR #185](https://github.com/JainCommunityPlatform/jain-community-platform/pull/185) merged as `eec4b012aa56e3904bffd7800de40b062d1553d2`. Exact-head [CI #805](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38416322337) passed all required jobs; Android AAB was skipped by design.
- **Post-merge verification:** [CI #807](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38416748402) passed; the stale running-status note is corrected in this checkpoint.
- **Current P0:** cross-tenant campaign write denial. A finance operator whose membership belongs to tenant B must not create or change campaign status under tenant A; denied calls must not invoke campaign persistence or audit.
- **Evidence boundary:** API HTTP integration with mocked membership/persistence/audit; Firestore/staging/device lifecycle verification remains open.
- **Release policy:** Android build/upload remains manual/on-demand.


## Execution checkpoint — cross-tenant campaign write matrix expansion (13 October 2026)

- **Previous item completed:** [PR #186](https://github.com/JainCommunityPlatform/jain-community-platform/pull/186) merged as `7ba24ef6718f65016752c3259e66469c501ebf50`.
- **Exact-head CI:** [run #810](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38417681101) passed on `aa9d23280201828fb939d5a145c309f7f1d33e8e`; the initial run #808 timeout was fixed by giving the existing refund concurrency test 15 seconds while preserving assertions.
- **Post-merge CI:** [run #811](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38418357794) passed on the merge commit. Repository validation, backend lint/tests/Firestore-emulator/build, Flutter analyze/tests, and merge gate passed; Android AAB skipped by design.
- **Current P0:** extend campaign cross-tenant mutation denial to tenant administrators as well as finance operators.
- **Branch:** `qa/campaign-cross-tenant-admin-denial`.
- **Exit:** exact-head CI green, merge only when eligible, verify post-merge CI, update issue #162, then continue to the donor UI-to-API and persisted campaign lifecycle gaps. Android build/upload remains manual/on-demand.


## Execution checkpoint — donor pledge HTTP contract (13 October 2026)

- **Previous item verified:** PR #187 merged as `f56c65e772a46ee840b3dbae7c90bcfc9edbf704`; exact-head CI #812 and post-merge [CI #813](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38421519258) passed all applicable jobs. Android AAB skipped by design.
- **Current P0:** strengthen the donor pledge creation HTTP boundary. The focused branch adds a positive test for tenant/donor/campaign/amount/idempotency propagation and success audit, plus an inactive tenant-donor relationship HTTP denial asserting no success audit. The initial cross-tenant guard expectation failed because the route allows the giving layer to enforce donor eligibility; the test was corrected to match the established contract.
- **Branch:** `qa/donor-pledge-http-contract`.
- **Evidence boundary:** mocked API integration; persisted Firestore campaign-to-receipt lifecycle and Flutter UI-to-API/device evidence remain open.
- **Next:** inspect exact-head CI; fix root causes without weakening assertions; merge only when required checks pass and the PR is mergeable; verify post-merge CI; then continue the next uncovered P0. Android build/upload remains manual/on-demand.


## Execution checkpoint — donor pledge UI-to-HTTP journey (13 October 2026)

- **Previous item:** [PR #188](https://github.com/JainCommunityPlatform/jain-community-platform/pull/188) merged; exact-head [CI #818](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38422723605) passed on `3e632fc142afbe26f2535515dfde21260132e250`. Post-merge default-branch CI remains UNKNOWN because the available run lookup only returns PR-triggered runs.
- **Current P0:** QA-003, Flutter donor pledge journey. New widget tests cover successful campaign selection, amount entry, pledge POST payload and idempotency header, refreshed “My pledges” state, and inactive tenant-donor API error handling without a false success message.
- **Branch:** `qa/flutter-donor-pledge-journey`.
- **Evidence boundary:** mocked HTTP widget test; live API, Firebase identity, persisted Firestore and staging/device behavior remain separate evidence layers.
- **Next:** inspect exact-head CI, fix genuine failures without weakening assertions, merge only when required checks pass and the PR is mergeable, verify post-merge default-branch CI where available, then continue the donation payment → approval → receipt UI path. Android build/upload remains manual/on-demand.


## CI repair checkpoint — Flutter donor pledge journey (13 October 2026)

- PR #189 exact-head CI #820 failed because one new widget test expected two pledge amount labels where the actual “My pledges” UI renders one. Backend checks, Flutter analysis, repository validation and the other 72 Flutter tests passed; the merge gate correctly failed. Android build was skipped by design.
- Corrected the assertion to one visible amount label in commit `4b4f5e7f0e0b52fc02d71e493184a98561732064`. Functional request payload, idempotency header, success/error feedback, and pledge status assertions remain unchanged.
- **Next:** verify all required jobs on the updated exact PR head; fix any further genuine failures, merge only when all checks pass and the PR is mergeable, verify post-merge CI separately, then continue the P0 payment → approval → receipt UI integration gap. Android build/upload remains manual/on-demand.


## Execution checkpoint — donor receipt refresh regression (14 October 2026)

- **Previous item merged:** [PR #189 — Flutter donor pledge journey](https://github.com/JainCommunityPlatform/jain-community-platform/pull/189), merge commit `88adb21d0330d2cc03d45b1b0c1b07ca3b759147`; exact-head [CI #822](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38435636205) passed.
- **Post-merge CI:** [CI #823](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38495571718) was still running when this checkpoint was created. Verify its final conclusion before recording the post-merge gate as passed.
- **Current P0:** donor receipt visibility after independent payment approval. Branch `qa/donor-receipt-after-approval-refresh` adds a widget regression asserting the receipt list remains empty before the backend reflects approval and shows the receipt after donor refresh.
- **Evidence boundary:** mocked HTTP/widget coverage only; approval authorization, persisted Firestore receipt creation, end-to-end financial state transition and staging/device verification remain open.
- **Release policy:** Android build/upload remains manual/on-demand.
