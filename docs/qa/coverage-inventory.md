# JCP QA Coverage Inventory

Last reviewed: 15 October 2026  
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
| QA-001 | Authentication, session restoration, sign-out | P0 | Flutter session/auth tests under `apps/flutter/test/core/session/`; controller-level startup restoration, sign-out, handshake timeout/error tests; `apps/flutter/test/widget_test.dart` login, protected-route role denial, sign-out refresh, role-refresh, expired-session refresh, and initial session-restoration failure redirects; API auth/identity unit tests | Verify Firebase Emulator/device login, expired/invalid credentials through real API, live role/session changes, membership revocation, restart/session restore and offline/error UI | Partial; PR #182 merged; exact-head CI #800 passed on `7c5a3bc870b8e82fd6ac3d671fb7e9e4b1b5e546`; post-merge default-branch CI UNKNOWN; device/emulator restart and environment verification open; Bearer scheme parsing regression added on `qa/bearer-scheme-case-insensitive`, exact-head CI pending |
| QA-002 | Tenant selection and cross-tenant isolation | P0 | Tenant context/resolver tests; `apps/api/test/app.e2e-spec.ts` cross-tenant finance/member mutations, profile-contact denial, donor history scoping, finance decision denials, website update/reset and media-upload denials, and platform tenant-admin route denials | Continue full protected-route matrix for remaining tenant administration and any future export routes; persisted Firestore isolation and staging identity verification remain open | Partial; PRs #197–#199 cover finance approver, website configuration and platform tenant administration; current branch adds media-upload denial before Storage or audit side effects. Persisted/environment matrix remains open |
| QA-003 | Donation campaign discovery and lifecycle | P0 | Firestore emulator coverage for active campaign visibility, partial-payment/receipt reconciliation, concurrent pledge idempotency and donor-history isolation; API HTTP coverage for campaign and pledge creation, tenant/donor/campaign/amount/idempotency propagation, authorization/audit boundaries; Flutter `DonorGivingPage` widget journey covers pledge success, inactive-donor failure, and receipt visibility only after mocked approval state appears on refresh (PR #190) | Continue actual persisted UI/API journey and controlled staging/device verification; mocked receipt refresh does not itself execute finance approval or Firestore persistence | Partial; PR #189 merged as `88adb21d0330d2cc03d45b1b0c1b07ca3b759147`; exact-head CI #822 and post-merge CI #823 passed. PR #190 merged as `56e8d986b96ac48027881148475dc98f9d6ad590`; exact-head CI #835 and post-merge CI #836 passed. Persisted Firestore and device/environment evidence remain separate |
| QA-004 | Financial maker-checker, balance and receipt integrity | P0 | Giving service/controller tests; Firestore fake-adapter and emulator cases for self-approval, overpayment, concurrent approval, receipt allocation and audit; HTTP E2E denial/audit regressions for cross-tenant payment/expense/adjustment operations | Verify persisted workflow and staging behavior; concurrent edge cases, reversal/adjustment, receipt uniqueness and audit trail across complete workflows | PRs #191–#195 merged with exact-head CI green; current regression expands cross-tenant approve/reject checks to finance approver role for expenses and adjustments. Persisted/staging verification remains open |
| QA-005 | Finance reports and reconciliation | P0 | `apps/api/test/app.e2e-spec.ts` verifies finance summary/reconciliation access only for the resolved tenant; PR #179 adds cross-tenant denials for receipts, pledges, payments, expenses, adjustments, summary and reconciliation; PR #211 adds positive HTTP coverage for finance-viewer reads across tenant-wide payments, expenses, adjustments, receipts, pledges, summary and reconciliation, asserting the resolved tenant ID reaches each service; persisted reconciliation tests compare payment, receipt, expense and refund totals | Cross-check report/export rows and totals against persisted receipts, pending payments, approved adjustments/refunds and expenses; there is no export route in `GivingController` currently, so determine/export requirement separately before treating export authorization as a route test | HTTP route authorization and tenant argument assertions automated; PR #211 exact-head CI #885 green; post-merge CI #886 pending at checkpoint; persisted reconciliation emulator coverage exists, but complete end-to-end report and any future export workflow remain open |
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
| QA-016 | Automated UI-to-API-to-persistence E2E | P0 | Backend HTTP→Firestore emulator positive/rejection journeys; Flutter mocked-HTTP donor workflows | PR #219 adds a controlled connected Flutter widget → real NestJS HTTP → Firestore emulator receipt journey; exact-head CI #910 and post-merge default-branch CI #911 passed; staging/device remains open | Connected emulator-backed journey automated and verified in CI #910/#911; staging/device remains open |
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


## Execution note — platform tenant-administration authorization matrix (14 October 2026)

- Current branch: `qa/platform-tenant-admin-route-authorization` adds an HTTP integration matrix for non-platform users against tenant list/create/get/update, tenant-admin list/add, and custom-domain verification routes under `/api/platform`.
- Each route must return HTTP 403 before tenant operations; the regression also asserts the mocked tenant lookup and audit writer are not called.
- Evidence boundary: mocked authenticated identity and Firestore adapter in the real NestJS route/guard pipeline. This does not prove production identity claims, persisted tenant onboarding, or staging behavior. Platform-admin positive-path and persisted onboarding verification remain separate.
- Exact-head CI is required before merge. Post-merge CI is recorded when available but does not block beginning the next QA task. Android build/upload remains manual/on-demand.


## Execution note — website media upload authorization (14 October 2026)

- Branch `qa/website-media-upload-authorization` adds HTTP-route regressions for a cross-tenant content manager and a finance-only viewer attempting `POST /api/website/media`.
- Acceptance: each returns HTTP 403 before Firebase Storage upload and audit recording; tests assert both side-effect mocks remain untouched.
- Evidence boundary: NestJS route/guard/interceptor pipeline with mocked identity, Storage adapter and audit. Actual Firebase Storage, persisted website publication, and staging identity remain unverified.


## Execution note — authorized website media upload (14 October 2026)

- PR #201 merged as `1cac24f38110d355142881776651651b056cd2b7`: [authorized upload HTTP contract regression](https://github.com/JainCommunityPlatform/jain-community-platform/pull/201).
- Exact-head [CI #866](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38561377120) passed backend lint/unit/integration/Firestore emulator/build, Flutter analysis/tests, repository validation and merge gate. Android AAB was skipped under the manual/on-demand release policy.
- The positive HTTP regression asserts that an authorized tenant content manager's upload passes the resolved tenant ID to Storage and records the expected tenant-scoped success audit metadata.
- Evidence boundary: identity, Storage and audit dependencies are mocked. This is HTTP integration evidence only; real Firebase Storage, persisted metadata, publish/reload, and staging/device verification remain open.
- Post-merge [CI #867](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38563988003) passed on merge commit `1cac24f38110d355142881776651651b056cd2b7`; backend, Flutter, repository validation and merge gate succeeded. Android AAB was skipped by design.


## Execution note — reject empty website media uploads (14 October 2026)

- PR #204 merged as `f9844577f71b4fd7611557176c83a784c5c29e03`: [empty image buffer regression](https://github.com/JainCommunityPlatform/jain-community-platform/pull/204).
- Exact-head [CI #871](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38576707061) passed backend lint/unit/integration/Firestore emulator/build, Flutter analysis/tests, repository validation and merge gate. Android AAB was skipped under the manual/on-demand policy.
- The Firebase Storage service regression rejects a zero-length buffer with the documented validation error and asserts Firebase Storage is not contacted.
- Post-merge [CI #872](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38578721968) passed on merge commit `f9844577f71b4fd7611557176c83a784c5c29e03`; backend, Flutter, repository validation and merge gate succeeded. Android AAB was skipped by design.
- Evidence boundary: service-level empty-buffer validation only. HTTP multipart empty-file behavior, real Firebase Storage persistence, website publish/reload, and staging/device behavior remain open. Continue P0 donation-to-receipt connected journey and role/route coverage.
- Android build/upload remains manual/on-demand.


## Execution note — empty website media checkpoint and MIME validation (14 October 2026)

- PR #205 merged as `cdc39347203006b0b1584f1de300c3fafb3b7d37`: [QA evidence checkpoint](https://github.com/JainCommunityPlatform/jain-community-platform/pull/205). Exact-head [CI #873](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38578969208) passed all required jobs. Post-merge [CI #876](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38582209232) is still running at checkpoint time.
- PR #206 [reject spoofed image content types](https://github.com/JainCommunityPlatform/jain-community-platform/pull/206) is open. Its first updated-head attempt [CI #875](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38579170908) failed one existing oversized-file assertion because signature validation ran before the 10 MB size guard. Validation order was corrected on head `ceb218535434995ec0f115ecd6f4929875f4f6fa`; exact-head [CI #877](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38582204179) is in progress. Do not merge until all required checks pass.
- Security intent: reject non-image bytes even when the client claims `image/jpeg`; derive stored MIME type from recognized image bytes, while retaining empty-buffer and 10 MB size guard contracts.
- Evidence boundary: service-level image signature checks and mocked Storage tests. Actual Firebase Storage, published website retrieval and staging/device behavior remain unverified.
- Android build/upload remains manual/on-demand.


## Execution note — empty multipart website image route validation (14 October 2026)

- New regression on branch `qa/reject-empty-multipart-website-image`: a tenant content manager submits a zero-byte multipart file to `POST /api/website/media`; the route must return HTTP 400 before Storage upload or success audit.
- The controller now validates the uploaded buffer before invoking the Storage adapter. Existing service-level empty-buffer and MIME-signature checks remain in place.
- Evidence boundary: NestJS HTTP integration with mocked Storage/audit. Real Firebase Storage and staging verification remain open. Android build/upload remains manual/on-demand.


## Execution checkpoint — authorized finance read-route matrix (14 October 2026)

- PR #211 merged as `b1a2f110ef7bb290848c48ac05c29861195b62a7` after exact-head [CI #885](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38609457479) passed backend lint/unit/integration/Firestore-emulator/build, Flutter analysis/tests, repository validation and merge gate. Android AAB was skipped by design.
- The HTTP matrix verifies finance-viewer access to tenant-wide payments, expenses, adjustments, receipts, pledges, summary and reconciliation; each service must receive the active tenant ID resolved from the request host.
- PR #210 post-merge [CI #884](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38609319670) passed all required jobs. Post-merge [CI #886](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38612960495) for PR #211 was still running at this checkpoint; backend and Flutter checks were in progress. Do not infer post-merge green until the run completes.
- Existing Firestore emulator test `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “persists partial payments, updates the pledge and issues distinct receipts transactionally” — verifies approved payments, persisted receipt records, donor pledge/receipt history and reconciliation from persisted state. Flutter donor tests still use mocked HTTP; the connected Flutter → live API → Firestore → refreshed donor receipt journey and staging/device verification remain open.
- Android build/upload remains manual/on-demand.


## Execution checkpoint — donor UI rejection receipt regression (15 October 2026)

- PR #215 merged as `6b8333fee554f19b2807bb57810f29ff235cbd51`; exact-head CI #892 and post-merge CI #893 passed all required jobs. Android AAB skipped by design.
- Added on branch `qa/donor-rejected-payment-no-receipt`: a widget regression for a rejected payment followed by donor refresh. It asserts the receipt list remains empty and neither a receipt number nor paid amount appears.
- Test layer: Flutter widget + mocked HTTP. This complements, but does not replace, the backend HTTP→Firestore emulator test for rejected payments.
- Remaining: connected Flutter→live API→Firestore journey and staging/device verification. Android build/upload remains manual/on-demand.


## Execution checkpoint — donor receipt retry regression (15 October 2026)

- PR #216 merged; exact-head CI #896 passed all required checks. Post-merge CI #897 is pending and must be verified.
- Added branch `qa/donor-receipt-load-retry`: Flutter workflow test makes `GET /api/giving/my-receipts` fail once with 503, checks recoverable error/no receipt, retries, and verifies receipt data is displayed after success.
- Coverage layer: Flutter widget + mocked HTTP. This tests UI recovery, not real network connectivity or Firestore persistence.
- Remaining P0: connected Flutter→NestJS API→Firestore-emulator journey and staging/device verification. Android build/upload remains manual/on-demand.


## Execution checkpoint — donor receipt retry merged (15 October 2026)

- PR [#217](https://github.com/JainCommunityPlatform/jain-community-platform/pull/217) merged as `339f30cefe7d6cfbc9abe7bd65ee01b7831662f0`.
- Exact-head [CI #898](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38676951380) passed backend, Flutter, repository validation and merge gate; Android AAB was skipped by design.
- Post-merge default-branch run [CI #899](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38679831894) started on the merge commit. Its three applicable jobs were queued at the last check; post-merge verification is pending.
- Donor receipt UI evidence now includes rejection/refresh and recoverable 503/retry widget tests, both using mocked HTTP. Backend HTTP→Firestore emulator positive and negative receipt paths are separate evidence layers.
- Remaining P0: connected Flutter→NestJS API→Firestore-emulator receipt-history journey and staging/device verification. Do not mark environment verification complete based on widget or emulator tests alone. Android build/upload remains manual/on-demand.


## Execution checkpoint — connected donor receipt journey in progress (15 October 2026)

- PR [#219](https://github.com/JainCommunityPlatform/jain-community-platform/pull/219) adds a standalone test-only NestJS server with test-scoped authentication override, seeds an approved payment through API routes against the Firestore emulator, and exercises the donor Flutter widget against real local HTTP.
- Evidence is pending exact-head CI. If CI fails, fix the harness or assertions; do not skip the connected test to make the pipeline green.
- This test does not establish production Firebase, staging identity, or physical-device behavior. Those remain separate environment gates. Android build/upload remains manual/on-demand.


## Execution checkpoint — Bearer authentication header parsing (15 October 2026)

- Branch `qa/bearer-scheme-case-insensitive` adds a focused authentication-guard regression: RFC case-insensitive Bearer scheme parsing is accepted; missing token, empty Bearer credentials, and non-Bearer schemes are rejected before token verification.
- The guard now extracts the token using a case-insensitive scheme match and still delegates all token validity checks to Firebase token verification.
- Exact-head CI and review/merge are pending. This is code-level parsing coverage, not Firebase emulator, staging, or device authentication evidence. Android build/upload remains manual/on-demand.


## Verified checkpoint — connected donor receipt journey (15 October 2026)

- PR [#219](https://github.com/JainCommunityPlatform/jain-community-platform/pull/219) merged as `268bcf9a80574baa254e14683e5c8919279ca69e`.
- Exact-head [CI #910](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38690852215) passed backend, Flutter, repository validation and merge gate. The connected Flutter widget test ran and passed against the live local NestJS test server and Firestore emulator.
- Post-merge default-branch [CI #911](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38691150536) passed all applicable jobs on the merge commit; Android AAB was skipped by policy.
- Remaining evidence boundary: staging/device and production Firebase identity/session behavior remain unverified. Android build/upload remains manual/on-demand.


## Execution checkpoint — revoked Firebase ID tokens rejected (15 October 2026)

- **Merged:** [PR #222](https://github.com/JainCommunityPlatform/jain-community-platform/pull/222), merge commit `708887ebe75f70675dc89adbd370c32ddd9da679`.
- **Exact-head CI:** [run #917](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38712069443) passed on head `aee8799630a563543e6c9942dfd1e118ff4929e0`.
- **Automated coverage:** `JwtAuthenticationService` passes `checkRevoked: true` to Firebase Admin `verifyIdToken`; tests cover verifier invocation and revoked-token HTTP 401 handling.
- **Post-merge CI:** [run #918](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38743276237) was in progress when recorded; status must be refreshed.
- **Evidence boundary:** unit tests only; controlled staging/device behavior for real token revocation, session restart, tenant routing and role propagation remains unverified. Android build/upload remains manual/on-demand.
