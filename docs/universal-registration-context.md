# Universal Registration Context

JCP owns canonical user identity and profile data. Feature and tenant registrations own their event-specific data.

## Contract

Authenticated registration/data-collection flows should call:

`GET /api/profile/registration-context`

The response contains:

- `profile.id`: canonical JCP user ID
- profile fields suitable for prefill
- linked mobile information
- prior JCP activities

The consuming feature must persist `profile.id` as its canonical `jcpUserId` reference. It must not create a second user/profile table.

## Rules

1. Never accept a client-supplied JCP user ID as proof of identity.
2. Resolve the user from the authenticated Firebase identity on the JCP API.
3. Mobile numbers are not editable through normal profile updates.
4. Registration-specific fields stay in the feature/tenant data model.
5. Do not duplicate the canonical profile into event records; use `jcpUserId` and snapshot only fields required for the business record or audit trail.
6. Unauthenticated forms must establish an approved identity flow before attaching a registration to an existing person. A raw mobile-number lookup is not authentication.

## Flutter

Use `ProfileRepository.registrationContext()` and `RegistrationPrefill` to prefill common fields. New registration features should consume these reusable types rather than implementing their own profile lookup.

## Example

```text
JCP user
  |
  +-- Kshamawani registration
  +-- Pratibha Samman application
  +-- donation
  +-- seva registration
  +-- future event
```

Identity stays centralized while each feature owns its own business data.
