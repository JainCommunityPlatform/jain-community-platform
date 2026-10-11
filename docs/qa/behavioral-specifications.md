# JCP Behavioural Specifications and QA Coverage

Status: initial executable-specification backlog, 11 October 2026

## Rules of evidence

A feature is not considered verified merely because it compiles or a pull request is merged. Report these states separately:

- **Specified** — acceptance behaviour is written down and agreed.
- **Automated** — an automated test asserts the behaviour.
- **CI green** — the relevant test suite passed on the exact commit.
- **Environment verified** — a real integration/staging environment passed the scenario.
- **Released** — the intended distribution channel contains the verified build.

Tests must assert outcomes and security invariants, not private implementation details. Never weaken an assertion or skip a failing test solely to make CI green.

## Role matrix

| Role | Allowed behaviour | Must be denied |
|---|---|---|
| Anonymous visitor | View public tenant website, directory, active campaigns and public event content | Mutate tenant configuration, create authenticated pledges or read private donor/finance data |
| Authenticated donor/member | View and edit own allowed profile fields; view own pledges, receipts and notifications; create a pledge | Read another member's records; record/approve payments; access another tenant's records |
| Tenant administrator/content manager | Manage authorized tenant website content, images, events and member administration | Financial operations unless separately granted the specific finance permission |
| Finance operator | Manage permitted campaigns, record payments, submit expenses and request adjustments within the active tenant | Approve own payment/expense/adjustment; operate outside tenant scope |
| Finance approver | Independently approve/reject pending financial operations and view permitted finance reports | Approve own submission; bypass balance, idempotency, audit or tenant controls |
| Platform administrator | Onboard tenants, manage tenant membership and grant/revoke explicitly permitted roles | Implicit access to tenant financial records merely from being an administrator |
| Finance viewer | Read only the finance data granted by permissions | Create, edit, approve, reject or reverse financial operations |

## Feature: Tenant website image management

### Scenario: Add a gallery image and publish it
Given a tenant administrator is authenticated and has content-management permission
And the active tenant website configuration is loaded
When the administrator adds a gallery item with a title, image URL and alt text
And saves and publishes the website
Then the API receives the gallery item under the active tenant's gallery configuration
And the saved response retains the image URL, title and alt text
And reopening the editor displays the saved gallery item

### Scenario: Upload a gallery image
Given a tenant administrator is editing the active tenant's gallery
When they select a supported image file and confirm the upload
Then the upload uses the tenant website media endpoint
And a successful upload returns an image URL to the gallery item editor
And the URL is not considered published until the website configuration is saved
And the published gallery displays the image after a refresh

### Scenario: Cancel or fail a gallery upload
Given a tenant administrator is adding a gallery item
When they cancel image selection or the upload fails
Then no broken image URL is added to the gallery configuration
And an actionable error is shown beside the gallery upload control
And the administrator can retry without duplicating the gallery item

### Scenario: Reject invalid media
Given an administrator selects an empty, unsupported or oversized file
When the upload is attempted
Then the application explains why the file was rejected
And the backend rejects invalid payloads even if the client validation is bypassed
And existing published content remains unchanged

### Scenario: Deny cross-tenant or unauthorized upload
Given a user lacks content-management permission for the active tenant
When they submit a media upload or website mutation
Then the API rejects the request
And no tenant media or configuration is changed

## Feature: Authentication and tenant boundary

- Valid Firebase identity resolves to the canonical user and active tenant.
- Missing, expired or invalid credentials are rejected by the real API authentication path.
- Membership is required for protected tenant context.
- A member of tenant A cannot read or mutate tenant B by changing a hostname, tenant header, path or request body.
- Revoking a role removes the corresponding authorization on subsequent protected requests.
- Sign-out clears the app session; signing back in rebuilds it from the current server-authoritative membership.

## Feature: Giving and pledges

- A visitor can discover active campaigns without receiving private donor information.
- An authenticated donor can create a pledge using integer paise and an idempotency key.
- Replaying the same request does not create a second pledge.
- A donor sees only their own pledge and receipt history for the active tenant.
- Closed/draft campaigns follow the documented lifecycle rules and cannot be used to bypass campaign policy.
- Tenant finance users can see permitted tenant pledges; other roles cannot access finance-only endpoints.

## Feature: Payment, receipt and financial controls

