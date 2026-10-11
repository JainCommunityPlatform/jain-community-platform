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
