# JCP Autonomous QA Checkpoint

Date: 12 October 2026
Repository: [JainCommunityPlatform/jain-community-platform](https://github.com/JainCommunityPlatform/jain-community-platform)

## Last durable baseline

- Control tower: [issue #162](https://github.com/JainCommunityPlatform/jain-community-platform/issues/162) (closed in GitHub, but the inventory explicitly remains incomplete; do not interpret closure as programme completion).
- Latest observed default-branch merge: [commit 305e4e8](https://github.com/JainCommunityPlatform/jain-community-platform/commit/305e4e8b5d7d02e1f0fbd75a9b1f70ba6ad80d1a), PR #165.
- Relevant existing persisted lifecycle test: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts`, “persists partial payments, updates the pledge and issues distinct receipts transactionally”.
- The GitHub connector returned no commit status records and no PR-triggered workflow runs for the observed merge commit. This is missing evidence, not a green CI result.

## Current item

- **In progress:** P0 auth/session UI — a Firebase signed-out event must refresh navigation and remove the protected screen.
- **Branch:** `qa/session-signout-route-refresh-v2`.
- **Test:** `apps/flutter/test/widget_test.dart` — “redirects an open protected route to login when Firebase signs out”. It checks that an authenticated admin route changes to login without manual navigation.
- **Previous item:** [PR #171](https://github.com/JainCommunityPlatform/jain-community-platform/pull/171) merged as `dc008919f598cc42d69b143e9b28d57c40098775`; exact PR-head [CI #767](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38294696101) passed; post-merge [CI #768](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38295038490) pending final verification.
- **Current PR / CI:** not yet opened; exact-head CI pending.
- **Evidence boundary:** fake Firebase auth stream and Flutter router test; real Firebase, API token expiry, and device behavior remain unverified.

## Exact next action

Verify post-merge CI #768 for PR #171, then open the focused PR for sign-out route refresh. Inspect exact-head CI, fix failures rather than weakening assertions, merge only when all required checks pass, verify post-merge CI, update this checkpoint and issue #162, then continue the auth/session matrix. Keep Android build/upload manual/on-demand.