- Recording cash, UPI, bank transfer or cheque creates a pending payment; it does not immediately count as received funds.
- Only a distinct, authorized finance approver can verify/reject the payment.
- Self-approval is denied by the backend, not just hidden in the UI.
- Verification atomically updates payment state, paid balance, receipt sequence and receipt record.
- Repeated approval requests do not issue duplicate receipts or double-count funds.
- Invalid amounts, wrong tenant, invalid transitions and concurrent over-payment/over-adjustment are rejected.
- Original verified payment/receipt records remain auditable after an approved reversal.


### Scenario: Payment approval remains committed when notification delivery fails

Given a pending payment is approved by an authorized independent finance approver
And the persistence operation returns the verified payment and receipt reference
When post-approval notification dispatch fails
Then the approval result remains successful
And the payment persistence operation is not repeated or rolled back
And the notification failure does not turn a committed financial operation into an API failure

Executable regression: `apps/api/src/giving/giving.service.spec.ts` — “keeps an approved payment successful when post-approval notification dispatch fails”. This unit test uses a mocked persistence boundary; it proves service-level failure isolation only, not Firestore transaction atomicity or real receipt persistence.

### Scenario: Multiple approved partial payments complete a pledge

Given a donor has a pledge for 100000 paise
And two separate pending payments total exactly 100000 paise
When an authorized independent approver verifies both payments
Then the first payment leaves the pledge partially paid
And the second payment marks the pledge paid in full
And each verified payment has a distinct receipt
And the paid amount equals the pledged amount

### Scenario: Pending payments cannot collectively overpay a pledge

Given a donor has a pledge for 100000 paise
And two pending payments are recorded for 60000 and 50000 paise
When the first payment is verified
And approval is attempted for the second payment
Then the second approval is rejected because it exceeds the remaining balance
And the pledge paid amount remains 60000 paise
And no receipt is issued for the rejected approval attempt

Executable regressions: `apps/api/src/database/firestore.service.spec.ts` — “completes a pledge across multiple approved partial payments with distinct receipts” and “rejects a second pending payment when approval would exceed the remaining pledge balance”. Both use a fake Firestore adapter; concurrent transactions and live Firestore atomicity remain unverified.

Emulator-level regression: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “rejects overpayment and replayed approval without changing the persisted balance or receipts”. This runs against the Firestore emulator and verifies persisted state after rejected approval and idempotent recording. It does not replace staging verification. The separate concurrent-approval race scenario below exercises transaction contention in the emulator.


### Scenario: Replaying payment approval does not issue a second receipt

Given a payment has been verified by an authorized finance approver
And its receipt and pledge balance update have been persisted
When another approval request is submitted for the same payment
Then the API rejects the replay because the payment is no longer pending
And the original receipt remains the only receipt for that payment
And the pledge paid amount and receipt sequence are not incremented again

Executable regression: `apps/api/src/database/firestore.service.spec.ts` — “does not issue a second receipt or double-count a replayed payment approval”. The current test uses a fake Firestore adapter; true transaction concurrency and live Firestore atomicity remain unverified.

### Scenario: Finance summary agrees with reconciliation for partial and pending payments

Given a tenant has a pledge for 100000 paise
And a 30000-paise payment has been approved and receipted
And a separate 20000-paise payment is still pending approval
When the finance summary and reconciliation report are generated
Then received and reconciled receipt amounts both equal 30000 paise
And the pending approval amount is 20000 paise and is not counted as received
And the outstanding pledge balance is 70000 paise
And the reconciliation reports the issued receipt as balanced

Executable regression: `apps/api/src/database/firestore.service.spec.ts` — “keeps finance summary and reconciliation totals aligned across partial and pending payments”. The test uses fake Firestore; it does not establish live persistence or transaction guarantees.



Emulator-level concurrency regression: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “allows only one concurrent approval when two payments would overpay a pledge”. Two 60000-paise approvals race against a 100000-paise pledge; exactly one approval and one receipt must persist, leaving the pledge partially paid at 60000 paise. This exercises emulator transaction contention but is not a substitute for production/staging verification.

## Feature: Expenses and reconciliation

- A finance operator submits an expense with an integer-paise amount and evidence reference.
- A different finance approver approves/rejects it; rejection requires a reason.
- Finance reports are tenant-scoped and totals reconcile with persisted records.
- Missing, orphaned, duplicate or mismatched receipt/payment records are flagged rather than silently omitted.
- Exported totals and rows match the report query and active tenant scope.

