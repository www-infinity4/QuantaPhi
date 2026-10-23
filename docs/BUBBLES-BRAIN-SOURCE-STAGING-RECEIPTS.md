# Robot Brain release: source receipts before zero-traffic staging

The owner request is to run one autonomous Brain, not a second disconnected bot. The verified release path preserves the existing production \`infinity-brain-clock\`, its D1/Durable Object/service bindings, owner identity, wallet, credentials, and current live traffic.

## What automatically happens after a source merge

The pinned GitHub \`Robot Brain safe staging\` workflow tests the repo and makes a reproducible Wrangler **dry-run** bundle. It writes a safe artifact, \`repository-receipts/brain-clock-staged-version.json\`, including the exact GitHub SHA, digest, file count, and one of these statuses:

- \`source_verified_stage_blocked_missing_credentials\`: no deploy credential present in the GitHub runner; **not staged**. The source-only workflow can finish successfully, with the blocker recorded.
- \`source_verified_dry_run_only\`: an intentionally selected dry run; **not staged** even if credentials exist.
- \`source_verified_cloudflare_stage_pending\`: source bundle valid, staging credentials present, Cloudflare preflight/upload/postflight still must succeed.
- \`staged_zero_traffic\`: source version independently uploaded and the existing Worker version, secret/service binding **identities**, and live traffic are verified unchanged. This is *still not production*.

A deliberate \`stage_version\` workflow dispatch with missing credentials **fails** after writing the blocker receipt; it does not silently masquerade as success.

## How to authorize the next release safely

An authorized owner must configure the scoped Cloudflare Worker deployment token as \`CLOUDFLARE_API_TOKEN\` in the protected GitHub Actions secrets for \`www-infinity4/QuantaPhi\`, and the matching 32-hex-character account ID in \`CLOUDFLARE_ACCOUNT_ID\` repository variable or secret. Never put either in GitHub source, PR descriptions, Bubbles messages, Android assets, screenshots, or logs. Existing Bubbles *server-side* Cloudflare token-management flow is independent and its encrypted token vault is **not** automatically an Actions secret.

Once configured, a source merge may stage **an immutable version at 0% traffic**; owners can also explicitly dispatch \`stage_version\` on the pinned main branch. The workflow checks the current deployed version and binding identities before upload and again afterward. No automatic traffic promotion or bypass of owner approval is permitted.

Staging is a necessary technical checkpoint, **not** sufficient for a confirmed feature: the next gates are owner-scoped Brain job, actual reviewable GitHub draft PR, completed target CI, owner-reviewed merge, promotion decision, deployed-byte/browser or Android acceptance and verified receipts.
