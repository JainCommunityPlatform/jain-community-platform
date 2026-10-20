# JCP Autonomous QA Checkpoint

## Current checkpoint — 20 October 2026

- **Latest master:** [CI #39357376815](https://github.com/JainCommunityPlatform/jain-community-platform/actions/runs/39357376815) passed repository validation, Flutter analysis/tests, backend lint/unit/integration/Firestore-emulator/build, and merge gate on `42f889762a53df4f969f5eea17bc042e0df3a1bb`. Android AAB skipped by design.
- **Recently merged:** [PR #273](https://github.com/JainCommunityPlatform/jain-community-platform/pull/273) stale asynchronous session restoration/refresh race matrix; [PR #272](https://github.com/JainCommunityPlatform/jain-community-platform/pull/272) grouped HTTP DTO validation; [PR #271](https://github.com/JainCommunityPlatform/jain-community-platform/pull/271) connected website publish/reload; [PR #270](https://github.com/JainCommunityPlatform/jain-community-platform/pull/270) connected profile save/reload; [PR #268](https://github.com/JainCommunityPlatform/jain-community-platform/pull/268) persisted notification read-state/tenant isolation; and [PR #266](https://github.com/JainCommunityPlatform/jain-community-platform/pull/266) connected donation payment lifecycle.
- **Current branch:** `qa/p1-public-directory-tenant-routing-security-batch` groups public directory allowlist/inactive filtering, anonymous public directory and website API reads, hostname-over-header precedence, and resolver fallback rejection for known inactive/unverified hostnames.
- **Evidence boundary:** API and fake-Firestore unit tests do not establish live Firestore production behavior, real custom-domain DNS/TLS routing, public media reachability, or device rendering. Those remain separate environment gates.
- **Acceptance gate:** inspect exact-head CI; repair actual failures without weakening assertions; merge only if all required checks pass and the PR is mergeable; independently verify post-merge CI. Keep Android AAB manual/on-demand.