## Feature: Notifications

- In-app notification creation is associated with the correct user and tenant and can be marked read.
- External delivery defaults to opt-out and requires explicit preference plus a verified destination.
- Pledge/payment/adjustment notifications reflect persisted financial events.
- Provider failure or timeout does not roll back a committed financial transaction.
- Delivery status callbacks must be authenticated and idempotent before they are enabled in production.
- Retry-worker and mobile FCM token lifecycle scenarios remain deferred until those backlog items are reactivated.

## Feature: Member profile and navigation

- Profile opens read-only by default; Edit enables only permitted fields.
- Cancel discards local edits; successful save survives a reload.
- Phone identity fields cannot be overwritten by a profile update that is not authorized to change them.
- Pull-to-refresh reloads persisted profile and activity data.
- Sign-out requires confirmation and clears the authenticated session.

## Feature: Temple website and content

- A tenant's public website renders the server-managed configuration rather than tenant-specific hard-coded sample content.
- Hero, about and gallery media render from saved URLs.
- Adding/editing/deleting gallery items persists correctly after Save & Publish and reload.
- Failed upload/save leaves existing published content intact and exposes a retryable error beside the relevant control.
- A second tenant can use the same implementation with separate content and media paths.
- Supported language selection covers page labels, form validation, empty states and errors.

## Required test layers

1. Unit tests for validation, state transitions, idempotency, permission decisions and failure handling.
2. HTTP integration tests for controllers, guards, DTO validation and service wiring.
3. Persistence integration tests against an isolated Firestore emulator/test project for tenant scoping and atomic financial invariants.
4. Flutter widget tests for user-visible loading, success, cancellation, retry and permission states.
5. End-to-end smoke tests that traverse UI → API → persistence → refreshed UI for critical role-based journeys.
6. Staging checks for Firebase Storage, authentication configuration, image URL reachability and external providers.

## Merge gate

- Do not merge with a failed required check.
- Classify each failure as (a) product-code defect, (b) test defect, (c) environment/configuration defect or (d) flaky/non-deterministic test, with evidence.
- Fix product defects in implementation; fix incorrect tests without weakening the stated behaviour.
- Run the affected test first, then the complete relevant suite, then full CI.
- Record commit SHA, workflow URL, failed/passed test names and environment limitations.
- A green mocked test is not proof of real Firebase or production integration.

## Initial coverage status (2026-10-11)

| Area | Current automated evidence | Remaining verification |
|---|---|---|
| Website gallery | Flutter widget regression exercises picker injection, image upload result, item save, and publish payload preservation | Real API/storage integration, upload failure/oversize cases, reopen-after-publish, device-level validation |
| Authorization | Table-driven unit tests cover allow/deny permission boundaries for all current tenant roles, including mixed tenant-admin/finance roles | HTTP-level endpoint matrix for every protected controller and real Firebase identity |
| Giving and finance | Existing service/controller unit tests cover idempotency requirements, tenant scoping, maker-checker failures, overpayment, and receipt/report paths | Persisted-database integration and end-to-end pledge → payment → approval → receipt → report/reconciliation |
| Tenant isolation | Existing integration tests exercise missing membership, cross-tenant membership, and unknown hostname denial | Cross-tenant negative tests for website media, every giving endpoint, exports, and administrative actions |
| Mobile session/profile | Existing API integration tests exercise profile reads/updates and activity history | Firebase emulator/device login, revoked membership, sign-out/session clearing, and offline/error states |

Do not label a workflow fully covered until its remaining verification has executable tests and the relevant CI/environment evidence. A passing unit or widget test is not proof that Firebase, deployed storage, or a real device workflow works.


## Feature: Finance authorization at the HTTP boundary

### Scenario: Tenant administrator cannot list tenant payments

Given an authenticated tenant administrator belongs to tenant A
And the request resolves tenant A as the active tenant
When the administrator requests the tenant payment list directly from the API
Then the API responds with 403 Forbidden
And the finance service is not invoked

### Scenario: Tenant administrator cannot approve a payment by calling the API directly

Given an authenticated tenant administrator belongs to tenant A
And a payment identifier is supplied
When the administrator submits a payment approval request directly to the API
Then the API responds with 403 Forbidden
And payment approval is not invoked

### Scenario: A finance role cannot be used with another tenant's membership

