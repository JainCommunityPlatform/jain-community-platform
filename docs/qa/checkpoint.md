# JCP Autonomous QA Checkpoint

Date: 12 October 2026
Repository: [JainCommunityPlatform/jain-community-platform](https://github.com/JainCommunityPlatform/jain-community-platform)

## Last durable baseline

- Control tower: [issue #162](https://github.com/JainCommunityPlatform/jain-community-platform/issues/162) (closed in GitHub, but the inventory explicitly remains incomplete; do not interpret closure as programme completion).
- Latest observed default-branch merge: [commit 305e4e8](https://github.com/JainCommunityPlatform/jain-community-platform/commit/305e4e8b5d7d02e1f0fbd75a9b1f70ba6ad80d1a), PR #165.
- Relevant existing persisted lifecycle test: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts`, “persists partial payments, updates the pledge and issues distinct receipts transactionally”.
- The GitHub connector returned no commit status records and no PR-triggered workflow runs for the observed merge commit. This is missing evidence, not a green CI result.

## Current item

- **In progress:** P0 auth/session UI — refreshed membership roles must immediately remove access to protected finance screens.
- **Branch:** `qa/session-role-refresh-route-denial`.
- **Test:** `apps/flutter/test/widget_test.dart` — “refreshing a revoked finance role redirects away from finance”. It verifies finance access is allowed before refresh and denied after the refreshed session no longer has a finance role.
- **Previous item:** [PR #172](https://github.com/JainCommunityPlatform/jain-community-platform/pull/172) merged as `4000fd9fa1d6e2184657b48a5465239aac115899`; exact-head [CI #770](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38295541409) passed all required checks; post-merge [CI #771](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38296014960) pending final verification.
- **Current PR / CI:** not yet opened; exact-head CI pending.
- **Evidence boundary:** mocked session refresh and Flutter router only; persisted membership revocation and production identity/session propagation remain unverified.

## Exact next action

Verify post-merge CI #771 for PR #172, then open the focused PR for session role-refresh route denial. Inspect exact-head CI, fix failures rather than weakening assertions, merge only when all required checks pass, verify post-merge CI, update this checkpoint and issue #162, then continue auth/session expiry and restoration gaps. Keep Android build/upload manual/on-demand.
