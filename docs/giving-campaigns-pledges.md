# Giving: campaigns and pledges (Phase 3)

This slice introduces generic, tenant-scoped campaign and pledge primitives on the existing NestJS + Firestore backend. It is shared platform functionality; no temple-specific service or schema is introduced.

## API

All paths use the global `/api` prefix.

- `GET /api/giving/campaigns` — public list of active campaigns for the tenant resolved by the request host.
- `POST /api/giving/campaigns` — create a draft campaign; requires `finance.write`.
- `PATCH /api/giving/campaigns/:campaignId/status` — activate/close a campaign; requires `finance.write`.
- `POST /api/giving/pledges` — create a pledge for the authenticated global user; requires `Idempotency-Key` header.
- `GET /api/giving/my-pledges` — the authenticated user's pledges for the current tenant only.
- `GET /api/giving/pledges` — tenant pledge list; requires `finance.read`.

## Financial and security invariants

- Amounts are integer **paise**, never floating-point rupees; currency is currently INR.
- Campaign IDs must resolve to an active campaign in the current tenant before a pledge can be created.
- Donor identity is derived from the authenticated session, not a client-supplied donor ID.
- Pledge idempotency is scoped to tenant + global donor identity + idempotency key. Reusing a key with different pledge content returns a conflict.
- Pledges are separate from payments. A pledge does not mean money was received.
- Tenant-owned reads are scoped to the resolved tenant. Donor history is further filtered by canonical user ID.
- Campaign creation/status changes and pledge creation are audited.
- No payment gateway, successful-payment state, receipt, ledger posting, expense workflow, or migration is included in this slice. Those must be built as separate backend-authoritative steps.

## Roles

Tenant Admin does not receive `finance.read` or `finance.write`. Campaign administration and finance reporting require explicitly assigned financial permissions. Public campaign discovery is read-only.
