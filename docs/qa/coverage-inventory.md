# JCP QA Coverage Inventory

Last reviewed: 20 October 2026  
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

## Consolidated P0 route-audit update — 16 October 2026

- [PR #239](https://github.com/JainCommunityPlatform/jain-community-platform/pull/239) closes the finance-viewer denial matrix for nine financial write/decision routes; exact-head CI #952 and post-merge CI #953 passed.
- [PR #240](https://github.com/JainCommunityPlatform/jain-community-platform/pull/240) adds HTTP authorization/escalation coverage for the general tenant-membership routes; exact-head CI #954 and post-merge CI #955 passed.
- [PR #241](https://github.com/JainCommunityPlatform/jain-community-platform/pull/241) adds HTTP token enforcement coverage for both internal profile-migration routes; exact-head CI #957 and post-merge CI #958 passed.
- The current consolidated route audit adds HTTP identity/tenant-scoping coverage for `GET /api/profile/registration-context`, `POST /api/profile/contact`, and all four protected notification routes. These tests exercise the NestJS HTTP pipeline with mocked identity and service dependencies; they do not claim persisted notification delivery, Firebase production identity, or staging/device verification.
- P0 automation is not considered globally closed until the route/inventory reconciliation is complete. Firebase staging/device identity propagation and external UPI/bank settlement remain environment/external-system gates, not claims of automated completion.

## Initial inventory (repository evidence as of 12 October 2026)

| ID | Area / journey | Priority | Evidence already present | Known gap / next verification | Initial state |
|---|---|---:|---|---|---|
| QA-001 | Authentication, session restoration, sign-out | P0 | Flutter session/auth controller tests cover startup restoration, unauthorized refresh, revoked/restored session sign-out and timeouts; `apps/flutter/test/widget_test.dart` covers login, protected-route denial, role refresh, session expiry and redirect to login after revoked-session refresh (PR #228, exact-head CI #932; post-merge CI #933 passed); API auth tests cover Firebase ID-token revocation (PR #222, CI #917 and post-merge #918) | Controlled Firebase emulator/staging/device login, expired/revoked credentials through real Firebase verification, app restart/session restore, live role/session propagation, tenant routing and offline/error UI remain environment gates | Automated/controller and widget-router tests green; post-merge CI #928 and #933 passed; staging/device verification open; Android build/upload remains manual/on-demand |
| QA-002 | Tenant selection and cross-tenant isolation | P0 | Tenant context/resolver tests; HTTP route matrix for finance/member mutations, profile-contact denial, website update/reset and media-upload denial, platform tenant-admin routes and membership administration; PR #265 merged with exact-head CI #39120375666 green, verifying tenant A donor pledge/receipt history stays invisible in tenant B and tenant B cannot pledge against tenant A campaign | Verify post-merge CI #39234175711; controlled staging identity verification remains open; future export routes require explicit authorization tests before implementation | HTTP route matrix and emulator-backed finance/donor isolation automated; post-merge CI pending at last poll; broader persisted data and staging/device evidence remain open |
| QA-003 | Donation campaign discovery and lifecycle | P0 | Firestore emulator covers active campaigns, partial-payment/receipt reconciliation, concurrent pledge idempotency and donor-history isolation; PR #264 connected UI pledge write/read-after-write passed exact-head/post-merge CI #39119641541/#39119849096; PR #265 cross-tenant donor isolation passed exact-head CI #39120375666; current branch `qa/p0-connected-donation-payment-receipt-batch` links the UI-created pledge to a real HTTP payment, independent approval, exact persisted receipt, reconciliation and refreshed UI | Verify grouped connected lifecycle on exact head and post-merge CI; controlled staging/device verification and external UPI/bank settlement remain separate | Prior connected pledge journey green; payment/approval/receipt link for the same UI-created pledge under CI; post-merge #265 run pending at last poll; staging/device evidence remains open |
| QA-004 | Financial maker-checker, balance and receipt integrity | P0 | Giving service/controller tests; Firestore fake-adapter and emulator cases for self-approval, overpayment, concurrent approval, receipt allocation and audit; PR #231 persists independently approved refunds; PR #234 covers over-adjustment denial, rejected-adjustment reservation release and approved reversal; PR #235 covers persisted expense self-approval denial, independent approval/rejection and reconciliation; PR #244 finance-console widget tests cover overview/refresh, recoverable report failure/retry and valid expense submission; current consolidated widget MR adds payment/expense/adjustment approve/reject interactions and rejection reasons | Verify decision controls send the correct route/body and refresh after a decision; controlled staging/device verification and external UPI/bank settlement remain separate | Persisted backend decision/reconciliation journeys automated; widget interaction contract under CI; production/staging verification remains open |
| QA-005 | Finance reports and reconciliation | P0 | `apps/api/test/app.e2e-spec.ts` covers tenant-scoped finance read authorization and finance-viewer positive reads; PR #231 verifies persisted approved adjustment totals and net after adjustments; PR #234 verifies rejected/pending/approved adjustment reconciliation; PR #235 verifies approved versus rejected expense totals and that only approved expenses reduce operational net | Expand persisted reconciliation across full lifecycle and any future export routes; no export route exists in `GivingController`, so define export requirement before adding export authorization tests | HTTP authorization and emulator reconciliation for payments, receipts, adjustments and expenses automated; PR #235 exact-head CI #945 and post-merge CI #946 passed; external settlement and production/staging verification remain open |
| QA-006 | Finance role administration and revocation | P0 | Authorization policy/guard, membership service and platform finance-team tests; HTTP E2E verifies revocation across tenant-scoped expense, payment, adjustment, pledge, receipt, summary and reconciliation reads; Firestore-emulator HTTP suite uses real `MembershipService` and proves persisted finance-role revocation preserves `CONTENT_MANAGER` and blocks the next protected request (PR #229; exact-head CI #934 and post-merge CI #935 passed); general membership HTTP route matrix protects against financial-role escalation | Production/staging identity propagation and device/session behavior remain environment gates; continue only if route audit discovers another untested privileged mutation | Automated HTTP and persisted emulator revocation plus general-membership escalation denial; production/staging verification remains open |
| QA-007 | Tenant website editor, save/publish, reload | P1 | Flutter gallery publish workflow; API website service tests for partial-update preservation/versioning and no success audit on persistence failure; Firestore-emulator save/reload and tenant isolation; PR #251 widget regression proves failed publish preserves last saved output and reopening reloads last successful title (exact-head CI #984 and post-merge CI #985 passed); current grouped branch adds connected Flutter editor → NestJS API → Firestore Emulator publish/reload, unrelated-field preservation and rejected-update no-mutation | Verify corrected exact-head CI and then post-merge CI for the connected editor batch; production tenant hostname routing and controlled staging/device evidence remain open | Prior widget/API/emulator coverage green; CI #39350905898 showed the connected test tapping the hero section before async editor load exposed it; latest correction waits for the section before tapping. Real Storage/public media reachability remains open |
| QA-008 | Media upload and gallery | P1 | Flutter gallery workflow covers successful publish, failed-upload retry, >10 MB rejection, unreadable bytes, picker cancellation, in-flight progress/disabled controls (PR #255 CI #990 passed), and invalid URL rejection/recovery (PR #256 CI #992 passed); Firebase Storage unit tests cover signature/size; HTTP multipart rejects >10 MB before Storage/audit (PR #250) | Verify real Storage networking, public URL reachability and staging/device behavior; continue grouped URL-validation/recovery matrix | Automated widget/API/unit coverage; exact-head CI #992 passed for URL validation; post-merge CI #39087779879 passed; real Storage networking and staging/device evidence remain open |
| QA-009 | Member profile and contact linking | P1 | Flutter fake-repository widget tests cover edit/cancel, trimmed save, failure/retry and refresh; API emulator tests cover persisted PATCH→GET, invalid DTO rejection, caller-controlled field denial, unchanged phone fields, second-user isolation and preservation of email/displayName when auth claims are absent (PR #269 exact-head CI #39307326991 passed); current connected batch adds real Flutter UI→NestJS HTTP→Firestore profile save/read-after-write | Verify exact-head and post-merge CI; physical-device session, production Firebase identity and contact linking remain environment gates | Fake-repository widget + emulator HTTP profile tests green; connected profile widget journey under CI; staging/device evidence remains open |
| QA-010 | Tenant members and platform administration | P1 | Flutter admin member tests cover loading/retry plus add validation/create retry, contact validation/update, role change, remove and pull-to-refresh; PR #259 merged; exact-head CI #39089408184 and post-merge CI #39089595905 passed after dialog controller lifecycle and connected-giving readiness fixes; API tenant/platform/membership service/controller tests cover authorization and tenant boundaries | Verify updated exact-head CI, full mutation retry behavior, and persisted role/contact changes in controlled staging/device session | Fake repository UI tests; real persisted membership lifecycle and staging/device behavior remain open; post-merge connected-giving integration flake separately tracked |
| QA-011 | Notifications and delivery preferences | P1 | API service/controller/HTTP E2E covers list, preferences, mark-read and authenticated tenant/user scoping; PR #260 batches delivery retry/idempotency behavior; PR #268 exact-head CI #39305782003 and post-merge CI #39306280409 passed opt-out defaults, tenant/user-specific preference persistence, pledge-created notification, read-state reload and cross-user/cross-tenant read denial through real NestJS HTTP + Firestore Emulator | Verify real provider delivery/timeout/retry and staging identity; ensure delivery failure never reverses committed financial state | Emulator-backed persistence/read-state coverage green; provider delivery mocked; production/staging and real provider evidence remain open |
| QA-012 | Public directory and public tenant pages | P1 | Existing test confirms central directory data rather than sample records; current batch covers empty-state/search no-results, API failure and retry on Home/Temples tabs, location filtering, pull-to-refresh reload, and anonymous public landing/sign-in navigation | Verify active tenant hostname/slug routing, public website content and event/seva links, mobile/responsive rendering, and no private member/finance leakage | MockClient widget coverage only; tenant hostname routing and real public website integration/staging remain open |
| QA-013 | Localization, accessibility and responsive layout | P1 | Current batch checks critical shared labels for English/Hindi/Marathi/Gujarati, live language switching for contact validation, semantics labels for mobile field/action, and 320px viewport with 1.5 text scale for directory and public landing | Audit all screens for mixed-language/error strings, keyboard/focus order, contrast, screen-reader navigation and real device sizes; public landing content is still not localized by these tests | Automated unit/widget evidence only; device/contrast/keyboard audit and complete public-site localization remain open |
| QA-014 | HTTP DTO validation and failure mapping | P1 | Existing payment/adjustment/rejection payload tests; current grouped branch adds campaign, pledge, expense and notification-preference DTO cases including numeric/date/count/type validation and caller-supplied tenant-field rejection, with no-service/no-audit assertions | Continue route-by-route matrix for missing/invalid fields, authentication, permission, tenant context, not found/conflict, and applicable rate/size limits | HTTP E2E tests use mocked services; persistence/staging evidence separate |
| QA-015 | Build/release and deployment readiness | P1 | CI workflow runs frontend analysis/tests and backend checks; Android workflow is separate/on-demand by policy | Document exact commit, CI run, environment/device smoke results, version/build artifact and release destination; verify Android packaging only when intentionally requested | CI evidence exists; release evidence tracked separately |
| QA-016 | Automated UI-to-API-to-persistence E2E | P0 | PR #264 exact-head CI #39119641541 and post-merge CI #39119849096 pass UI-created pledge read-after-write; PR #265 exact-head CI #39120375666 passes persisted cross-tenant donor-history checks; current branch `qa/p0-connected-donation-payment-receipt-batch` extends the same UI-created pledge through payment recording, independent approval, persisted receipt association, reconciliation and refreshed UI | Keep connected lifecycle blocking; verify exact-head and post-merge runs; staging/device and external settlement remain open | Connected pledge write/read-after-write and tenant isolation automated; linked payment-to-receipt journey under CI; post-merge PR #265 run pending at last poll |
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
- **Post-merge CI:** [run #918](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38743276237) passed on merge commit `708887ebe75f70675dc89adbd370c32ddd9da679`; applicable backend, Flutter and repository validation jobs passed; Android AAB was skipped by design.
- **Evidence boundary:** unit tests only; controlled staging/device behavior for real token revocation, session restart, tenant routing and role propagation remains unverified. Android build/upload remains manual/on-demand.


## Verified execution — startup session 401 regression (15 October 2026)

- **Merged:** [PR #225](https://github.com/JainCommunityPlatform/jain-community-platform/pull/225), merge commit `1c93a488308840ee160ecec8c89d308ef22a660b`.
- **Exact-head CI:** [#927](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38745451933) passed; the new Flutter controller regression ran within the complete CI pipeline.
- **Post-merge CI:** [#928](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38745904260) passed; Android AAB skipped by design.
- **Coverage:** startup restoration now clears Firebase auth when backend session loading returns HTTP 401. The existing refresh path is also covered for unauthorized responses. Non-401 failures are not forced into sign-out.
- **Evidence boundary:** automated controller coverage only. Real Firebase staging/device session revocation, restart, role propagation, tenant routing and receipt-history verification remain open. Android build/upload remains manual/on-demand.


## Verified execution — persisted finance-role revocation (15 October 2026)

- **Merged:** [PR #229](https://github.com/JainCommunityPlatform/jain-community-platform/pull/229) as `b1f06fa5f066b800ad8a6c5cbf074b0623708404`.
- **Exact-head CI:** [#934](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38747984088) passed backend lint/tests/build, Flutter analyze/tests, repository validation and merge gate.
- **Test behavior:** the connected Firestore-emulator HTTP suite uses the real Firestore-backed `MembershipService`; it persists a finance-role revocation, preserves the user's general content-manager role, and verifies the next protected expenses request returns 403 before the giving service reads data.
- **Post-merge CI:** [#935](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38748409681) passed on merge commit `b1f06fa5f066b800ad8a6c5cbf074b0623708404`; backend, Flutter, repository validation and merge gate passed, with Android AAB skipped by design.
- **Evidence boundary:** emulator-backed persistence is verified by the PR test; production/staging identity propagation and device/session behavior remain open. Android build/upload remains manual/on-demand.


## Verified execution — persisted refund adjustment reconciliation (15 October 2026)

- **Merged:** [PR #231](https://github.com/JainCommunityPlatform/jain-community-platform/pull/231) as `b92f06a5940c913ad65f6db82802e725add17212`.
- **Exact-head CI:** [#938](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38749529638) passed; **post-merge CI:** [#939](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38749980056) passed.
- **Persisted workflow:** independent approval of a refund adjustment reduces the donor pledge balance, keeps the original receipt as historical evidence, persists the approved adjustment and updates net reconciliation totals. This is internal Firestore-emulator evidence, not external UPI/bank settlement.
- **Next P0:** add persisted negative-path coverage for rejected adjustments, over-adjustment and reversal; keep external settlement and production/staging/device verification separate. Android build/upload remains manual/on-demand.


## Verified execution — expense maker-checker and reconciliation (15 October 2026)

- **Merged:** [PR #235](https://github.com/JainCommunityPlatform/jain-community-platform/pull/235) as `76dbbacf375b1e95ba96a7f7b09f44d9b13d4fbe`.
- **Exact-head CI:** [#945](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38752045254) passed; **post-merge CI:** [#946](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38752615989) passed.
- **Persisted behavior:** expense creator self-approval is denied; independent approval and rejection persist; rejected expense remains in reporting but only approved expenses reduce net totals.
- **Next:** complete remaining protected-route/write matrix; controlled production/staging/device identity verification and external UPI/bank settlement remain separate evidence gates. Android build/upload remains manual/on-demand.


## Route-audit follow-up — general tenant membership administration (16 October 2026)

- **Gap found:** the dedicated `TenantMembershipController` routes (`GET /api/memberships`, `POST /api/memberships/roles`, and `PUT /api/memberships/:userId/roles`) had controller unit tests but no explicit HTTP integration matrix in `app.e2e-spec.ts`.
- **Added in the consolidated P0 route-audit MR:** finance viewers and tenant administrators whose membership belongs to another tenant are denied before membership reads/writes or audit; tenant admins are denied attempts to grant financial roles through general membership endpoints, including replacing/removing an existing financial role; authorized non-financial role assignment remains allowed and audited.
- **Evidence boundary:** real NestJS HTTP guard/interceptor/controller pipeline with mocked membership and Firestore dependencies. Persisted multi-tenant role state and live Firebase/device propagation remain separate gates.


## P0 finance-console decision coverage — 17 October 2026

- PR #244 merged as `8494a436535255b5faef8332cfa00dd7c57a57fc`; exact-head CI #965 and post-merge CI #966 passed.
- Current consolidated widget MR exercises payment verify/reject, expense approve/reject, and adjustment approve/reject controls, including required rejection reasons and the emitted API routes.
- Evidence boundary: widget tests use a fake API client and prove visible control/request contracts, not backend authorization, persisted state, independent approval in production, or bank settlement. Those are covered by backend/emulator tests and separate environment gates.
- Android AAB remains manual/on-demand.


## Finance-console decision resilience — 17 October 2026

- Follow-up branch `qa/p0-finance-console-decision-resilience` adds three grouped widget regressions to the existing payment/expense/adjustment decision suite: empty rejection reason validation and cancellation without POST across all three record types; decision API 503 feedback without false success; and list refresh after successful approval.
- Test layer: Flutter widget tests with fake API client. This proves form/request/UI state contracts only; backend authorization and Firestore-emulator decision/reconciliation evidence remain separate.
- Merge gate: exact-head CI must pass; post-merge CI must be checked independently. The merge of PR #246 is confirmed, but the connected workflow lookup did not expose a post-merge run for its merge commit, so that specific post-merge CI status remains UNKNOWN.


## CI connected-giving fixture identity correction — 18 October 2026

- PR #262 exposed a deterministic integration harness mismatch: server-generated tenant IDs were random per run while the workflow and Flutter client hard-coded `connected-giving-test`. The connected campaign journey failed because requests did not use the tenant that owned the seeded campaign/receipt.
- The grouped localization/accessibility/responsive MR now also passes the server-emitted tenant ID into the connected API checks and Flutter test. This change preserves the real Flutter → NestJS → Firestore path; it does not skip or mock the connected test.
- Verify exact-head CI after this correction; keep PR unmerged until the connected journey and all required checks pass. Android AAB remains manual/on-demand.


## Connected giving UI-to-API failure diagnosis — 18 October 2026

- CI #39118114093: repository validation and backend lint/unit/integration/Firestore-emulator/build passed; the connected Flutter widget journey failed to render the seeded campaign. The workflow's live API preflight did find the seeded campaign/receipt using the dynamically emitted tenant ID, so tenant-ID alignment alone is not sufficient evidence of a fix.
- The current grouped PR #262 adds individual live API probes for campaigns, pledges, receipts and notifications before the combined page render, and increases the test request timeout to 15 seconds to distinguish endpoint failures from concurrent widget-load timing.
- Keep the connected integration journey required and unskipped. Verify the next exact-head CI before merge; Android AAB remains manual/on-demand.


## Next grouped P1 batch — API DTO validation/failure matrix (18 October 2026)

- PR #262 merged as `91146da0b479a976f19219a9370e21d6545d1579`; exact-head CI #39118457894 and post-merge CI #39118764541 passed all applicable required checks, including the connected giving journey. Android AAB skipped.
- Current branch `qa/p1-api-dto-validation-failure-matrix` groups invalid campaign, pledge, expense and notification-preference payloads. Acceptance: HTTP 400 for invalid fields/unknown caller-controlled tenant fields, with no domain service or success audit invoked.
- This extends the existing payment/adjustment/rejection DTO matrix; it does not claim full route-by-route validation coverage.


## P0 connected donor pledge UI-to-persistence batch — 18 October 2026

- PR #263 merged as `21867d8b95200ca4c67f8a3eb0d4e25d4e4d05af`; exact-head CI #39119173399 and post-merge CI #39119374068 passed all applicable checks.
- Current branch `qa/p0-connected-donor-pledge-e2e-batch` extends the live connected test beyond receipt rendering: invalid amount validation leaves persisted pledge count unchanged; valid pledge submission is sent by Flutter through NestJS and must appear in the donor's persisted pledge list; the existing Firestore-persisted receipt remains visible.
- Environment boundary: emulator-backed integration with real HTTP; production/staging identity, device behavior and external payment settlement remain open.


## P0 persisted cross-tenant donor isolation batch — 18 October 2026

- PR #264 merged as `cd4b6a3082880cc0b7fe3ccf93bac60db3ac7add`; exact-head CI #39119641541 and post-merge CI #39119849096 passed all applicable checks, including the connected UI pledge write/read-after-write.
- Current branch `qa/p0-persisted-cross-tenant-donor-isolation-batch` extends the Firestore-emulator HTTP suite with a second tenant host: tenant A's donor pledge/receipt must be visible only in A, and a tenant B pledge against A's campaign must return 404 without creating tenant B data.
- This is real NestJS HTTP + Firestore Emulator coverage; production/staging identity and device evidence remain separate.


## PR #265 test isolation correction — 18 October 2026

- CI #39120170312 exposed shared-fixture contamination: the new cross-tenant test created a receipt in the same tenant used by later exact-count reconciliation tests.
- The test now uses dedicated tenant A/B IDs and a distinct pair of hostnames, with operator/approver memberships seeded only for the isolated tenant. Exact reconciliation assertions remain unchanged.
- Fresh exact-head CI must prove both the new tenant isolation and all pre-existing emulator journeys pass.


## P0 donation lifecycle batch — payment replay, maker-checker and partial payment (19 October 2026)

- Folded into PR #266 to avoid a separate small MR.
- Added Firestore-emulator HTTP assertions: identical payment retry returns the same record; conflicting idempotency-key reuse returns 409; maker cannot approve their own payment; repeat approval returns 409; two partial payments yield the full persisted paid balance; each approved payment has exactly one receipt and reconciliation stays balanced.
- PR #265 cross-tenant donor isolation is merged and both exact-head CI #39120375666 and post-merge CI #39234175711 passed. PR #266 must pass fresh exact-head CI after the combined test change before merge.


## PR #271 connected editor test timing correction — 20 October 2026

- Latest exact-head CI #39350905898 failed because the test attempted to tap the hero section before the asynchronous website load made it available.
- Updated the connected test to wait for the section on initial load and after reopening. Existing persistence, version, unrelated-field and rejection assertions remain unchanged.
- Await fresh exact-head CI; PR #271 must remain unmerged until required checks pass.


## PR #271 connected editor viewport correction — 20 October 2026

- Exact-head CI #39351766590 failed in the connected website journey while locating the hero section; backend lint/unit/integration/Firestore-emulator/build and repository validation passed.
- The test now waits for the editor scaffold and scrolls the lazy ListView to the hero section on initial load and after reopening. Persistence/version/contact/validation/reload assertions are preserved.
- Fresh exact-head CI must pass before merge; Android AAB remains manual/on-demand.
