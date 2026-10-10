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

This change provides the delivery adapter and tracking foundation. Channels remain operationally inactive until the relevant provider is configured, the recipient destination is verified, consent is recorded by the caller, and end-to-end delivery is validated. A background worker, provider webhook reconciliation, and user-facing preference management remain follow-up work; do not claim automatic campaign-wide delivery until those are wired.
