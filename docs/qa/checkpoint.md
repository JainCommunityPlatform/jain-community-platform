# JCP Autonomous QA Checkpoint

Date: 12 October 2026
Repository: [JainCommunityPlatform/jain-community-platform](https://github.com/JainCommunityPlatform/jain-community-platform)

## Last durable baseline

- Control tower: [issue #162](https://github.com/JainCommunityPlatform/jain-community-platform/issues/162) (closed in GitHub, but the inventory explicitly remains incomplete; do not interpret closure as programme completion).
- Latest observed default-branch merge: [commit 305e4e8](https://github.com/JainCommunityPlatform/jain-community-platform/commit/305e4e8b5d7d02e1f0fbd75a9b1f70ba6ad80d1a), PR #165.
- Relevant existing persisted lifecycle test: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts`, “persists partial payments, updates the pledge and issues distinct receipts transactionally”.
- The GitHub connector returned no commit status records and no PR-triggered workflow runs for the observed merge commit. This is missing evidence, not a green CI result.

## Current item

- **In progress:** P0 auth/session UI — failed current-session refresh must clear authentication and remove protected content.
- **Branch:** `qa/session-refresh-expiry-redirect`.
- **Test:** `apps/flutter/test/widget_test.dart` — “redirects to login when a session refresh fails after expiry”. It asserts error/signed-out controller state, automatic login redirect, and absence of admin content.
- **Previous item:** [PR #173](https://github.com/JainCommunityPlatform/jain-community-platform/pull/173) merged as `9c8259cb2a9605b43404d519198d15b051eae070`; exact-head [CI #772](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38296287780) passed; post-merge [CI #773](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38296615312) pending final verification.
- **Current PR / CI:** not yet opened; exact-head CI pending.
- **Evidence boundary:** mocked session-service failure and Flutter router only; real Firebase token expiry/API authentication remain unverified.

## Exact next action

Verify post-merge CI #773 for PR #173, then open the focused PR for expired-session redirect. Inspect exact-head CI, fix failures rather than weakening assertions, merge only when all required checks pass, verify post-merge CI, update this checkpoint and issue #162, then continue auth/session restoration and offline/error cases. Keep Android build/upload manual/on-demand.
