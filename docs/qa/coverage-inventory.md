# JCP QA Coverage Inventory

Last reviewed: 13 October 2026  
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
| QA-001 | Authentication, session restoration, sign-out | P0 | Flutter session/auth tests under `apps/flutter/test/core/session/`; controller-level startup restoration, sign-out, handshake timeout/error tests; `apps/flutter/test/widget_test.dart` login, protected-route role denial, sign-out refresh, role-refresh, expired-session refresh, and initial session-restoration failure redirects; API auth/identity unit tests | Verify Firebase Emulator/device login, expired/invalid credentials through real API, live role/session changes, membership revocation, restart/session restore and offline/error UI | Partial; startup controller restoration test is added in PR for this branch; route/session regressions already exist; environment verification open |
| QA-002 | Tenant selection and cross-tenant isolation | P0 | Tenant context/resolver tests; authorization policy/guard/membership tests; `apps/api/test/app.e2e-spec.ts` cross-tenant finance/member mutation cases, profile-contact denial, tenant-wide giving read-route denial, and PR #180 donor self-service query-scope assertions | Continue the complete protected-route matrix for media, remaining admin operations and future export routes; donor history must be scoped by both active tenant and authenticated donor; persisted Firestore isolation exists but production/staging verification remains open | Partial; PR #180 merged. Initial exact-head run #792 failed because its first expectation incorrectly required 403 for donor self-service; corrected head `e5a2c6e5f9d39e5b9964532c8b4e9b123e07aa13` passed exact-head CI #794. Post-merge default-branch CI remains UNKNOWN; persisted/environment matrix remains open |
| QA-003 | Donation campaign discovery and lifecycle | P0 | `apps/api/src/database/firestore.service.firestore-emulator-spec.ts`: persisted payment/receipt reconciliation, concurrent pledge idempotency, donor-history isolation and API donor-history boundary tests | Concurrent refund approval and receipt-number allocation tests have each exposed Jest's 5-second default under Firestore emulator contention; the current branch raises the receipt-race timeout to 15 seconds while preserving assertions. Full donor UI-to-API path and controlled staging/device verification remain open | Emulator timeout repair in progress; exact-head CI pending; environment verification open |
| QA-004 | Financial maker-checker, balance and receipt integrity | P0 | Giving service/controller tests; Firestore fake-adapter tests; emulator cases for self-approval, overpayment, concurrent approval, receipt allocation and audit behavior; HTTP E2E positive decision routes | Verify HTTP failure paths for self-approval/rejection across payments, expenses and adjustments do not emit success audit events; staging verification; concurrent edge cases and audit trail across complete workflows | Service/emulator maker-checker cases exist; PR #181 adds HTTP-level denied-decision/no-success-audit assertions; exact-head CI pending; environment verification open |
| QA-005 | Finance reports and reconciliation | P0 | `apps/api/test/app.e2e-spec.ts` verifies cross-tenant summary denial and now allows a finance viewer to read summary and reconciliation reports only for the resolved tenant; report service/persistence tests and BDD scenarios also exist | Cross-check report/export rows and totals against persisted receipts, pending payments, approved adjustments/refunds and expenses; add export-route authorization and verify persisted tenant scoping | HTTP route authorization and tenant argument assertions automated; exact-head CI pending; persisted end-to-end reconciliation/export verification open |
| QA-006 | Finance role administration and revocation | P0 | Authorization policy/guard, membership service, platform finance-team tests; `apps/api/test/app.e2e-spec.ts` now exercises a finance-role revocation followed by a protected request | Continue role × route matrix and prove revocation is read on the next request; this test uses mocked membership state and does not prove Firestore persistence or production identity propagation | HTTP authorization regression added; exact PR CI pending; persisted/environment verification open |
| QA-007 | Tenant website editor, save/publish, reload | P1 | Flutter website repository and gallery workflow tests; API website service/controller tests; BDD editor scenarios | Exercise save/publish and reopen-after-refresh with persisted backend data; verify failed save does not damage published version and two tenants stay isolated | Partial; persisted E2E open |
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
