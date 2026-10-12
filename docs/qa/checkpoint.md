# JCP Autonomous QA Checkpoint

Date: 12 October 2026
Repository: [JainCommunityPlatform/jain-community-platform](https://github.com/JainCommunityPlatform/jain-community-platform)

## Last durable baseline

- Control tower: [issue #162](https://github.com/JainCommunityPlatform/jain-community-platform/issues/162) (closed in GitHub, but the inventory explicitly remains incomplete; do not interpret closure as programme completion).
- Latest observed default-branch merge: [commit 305e4e8](https://github.com/JainCommunityPlatform/jain-community-platform/commit/305e4e8b5d7d02e1f0fbd75a9b1f70ba6ad80d1a), PR #165.
- Relevant existing persisted lifecycle test: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts`, “persists partial payments, updates the pledge and issues distinct receipts transactionally”.
- The GitHub connector returned no commit status records and no PR-triggered workflow runs for the observed merge commit. This is missing evidence, not a green CI result.

## Current item

- **In progress:** P0 auth/session UI — verify direct navigation to protected screens is denied when the authenticated session lacks the required role.
- **Branch:** `qa/auth-role-redirect-denials`.
- **Test:** `apps/flutter/test/widget_test.dart` — “redirects authenticated users without each required role to member home”. Covers tenant admin, website admin, finance, platform admin, and inventory routes.
- **Previous item:** [PR #169](https://github.com/JainCommunityPlatform/jain-community-platform/pull/169) merged as `1c5a85038d3182452cc3d54ce54ad5d260d4c958`; exact PR-head [CI #762](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38292799818) passed all required checks; post-merge [CI #763](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38293137101) pending final verification.
- **Current PR / CI:** not yet opened; exact-head CI pending.
- **Evidence boundary:** Flutter widget/router behavior only; live session role refresh and backend authorization are separate evidence layers.

## Exact next action

Verify post-merge CI #763 for PR #169, then open the focused PR for protected-route role denial. Inspect exact-head CI, fix failures rather than weakening assertions, merge only when all required checks pass, verify post-merge CI, update this checkpoint and issue #162, then continue the auth/session journey matrix. Keep Android build/upload manual/on-demand.
