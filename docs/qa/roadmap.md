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

- **Previous completed item:** [PR #172](https://github.com/JainCommunityPlatform/jain-community-platform/pull/172) merged as `4000fd9fa1d6e2184657b48a5465239aac115899`; exact-head [CI #770](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38295541409) passed all required checks. Post-merge [CI #771](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/3829579) is being verified.
- **Current item:** P0 auth/session UI — refreshed membership roles must immediately remove access to a protected finance screen.
- **Assertions:** finance role initially permits the route; refreshing the session to a non-finance role redirects to member home and removes finance content.
- **Evidence boundary:** mocked session refresh and Flutter router; persisted membership revocation and production API/session propagation remain open.
- **Next action:** finish post-merge CI #771, open the focused PR, inspect exact-head CI, fix real failures, merge only when required checks pass, verify post-merge CI, and continue auth/session expiry and restoration gaps.
- **Release policy:** Android build/upload remains manual/on-demand.