Given an authenticated user has a membership associated with tenant B
And the request resolves tenant A as the active tenant
When the user requests tenant A's payment list directly from the API
Then the API responds with 403 Forbidden
And no financial data is returned

### Executable test traceability

| Behaviour | Executable test | Layer | Evidence boundary |
|---|---|---|---|
| Tenant administrator is denied payment-list access | `apps/api/test/app.e2e-spec.ts` — “GET /api/giving/payments denies tenant administrators at the HTTP authorization boundary” | NestJS HTTP integration | Real Nest guards/interceptors; mocked identity and membership providers |
| Tenant administrator is denied payment approval | `apps/api/test/app.e2e-spec.ts` — “POST /api/giving/payments/:paymentId/approve denies tenant administrators before payment processing” | NestJS HTTP integration | Authorization rejection at HTTP boundary; no Firestore persistence claim |
| Cross-tenant finance request is denied | `apps/api/test/app.e2e-spec.ts` — “GET /api/giving/payments denies a finance user whose membership belongs to another tenant” | NestJS HTTP integration | Real Nest guards/interceptors; tenant and identity fixtures are mocked |


## HTTP finance authorization regression coverage

The API integration suite exercises the real NestJS HTTP route, authorization guard, and membership-context pipeline with mocked identity/membership providers. It is not a Firestore-backed or deployed-environment test.

### Scenario: Tenant administrator cannot read finance expenses or adjustments
Given a user has the tenant administrator role without a finance role
When they request the tenant expense list or adjustment list
Then each request is rejected with HTTP 403 before finance data is returned

### Scenario: Finance viewer cannot create an expense
Given a user has the finance viewer role for the active tenant
When they submit an expense creation request
Then the API rejects it with HTTP 403 before expense creation

### Scenario: Finance operator cannot access another tenant's expenses
Given a finance operator's membership belongs to a different tenant
When they request expenses in the active tenant context
Then the API rejects the request with HTTP 403 and a tenant access denied response


## Finance protected-route matrix — follow-up

Additional HTTP integration scenarios exercise protected report and record endpoints with the actual NestJS guards/interceptors and mocked identity/membership providers.

| Route family | Negative scenario | Expected outcome |
|---|---|---|
| Tenant receipts, finance summary, reconciliation report, tenant pledges | Tenant administrator lacks finance.read | HTTP 403 |
| Payment rejection | Tenant administrator lacks finance.approve | HTTP 403 before service processing |
| Expense approval | Tenant administrator lacks finance.approve | HTTP 403 before service processing |
| Adjustment approval | Tenant administrator lacks finance.approve | HTTP 403 before service processing |
| Finance summary | Membership belongs to another tenant | HTTP 403, tenant access denied |

These tests expand API boundary coverage only; persistence correctness, Firebase identity integration, and the full donor-to-receipt lifecycle remain separate verification tasks.


## Donor pledge query isolation

### Scenario: Donor pledge history is queried by tenant and donor
Given tenant A has pledges for donor A and donor B, and tenant B has a pledge for donor A
When donor A requests their pledge history for tenant A
Then the persistence query is constrained by both tenant A and donor A
And only tenant A's pledges belonging to donor A are returned
And the query does not first load every pledge belonging to tenant A into application memory

The implementation uses a Firestore query constrained by both `tenantId` and `donorUserId`. Existing persistence workflow tests cover returned results across two donors and two tenants using a fake Firestore adapter; this is not a live Firestore emulator test.


### Scenario: Cross-check reports after partial payments, refund and expense

Given a tenant has a 100000-paise pledge paid through two approved partial payments
And a 20000-paise refund is independently approved against one payment
And a 15000-paise expense is independently approved
When finance and reconciliation reports are generated for that tenant
Then gross verified payments and issued receipts both total 100000 paise
And finance reports 20000 paise adjusted and 80000 paise net received
And reconciliation reports 15000 paise approved expenses and 20000 paise approved adjustments
And net after approved expenses and adjustments equals 65000 paise

Executable regression: `apps/api/src/database/firestore.service.spec.ts` — “keeps finance and reconciliation reports aligned after partial payments, a refund, and an approved expense”. This uses the fake Firestore adapter; it does not prove live Firestore transaction behaviour or production data correctness.


### Scenario: Receipt numbers remain unique under concurrent approvals

Given two valid pending payments belong to separate pledges in the same tenant and receipt year
When independent authorized approvers verify both payments concurrently
Then both approvals succeed
And each payment receives exactly one receipt
And the receipt numbers are distinct and conform to the tenant receipt-number format
And both receipt records refer to the correct payment

