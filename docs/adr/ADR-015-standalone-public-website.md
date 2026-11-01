# ADR-015: Standalone public website stack

- **Status:** Proposed
- **Date:** 2026-10-22

## Context

Bade Baba Kharadi needs a polished, SEO-friendly public website at `badebabakharadi.com`. The public website must not depend on Flutter Web. JCP already owns tenant resolution, tenant-scoped website configuration, media upload, identity, and authorization in its shared backend.

## Decision

Introduce `apps/web` as an independent Next.js App Router + TypeScript application. Keep the mobile app in Flutter and reuse the JCP API for shared temple data and privileged workflows. Public rendering and web deployment are separate from Android release pipelines.

## Boundaries

- The website must use the existing tenant-aware API; it must not connect directly to privileged Firestore collections from the browser.
- Tenant identity must be resolved from the incoming host by the server/API. Never trust a client-supplied tenant ID as authorization.
- Public routes expose only published, public-safe data. Admin/editor routes require server-validated authentication and tenant permissions.
- Website configuration, media and content remain reusable across tenants; no Bade Baba-only backend fork.
- Deployment requires independent web build/CI and domain configuration for `badebabakharadi.com`.

## Initial implementation

The first app foundation adds a responsive Hindi landing page and app-level metadata. The current visual uses a CSS temple placeholder until approved reference assets and the intended design are available. The linked visual reference should be attached directly to the repository issue/PR before pixel-level design matching.

## Consequences

The public site can use server rendering, metadata and web-native performance/SEO capabilities independently of Flutter releases. API contracts, preview/publishing workflow, content hydration and production deployment are follow-up work.
