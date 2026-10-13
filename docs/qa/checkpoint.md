# JCP Autonomous QA Checkpoint

Date: 13 October 2026  
Repository: [JainCommunityPlatform/jain-community-platform](https://github.com/JainCommunityPlatform/jain-community-platform)

## Latest merged change — post-merge gate is red

- **Merged:** [PR #175 — initial session restoration failure](https://github.com/JainCommunityPlatform/jain-community-platform/pull/175), merge commit [6c5a703afa1bf7d6bb2c4a902275ad05a6996008](https://github.com/JainCommunityPlatform/jain-community-platform/commit/6c5a703afa1bf7d6bb2c4a902275ad05a6996008).
- **Exact PR-head CI:** [run #778](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38304250367) passed all applicable required jobs on the PR head. Android AAB was skipped by design.
- **Post-merge default-branch CI:** [run #779](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/38323486041) completed with **failure** on the merge commit. Flutter analyze/tests and repository validation passed. Backend lint and unit tests passed; the Firestore emulator integration job failed, so backend build was skipped and the merge gate failed. Android AAB remained skipped as intended.
- **Root cause from job log:** the existing emulator test `allows only one concurrent approval of a refund and creates one approval notification` exceeded Jest's default 5,000 ms per-test timeout. The same test passed in PR-head CI #778 in 3,210 ms; neighboring emulator concurrency tests also take about 3 seconds. The pledge idempotency regression passed in #779. This is consistent with emulator contention/test timeout sensitivity; no failed financial assertion was reported.
- **Fix in this branch:** adds an explicit 15-second timeout to this one emulator-heavy concurrency test. All outcome, persisted-balance, single-notification, and single-winner assertions remain unchanged. Exact-head CI must prove the fix.
- **Evidence boundary:** Firestore emulator only; no production Firebase or staging behavior is claimed.

## Next action

Open a focused PR for the timeout fix, inspect every exact-head CI job, repair any genuine failure without weakening functional assertions, and merge only when all required checks are green and the PR is mergeable. Then verify the push-triggered default-branch run through the Actions API. Keep Android build/upload manual/on-demand. Once the post-merge baseline is green, resume the next highest-priority uncovered P0 from the coverage inventory.
