# JCP Autonomous QA Checkpoint

Date: 12 October 2026
Repository: [JainCommunityPlatform/jain-community-platform](https://github.com/JainCommunityPlatform/jain-community-platform)

## Last durable baseline

- Control tower: [issue #162](https://github.com/JainCommunityPlatform/jain-community-platform/issues/162) (closed in GitHub, but the inventory explicitly remains incomplete; do not interpret closure as programme completion).
- Latest observed default-branch merge: [commit 305e4e8](https://github.com/JainCommunityPlatform/jain-community-platform/commit/305e4e8b5d7d02e1f0fbd75a9b1f70ba6ad80d1a), PR #165.
- Relevant existing persisted lifecycle test: `apps/api/src/database/firestore.service.firestore-emulator-spec.ts`, “persists partial payments, updates the pledge and issues distinct receipts transactionally”.
- The GitHub connector returned no commit status records and no PR-triggered workflow runs for the observed merge commit. This is missing evidence, not a green CI result.

## Current item

- **In progress:** restore green default-branch CI after a Firestore emulator concurrency failure.
- **Branch:** `qa/firestore-pledge-idempotency-race`.
- **Failure evidence:** post-merge [CI #765](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38293792926) failed in `deduplicates concurrent pledge creation with the same idempotency key` with `3 INVALID_ARGUMENT: Transaction is invalid or closed` (41 passed, 1 failed).
- **Fix:** re-read the deterministic pledge after a transaction error and return the matching committed pledge if found; retry only the specific closed-transaction error with a strict cap. The concurrency test itself is not weakened.
- **Current PR / CI:** hotfix PR not yet opened; exact-head CI pending.
- **Evidence boundary:** Firestore emulator only; this does not claim production/staging concurrency verification.

## Exact next action

Open the focused hotfix PR, monitor exact-head backend/emulator CI, inspect and fix any remaining failures, merge only if all required checks pass, verify post-merge CI until green, update issue #162 and this checkpoint, then resume the pending auth/session route-refresh work. Keep Android build/upload manual/on-demand.
