# External notification delivery

The in-app notification is the source event. External delivery is a separate, best-effort side effect and must never roll back or fail a pledge, payment, receipt, or other financial transaction.

## Channels and configuration

- **Email:** configure `RESEND_API_KEY` and `NOTIFICATION_EMAIL_FROM`.
- **WhatsApp:** configure `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and optionally `WHATSAPP_GRAPH_API_VERSION` (defaults to `v22.0`).
- **Push:** initialize Firebase Admin with the existing server credentials. A recipient must be a valid registered FCM device token.

Provider credentials belong in the deployment secret manager, never in source control or Flutter assets. `providerReadiness()` exposes booleans only; it never returns credential values.

## Consent, privacy, retries, and deduplication

Callers must pass a verified destination and explicit channel consent. Missing verification, consent, or provider configuration is recorded as `SKIPPED`; it is not treated as successful delivery. Destination values are not persisted in delivery records. Provider errors are bounded and stored for operational diagnosis.

A deterministic tenant + notification + channel key avoids duplicate records. Successful deliveries are not sent again; an active processing record suppresses concurrent retries, and a processing record older than 15 minutes may be retried. Email sends use the provider idempotency header. WhatsApp and push provider delivery semantics can still make exactly-once delivery impossible; use provider receipts/webhooks for stronger reconciliation.

## Delivery states

`PENDING`, `PROCESSING`, `SENT`, `FAILED`, and `SKIPPED` are persisted in `notificationDeliveries`, with attempt counts, timestamps, provider message IDs, and bounded failure details. Provider credentials and contact destinations are not exposed by the tracking model.

## Activation boundary

The delivery adapter is wired to persisted donation events for pledge creation, payment verification/rejection, and adjustment approval/rejection. Dispatch happens after the Firestore financial transaction returns and is best-effort: provider errors are tracked but never roll back a financial decision. The dispatcher sends only through channels enabled in the member's tenant-scoped preferences. Email verification and verified phone destinations come from trusted Firebase ID-token claims; a WhatsApp destination is not inferred from an unverified profile phone. Push requires a registered device token. Provider configuration and end-to-end delivery must still be validated in each deployment. Push dispatch requires a registered `fcmToken` on the user profile; app-side device-token registration is not included in this phase. A background retry worker and provider webhook reconciliation remain follow-up work.


## User-managed channel preferences

Authenticated members can read and replace their own tenant-scoped channel choices:

- `GET /api/notifications/preferences`
- `PUT /api/notifications/preferences` with boolean `email`, `whatsapp`, and `push` fields.

New or missing preferences default to opt-out for every external channel. Updating these choices records the member's channel selection, but delivery still requires a verified destination and the dispatch caller to pass explicit consent. Preferences are isolated by tenant and authenticated user; clients cannot supply another user or tenant identifier.
