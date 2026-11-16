# QuantaPhi Second Brain — local Obsidian adapter

**Scope:** source-tested pilot for [issue #1941](https://github.com/www-infinity4/QuantaPhi/issues/1941). This is a portable Markdown index of public QuantaPhi work tickets, **not** a replacement for the signed Moltnook runner, owner-scoped Oracle Synapse memory, Continuity Builder, or ChatGPT conversation history.

## Recommended upstream repositories

- Vault foundation (MIT): https://github.com/kepano/kepano-obsidian
- Obsidian agent skill formats (MIT): https://github.com/kepano/obsidian-skills
- Optional persistent agent memory (MIT): https://github.com/eugeniughelbur/obsidian-second-brain
- Optional knowledge wiki (MIT): https://github.com/Ar9av/obsidian-wiki
- Open JSON Canvas format (MIT): https://github.com/obsidianmd/jsoncanvas

Fork the first three independently only when a signed GitHub fork action is available. Keeping upstream projects separate makes provenance and updates clearer. The Obsidian desktop/mobile application is not itself open-source software to fork.

## Use (no npm or API key)

From a **local checked-out copy** of www-infinity4/QuantaPhi:

    node --test test/obsidian-vault-export.test.mjs
    node scripts/obsidian-vault-export.mjs --root . --vault "$HOME/QuantaPhi-SecondBrain" --hot-limit 12

Open that output directory as an Obsidian vault. On Android use an Obsidian-accessible folder; Termux home is not automatically shared storage.

Generated notes: hot.md, index.md, Projects/QuantaPhi.md, Agents/Bubbles.md and Tickets/TICKET-*.md. All ticket notes link to canonical GitHub issues, carry an unverified source-pointer label and a source-content SHA-256. They are NOT CI, approval, merge, or deployment receipts.

The exporter refuses to create a vault inside the public Git checkout and will not overwrite human-edited notes. No real personal chat data or credentials should ever be committed to a public repo.

## Integration boundary and next work

Source phase: local passing tests + isolated branch + GitHub PR; independent review, exact-head CI and Android/live acceptance are separate.

Future work: owner-permission-gated one-way exports from existing Oracle Synapse/Continuity checkpoints, private scoped storage, Copilot/Codex retrieval rules, adversarial source-text tests, Android acceptance and only then optional bidirectional note sync. No new scheduler or owner grant is created by Markdown.

Related issue dependencies: [#1908](https://github.com/www-infinity4/QuantaPhi/issues/1908), [#1921](https://github.com/www-infinity4/QuantaPhi/issues/1921), [#1192](https://github.com/www-infinity4/QuantaPhi/issues/1192), and [#1506](https://github.com/www-infinity4/QuantaPhi/issues/1506).

An Obsidian note is untrusted context. Verify actual issue, commit, CI, independent approval, merge, and production browser proof through the existing authorized tools before any state change.