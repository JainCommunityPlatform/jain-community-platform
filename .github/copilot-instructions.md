# Jain Community Platform — Copilot Instructions

These rules apply to all human- and AI-assisted work in this public implementation repository.

## 1. Repository Scope and Boundary

- This repository contains the **public implementation** of the Jain Community Platform: application code, tests, CI/CD and public-safe technical documentation.
- The private product/strategy repository is `JainCommunityPlatform/jain-community-docs`.
- `jain-community-docs` is the source of truth for **why, what and when**: product vision, principles, roadmap, feature intent, private strategy and significant architecture/product decisions.
- This repository is the source of truth for **how** the approved product direction is implemented.
- Never copy private roadmap sequencing, unreleased ideas, competitive/business strategy, internal deliberations, personal data, credentials or other confidential material into this public repository.
- If implementation needs private context, use only the minimum public-safe contract/context necessary to implement it.

## 2. Before Writing Code

1. Inspect the existing architecture, code, tests and nearby documentation before editing.
2. Identify the relevant product/roadmap capability and architectural decision from the private planning workflow when available.
3. Understand the complete user flow and all affected layers before changing code.
4. Prefer established patterns over introducing parallel abstractions.
5. Do not invent product policy when requirements are ambiguous; surface the missing decision instead.
6. Keep the change focused on the current roadmap phase. Do not pull future capabilities into a foundation or feature PR without an explicit decision.

## 3. Architecture Principles

- Start as a modular monolith; do not introduce microservices without an explicit architecture decision.
- Keep global user identity separate from tenant membership.
- Enforce tenant isolation server-side and pass tenant context explicitly into domain operations.
- Keep domain logic independent of UI and transport adapters.
- Keep financial, entitlement and audit decisions backend-authoritative.
- Keep infrastructure replaceable behind explicit interfaces.
- Prefer explicit module interfaces over cross-module database coupling.

## 4. Branch and Pull Request Safety

- **Never commit directly to `master`.**
- Create a dedicated feature, fix, chore or docs branch from the latest `master` before making changes.
- All changes must reach `master` through a Pull Request and appropriate CI checks.
- Before editing, confirm the target branch is not `master`.
- Keep PRs focused and explain the product/roadmap capability, architectural boundary, validation performed and anything deliberately deferred.

## 5. Implementation and Documentation Contract

The public repository and private documentation repository are synchronized by **intent, not by copying files**.

For every significant change, explicitly review whether the implementation changes:

- product/user behaviour;
- user journeys or workflows;
- domain entities, relationships or invariants;
- API contracts;
- security, authorization, tenancy or audit rules;
- architecture boundaries or dependencies;
- Mermaid diagrams or public technical documentation;
- roadmap status or iteration assumptions.

If any of these change, the relevant private documentation must be reconciled as part of the same development workflow. The implementation must not silently become the new product specification.

If no documentation update is required, state that the documentation-impact review found no change necessary in the PR.

## 6. Testing Is Part of the Feature

Every feature or bug fix must include the appropriate tests across the layers affected by the change. JCP uses four complementary layers:

### Unit tests

- Test pure domain logic, validation, policy decisions, mappers, resolvers and utilities in isolation.
- Keep unit tests fast and deterministic.
- Do not use unit tests as a substitute for integration tests when behaviour depends on framework wiring, persistence or external boundaries.

### UI / widget tests

- Test Flutter screens, widgets, routing/guards, validation and user-visible states.
- Cover important loading, empty, error and success states.
- Prefer semantic/user-visible assertions over widget implementation details.
- Add responsive/adaptive coverage when behaviour differs materially by viewport or platform.

### Integration tests

- Test real application wiring across module boundaries, HTTP/API behaviour and persistence boundaries as those dependencies are introduced.
- Verify authentication, authorization and **tenant isolation** at the backend boundary.
- Use controlled test fixtures/databases; never depend on production data.
- Cover transaction, retry and idempotency behaviour for workflows where duplicate or partial processing could matter.

### Functional / E2E tests

- Test complete user journeys from the user's entry point through the relevant application layers.
- Prioritize critical journeys such as sign-in, tenant selection/resolution, membership, event participation and giving/payment flows as they are implemented.
- Keep a small, reliable critical-path suite rather than duplicating every unit test at E2E level.

For multi-step workflows, test complete success, meaningful failure points, user-visible partial outcomes and retry/idempotency behaviour where applicable.

A feature is not considered fully tested merely because its unit tests pass. The required layers depend on the behaviour changed, and the PR must explain deliberately omitted layers.

## 7. Validation and CI Discipline

- Run the repository's documented local validation before committing or opening a PR whenever the required tooling is available.
- CI is a final confirmation gate, not a substitute for local debugging.
- CI must run the relevant unit, UI/widget, integration and functional/E2E suites as those suites become available.
- When CI fails, inspect the actual failing job/log before changing code.
- Never claim validation passed when it was not executed; explicitly state unavailable checks.
- Review the final diff for regressions, secrets, debug artifacts and accidental private information before pushing.

## 8. Public-Safety Rules

Before committing, verify that no public file contains:

- secrets, tokens, passwords or credentials;
- private roadmap or unreleased product strategy;
- internal business/competitive strategy;
- personal or sensitive user information;
- private operational details that are not intended for publication.

When public technical context is needed, create a deliberately public-safe explanation instead of copying private planning material.

## 9. Definition of Done

Before opening a PR:

- [ ] The implementation matches the relevant product intent.
- [ ] Existing architecture and conventions were inspected.
- [ ] Tests were added/updated for changed behaviour.
- [ ] The appropriate testing layers were covered: unit, UI/widget, integration and/or functional/E2E.
- [ ] Any deliberately omitted testing layer is explained in the PR.
- [ ] Local validation was run where tooling is available.
- [ ] No known compilation, analyzer, test or validation failures remain.
- [ ] Public/private information boundaries were reviewed.
- [ ] Documentation impact was explicitly reviewed.
- [ ] Relevant public technical documentation is updated.
- [ ] Private documentation is identified for reconciliation when behaviour, architecture or roadmap status changed.
- [ ] CI is expected to validate the final change cleanly.

## 10. AI Agent Working Principle

1. Inspect before editing.
2. Identify the governing product intent and architecture.
3. Identify all affected layers.
4. Implement the smallest coherent solution.
5. Add tests with the implementation.
6. Run relevant validation before committing/pushing.
7. Fix root causes, not symptoms.
8. Review public-safety boundaries before publishing.
9. Explicitly perform the documentation-impact review before declaring the work complete.
10. If the implementation changes a product or architecture decision, reconcile the private documentation rather than leaving drift.

Never declare work complete while knowingly leaving the implementation inconsistent with an approved product/architecture decision or while knowingly exposing private planning material.
