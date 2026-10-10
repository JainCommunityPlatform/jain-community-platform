# Finance-team management API

## Authorization contract

The finance-team management API is restricted to authenticated JCP platform administrators through the server-side `platform.finance.team.manage` permission. A platform role grants authority to provision a tenant's finance team; it does not grant access to that tenant's financial records.

Tenant administrators cannot be assigned financial roles. The authorization policy also denies finance and financial-audit permissions for any legacy membership that combines `TENANT_ADMIN` with a financial role. Platform administrators cannot assign finance roles to themselves or other platform administrators.

## Endpoints

- `GET /api/platform/tenants/:tenantId/finance-team` — list only financial roles for members of the selected tenant.
- `POST /api/platform/tenants/:tenantId/finance-team` — grant one supported financial role to an existing JCP identity, preserving other non-financial membership roles.
- `DELETE /api/platform/tenants/:tenantId/finance-team/:userId/:role` — revoke one financial role. If it was the member's only tenant role, the tenant membership is removed.

Supported roles: `TENANT_FINANCE`, `FINANCE_VIEWER`, `FINANCE_OPERATOR`, `FINANCE_APPROVER`, and `CA_AUDITOR`.

Every request verifies the tenant exists. Role grants/revocations write tenant-scoped audit events with actor, target, role and resulting membership state. The general tenant-membership endpoints continue to reject financial role assignments.

## Scope and follow-up

This is a provisioning API foundation. It does not yet implement donation campaigns, pledges, payments, receipts, expenses, reports or a finance UI. Those are delivered in separate domain slices with tenant-isolation, identity, audit, idempotency and separation-of-duties tests. No data migration or automatic role grant is performed.
