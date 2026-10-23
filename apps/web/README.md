# JCP Public Website

Standalone public-facing website for tenant domains such as `badebabakharadi.com`.

## Stack

- Next.js App Router + TypeScript + React
- Independent app in `apps/web`; this is **not Flutter Web**
- Intended to consume the existing JCP API for tenant-resolved website content
- Deployable as a Node.js service or container; Next.js standalone output is enabled

## Local development

From this directory:

```bash
npm install
npm run dev
npm run build
```

The landing page reads the incoming hostname on the server, resolves it through the JCP tenant resolver, then loads the matching tenant website configuration. It fails closed when API resolution fails so a different tenant's content is not shown. The temple illustration remains a placeholder until approved photography is configured. Events and gallery render from tenant configuration; transaction-grade donation flows must be connected to approved JCP giving workflows before launch.

## Configuration

- `JCP_API_BASE_URL`: server-only JCP API base URL including `/api`, required for live multi-tenant mode.
- `NEXT_PUBLIC_SITE_URL`: canonical site URL used for metadata; defaults to `https://badebabakharadi.com`.

Do not put service-account secrets or privileged Firebase credentials in `NEXT_PUBLIC_*` variables.
