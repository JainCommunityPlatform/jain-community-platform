# User Profile and Identity

JCP owns the canonical community profile in the existing `users` collection.

- `userAuthIndexes` maps each Firebase Auth subject to a profile.
- `userPhoneIndexes` maps each normalized Indian mobile number to one profile.
- A profile may have multiple Google identities and multiple phone numbers.
- Normal users may update profile details, but not phone numbers.
- Tenant administrators may change a member's primary phone.
- `userActivities` records participation such as Kshamawani and future community events.

When a new Google identity links a phone already owned by a profile, the authentication index is re-pointed to the existing profile and the provisional profile is marked `mergedInto`.

## API

- `GET /api/profile`
- `PATCH /api/profile`
- `POST /api/profile/contact`
- `GET /api/profile/activities`
- `PATCH /api/profile/:userId/contact` (tenant administrator)
- trusted migration endpoints under `/api/profile-migrations/*`

The profile update endpoint deliberately has no mobile-number field.

## Transitional event integration

BadeBaba remains a separate repository while JCP is the canonical identity owner. Historical Kshamawani and Pratibha Samman documents are reconciled by normalized mobile number and receive a canonical `userId`. JCP currently reads those existing event collections in the shared named Firestore database to surface participation history. This avoids duplicating event records while the repositories remain separate.

The trusted migration API is protected by `JCP_INTERNAL_TOKEN`; credentials must never be committed.
