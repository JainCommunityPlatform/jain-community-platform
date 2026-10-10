# JCP Financial Platform — Discovery and Phase 1 Security Baseline

## Status

Discovery is based on the public implementation repository and its current authorization, membership, identity, audit, Firestore, Flutter, and tenant website modules. This document is a public-safe implementation note; product policy and material architecture decisions must also be reconciled with the private product documentation source of truth.

## Findings

- The API is a NestJS modular monolith using Firebase Authentication and Cloud Firestore through `FirestoreService`.
- Canonical global identity is represented in the `users` collection and authentication indexes; tenant roles are held by tenant-scoped `memberships`.
- The existing authorization guard resolves the authenticated JCP identity and current tenant membership server-side. The authorization policy combines explicitly assigned roles within the resolved membership.
- Existing role names include `TENANT_ADMIN`, `CONTENT_MANAGER`, `EVENT_MANAGER`, `INVENTORY_MANAGER`, `FINANCE_VIEWER`, `FINANCE_OPERATOR`, `FINANCE_APPROVER`, and `CA_AUDITOR`.
- Audit records are written through existing Firestore-backed audit infrastructure.
- Existing policy code granted Tenant Admin finance read/write/approve and audit read. This contradicted the required separation of general temple administration from financial operations.
- No dedicated financial domain modules for campaigns, pledges, payments, expenses, receipts, or finance reports were present in the inspected source tree. Reconfirm repository-wide before introducing each domain entity.
- Existing tenant website configuration is consumed by Flutter Web and the Android app. Financial operations must remain backend-authoritative and use shared records/APIs.

## Phase 1 security baseline

- Remove implicit finance and audit permissions from `TENANT_ADMIN`.
- Introduce `TENANT_FINANCE` as a distinct tenant membership role.
- Keep `TENANT_FINANCE` unable to approve payments by default. Existing finance operator and approver roles remain distinct during transition.
- Prevent the general tenant membership endpoints, which are protected by `tenant.manage`, from assigning or updating financial roles. This is intentionally fail-closed until a dedicated finance-team assignment workflow with its own authorization and audit contract is implemented.
- Preserve global platform administration as a separate scope; a platform role does not imply tenant financial permission.
- Preserve the existing global identity and membership storage model; do not auto-grant finance roles during migration.

## Proposed authorization model

Identity, tenant membership, role, and permission are separate concerns. All financial requests must be authorized by the backend using the authenticated canonical user, validated tenant context, and current membership/permissions. Client-provided tenant IDs, UI visibility, and stale client role claims are not authorization evidence.

Target permission granularity should include campaign, pledge, payment record/verify/reconcile, expense, receipt, report/export, audit, and finance-team management permissions. Existing coarse `finance.read/write/approve` permissions are a transitional limitation and must not be treated as the final fine-grained policy.

General tenant administrators should not be able to grant themselves or others finance roles. A future finance-team workflow must explicitly authorize the actor, tenant scope, allowed target role, and each grant/revocation; record an audit event; and prevent privilege escalation. Assignment policy and any platform-admin exception must be decided explicitly before that endpoint is shipped.

## Domain and persistence direction

Use Firestore-backed persistence conventions unless an approved architecture decision changes that boundary. Before creating a collection, inspect existing code and data for equivalent concepts. Financial amounts must use integer minor units or a rigorously validated decimal representation; floating-point arithmetic is prohibited. Use Firestore transactions and uniqueness/idempotency records where required by concurrency and retry semantics.

Potential domain concepts, only after duplicate-functionality checks:

- Campaign and donation event.
- Pledge and immutable payment/verification/reversal events.
- Expense and approval/payment events.
- Receipt and issuance/cancellation history.
- Finance audit events and notification outbox/deduplication state.

Historical financial records must retain their original tenant association. Identity linking must use the canonical JCP identity or a verified claim process, never name/phone equality alone. Do not import MyJinalay data.

## Separation-of-duties test contract

The security suite is a release gate, not merely a UI check.

1. Tenant Admin is allowed general tenant/content/event permissions but denied finance read, write, approval, and financial audit permissions by default.
2. Tenant Finance is denied tenant administration, platform administration, finance approval, and finance-team management unless separately granted.
3. Finance viewer cannot write; finance operator cannot approve; approver behavior remains explicit.
4. Multi-role permissions combine only within the same validated tenant membership.
5. A membership from another tenant or another user is rejected.
6. General membership endpoints reject assignment of all finance roles until the separately authorized finance-team workflow exists.
7. Revoked roles are re-evaluated on subsequent backend requests.
8. Every future financial resource endpoint, export, search, pagination, bulk operation, receipt/file download, and background job must have cross-tenant and cross-donor tests.
9. Donors can view their own eligible records across temples but cannot access another donor's records.
10. Payment idempotency, partial payments, concurrent updates, verification separation, reversals/refunds, receipt issuance, report reconciliation, and audit generation must be tested.

Also maintain regression tests for existing sign-in, tenant resolution, membership management, website editing, public endpoints, and Android/Web flows. Public endpoints must remain intentionally public where appropriate; do not require authentication indiscriminately.

## Phased delivery

1. **Phase 0 — Discovery and authorization design:** inspect all current routes and domain models; confirm private product/architecture decisions; finalize role matrix, identity-linking policy, state transitions, persistence strategy, migration/backfill and rollback plans.
2. **Phase 1 — Role separation:** correct policy, add tenant finance role, close the general membership role-assignment escalation path, and test the role/tenant boundaries.
3. **Phase 2 — Financial domain/API:** campaigns, pledges, payment lifecycle, expenses, integrity/idempotency and audit.
4. **Phase 3 — Finance portal:** permission-aware navigation and workflows.
5. **Phase 4 — Receipts/reports:** unique receipt IDs, reconciled reports and scoped exports.
6. **Phase 5 — Donor dashboard:** safe cross-temple read model and identity linking.
7. **Phase 6 — Website/Android/notifications:** shared backend records and authorized flows.
8. **Phase 7 — Production readiness:** full regression/security suite, deployment/migration verification, docs, CI and reviewed PR merge.

## Rollout safety

- No destructive migration is proposed by this discovery note.
- Do not automatically assign `TENANT_FINANCE` to current Tenant Admins.
- Inventory existing memberships and any current finance-role assignments before changing production data.
- The Phase 1 general membership endpoint blocks finance-role grants until a dedicated authorized assignment flow is available. Existing financial role assignments remain persisted, but access is determined by the corrected backend policy.
- Validate the exact test suite and CI status in GitHub before merging. Do not report tests as passed unless executed by CI or local tooling.
