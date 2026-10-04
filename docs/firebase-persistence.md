# Firebase Persistence

JCP uses Firebase Authentication for global identity and Cloud Firestore as the persistence layer for the platform foundation.

## Deployment boundary

JCP owns the Firebase project configured by `FIREBASE_PROJECT_ID` (default: `jain-community-platform`). Other applications such as BadeBaba and Avijit Sahyog must not read or write JCP's Firestore collections directly. They integrate through JCP's API contracts.

This keeps application infrastructure and Firebase quotas independently bounded.

## Firestore collections

| Collection | Purpose |
| --- | --- |
| `users` | Global JCP user records |
| `userAuthIndexes` | Stable lookup from Firebase Auth subject to JCP user ID |
| `tenants` | Tenant records |
| `tenantDomains` | Hostname-to-tenant resolution |
| `memberships` | User-to-tenant roles |
| `auditLogs` | Backend-authoritative audit events |

User IDs remain UUIDs so the API contract is not coupled to Firebase Auth UID format.

## Server access

The NestJS API uses the Firebase Admin SDK from a trusted server environment. Firebase Security Rules are not the authorization boundary for these server-side operations; tenant authorization remains in the backend. Firebase documents that Admin SDK/server client libraries operate in a privileged environment and are not evaluated against Firestore Security Rules.

For Render, the preferred credential variables are:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY_BASE64`

The service also accepts a base64-encoded complete service-account JSON as `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64`.

## First deployment bootstrap

Set `FIREBASE_BOOTSTRAP_ENABLED=true` only during initial provisioning and supply the bootstrap tenant and Firebase Auth UID. The API creates the tenant/domain records and grants the configured Auth subject `TENANT_ADMIN`.

After successful provisioning, set `FIREBASE_BOOTSTRAP_ENABLED=false`.

## PostgreSQL

PostgreSQL and Prisma are no longer runtime dependencies of the JCP API. Existing application/domain contracts remain backend-authoritative and persistence is behind the database module so the domain layer does not depend directly on Firestore.