Executable regression: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “allocates unique receipt numbers when separate pledges are approved concurrently”. This exercises contention on the tenant/year receipt-sequence document in the Firestore emulator; it does not claim staging or production verification.

### Scenario: Failed overpayment approval leaves no partial financial side effects

Given a 100000-paise pledge has one approved 60000-paise payment and a second pending 50000-paise payment
When finance attempts to approve the second payment and the operation is rejected as exceeding the pledge balance
Then the pledge remains partially paid at 60000 paise
And the rejected approval attempt leaves the second payment pending
And no receipt is issued for the second payment
And reconciliation has no missing, orphaned, or amount-mismatched receipts

Executable regression: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “rejects overpayment and replayed approval without changing the persisted balance or receipts”. The assertions inspect persisted Firestore emulator state; this does not claim production/staging verification.


### Scenario: Reusing a payment idempotency key with changed request data is rejected

Given a pending payment was recorded with an idempotency key and a counter note
When the same actor reuses that key but changes the note
Then the API rejects the request with a payment idempotency conflict
And the original pending payment and note remain unchanged
And no additional payment or receipt is persisted

Executable regression: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “rejects payment idempotency-key reuse when the original note differs and preserves the original pending payment”. This test exposed and fixes a persistence-layer omission in the idempotency comparison. It verifies emulator persistence, not production/staging behaviour.

### Scenario: Self-approval rejection does not mutate financial state or consume receipt sequence

Given a finance operator records a payment for a pledge
When the same operator attempts to approve that payment
Then approval is rejected as a maker-checker violation
And the payment remains pending with no receipt number
And the pledge paid amount remains unchanged and no receipt exists
When an independent approver subsequently approves the payment
Then exactly one receipt is issued using the first sequence number for that isolated tenant

Executable regression: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “denies persisted self-approval without consuming a receipt number or changing the pledge”. This verifies persisted emulator state and receipt sequencing, not production/staging behaviour.

### Scenario: Tenant-scoped giving queries do not leak persisted records

Given two tenants each have a pledge, an approved payment and a receipt
When finance queries pledges, payments and receipts for tenant A
Then every returned record belongs to tenant A
And tenant B's pledge, payment and receipt are absent
And querying tenant B returns only tenant B's records

Executable regression: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “keeps pledge, payment and receipt queries isolated between tenants in persisted Firestore data”. This verifies the Firestore emulator query boundary, not the complete HTTP authorization or production environment.

### Scenario: Pledge idempotency protects the original amount

Given a donor has created a pledge with an idempotency key
When the same request is replayed unchanged
Then the existing pledge is returned without creating a duplicate
When the same key is reused with a different pledge amount
Then the operation is rejected with an idempotency conflict
And the original pledge amount and unpaid status remain unchanged
And no payment or receipt is created

Executable regression: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “rejects pledge idempotency-key reuse with a changed amount and preserves the original pledge”. This verifies Firestore emulator persistence, not production/staging behaviour.

### Scenario: A different tenant cannot approve another tenant's payment

Given tenant A owns a pending payment and pledge
When an approver acting in tenant B attempts to approve that payment
Then the operation returns payment not found
And the payment remains pending in tenant A
And tenant A's pledge balance and receipts remain unchanged
And tenant B cannot see the payment or receipt in its tenant-scoped queries

Executable regression: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “does not allow another tenant to approve a persisted payment or mutate its financial state”. This tests service-level tenant enforcement against persisted emulator data; HTTP role authorization and production/staging remain separate evidence.

### Scenario: A tenant cannot record a payment against another tenant's pledge

Given a pledge belongs to tenant A
When a cashier acting in tenant B attempts to record a payment against that pledge
Then the operation is rejected as pledge not found
And no payment or receipt is created for tenant B
And tenant A's pledge remains unpaid

Executable regression: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “rejects recording a payment against another tenant pledge without creating a payment”. This verifies the persisted Firestore emulator boundary, not production/staging behaviour.

### Scenario: Invalid payment amounts never create financial records

Given an active campaign has an unpaid pledge
When a cashier attempts to record a zero, negative, or fractional-paise payment
Then each request is rejected as an invalid payment amount
And no payment or receipt is persisted
And the pledge remains unpaid

