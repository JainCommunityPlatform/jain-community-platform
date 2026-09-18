# Database foundation test matrix

The database foundation is intentionally covered at three levels:

1. Prisma migration deployment in CI verifies the schema can be applied to a clean PostgreSQL instance.
2. Prisma tenant resolver unit tests verify hostname normalization and tenant lookup behavior without requiring a database.
3. API integration tests verify the HTTP tenant-resolution contract against PostgreSQL and the seeded tenant.

The next tenant-security milestone will add request-scoped tenant context, membership authorization, and explicit cross-tenant isolation regression tests.
