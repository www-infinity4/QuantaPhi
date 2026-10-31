# Zeus 6.2 private Cloudflare conversation history

This feature archives the **actual Zeus Builder Bubbles iframe transcript**, not the public shared Coliseum room messages and not a simulated AI. The existing iframe keeps its local Chats list; Zeus adds a separate "Zeus · Cloud history and backup" section. Unlike Story Writer's currently device-local draft library, this feature requires a verified wallet and explicit Cloudflare-storage consent.

## Architecture

- The user opens /coliseum/ and chooses **Ask the Zeus builder (Bubbles AI)**.
- Inside the same-origin Bubbles iframe, the Zeus-only history module captures each persisted user/assistant turn from the existing transcript. Other embedded Bubbles assistants are unchanged.
- The owner of each archive is derived **server-side** from a live StarQuest device token verified against StarQuest Ledger. The username is HMAC-pseudonymized using the existing stable MEMBER_PEPPER. Never trust a profile or user ID from the browser.
- D1 `COLISEUM_DB` is authoritative. The additive migration `0002_zeus_private_history.sql` creates `zeus_threads` and `zeus_turns` with per-wallet composite keys.
- Private R2 `ZEUS_HISTORY_R2` receives a separate JSON object for every thread and every saved turn. No public R2 URLs or listing endpoints exist. The API reports `backedUp=false` if D1 succeeded but R2 failed, allowing a safe idempotent retry without deleting data.
- Private endpoints `/v1/private/zeus/threads` and `/v1/private/zeus/threads/{id}/messages` support idempotent POST and paged GET. All reads and writes require the current authenticated wallet; cross-origin POST requests are rejected.
- The archive supports new conversations, multiple devices on the **same verified wallet**, restoring a previous thread in the existing Zeus UI, JSON download of *all pages* of cloud history, and pausing new backups. There is no destructive delete action in Zeus cloud history.
- Messages contain text only. This does not back up voice recordings, attachments, Story Writer images, conversations from other AI services, or a full Android/WebView file-system snapshot. Data is private by authorization, **not end-to-end encrypted** from the operator.
- This feature is independent of the invited shared-room beta and of subscription billing. It does not grant paid AI access.

## Deployment prerequisites / release hold

1. Review the PR, source tests, Android viewport/browser tests, and privacy/consent wording. Ensure users can see backup success and recovery on a second verified account, and that two different accounts never see one another's conversations.
2. Apply `workers/coliseum/migrations/0001_coliseum.sql` if it has not been applied, followed by the additive `0002_zeus_private_history.sql` migration to the dedicated `infinity-coliseum` D1 database. **Do not drop or reset** this database or existing wallets.
3. Bind `COLISEUM_DB`, set a stable 32+-character **secret** `MEMBER_PEPPER` (never printed in logs, code, or browser), and bind a **private R2 bucket** as `ZEUS_HISTORY_R2`. Enable R2 backups only after access/storage policy review. Pepper rotation needs a migration plan because the pseudonym is the per-wallet archive key.
4. Deploy the Worker at `workers/coliseum/worker.mjs` bundled with both imports. Verify `/v1/health`, then that private history fails closed without verified credentials, and succeeds with R2 backup receipts. The public group beta still requires its separate explicit allowlist and `OPEN_COLISEUM_BETA` gate.
5. Publish the matching QuantaPhi website assets (the modified `bubbles-ai.js` and `coliseum/zeus-history-client.mjs`) in the same release window.
6. Test two real devices signed in to the same wallet; test a different wallet is isolated, and confirm an R2 outage leaves D1 data intact with an honest backup-pending notice. Test long conversations, pagination, reloads, login changes, explicit consent, and exported JSON.
7. Set R2 retention/versioning and recovery procedure appropriate to the operator's privacy commitments. D1 plus R2 on the same Cloudflare account provide **two storage copies**, not a geographically/account-independent disaster-recovery guarantee. Evaluate an independently controlled encrypted off-site backup separately.

**Do not claim deployment or historical conversations already restored based on committed source.** The automatic backup applies to Zeus conversations produced while this consented feature is running; older, device-only records require the user to enable upload in the original browser, and no external ChatGPT/Gemini histories are imported automatically.

## Verification

```sh
node --check workers/coliseum/zeus-history.mjs
node --check coliseum/zeus-history-client.mjs
node --check bubbles-ai.js
node --test test/zeus-history.test.mjs test/coliseum-api.test.mjs
```

Never put authentication credentials, transcript text, or R2 object content in public CI logs, GitHub issues, or PR descriptions.
