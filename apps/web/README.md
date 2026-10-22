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

The current landing page is a design/route foundation. Its temple illustration is a CSS placeholder, not an approved temple photograph. Dynamic tenant content, live event/gallery data, editor integration, and verified donation flows must be connected to the JCP API before production launch.

## Configuration

- `NEXT_PUBLIC_SITE_URL`: canonical site URL used for metadata; defaults to `https://badebabakharadi.com`.

Do not put service-account secrets or privileged Firebase credentials in `NEXT_PUBLIC_*` variables.
