# Multi-tenant Temple Website Platform

The JCP implementation uses one reusable temple website template backed by tenant-scoped configuration. The same configuration is consumed by the responsive Flutter Web experience and the MyJinalay Flutter mobile application.

## Runtime model

1. A platform administrator creates a tenant.
2. The tenant receives a stable ID and slug.
3. The platform administrator can provide a custom hostname or let JCP generate a subdomain from JCP_TENANT_BASE_DOMAIN.
4. The initial temple administrator is assigned immediately when a matching global user exists, otherwise an invitation is persisted and claimed when that user first authenticates.
5. A default website configuration is created automatically.
6. Temple administrators edit the website through the tenant-scoped admin portal.
7. Images are uploaded through the backend and stored under a tenant-specific storage prefix.
8. Public web requests resolve the tenant from a verified hostname.
9. Mobile requests select a tenant from the central directory and send the validated tenant ID as an explicit API context.
10. Both surfaces read and write the same tenant website configuration record.

## Tenant isolation

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

The configuration is intentionally data-driven. A tenant must not require a dedicated UI module or service.

## Deployment requirements

For generated tenant subdomains, configure:

- JCP_TENANT_BASE_DOMAIN;
- wildcard DNS for that domain;
- the web host/reverse proxy to route the wildcard host to the Flutter Web application;
- the API to be reachable under the same origin or an explicitly configured API base URL.

For image uploads, configure FIREBASE_STORAGE_BUCKET for the backend.

For the first platform administrator, configure FIREBASE_BOOTSTRAP_PLATFORM_ADMIN_SUBJECT with the authenticated Firebase subject that should receive PLATFORM_ADMIN.

## Deliberate boundary

The website's event cards are configuration content in this vertical slice. They can later be linked to the generic Events domain without changing tenant resolution, authorization or the website rendering contract.
