# Bubbles AI skills and plugin catalog — 2026-10-22

The source asset `/bubbles-skill-catalog.json` contains **64** currently advertised ChatGPT plugin-skill metadata entries plus 7 separately classified Bubbles capabilities. This is a **reference catalog**, not a copy of ChatGPT's private runtime or its connectors. No source secrets, personal history or installed plugin tokens were exported.

## Execution boundary
- Bubbles tools remain backed by `workers/bubbles-tools`, existing owner Brain work tickets, `bubbles-memory.js`, and `workers/bubbles-connections`. Skill descriptions cannot execute API actions.
- Personal context in Bubbles uses its own wallet-scoped indexed transcript and user-authorized synapses. It cannot query ChatGPT's private personal_context or import chats without an explicit export/import.
- Image attachment already exists in `bubbles-ai.js`. Document/video attachments are listed as not connected until parser, durable upload, storage/privacy and end-to-end testing exist.
- GitHub and Cloudflare credentials belong in per-user, encrypted, revocable server-side connector vaults. Provider-native consent must approve actual scopes and repositories. Neither may use the platform owner's access for public users.
- Plugin settings expose authorization management, with a warning about service disruption on disconnect. Revoking provider access must actually invalidate pending actions.
- The prechat gate should show GitHub first and Cloudflare second, then collapse after server-verifying both. Until the Cloudflare OAuth client is configured and a real two-account pilot succeeds, **do not hard-block the functioning chat** merely for an unconfigured provider.
- Five-day ChatGPT↔Bubbles signed owner flow: see `docs/BUBBLES-GPT-CONNECTION.md`. Signed `assist/result` is separate from live owner-page consumption and APK control.
- Run `node --test test/bubbles-skill-catalog.test.mjs`. Passing source tests does not prove production deployment.

## Safe importer behavior
Re-run `skills__list` from an explicitly authorized developer session to refresh catalog metadata, review changes, and version the JSON in GitHub. The user-visible client must not auto-execute newly discovered skill definitions, import remote arbitrary JavaScript, or enlarge OAuth scopes. When an independent capability is implemented, change its state only after verifying backend receipt and end-to-end account isolation.
