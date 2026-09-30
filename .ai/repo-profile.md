# AI Repository Profile — MyJinalay / JCP

This file is the repository-local operating profile for AI agents. It complements `.github/copilot-instructions.md` and does not replace it.

## Identity
- Product: MyJinalay
- Implementation repository: JainCommunityPlatform/jain-community-platform
- Default branch: `master`
- Scope: public implementation code, tests, CI/CD and public-safe technical documentation

## Source of truth
1. `.github/copilot-instructions.md` — mandatory implementation rules.
2. `JainCommunityPlatform/jain-community-docs` — private source of truth for product vision, roadmap, priorities, feature intent and significant architecture/product decisions.
3. Repository code/tests/CI — implementation truth.
4. Public `docs/` — public-safe technical documentation.

Never copy private roadmap, strategy, confidential architecture discussions, credentials or personal data into this public repository.

## Technical/product principles
- Multi-tenant Jain temple/community platform.
- Backend-authoritative tenant isolation, authorization, financial and audit decisions.
- Modular monolith unless an explicit architecture decision says otherwise.
- Global identity is distinct from tenant membership.
- Public implementation must remain independently deployable and public-safe.

## Developer operating contract
1. Inspect Copilot instructions, relevant public docs and existing implementation before editing.
2. Identify the governing product/architecture decision in the private docs repository when available.
3. Identify all affected modules, APIs, persistence boundaries, tenant/authorization rules and tests.
4. Implement the smallest coherent solution.
5. Add/update unit, UI/widget, integration and functional/E2E tests according to the changed behaviour.
6. Explicitly test tenant isolation, authorization, retry/idempotency and failure boundaries when relevant.
7. Run available local validation.
8. Monitor CI and fix actual failures until required checks are green.
9. Review the final diff for secrets/private information.
10. Update public technical docs when implementation behaviour changes.
11. If product/architecture intent changes, reconcile the private documentation rather than silently changing the public implementation contract.
12. Merge only after required CI checks pass and repository rules permit it.

## Product Owner operating contract
1. Start with `jain-community-docs`, not this public implementation repository.
2. Review roadmap, priorities, product vision, current epics and architecture decisions.
3. Find existing issues/epics before creating duplicates.
4. Convert requests into outcome, epic/story, acceptance criteria, priority, dependencies and non-goals.
5. Record material decisions in the private docs repository.
6. Keep roadmap and implementation intent synchronized.
7. Provide Developer with a public-safe implementation contract.
8. After delivery, reconcile the product documentation and mark roadmap status accurately.

## Quality gates
Complete means: acceptance criteria met, appropriate tests added/updated, local validation performed where available, CI green, public/private boundary preserved, docs reconciled, and no known regression.

## Agent handoff
PO -> Developer: product intent, priority, acceptance criteria, architecture constraints, dependencies, public/private documentation impact.
Developer -> PO: implementation summary, tests, CI status, docs updated, deviations, deferred work.

## Critical boundary
If a requested implementation conflicts with the private product/architecture decision, do not invent a compromise. Surface the conflict and identify the exact decision needed.
