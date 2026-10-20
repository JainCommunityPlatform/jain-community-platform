## Verified execution — persisted finance workflows and reconciliation (15 October 2026)

- **PR #229:** persisted finance-role revocation with real Firestore-backed `MembershipService`; exact-head CI #934 and post-merge CI #935 passed.
- **PR #231:** approved refund adjustment, persisted donor balance and net reconciliation; exact-head CI #938 and post-merge CI #939 passed.
- **PR #234:** over-adjustment rejection, pending reservation release after rejection, and approved reversal; exact-head CI #943 and post-merge CI #944 passed.
- **PR #235:** expense maker-checker, approval/rejection and reconciliation; exact-head CI #945 and post-merge CI #946 passed on `76dbbacf375b1e95ba96a7f7b09f44d9b13d4fbe`.
- **Next P0:** remaining protected-route/write authorization matrix. Controlled production/staging/device identity verification and external UPI/bank settlement remain separate gates; emulator success does not establish either. Android build/upload remains manual/on-demand.

---

# JCP QA Roadmap\n\n## Consolidated P0 closure pass — 16 October 2026\n\nThe remaining deterministic P0 authorization assertions are being consolidated into one MR rather than split into one-role/one-route MRs. The MR adds the missing finance-viewer negative matrix across payment, expense and adjustment writes and all approval/rejection actions, with no-service/no-audit assertions. Closure requires exact-head CI green, default-branch post-merge CI green, and inventory/checkpoint reconciliation. Remaining controlled Firebase staging/device verification and external UPI/bank settlement are explicitly separate gates; they must not be reported as complete from emulator or mocked HTTP tests. Android AAB build/upload remains manual/on-demand.\n\n

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
- **Post-merge CI:** [CI #823](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38495571718) passed on merge commit `88adb21d0330d2cc03d45b1b0c1b07ca3b759147`; repository validation, backend checks, Flutter analyze/tests, and merge gate all succeeded. Android AAB was skipped by design.
- **Current P0:** donor receipt visibility after independent payment approval. Branch `qa/donor-receipt-after-approval-refresh` adds a widget regression asserting the receipt list remains empty before the backend reflects approval and shows the receipt after donor refresh.
- **Evidence boundary:** mocked HTTP/widget coverage only; approval authorization, persisted Firestore receipt creation, end-to-end financial state transition and staging/device verification remain open.
- **Release policy:** Android build/upload remains manual/on-demand.


## Execution checkpoint — receipt refresh merged; cross-tenant payment approval denial (14 October 2026)

- **Previous item merged:** [PR #190 — donor receipt after approval refresh](https://github.com/JainCommunityPlatform/jain-community-platform/pull/190), merge commit `56e8d986b96ac48027881148475dc98f9d6ad590`; exact-head [CI #835](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38502664984) passed all required checks; Android AAB skipped by design.
- **Post-merge CI:** [CI #836](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38503267430) passed backend lint/tests/build, Flutter analyze/tests, repository validation and merge gate. Android AAB was skipped by design.
- **Current P0:** add a route-level negative test proving that a finance approver with a membership in another tenant cannot approve a payment and cannot emit a success audit event.
- **Branch:** `qa/cross-tenant-payment-approval-denial`.
- **Evidence boundary:** the route regression uses mocked membership, GivingService and audit; Firestore emulator covers persisted cross-tenant payment denial separately. Live staging/device evidence remains open.
- **Next:** inspect the newest exact-head CI for PR #191; repair genuine failures without weakening assertions; merge only when checks pass and mergeability is confirmed; then continue P0 inventory and persisted UI/API workflow evidence. Android build/upload remains manual/on-demand.


## Execution checkpoint — cross-tenant approval merged; payment recording denial in progress (14 October 2026)

- **Previous item merged:** [PR #191](https://github.com/JainCommunityPlatform/jain-community-platform/pull/191), merge commit `a3918a09fe7a8cd64d5259a2511ab76e05209acf`; exact-head [CI #842](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38503605901) passed all required checks. Android AAB was skipped by design.
- **Post-merge CI:** [CI #843](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38503917818) passed backend lint/unit/integration/Firestore-emulator/build, Flutter analyze/tests, repository validation and merge gate. Android AAB was skipped by design.
- **Current P0:** route-level denial of cross-tenant payment recording before mutation/audit.
- **Branch:** `qa/cross-tenant-payment-recording-denial`.
- **Evidence boundary:** mocked HTTP authorization; persisted Firestore cross-tenant payment reference isolation is covered by emulator tests. Live staging/device evidence remains open.
- **Next:** inspect exact-head CI, fix genuine failures without weakening assertions, merge only when required checks pass and the PR is mergeable, verify post-merge CI, then continue the P0 route matrix and persisted UI/API workflow evidence. Android build/upload remains manual/on-demand.


## Execution checkpoint — cross-tenant payment recording merged; rejection denial in progress (14 October 2026)

- **Previous item merged:** [PR #192](https://github.com/JainCommunityPlatform/jain-community-platform/pull/192), merge commit `a071ebb6ab88f33178d09fe44aa98b65293cd9ea`; exact-head [CI #846](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38504152722) passed all required checks. Android AAB was skipped by design.
- **Post-merge CI:** [CI #847](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38504392374) passed backend lint/unit/integration/Firestore-emulator/build, Flutter analyze/tests, repository validation and merge gate. Android AAB was skipped by design.
- **Current P0:** route-level denial of cross-tenant payment rejection before mutation/audit.
- **Branch:** `qa/cross-tenant-payment-rejection-denial`.
- **Evidence boundary:** mocked HTTP authorization; persisted Firestore cross-tenant payment decision isolation is covered by emulator tests. Live staging/device evidence remains open.
- **Next:** inspect exact-head CI, fix genuine failures without weakening assertions, merge only when required checks pass and the PR is mergeable, verify post-merge CI, then continue the P0 route matrix and persisted UI/API workflow evidence. Android build/upload remains manual/on-demand.


## Execution checkpoint — cross-tenant expense/adjustment rejection routes (14 October 2026)

- PR #193's payment-rejection denial merged; exact-head CI #851 passed. The connected commit-run lookup does not expose post-merge push CI for merge commit `daf2a43d8f1c0d3209fc3afae1a505d6063f7927`, so post-merge verification remains UNKNOWN.
- Next focused P0 regression extends the cross-tenant financial write matrix to expense rejection and adjustment rejection. Both must return HTTP 403 without invoking the relevant service or emitting a success audit event.
- After exact-head CI and merge, continue the persisted UI → API → Firestore donation lifecycle and full role × protected-route inventory. Mocked HTTP coverage is not environment verification. Android build/upload remains manual/on-demand.


## Execution checkpoint — cross-tenant finance approver decisions (14 October 2026)

- PR #195 merged; exact-head CI #856 passed. Post-merge CI #857 was still running when this checkpoint was prepared, with Flutter and repository validation green and backend Firestore-emulator tests in progress.
- Current branch adds explicit finance-approver negative cases for approving/rejecting expenses and adjustments across tenant boundaries. Every request must be denied before mutation service invocation and must not emit a success audit.
- The new regression is mocked HTTP evidence; persisted membership and staging verification remain open.
- Next: inspect exact-head CI, merge only when green and mergeable, verify post-merge CI, then continue the protected-route × role matrix and persisted donation lifecycle. Android build/upload remains manual/on-demand.


## Execution checkpoint — website tenant-boundary regression (14 October 2026)

- PR #197 merged as `8b73a6d81e71c447e925c193fd62044bdac4da74`; exact-head CI #858 and post-merge default-branch CI #859 passed. Android AAB was skipped by design.
- Current branch adds route-level denials for cross-tenant website configuration update/reset and finance-viewer update attempts, asserting the website service is not called.
- Mocked HTTP authorization evidence only; persisted configuration, actual media upload and staging verification remain open.
- Next: verify exact-head CI and merge/post-merge gate this regression, then continue the protected-route matrix and persisted donation-to-receipt journey.


## Execution checkpoint — platform tenant administration authorization (14 October 2026)

- Current PR branch `qa/platform-tenant-admin-route-authorization` adds a non-platform denial matrix for all `PlatformController` tenant administration routes: list/create/get/update tenant, list/add tenant admins, and custom-domain verification.
- Acceptance: each route returns 403 before tenant lookup or audit side effects; exact-head CI must pass before merge.
- Evidence boundary: HTTP integration with mocked identity and Firestore adapter. Persisted onboarding and production/staging identity remain open.
- Workflow rule: continue the next QA task while post-merge CI is pending; record the result when available. Android build/upload remains manual/on-demand.


## Execution checkpoint — website media upload authorization (14 October 2026)

- Current branch `qa/website-media-upload-authorization` adds HTTP denial cases for cross-tenant content managers and finance-only viewers uploading to `POST /api/website/media`.
- Acceptance: 403 before Storage upload or audit side effects; exact-head CI required before merge.
- Evidence boundary: mocked identity/Storage/audit in the NestJS HTTP pipeline. Real Storage and staging identity verification remain open.
- Continue to the next QA task while post-merge CI is pending; record its result when available. Android build/upload remains manual/on-demand.


## Execution checkpoint — empty media and MIME spoofing (14 October 2026)

- PR #205 merged with exact-head CI #873 green; PR #204 post-merge CI #872 also passed all required jobs. PR #205 post-merge CI #876 remains in progress.
- PR #206 found that client-controlled `image/*` MIME types could be trusted without validating bytes. A regression now requires recognized image signatures and derives persisted content type from the bytes. The first attempt failed an oversized-file regression due to validation order; fixed by checking empty and maximum size before image signature. Current exact-head CI #877 is running; merge only after green and mergeability.
- Continue next to the finance role × protected-route matrix and persisted donation-to-receipt journey. Mocks are not environment verification. Android build/upload remains manual/on-demand.


## Execution checkpoint — empty multipart website image rejection (14 October 2026)

- Current branch `qa/reject-empty-multipart-website-image` adds a route-level regression for a zero-byte multipart upload to `POST /api/website/media`.
- Acceptance: HTTP 400 before Storage service invocation or success audit; service-level empty-buffer and MIME-signature checks remain unchanged.
- Evidence boundary: mocked Storage/audit HTTP integration. Real Firebase Storage, website publish/reload, and staging/device verification remain open.
- Verify exact-head CI, fix genuine failures without weakening assertions, merge only when all required checks pass and GitHub reports mergeable; then verify default-branch CI. Continue next P0 without waiting for post-merge CI. Android build/upload remains manual/on-demand.


## Execution checkpoint — finance read-route matrix (14 October 2026)

- **Merged:** [PR #211](https://github.com/JainCommunityPlatform/jain-community-platform/pull/211), merge commit `b1a2f110ef7bb290848c48ac05c29861195b62a7`.
- **Exact-head CI:** [#885](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38609457479) passed backend lint/unit/integration/Firestore-emulator/build, Flutter analyze/tests, repository validation and merge gate. Android AAB skipped by design.
- **Post-merge CI:** [#886](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38612960495) is running at this checkpoint; record its actual conclusion after completion.
- **Coverage added:** finance viewers can read tenant-wide payments, expenses, adjustments, receipts, pledges, summary and reconciliation; each controller passes the resolved tenant ID to its service.
- **Next P0:** connected donor journey from Flutter pledge submission through authorized payment approval and persisted Firestore receipt to refreshed donor receipt history. Existing Firestore emulator tests prove persistence/service behavior, and Flutter widget tests prove mocked HTTP/UI transitions; neither alone proves the connected runtime journey.
- **Evidence boundary:** current PR is HTTP integration with mocked identity/membership/service dependencies. No staging/device claim. Android build/upload remains manual/on-demand.


## Execution checkpoint — donor UI rejection receipt regression (15 October 2026)

- **Previous P0 completed:** [PR #214](https://github.com/JainCommunityPlatform/jain-community-platform/pull/214) added the positive HTTP→Firestore emulator receipt journey; [PR #215](https://github.com/JainCommunityPlatform/jain-community-platform/pull/215) added the negative rejection path. Exact-head and post-merge CI #893 are green.
- **Current branch:** `qa/donor-rejected-payment-no-receipt` adds a Flutter widget regression that a rejected payment remains absent from donor receipt history after refresh.
- **Gate:** no merge until exact-head required CI passes and GitHub confirms mergeability; verify post-merge CI once available.
- **Next P0:** connect the donor Flutter screen to a controlled API/Firestore test environment, then run staging/device verification. Current UI tests use mocked HTTP; backend emulator tests exercise real NestJS HTTP and Firestore emulator, but the full runtime bridge remains unverified.
- Android build/upload remains manual/on-demand.


## Execution checkpoint — donor receipt retry regression (15 October 2026)

- **Completed:** PR #216 rejection-side donor UI regression merged; exact-head CI #896 green. Post-merge CI #897 still pending at checkpoint.
- **Current branch:** `qa/donor-receipt-load-retry` adds a recoverable 503 receipt-history failure followed by successful retry and receipt rendering.
- **Merge gate:** wait for exact-head required CI, merge only if all checks pass and GitHub confirms mergeability, then verify post-merge CI.
- **Next P0:** validate the connected donor Flutter→NestJS API→Firestore-emulator path and then stage/device behavior. Mocked HTTP widget tests alone do not establish this bridge.
- Android build/upload remains manual/on-demand.


## Execution checkpoint — PR #217 merged; connected donor journey next (15 October 2026)

- **Merged:** [PR #217 — donor receipt-history retry](https://github.com/JainCommunityPlatform/jain-community-platform/pull/217), merge commit `339f30cefe7d6cfbc9abe7bd65ee01b7831662f0`.
- **Exact-head CI:** [run #898](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38676951380) passed backend, Flutter, repository validation and merge gate on `25e3264318b9599f3b5c10af1017deb481e62ed6`. Android AAB skipped by design.
- **Post-merge CI:** [run #899](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38679831894) was queued on merge commit `339f30cefe7d6cfbc9abe7bd65ee01b7831662f0`; verify completion before calling post-merge validation green.
- **Current P0:** bridge the donor Flutter screen to a controlled NestJS API + Firestore emulator environment, proving a persisted receipt appears after approval and remains absent after rejection/refresh. Existing Flutter widget tests use mocked HTTP; existing backend HTTP tests use the Firestore emulator. Neither alone proves the connected runtime bridge.
- **Following:** controlled staging/device smoke and identity/session verification. Android build/upload remains manual/on-demand.


## Execution checkpoint — connected Flutter/API/persistence regression (15 October 2026)

- **Current P0:** [PR #219](https://github.com/JainCommunityPlatform/jain-community-platform/pull/219) establishes a controlled connected receipt journey: test-only NestJS server, Firestore emulator, real API requests to create and approve a payment, then Flutter widget reads and renders the persisted receipt over HTTP.
- **Safety boundary:** authentication override exists only in the standalone test server used by CI; it is not a production API route or production configuration.
- **Gate:** exact-head CI must demonstrate the connected test runs and passes. Fix real failures rather than skipping the test. Verify post-merge CI before marking CI green.
- **Still open after this:** staging/device identity and session verification; this emulator-backed widget journey is not production evidence. Android build/upload remains manual/on-demand.


## Execution checkpoint — Bearer authentication header parsing (15 October 2026)

- **Current branch:** `qa/bearer-scheme-case-insensitive` adds case-insensitive Bearer scheme parsing plus regression assertions for missing credentials, empty Bearer credentials and unsupported authorization schemes.
- **Security boundary:** malformed/missing credentials must fail before token verification; valid credentials continue through the existing Firebase token verifier. This does not change token trust or bypass authentication.
- **Gate:** run focused authentication tests and full exact-head CI; merge only after required checks pass and GitHub reports mergeable, then verify post-merge CI.
- **Evidence boundary:** unit-level guard behavior only. Firebase emulator, staging/device login, expiry, and membership/session propagation remain open. Android build/upload remains manual/on-demand.


## Verified execution — connected donor journey complete; auth parsing next (15 October 2026)

- **Completed:** [PR #219](https://github.com/JainCommunityPlatform/jain-community-platform/pull/219) merged as `268bcf9a80574baa254e14683e5c8919279ca69e`. Exact-head [CI #910](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38690852215) and post-merge [CI #911](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38691150536) passed. The connected Flutter→NestJS HTTP→Firestore-emulator receipt test explicitly ran and passed.
- **Current PR:** [#220](https://github.com/JainCommunityPlatform/jain-community-platform/pull/220) covers case-insensitive Bearer scheme parsing and malformed/missing credential guard behavior. Verify exact-head CI before merge.
- **Remaining P0 evidence:** staging/device login, Firebase token expiry/revocation, membership/session propagation, and device restart behavior. Emulator-backed widget tests do not close these environment gates.
- Android build/upload remains manual/on-demand.


## Execution checkpoint — Firebase revocation check merged (15 October 2026)

- **Completed:** [PR #222](https://github.com/JainCommunityPlatform/jain-community-platform/pull/222) merged as `708887ebe75f70675dc89adbd370c32ddd9da679`.
- **Exact-head CI:** [run #917](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38712069443) passed on `aee8799630a563543e6c9942dfd1e118ff4929e0`.
- **Regression:** Firebase token verification explicitly checks revocation and has a test proving revoked credentials return HTTP 401.
- **Post-merge CI:** [run #918](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38743276237) passed on merge commit `708887ebe75f70675dc89adbd370c32ddd9da679`; Android AAB was skipped by design.
- **Next P0:** controlled staging/device identity and session verification, including expired/revoked tokens, app restart, role/membership propagation, tenant routing and receipt history. Do not equate unit/emulator tests with environment verification. Android build/upload remains manual/on-demand.


## Verified execution — startup restored-session 401 handled (15 October 2026)

- **Completed:** [PR #225](https://github.com/JainCommunityPlatform/jain-community-platform/pull/225) merged as `1c93a488308840ee160ecec8c89d308ef22a660b`.
- **Exact-head CI:** [#927](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38745451933) passed; **post-merge CI:** [#928](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38745904260) passed.
- **Behavior verified by regression test:** when a Firebase-cached identity is restored at startup but the backend returns HTTP 401, clear local Firebase credentials and leave the app signed out. Transient/non-401 failures remain recoverable.
- **Current P0 environment gate:** controlled staging/device verification for sign-in, expiry/revocation, restart/session restoration, role/membership propagation, tenant routing and donor receipt history. This requires a controlled Firebase configuration and test device/session; never use production donor/financial data. Android build/upload remains manual/on-demand.


## Verified execution — persisted finance-role revocation (15 October 2026)

- **Completed:** [PR #229](https://github.com/JainCommunityPlatform/jain-community-platform/pull/229) merged as `b1f06fa5f066b800ad8a6c5cbf074b0623708404`.
- **Exact-head CI:** [#934](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38747984088) passed; **post-merge CI #935** passed on merge commit `b1f06fa5f066b800ad8a6c5cbf074b0623708404`; Android AAB skipped by design.
- **Coverage advanced:** the Firestore-emulator HTTP suite now proves persisted finance-role revocation with the real `MembershipService`, retaining the general content-manager role and denying the next finance read before service access.
- **Next P0:** controlled staging/device identity and session verification (Firebase sign-in, expiry/revocation, restart, role/membership propagation, tenant routing and donor receipt history). Emulator results do not establish production/device behavior. Android build/upload remains manual/on-demand.


## P0 route-audit checkpoint — general tenant membership authorization (16 October 2026)

- The post-merge CI for PR #239 passed, so the finance-viewer giving mutation matrix is green on master.
- The route audit found one additional deterministic P0 boundary that was not explicitly exercised through the HTTP pipeline: the general `/api/memberships` list/assign/update routes. Unit tests existed, but they did not prove guard/interceptor behavior or prevent a future route wiring regression.
- The consolidated follow-up MR adds three HTTP integration scenarios: denied finance-viewer/cross-tenant membership administration, denied financial-role escalation through general membership routes (including overwriting an existing financial membership), and a positive non-financial role assignment with tenant-scoped audit.
- Remaining P0 environment gates are unchanged: real Firebase sign-in/revocation/role propagation and app restart on a controlled device; no production donor data. External UPI/bank settlement is not represented by emulator tests. Android AAB remains manual/on-demand.


## P0 route-audit checkpoint — internal profile migration token (16 October 2026)

- The controller audit found that `ProfileMigrationController` had unit tests for its internal-token check but no HTTP integration test proving the configured header is enforced on both mutating routes.
- The final consolidated route-audit follow-up adds missing/wrong-token denials and valid-token positive requests for profile provisioning and activity recording, asserting protected services are not invoked on denial.
- The test validates route/header wiring with a mocked profile service. Deployment secret configuration/rotation and caller identity are operational controls; Firebase/device verification and external UPI/bank settlement remain separate gates.
- Android AAB build/upload remains manual/on-demand.


## Consolidated API route audit — 16 October 2026

- Verified PR #239 (CI #952/#953), PR #240 (CI #954/#955), and PR #241 (CI #957/#958).
- The remaining route-level gaps found in the current pass are profile registration/contact identity handling and HTTP-level tenant/user scoping for notification list/preferences/read endpoints. These are grouped into one test MR rather than split by route.
- Environment acceptance is still separate: controlled Firebase staging/device session and role propagation, actual Storage/notification provider behavior, and external UPI/bank settlement are not proven by emulator or mocked HTTP tests.


## Persisted cross-tenant finance isolation — 16 October 2026

- The HTTP authorization route audit is consolidated through PR #242; exact-head CI #961 and post-merge CI #962 passed.
- The next risk-based gap is persisted membership isolation: an operator with a real Firestore membership in tenant B must not read or mutate finance data in tenant A. This is being added to the existing Firestore-emulator HTTP suite, not a mocked membership-only test.
- Broader persisted tenant-data isolation and production/staging identity/device checks remain separate evidence gates. Android AAB remains manual/on-demand.


## P0 finance-console decision interaction coverage — 17 October 2026

- PR #244 finance overview/retry/expense-entry widgets merged; exact-head CI #965 and post-merge CI #966 passed.
- The next consolidated widget test change covers payment verify/reject, expense approve/reject, and adjustment approve/reject, asserting decision endpoints and rejection reasons.
- These widget tests use a fake API client. They do not replace persisted backend/emulator maker-checker tests or staging/device/external-settlement verification.
- Android AAB remains manual/on-demand.


## Execution checkpoint — grouped website persistence tests (17 October 2026)

- **Prior merge:** PR #247 merged as `1e40a10ce1f211957eff90b53a73d530f466bb69`; exact-head CI #970 passed. Post-merge CI is UNKNOWN because the available connector lookup exposes PR-triggered runs/statuses but no default-branch run for the merge commit.
- **Current branch:** `qa/p1-website-save-reload-persistence` groups API service and Firestore-emulator tests for partial-update preservation/versioning, persistence failure without false success audit, and tenant-isolated save/reload.
- **Next:** exact-head CI, fix actual failures without weakening assertions, merge only if required checks pass and mergeability is confirmed, then verify post-merge CI where available. Full Flutter editor publish/reopen, real Storage and staging/device verification remain open.


## Website gallery URL validation and recovery — 18 October 2026

- PR #256 merged as `238718e05e00319c3cb10e0ef5c5934bb3ff934e`; exact-head CI #992 passed all required jobs. Post-merge default-branch [CI #39087779879](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39087779879) passed all applicable checks; Android AAB was skipped by design.
- Follow-up branch `qa/p1-gallery-upload-url-recovery-batch` consolidates multiple related cases in one MR: reject HTTP, relative, empty and hostless HTTPS URLs; verify invalid values are not assigned to the image field; and prove a valid retry succeeds after an invalid URL response.
- Evidence boundary: fake repository/widget tests prove client-side handling only. Real Storage, URL reachability and staging/device behavior remain separate acceptance gates.
- Android AAB remains manual/on-demand.


## Post-merge CI correction — website gallery URL validation (18 October 2026)

- PR #256 exact-head CI #992 passed and the default-branch push workflow [#39087779879](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39087779879) subsequently passed Flutter, connected giving journey, backend, repository validation and merge gate. This supersedes the earlier UNKNOWN post-merge note.
- PR #257 remains in progress; exact-head CI #39087830219 has passed repository validation, Flutter analyze/widget tests and backend lint/unit/integration/emulator/build, with the connected giving journey still running at the last check.


## Next grouped P1 work — profile and contact-linking UI resilience (18 October 2026)

- Previous merge: PR #257 gallery URL validation/retry matrix merged as `ea45df4972dc21dfe29f3a9dea94019acfae55f8`; exact-head CI #39087984656 passed all required jobs. Post-merge default-branch CI #39088157001 passed all applicable checks.
- Current branch `qa/p1-profile-contact-ui-regressions-batch` groups profile edit cancel/no-save, save trimming and read-only recovery, save failure/retry, load failure/retry, pull-to-refresh reload, plus contact-link validation, disabled duplicate submission and recoverable failure.
- Evidence boundary: profile and contact-link UI tests use fake repositories/callbacks. API identity/tenant authorization tests exist separately; full persisted UI/API round-trip and staging/device behavior remain open.
- Keep this work as one coherent MR. Android AAB remains manual/on-demand.


## Next grouped P1 work — tenant member administration UI workflows (18 October 2026)

- Previous merge: [PR #258](https://github.com/JainCommunityPlatform/jain-community-platform/pull/258), merge commit `46a332a4b345b150aeb84cf991fcc721911ed45b`; exact-head CI #39088411925 passed all required checks. Post-merge CI #39088624672 was in progress at last check.
- Current branch `qa/p1-admin-members-ui-workflow-batch` consolidates add-member validation/create retry, contact validation/update, role change, remove, and pull-to-refresh into one test MR.
- Evidence boundary: widget tests use a fake repository; existing API authorization tests separately cover tenant/role boundaries. Real persisted membership lifecycle and staging/device session behavior remain open.
- Android AAB remains manual/on-demand.


## Member administration UI batch — CI failure diagnosis (18 October 2026)

- First exact-head [CI #39088711839](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39088711839) passed repository validation but failed five new widget cases.
- Root cause: Add/Contact dialogs tied controller disposal to the `showDialog` future, which can complete before the transition widget is fully removed; CI reported "TextEditingController was used after being disposed." Dedicated stateful dialog widgets now own/dispose controllers. Fake repository mutation calls yield asynchronously so the popup route is removed before the parent list refreshes.
- Updated branch `qa/p1-admin-members-ui-workflow-batch` awaits a fresh exact-head CI run before merge.
- Separate post-merge note: PR #258's default-branch CI #39088624672 failed the connected-giving journey despite exact-head CI passing. Investigate readiness and API context if this recurs; do not conflate it with member UI regressions.


## Connected giving integration readiness — fix in member administration QA batch (18 October 2026)

- Post-merge PR #258 CI #39088624672 and PR #259 CI #39089123588 both failed the connected-giving journey with the seeded campaign absent. Logs show repeated connection refusals to port 4317 while the background `npx ts-node` process was considered exited.
- The workflow previously tracked the `npx` wrapper PID and only probed `my-receipts`, not the campaign endpoint needed by the Flutter screen.
- Current branch changes launch `./node_modules/.bin/ts-node` directly and require both seeded campaign and receipt endpoints to be ready with the same tenant header before starting the Flutter integration test.
- The updated workflow and member UI regressions need a fresh exact-head CI run; no merge until all required checks pass.


## Next grouped P1 work — notification delivery retry and tenant idempotency (18 October 2026)

- Previous merge: PR #259, commit `86ac65e75b6ee94d15ca8d29f0a1447b6b271b1e`; exact-head CI #39089408184 passed. Post-merge default-branch CI #39089595905 passed all applicable checks, including the connected giving journey; Android AAB was skipped by design.
- Current branch `qa/p1-notification-delivery-retry-batch` adds tests for blank destination skipping, retrying FAILED deliveries with the same provider idempotency key, avoiding cross-tenant deduplication, and keeping provider rejection/timeout from failing the persisted in-app event workflow.
- Evidence boundary: provider HTTP calls and Firestore are mocked; live provider delivery and production persistence remain separate gates.
- Android AAB remains manual/on-demand.


## Notification delivery retry/idempotency batch — exact-head CI verified (18 October 2026)

- PR #259 post-merge [CI #39089595905](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39089595905) passed all applicable checks after the connected-giving workflow fix.
- PR #260 exact-head [CI #39089740194](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39089740194) passed Flutter analysis/tests and connected giving, backend lint/unit/integration/Firestore-emulator/build, repository validation and merge gate. Android AAB skipped by design.
- Tests cover blank destination skip, retrying FAILED delivery with the same provider idempotency key, tenant-scoped delivery identity, and swallowing provider rejection/timeout in event dispatch. Provider and Firestore calls are mocked.
- PR #260 remains open until the post-merge verification strategy is confirmed; next merge gate is to verify current PR state/mergeability and merge only with required checks green.


## Next grouped P1 work — public directory and tenant landing pages (18 October 2026)

- PR #260 merged as `793aff1ad9d208f685191d970ddb35b9d54629ed`; exact-head CI #39089935044 passed all required checks. Post-merge default-branch [CI #39090197145](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39090197145) passed all applicable checks, including connected giving; Android AAB was skipped by design.
- Current branch `qa/p1-public-directory-recovery-batch` groups public directory empty-state/search feedback, API error/retry across Home and Temples, location filtering, pull-to-refresh reload, and anonymous landing-page sign-in navigation.
- Evidence boundary: directory calls use MockClient and public landing tests use a test GoRouter. Tenant hostname routing, live public website content and staging/device behavior remain open.
- Android AAB remains manual/on-demand.


## Public directory batch — updated post-merge evidence (18 October 2026)

- PR #260's default-branch CI #39090197145 passed all required checks; Android AAB skipped by design.
- PR #261 groups public directory empty state, API failure/retry, location search, refresh reload, and anonymous public landing/sign-in navigation.
- Exact-head CI #39090348627 was in progress when the checkpoint was refreshed; the newest head must be rechecked after this docs update.


## Public landing CTA test correction — 18 October 2026

- First PR #261 run #39090394205 passed directory empty/search, API retry and refresh cases; the public landing test failed because the “Sign in to continue” CTA is below the lazy ListView viewport.
- The test now scrolls to the bottom before locating the CTA; it then verifies both sign-in actions navigate to the login route.
- PR #260 post-merge CI #39090197145 passed all applicable checks. PR #261 must pass fresh exact-head CI before merge.


## Next grouped P1 work — localization/accessibility/responsive checks (18 October 2026)

- PR #261 exact-head CI #39090600461 passed; post-merge CI #39090790721 was in progress at last check.
- Current branch `qa/p1-localization-accessibility-responsive-batch` batches supported-locale shared strings, dynamic English-to-Hindi validation, semantics for mobile field/button, and narrow 320px layouts at 1.5 text scale for member directory and public landing.
- Evidence boundary: widget tests do not replace physical-device testing, contrast measurement, keyboard/focus audit, or complete localization of public tenant content.
- Android AAB remains manual/on-demand.


## Public directory post-merge verification and localization batch (18 October 2026)

- PR #261 default-branch [CI #39090790721](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39090790721) passed all required checks; Android AAB skipped by design.
- PR #262 groups supported-locale strings, dynamic language switching, semantics and responsive layout at narrow viewport/larger text.
- Exact-head CI #39090937905 was running when this checkpoint was updated; the newest head must be rechecked after this docs update.


## Localization/accessibility test-harness corrections — 18 October 2026

- PR #262 first run #39090967002 failed three new assertions: a semantics handle leaked when the locale assertion failed, and lazy directory/public landing children were asserted before being built.
- The locale test now disposes semantics in `finally` and uses anchored/pattern semantics labels. Responsive tests use `dragUntilVisible` to ensure offscreen content is built before assertions.
- PR #261 post-merge CI #39090790721 passed all required checks. PR #262 needs a fresh exact-head CI run after these corrections.


## Locale test static-analysis correction — 18 October 2026

- PR #262 run #39091208599 failed analysis due malformed test source after the previous automated text edit: raw RegExp syntax was corrupted and widget setup duplicated.
- The locale test file has been rewritten cleanly; the semantics handle is disposed in `finally`. A new exact-head run must verify analysis and all tests.


## Semantics node assertion refinement — 18 October 2026

- Run #39091376820 passed analysis and both responsive layout cases; the localized CTA semantics query matched both IndexedSemantics and Semantics wrappers for the same control.
- Updated the assertion to accept multiple framework nodes while continuing to require the Hindi accessible label and Hindi-only validation message. Latest exact-head CI must verify the final head.


## CI connected-giving tenant fixture alignment — 18 October 2026

- CI #39091500794 failed the connected Flutter → NestJS → Firestore journey because the server generated a per-run tenant ID while the workflow/client used the hard-coded `connected-giving-test` tenant header. Other backend checks and repository validation passed.
- Fix included in the current grouped PR #262: extract the tenant ID from the connected test server's readiness JSON and pass it through `JCP_CONNECTED_TENANT_ID` to the Flutter test and readiness probes. No integration assertions are removed.
- Await fresh exact-head CI. Merge only after the connected journey and all required checks pass; verify default-branch CI separately. Android AAB remains manual/on-demand.


## Connected Flutter giving journey — diagnostic expansion (18 October 2026)

- Exact-head CI #39118114093 still failed the connected widget render despite the workflow preflight finding the seeded campaign and receipt via the generated tenant ID. All backend and repository jobs passed.
- The grouped PR #262 now probes campaigns, pledges, receipts and notifications individually before mounting the donor page, and uses a 15-second request timeout. This should localize an API dependency failure and reduce cold-start sensitivity without removing the live journey or relaxing its receipt/campaign assertions.
- Re-run exact-head CI and fix the observed root cause before merging. Verify post-merge CI independently; Android AAB remains manual/on-demand.


## Verified localization batch and next API validation batch — 18 October 2026

- PR #262 merged as `91146da0b479a976f19219a9370e21d6545d1579`; exact-head CI #39118457894 and post-merge CI #39118764541 passed all applicable required checks, including the connected Flutter → NestJS → Firestore emulator receipt journey. Android AAB remains manual/on-demand.
- Next grouped branch `qa/p1-api-dto-validation-failure-matrix` adds HTTP E2E payload validation across campaign creation, pledges, expenses and notification preferences. It covers invalid numeric values, malformed dates, excessive evidence references, wrong boolean types, unknown fields and tenant-field injection; invalid requests must not call domain services or emit success audit.
- After CI, merge only on a green exact head, verify default-branch CI separately, then continue the remaining DTO/auth failure matrix.


## Next P0 — connected donor pledge write/read-after-write journey (18 October 2026)

- PR #263 merged as `21867d8b95200ca4c67f8a3eb0d4e25d4e4d05af`; exact-head [CI #39119173399](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39119173399) and post-merge [CI #39119374068](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39119374068) passed all applicable checks. Android AAB skipped by design.
- Current branch `qa/p0-connected-donor-pledge-e2e-batch` upgrades the connected Flutter → NestJS → Firestore-emulator journey: invalid zero pledge is rejected without changing persisted pledge count; a valid ₹123.45 pledge is created from the UI and verified by a subsequent live API read; seeded receipt remains visible.
- This is P0 UI-to-API-to-persistence coverage. Do not merge until exact-head CI passes and the read-after-write assertions are green; verify post-merge CI independently. Production/staging identity and external settlement remain separate gates.


## Next P0 — persisted cross-tenant donor and campaign isolation (18 October 2026)

- PR #264 merged as `cd4b6a3082880cc0b7fe3ccf93bac60db3ac7add`; exact-head [CI #39119641541](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39119641541) and post-merge [CI #39119849096](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39119849096) passed the connected UI pledge write/read-after-write and all applicable required checks.
- Current branch `qa/p0-persisted-cross-tenant-donor-isolation-batch` batches persisted tenant-boundary cases: donor pledge/receipt history created in tenant A must be empty in tenant B; tenant B cannot create a pledge against tenant A's campaign; direct Firestore assertions prove no tenant B pledge or receipt was persisted.
- Use two resolved tenant hosts with the real Firestore Emulator and HTTP pipeline. Merge only after exact-head CI passes and mergeability is confirmed; verify post-merge CI independently. Production/staging identity remains a separate gate.


## PR #265 CI repair — isolated tenant fixture (18 October 2026)

- Exact-head CI #39120170312 failed two later reconciliation tests because the new cross-tenant scenario added a receipt to the suite's shared tenant; observed receipt counts increased by one. The new scenario must not pollute other tests' data.
- Fix: allocate a separate tenant pair/hostnames for the new scenario and seed operator/approver memberships for that isolated tenant. Existing exact-count expectations are preserved.
- Re-run full exact-head CI and merge only if every required job passes; then verify post-merge CI independently.


## Current P0 checkpoint — persisted donor isolation and linked payment-to-receipt journey (19 October 2026)

- PR #265 merged as `7cfe8f8c3e03e19471de5980ad392fa7d718f4c4`; exact-head [CI #39120375666](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39120375666) passed all required checks after test data was isolated. Post-merge [CI #39234175711](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39234175711) was still running at last poll.
- Current branch `qa/p0-connected-donation-payment-receipt-batch` expands the connected Flutter → NestJS → Firestore-emulator test so the pledge created in the UI is the one paid and approved. It asserts distinct operator/approver identities, persisted receipt association and amount, balanced reconciliation, and receipt visibility after refreshing the donor UI.
- Merge gate: exact-head required checks green and mergeability confirmed; then verify post-merge CI independently. Do not weaken existing receipt, reconciliation, or tenant-isolation assertions to make CI green.
- Evidence boundary: emulator-backed integration does not establish production Firebase identity, external UPI/bank settlement, or staging/device behaviour. Android AAB remains manual/on-demand.


## Consolidated P0 donation lifecycle MR — UI-linked payment plus replay/reconciliation (19 October 2026)

- PR #266 combines the connected Flutter pledge → NestJS payment → independent approval → Firestore receipt flow with an API/Firestore-emulator regression for idempotent payment retries, conflicting key reuse, maker-checker denial, duplicate approval, two partial payments, persisted donor balance and receipt reconciliation.
- The related tests are grouped into one MR; PR #267's duplicate changes are transferred here to avoid separate small MRs.
- PR #265 post-merge [CI #39234175711](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39234175711) passed all applicable checks. PR #266 requires fresh exact-head CI after the combined changes and independent post-merge verification after merge.


## Next P0/P1 cross-cutting batch — persisted notification preferences and read state (20 October 2026)

- PR #266 merged at `c9c378da8bf8a43b41e67f8fdb413e7147d4dcad`; exact-head [CI #39304067428](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39304067428) passed required checks. Post-merge [CI #39305120442](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39305120442) was still in progress at last poll.
- Branch `qa/p0-notification-persistence-isolation-batch` groups related persistence/security cases: channel preferences default to opt-out; updates survive HTTP read-after-write; preferences do not leak across tenants or users; pledge-created notifications persist; read state survives a fresh list request; another user and another tenant cannot mark/read the notification.
- Real NestJS HTTP + Firestore Emulator is the automated evidence layer. Real provider delivery and staging/device identity are separate gates; Android AAB remains manual/on-demand.


## Next grouped profile persistence and identity-boundary batch (20 October 2026)

- PR #268 merged as `7c3cb24d32cffd5443c61a6584ebcc335af66d8a`; exact-head [CI #39305782003](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39305782003) passed all required jobs. Post-merge [CI #39306280409](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39306280409) passed all applicable checks on master; Android AAB skipped by design.
- Branch `qa/p1-profile-persistence-identity-batch` batches the remaining profile API persistence gap: valid field update → HTTP read-after-write → direct Firestore assertion; phone/contact fields remain immutable through this endpoint; malformed values and caller-supplied user/email/phone fields are rejected with no persisted change; another user's profile remains unchanged.
- This is emulator-backed HTTP evidence, separate from existing fake-repository Flutter widget coverage and from staging/device identity verification.


## Next grouped P1 — connected profile UI to persisted API read-after-write (20 October 2026)

- PR #269 merged at `c2b6ac853c63910ec59b229456a88ca1f3b26deb`; exact-head [CI #39307326991](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39307326991) passed all required checks. Post-merge [CI #39307890603](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39307890603) was running at last poll.
- Branch `qa/p1-connected-profile-ui-api-persistence-batch` extends the existing connected Flutter/NestJS/Firestore emulator run with a profile widget journey: seed editable profile via HTTP, load through the Flutter profile page, update name and city through the UI, then verify the new values and preserved email through a fresh live API read.
- This closes the current gap between fake-repository profile widget tests and emulator-backed API tests. Physical-device and production identity checks remain separate acceptance gates.

## Next grouped P1 — connected website editor publish and persisted reload (20 October 2026)

- PR #270 merged at `36fc2e371fd82ccb35ea528a21626aa009f77b0b`; exact-head CI #39308626401 and post-merge CI #39309084778 passed all applicable checks. Android AAB skipped by design.
- Branch qa/p1-connected-website-publish-persistence-batch adds the connected website editor workflow using a content-manager identity against the real NestJS HTTP API and Firestore Emulator.
- The batch covers UI save/publish and read-after-write, version increment, unrelated contact-field preservation, rejected blank hero title without version/config mutation, and reopening the editor to confirm the saved title.
- Evidence boundary: no production Firebase/tenant-hostname or physical-device claim; real Storage/public media URL reachability remains open.


## PR #271 CI failure and correction — 20 October 2026

- Exact-head [CI #39349173873](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39349173873) failed the connected Flutter → NestJS → Firestore Emulator job; backend checks and repository validation passed.
- Root cause from the Flutter test log: the connected website publish test looked for the hero title TextField while `Hero / मुख्य भाग` was collapsed. The test never reached the publish or persistence assertions.
- Fix: explicitly expand the hero section before editing and after reopening the editor. All substantive assertions remain in place; no test is skipped and no checks are weakened.
- Fresh exact-head CI is required before merge. Android AAB remains manual/on-demand.
