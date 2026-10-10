# Donation payment verification workflow

## Endpoints

- `POST /api/giving/pledges/:pledgeId/payments` — finance operator records a payment for a pledge; requires `finance.write` and `Idempotency-Key`.
- `POST /api/giving/payments/:paymentId/approve` — separate finance approver verifies it; requires `finance.approve`.
- `POST /api/giving/payments/:paymentId/reject` — finance approver rejects it with a reason; requires `finance.approve`.
- `GET /api/giving/payments` — tenant-scoped payment list; requires `finance.read`.

## Controls

- Amounts are integer paise (INR).
- A payment is only counted against a pledge after a different user approves it.
- Self-approval is rejected.
- Approval is transactional and checks the payment and pledge tenant, pending status, and outstanding pledge balance.
- Payment recording is idempotent; same key and same request returns the same pending payment, while conflicting reuse returns HTTP 409.
- Rejected payments do not alter the pledge paid balance.
- Tenant admin and platform admin do not receive finance permissions by default.
- This workflow is for offline/manual payment evidence. It does not assert that an online payment was settled, and it is not a substitute for signed gateway webhooks. Gateway reconciliation, reversal/refund accounting, ledger posting and receipts are later slices.
