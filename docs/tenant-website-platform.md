# Multi-tenant Temple Website Platform

The JCP implementation uses one reusable temple website template backed by tenant-scoped configuration. The same configuration is consumed by the responsive Flutter Web experience and the MyJinalay Flutter mobile application.

## Runtime model

This is implemented as a reusable platform capability; the reference tenant is data, not code, and its behavior is covered by backend and Flutter tests, including tenant-isolation and onboarding paths.

1. A platform administrator creates a tenant.
2. The tenant receives a stable ID and slug.
3. The platform administrator can provide a custom hostname or let JCP generate a subdomain from JCP_TENANT_BASE_DOMAIN.
4. The initial temple administrator is assigned immediately when a matching global user exists, otherwise an invitation is persisted and claimed when that user first authenticates.
5. Platform administrators can edit an existing tenant and add additional tenant administrators by user email.
6. A default website configuration is created automatically.
7. Temple administrators edit the website through the tenant-scoped admin portal.

Temple image uploads use Firebase Storage download tokens for public website media.
8. Images are uploaded through the backend and stored under a tenant-specific storage prefix.
9. Public web requests resolve the tenant from a verified hostname.
10. Mobile requests select a tenant from the central directory and send the validated tenant ID as an explicit API context.
11. Both surfaces read and write the same tenant website configuration record.

## Tenant isolation and platform administration

- Global identity is separate from tenant membership.
- Tenant context is resolved from the request hostname or a validated tenant selector.
- Protected mutations require the user's tenant membership and permission.
- Platform administration uses a global PLATFORM_ADMIN role and does not require a tenant membership.
- Website changes are audited.
- Custom hostnames are not publicly resolved until DNS TXT verification succeeds.

## Website configuration

The reusable configuration currently supports:

- theme colors and languages;
- logo, navigation and hero;
- quick information cards;
- temple introduction;
- central temple directory preview;
- event/activity cards;
- gallery;
- seva actions;
- contact information and map handoff;
- section visibility and titles.

The configuration is intentionally data-driven and shared across web and mobile. A tenant must not require a dedicated UI module or service.

## Deployment requirements

The CI pipeline is the validation gate for the reusable tenant capability and remains mandatory before merge.

For generated tenant subdomains, configure:

- JCP_TENANT_BASE_DOMAIN;
- wildcard DNS for that domain;
- the web host/reverse proxy to route the wildcard host to the Flutter Web application;
- the API to be reachable under the same origin or an explicitly configured API base URL.

For image uploads, FIREBASE_STORAGE_BUCKET may be set explicitly. If it is omitted, the backend resolves the Firebase project's current default bucket (<project>.firebasestorage.app) and falls back to the legacy <project>.appspot.com bucket.

For the first platform administrator, configure FIREBASE_BOOTSTRAP_PLATFORM_ADMIN_SUBJECT with the authenticated Firebase subject that should receive PLATFORM_ADMIN.

## Deliberate boundary

The website's event cards are configuration content in this vertical slice. They can later be linked to the generic Events domain without changing tenant resolution, authorization or the website rendering contract.