Executable regression: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “rejects invalid payment amounts without persisting payments or receipts”. This verifies Firestore emulator persistence, not production/staging behaviour.

### Scenario: Closed campaigns do not accept new pledges

Given a campaign has been closed by its tenant
When a donor attempts to create a new pledge against that campaign
Then the operation is rejected
And no pledge, payment, or receipt is persisted
And the campaign remains closed

Executable regression: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “rejects new pledges against a closed campaign without creating financial records”. This verifies the service and Firestore emulator, not production/staging behaviour.

### Scenario: Rejected payments do not affect balances or consume receipt sequence numbers

Given a valid payment is awaiting approval
When an independent reviewer rejects it with a reason
Then the rejection reason is trimmed and persisted
And the pledge balance and receipts remain unchanged
And a later approval attempt for that rejected payment is refused
When another valid payment for the same pledge is approved
Then it receives the first receipt sequence number
And exactly one receipt exists for the approved payment

Executable regression: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “keeps rejection atomic and does not consume the next receipt sequence”. This verifies persisted emulator state and sequence behaviour, not production/staging behaviour.

### Scenario: Expense records follow maker-checker and idempotency rules

Given an expense is submitted with supporting evidence
When the creator retries the same request
Then the same pending expense is returned without duplication
When the idempotency key is reused with a changed amount
Then the request is rejected and the original expense remains unchanged
And the creator cannot approve their own expense
When an independent reviewer rejects the expense with a reason
Then the reason is trimmed and persisted
And the rejected expense cannot later be approved

Executable regression: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “enforces expense maker-checker approval and prevents replay after rejection”. This verifies persisted Firestore emulator state, not production/staging behaviour.

### Scenario: Approved expenses require an independent reviewer and cannot be replay-approved

Given an expense is pending approval
When an independent finance reviewer approves it
Then the expense is persisted as approved with the reviewer identity
And a repeated approval attempt is rejected
And only one expense record exists

Executable regression: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “approves a valid expense only by an independent reviewer and blocks approval replay”. This verifies the Firestore emulator service workflow, not production/staging behaviour.

### Scenario: Refund adjustments preserve idempotency and reconcile balances atomically

Given a payment has been recorded but is still pending approval
When finance attempts to create a refund adjustment
Then the request is rejected because the payment is not verified
And no adjustment amount is reserved
Given the payment is verified and has an issued receipt and an unpaid pledge balance
When finance creates a refund adjustment within the remaining payment amount
Then the identical request returns the existing pending adjustment
And reusing its key with changed data is rejected
And another adjustment exceeding the remaining payment balance is rejected
When the adjustment creator attempts to approve it
Then approval is rejected as a maker-checker violation and balances remain unchanged
When an independent reviewer approves the adjustment
Then the adjustment is approved exactly once with an adjustment number
And the payment's adjusted and pending-adjustment balances are updated
And the pledge paid amount decreases by the approved refund
And the original payment receipt remains unchanged

Executable regression: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “keeps adjustment idempotency and refund balances consistent through approval”. The payment view exposes its persisted adjustment balances for verification. This tests the Firestore emulator, not production/staging behaviour.

### Scenario: Concurrent refund requests cannot reserve more than the verified payment amount

Given a verified payment has 50000 paise available for adjustment
When two concurrent refund requests each attempt to reserve 30000 paise
Then exactly one request succeeds
And the other request is rejected because it exceeds the remaining payment balance
And only 30000 paise is reserved across pending adjustments
And the pledge balance and issued receipt remain unchanged until approval

Executable regression: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “reserves adjustment balance atomically when refund requests race”. This verifies Firestore transaction contention and persisted emulator state, not production/staging behaviour.

### Scenario: Rejecting a refund releases its reservation without changing paid balances

Given a verified payment has a pending refund adjustment
When the adjustment creator attempts to reject it
Then rejection is denied by the maker-checker rule
When an independent reviewer rejects it with a reason
Then the reason is trimmed and persisted
And the pending adjustment reservation is released
And the payment's adjusted amount, pledge balance and issued receipt remain unchanged
And the rejected adjustment cannot later be approved
When a new valid full refund is created and independently approved
Then the payment's adjusted amount increases and the pledge paid amount is reduced to zero
And the original payment receipt remains present exactly once

Executable regression: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts` — “releases a rejected refund reservation and permits a later valid full refund”. This verifies persisted emulator transaction outcomes, not production/staging behaviour.