# JCP QA Coverage Inventory

Last reviewed: 14 October 2026  
Status: **baseline inventory in progress** — this is not a claim that every screen, route, or workflow has been exhaustively audited.  
Control issue: [#162 — QA Control Tower](https://github.com/JainCommunityPlatform/jain-community-platform/issues/162)  
Roadmap: [QA Roadmap](roadmap.md)  
Behaviour specifications: [BDD / behavioural specifications](behavioral-specifications.md)

## How to use this inventory

Keep one row per meaningful user journey or security invariant. Add concrete test names and paths as they are verified; do not infer coverage from a file name alone. A scenario moves through **Not inventoried → Specified → Automated → CI green → Environment verified → Released**. These are separate states.

Priority: **P0** blocks safe release or risks tenant/financial/security integrity; **P1** is important product workflow or user-visible failure; **P2** is broader resilience, usability, and regression confidence.

Evidence boundaries:
- **Unit/mock/fake** proves logic at the mocked boundary only.
- **HTTP integration** proves the real route/guard/controller pipeline exercised by the test, but may still use mocked identity or persistence.
- **Emulator/persistence integration** proves persisted behaviour against the configured emulator, not production.
- **Staging/device** proves only the tested build, configuration, device, and environment.
- **Released** requires the actual distribution channel/build to be identified.

## Initial inventory (repository evidence as of 12 October 2026)

| ID | Area / journey | Priority | Evidence already present | Known gap / next verification | Initial state |
|---|---|---:|---|---|---|
| QA-001 | Authentication, session restoration, sign-out | P0 | Flutter session/auth tests under `apps/flutter/test/core/session/`; controller-level startup restoration, sign-out, handshake timeout/error tests; `apps/flutter/test/widget_test.dart` login, protected-route role denial, sign-out refresh, role-refresh, expired-session refresh, and initial session-restoration failure redirects; API auth/identity unit tests | Verify Firebase Emulator/device login, expired/invalid credentials through real API, live role/session changes, membership revocation, restart/session restore and offline/error UI | Partial; PR #182 merged; exact-head CI #800 passed on `7c5a3bc870b8e82fd6ac3d671fb7e9e4b1b5e546`; post-merge default-branch CI UNKNOWN; device/emulator restart and environment verification open |
| QA-002 | Tenant selection and cross-tenant isolation | P0 | Tenant context/resolver tests; `apps/api/test/app.e2e-spec.ts` cross-tenant finance/member mutations, profile-contact denial, donor history scoping, finance decision denials, and website update/reset denial for cross-tenant content managers | Continue full protected-route matrix for media upload, remaining platform/tenant administration, and any future export routes; persisted Firestore isolation and staging identity verification remain open | Partial; PR #197 merged with exact-head CI #858 and post-merge CI #859 green. This branch adds website configuration update/reset denials before service invocation. Persisted/environment matrix remains open |
| QA-003 | Donation campaign discovery and lifecycle | P0 | Firestore emulator coverage for active campaign visibility, partial-payment/receipt reconciliation, concurrent pledge idempotency and donor-history isolation; API HTTP coverage for campaign and pledge creation, tenant/donor/campaign/amount/idempotency propagation, authorization/audit boundaries; Flutter `DonorGivingPage` widget journey covers pledge success, inactive-donor failure, and receipt visibility only after mocked approval state appears on refresh (PR #190) | Continue actual persisted UI/API journey and controlled staging/device verification; mocked receipt refresh does not itself execute finance approval or Firestore persistence | Partial; PR #189 merged as `88adb21d0330d2cc03d45b1b0c1b07ca3b759147`; exact-head CI #822 and post-merge CI #823 passed. PR #190 merged as `56e8d986b96ac48027881148475dc98f9d6ad590`; exact-head CI #835 and post-merge CI #836 passed. Persisted Firestore and device/environment evidence remain separate |
| QA-004 | Financial maker-checker, balance and receipt integrity | P0 | Giving service/controller tests; Firestore fake-adapter and emulator cases for self-approval, overpayment, concurrent approval, receipt allocation and audit; HTTP E2E denial/audit regressions for cross-tenant payment/expense/adjustment operations | Verify persisted workflow and staging behavior; concurrent edge cases, reversal/adjustment, receipt uniqueness and audit trail across complete workflows | PRs #191–#195 merged with exact-head CI green; current regression expands cross-tenant approve/reject checks to finance approver role for expenses and adjustments. Persisted/staging verification remains open |
| QA-005 | Finance reports and reconciliation | P0 | `apps/api/test/app.e2e-spec.ts` verifies finance summary/reconciliation access only for the resolved tenant; PR #179 adds cross-tenant denials for receipts, pledges, payments, expenses, adjustments, summary and reconciliation; persisted reconciliation tests compare payment, receipt, expense and refund totals | Cross-check report/export rows and totals against persisted receipts, pending payments, approved adjustments/refunds and expenses; there is no export route in `GivingController` currently, so determine/export requirement separately before treating export authorization as a route test | HTTP route authorization and tenant argument assertions automated; PR #179 exact-head CI #790 green; post-merge CI UNKNOWN; persisted reconciliation emulator coverage exists, but complete end-to-end report and any future export workflow remain open |
| QA-006 | Finance role administration and revocation | P0 | Authorization policy/guard, membership service, platform finance-team tests; `apps/api/test/app.e2e-spec.ts` verifies grant/revoke and next-request denial across tenant-scoped expense, payment, adjustment, pledge, receipt, summary and reconciliation reads | Persisted Firestore membership revocation, token/session propagation, and staging verification; expand remaining protected write/admin routes as inventory confirms them | HTTP revocation route matrix automated with mocked membership transition; persisted/environment verification remains open |
| QA-007 | Tenant website editor, save/publish, reload | P1 | Flutter website repository/gallery workflow tests; API website service/controller tests; HTTP integration denials for cross-tenant content-manager update/reset and finance-viewer update (current PR) | Exercise authorized save/publish and reopen-after-refresh with persisted backend data; verify failed save does not damage published version and two tenants stay isolated | Partial; authorization boundary automated with mocked membership/service; persisted E2E open |
| QA-008 | Media upload and gallery | P1 | Flutter gallery workflow test; API Firebase Storage and website tests; BDD upload/cancel/invalid-media cases | Verify unsupported/oversized file, network failure, retry without duplicate, progress/error placement, URL reachability, publish-after-save, device layout and real Storage configuration | Partial; real Storage/device evidence open |
| QA-009 | Member profile and contact linking | P1 | Flutter profile repository/page and registration-context tests; API profile controller/service tests; BDD profile requirements | Verify permitted fields, cancel/no-save, save then reload, contact identity protection, cross-tenant denial, pull-to-refresh and real session behaviour | Partial; full UI/API persisted journey open |
| QA-010 | Tenant members and platform administration | P1 | Flutter admin member/repository tests; API tenant/platform/membership service/controller tests | Cover create/edit/remove/invite or onboarding flows supported by product, invalid inputs, authorization matrix, audit trail and multi-tenant separation | Inventory incomplete |
| QA-011 | Notifications and delivery preferences | P1 | API notification controller/service/event-dispatcher/delivery tests; notification feature described in BDD | Verify user/tenant association, unread/read lifecycle, opt-in, verified destination, provider timeout/retry/idempotency and that delivery failure never reverses committed financial state | Partial; provider/staging evidence open |
| QA-012 | Public directory and public tenant pages | P1 | Directory controller test; Flutter home/tenant home screens and widget tests | Check anonymous access, active-tenant scoping, empty/error/loading states, responsive layout and no private member/finance leakage | Inventory incomplete |
| QA-013 | Localization, accessibility and responsive layout | P1 | Flutter app-string test and at least a narrow-phone readability test are present in the test tree | Audit all screens for language completeness, mixed-language/error strings, text scaling, keyboard/focus/semantics, contrast and small/large screen layout | Baseline evidence only |
| QA-014 | HTTP DTO validation and failure mapping | P1 | API controller, DTO, config and app E2E test suites exist | Build route-by-route positive/negative matrix: missing/invalid fields, authentication, permission, tenant context, not found, conflict, rate/size limits where relevant | Inventory incomplete |
| QA-015 | Build/release and deployment readiness | P1 | CI workflow runs frontend analysis/tests and backend checks; Android workflow is separate/on-demand by policy | Document exact commit, CI run, environment/device smoke results, version/build artifact and release destination; verify Android packaging only when intentionally requested | CI evidence exists; release evidence tracked separately |
| QA-016 | Automated UI-to-API-to-persistence E2E | P0 | API E2E test file exists at `apps/api/test/app.e2e-spec.ts`; existing Flutter widget tests cover selected mocked flows | Confirm actual test commands and environment setup; add a dedicated Flutter `integration_test/` suite if absent after branch recheck; establish controlled emulator-backed critical journeys and artifact capture | Open; do not assume broad E2E exists |
| QA-017 | CI reliability and failure classification | P1 | `.github/workflows/ci.yml` and cleanup workflow exist; recent PR/master CI evidence available in Actions | For each failure capture failing job/test, exact head SHA, category (product/test/config/flaky), fix and rerun; ensure required checks cannot be bypassed and Android release remains manual | Process improvement needed |

## First execution queue

1. **P0-A — Inventory completeness:** enumerate every Flutter screen, API controller/route, data mutation, and role/tenant permission. Add a row or explicit “not applicable” decision for each.
2. **P0-B — Donation-to-receipt E2E:** implement the highest-value end-to-end path and negative cases using isolated test data; prove persisted state and donor refresh.
3. **P0-C — Authorization route matrix:** enumerate protected endpoints and assert both allowed and denied roles, including cross-tenant attempts and no side effects on denial.
4. **P0-D — CI test-layer truth:** confirm which unit, API E2E, Firestore emulator and Flutter tests actually run in each workflow. Record command, trigger, and artifacts.
5. **P1-A — Website/media workflow:** upload → save → publish → refresh/reopen, plus cancel/failure/oversize/retry and tenant isolation.
6. **P1-B — Member, event/directory, notifications and localization:** fill the matrix using the same evidence rules.
7. **P1-C — Release gate:** add a repeatable staging/device checklist and record exact build/commit evidence.

## Update rules

- Update this file in the same PR that adds a meaningful new scenario, or in the QA tracking PR that verifies the evidence.
- Link exact test paths and scenario names; add the CI run or PR URL when available.
- Never mark **Environment verified** from a unit/widget test alone.
- Never mark **Released** from a merge alone.
- Do not publish an overall coverage percentage until the inventory denominator and measurement method are defined.
- Keep Android build/upload on-demand; ordinary PR merges must not trigger an Android release build/upload unless explicitly requested by the project’s release policy.


## Execution note — donor self-service tenant scope (13 October 2026)

- PR #180 adds HTTP integration assertions that `GET /api/giving/my-receipts` and `GET /api/giving/my-pledges` pass the resolved active tenant ID and authenticated user ID to the donor-history service.
- The existing Firestore emulator scenario `isolates persisted donor pledge and receipt history by both tenant and donor` verifies persisted filtering against both keys. The HTTP test uses mocked identity and service output; it is not itself persisted-data evidence.
- Exact-head CI #792 failed on the initial version because the test expected 403 for a user whose membership belongs to another tenant. That expectation was inconsistent with the donor self-service contract: donors may access their own history, but the query must be scoped to the active tenant and their own identity. The corrected test asserts an empty result when the scoped service returns no matching records and verifies the exact tenant/user arguments. Fresh exact-head CI is required before merge.


## Execution note — PR #180 donor-history scoping (13 October 2026)

- PR #180 merged as [7f3b572a20d58c61e0cf5c6d27984594d018fb1a](https://github.com/JainCommunityPlatform/jain-community-platform/commit/7f3b572a20d58c61e0cf5c6d27984594d018fb1a).
- Initial CI #792 failed on the first test expectation; the corrected latest head `e5a2c6e5f9d39e5b9964532c8b4e9b123e07aa13` passed all applicable jobs in CI #794: https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38352904588. Android AAB was skipped by policy.
- Post-merge push-triggered CI for #180 is UNKNOWN because the connected commit-run lookup did not return push-triggered runs. Do not infer a pass from CI #794.
- PR #181 adds HTTP integration assertions that rejected payment/expense/adjustment approvals or rejections return 403 without writing a success audit event. This complements existing service/emulator self-approval assertions; mocked GivingService failures mean it does not replace persisted Firestore verification.


## Execution checkpoint — authorized campaign writes and success audit (13 October 2026)

- **Merged:** [PR #185](https://github.com/JainCommunityPlatform/jain-community-platform/pull/185), merge commit `eec4b012aa56e3904bffd7800de40b062d1553d2`.
- **Exact-head CI:** [run #805](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38416322337) passed repository validation, backend lint/unit/integration/Firestore-emulator/build, Flutter analysis/tests, and merge gate. Android AAB skipped by design.
- **Post-merge CI:** [run #807](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38416748402) is in progress; do not mark post-merge verification complete until its conclusion is observed.
- **Coverage:** finance-operator campaign creation/status changes assert resolved tenant context, authenticated actor where applicable, and success-audit records.
- **Next P0:** deny campaign writes from a finance operator whose membership belongs to a different tenant; both create and status mutation must have no persistence or audit side effects.
- **Evidence boundary:** HTTP integration with mocked membership, persistence and audit services; persisted campaign lifecycle and staging/device verification remain open. Android build/upload remains manual/on-demand.


## Execution note — cross-tenant campaign write matrix (13 October 2026)

- **PR in progress:** cross-tenant campaign write denial for both finance operators and tenant administrators.
- **Regression:** create and status-update requests under tenant A using a membership from tenant B must return 403; campaign persistence and success-audit writer must remain untouched.
- **Prior baseline:** PR #186 merged as `7ba24ef6718f65016752c3259e66469c501ebf50`; exact-head CI #810 passed and post-merge master CI #811 passed. Android AAB was skipped by design.
- **Evidence boundary:** HTTP integration tests mock membership, persistence and audit. Persisted campaign lifecycle, donor UI-to-API journey, and staging/device verification remain open. Android build/upload remains manual/on-demand.


## Execution note — donor pledge HTTP contract (13 October 2026)

- Added an API integration regression for successful pledge creation: resolved tenant ID, authenticated donor ID, campaign ID, amount and idempotency key must reach the giving service; the success audit is asserted after the service returns the pledge.
- Added a negative HTTP case: when the giving service rejects a donor because their tenant-donor relationship is inactive, the controller returns HTTP 403 and emits no success audit. The first attempt incorrectly assumed the membership guard rejects all pledge writes from a cross-tenant member; CI showed that public donor pledge eligibility is enforced by the giving/persistence layer, so that unsupported expectation was replaced rather than weakening unrelated assertions.
- **Evidence boundary:** these tests use mocked membership, giving persistence and audit services. They do not prove persisted Firestore lifecycle or a Flutter widget/device journey.
- Current branch: `qa/donor-pledge-http-contract`; exact-head CI must pass before merge. Android build/upload remains manual/on-demand.


## Execution note — donor receipt after payment approval (14 October 2026)

- New widget regression: `apps/flutter/test/features/giving/donor_giving_page_test.dart` — “donor sees a receipt after an approved payment appears on refresh”. It verifies no receipt is shown before the mocked backend reports an approved payment, then the donor refreshes and sees the returned receipt number, method/date, and amount.
- Evidence boundary: this verifies donor UI refresh/rendering against mocked HTTP state. It does not execute finance approval, prove persisted Firestore transaction/receipt creation, or establish staging/device behavior. Those remain P0 follow-ups.
- PR #189 merged as `88adb21d0330d2cc03d45b1b0c1b07ca3b759147`; exact-head CI #822 passed. Post-merge [CI #823](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38495571718) was still running at branch creation; update status only after its conclusion is observed. Android AAB remains manual/on-demand.


## Post-merge verification — PR #189 (14 October 2026)

- Push-triggered [CI #823](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38495571718) completed successfully on merge commit `88adb21d0330d2cc03d45b1b0c1b07ca3b759147`. Repository validation, backend lint/unit/integration/Firestore-emulator/build, Flutter analyze/tests and merge gate passed. Android AAB was skipped under the manual/on-demand release policy.
- This confirms the post-merge CI gate only; it does not upgrade the donor pledge journey to persisted/staging/device verified.


- **PR #190 CI #832 failure and repair (14 October 2026):** [run #832](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38499891701) again failed only the exact receipt date-label assertion (73 passed, 1 failed); backend checks and repository validation passed. Changing the timestamp alone did not resolve it. The test now derives the expected localized medium date using `MaterialLocalizations` for the fixed issue instant and still compares the full rendered `UPI • date` subtitle exactly. Await fresh exact-head CI.


## Execution note — cross-tenant payment approval denial (14 October 2026)

- PR #190 merged as `56e8d986b96ac48027881148475dc98f9d6ad590`; exact-head CI #835 passed. Post-merge CI #836 is running; do not call it green until completed.
- New regression under branch `qa/cross-tenant-payment-approval-denial`: a finance approver whose membership resolves to tenant B cannot approve a payment while tenant A is active; expect HTTP 403 and assert no GivingService approval call or success-audit event.
- Evidence boundary: mocked HTTP authorization; the Firestore emulator already tests persisted cross-tenant payment approval denial. Staging/device verification remains open.


## Execution note — cross-tenant payment recording denial (14 October 2026)

- PR #191 merged as `a3918a09fe7a8cd64d5259a2511ab76e05209acf`; exact-head [CI #842](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38503605901) passed. Post-merge [CI #843](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38503917818) passed backend lint/unit/integration/Firestore-emulator/build, Flutter analyze/tests, repository validation and merge gate. Android AAB was skipped by design.
- Current branch `qa/cross-tenant-payment-recording-denial` adds a route-level regression: a finance operator whose membership belongs to tenant B cannot record a payment while tenant A is active; the test asserts HTTP 403 and no GivingService call or success audit.
- Evidence boundary: mocked HTTP authorization; Firestore emulator separately covers persisted cross-tenant payment references. Staging/device verification remains open.


## Execution note — cross-tenant payment rejection denial (14 October 2026)

- PR #192 merged as `a071ebb6ab88f33178d09fe44aa98b65293cd9ea`; exact-head [CI #846](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38504152722) passed. Post-merge [CI #847](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38504392374) passed backend lint/unit/integration/Firestore-emulator/build, Flutter analyze/tests, repository validation and merge gate. Android AAB was skipped by design.
- Current branch `qa/cross-tenant-payment-rejection-denial` adds a route-level regression: a finance approver whose membership belongs to tenant B cannot reject a payment while tenant A is active; assert HTTP 403 and no GivingService call or success audit.
- Evidence boundary: mocked HTTP authorization; Firestore emulator separately covers persisted cross-tenant payment decision isolation. Staging/device verification remains open.
