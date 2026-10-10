# Donation receipts and finance summary

## Receipt issuance

A receipt is issued only when a tenant-scoped finance approver verifies a pending manual donation payment. Receipt creation, the payment status change, the pledge paid-balance update, and the tenant/year receipt sequence increment are committed in the same Firestore transaction.

Receipt numbers use the format `JCP-<TENANT-CODE>-<UTC-YEAR>-<SEQUENCE>`. The sequence is tenant- and year-scoped. Receipt records are stored separately from payments so the issued receipt details can be listed for the tenant or for the authenticated donor.

- `GET /api/giving/receipts` — tenant finance team, requires `finance.read`
- `GET /api/giving/my-receipts` — authenticated donor's receipts for the resolved tenant

A receipt confirms a verified manual/offline payment recorded in JCP. It does not represent online payment gateway settlement, tax-deductibility approval, or a legally prescribed tax receipt.

## Finance summary

- `GET /api/giving/reports/summary` — requires `finance.read` and uses the resolved tenant only.
- Amounts are integer paise in INR.
- Totals distinguish pledged, verified/received, outstanding, pending approval, and rejected amounts.
- Campaign and payment-method breakdowns include verified receipts/payments only for received totals.
- Pending or rejected payments never count as received funds.
- Cancelled pledges are excluded from active pledged/outstanding totals and reported separately.

This summary is an operational giving report, not a double-entry ledger or audited financial statement. Expenses, refunds/reversals, date-range exports, and ledger reconciliation remain separate phases.


## Expenses and reconciliation

- `POST /api/giving/expenses` — finance.write; requires an `Idempotency-Key`, records amount in integer paise and stores evidence references. New expenses start in `PENDING_APPROVAL`.
- `GET /api/giving/expenses` — finance.read, tenant scoped.
- `POST /api/giving/expenses/:expenseId/approve` and `/reject` — finance.approve; only a different reviewer can act on a pending expense, and rejection requires a reason.
- `GET /api/giving/reports/reconciliation` — finance.read; compares verified payments with issued receipts, lists missing/orphan/mismatched receipt IDs, and reports approved/pending/rejected expenses plus net verified donations after approved expenses.

Only approved expenses reduce the operational net balance. This is a control/reconciliation summary, not a general ledger; it does not itself settle bank transactions or prove that cash/bank statements match.
