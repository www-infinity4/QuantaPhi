# QuantaPhi Second Brain — local Obsidian adapter

**Scope:** source-tested pilot for [issue #1941](https://github.com/www-infinity4/QuantaPhi/issues/1941). This is a portable Markdown index of public QuantaPhi work tickets, **not** a replacement for the signed Moltnook runner, owner-scoped Oracle Synapse memory, Continuity Builder, or ChatGPT conversation history.

## All repositories from the X post: one foundation + six supporting

Original post: https://x.com/danikkk_wqs/status/2122050763555774945

| Role | Verified upstream | Existing account fork, verified 2026-11-15 CT | How to use |
| --- | --- | --- | --- |
| **Foundation** | [kepano/kepano-obsidian](https://github.com/kepano/kepano-obsidian) | [www-infinity4/kepano-obsidian](https://github.com/www-infinity4/kepano-obsidian) (fork verified) | Starter Markdown vault |
| **1. Skills** | [obsidianmd/obsidian-skills](https://github.com/obsidianmd/obsidian-skills) (formerly linked under kepano) | [www-infinity4/obsidian-skills](https://github.com/www-infinity4/obsidian-skills) (fork verified) | Formats and skills for authorized agents |
| **2. Wiki** | [Ar9av/obsidian-wiki](https://github.com/Ar9av/obsidian-wiki) | No matching owner fork verified | Evaluate source-backed note creation |
| **3. Templates** | [groepl/Obsidian-Templates](https://github.com/groepl/Obsidian-Templates) | No matching owner fork verified | Use selected Zettelkasten templates; review plugin/content licenses |
| **4. Gardens** | [MaggieAppleton/digital-gardeners](https://github.com/MaggieAppleton/digital-gardeners) | No matching owner fork verified | Study public knowledge gardens; reference library, not an agent runtime |
| **5. Canvas** | [obsidianmd/jsoncanvas](https://github.com/obsidianmd/jsoncanvas) | No matching owner fork verified | Documented JSON Canvas format for diagrams |
| **6. Plugin directory** | [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases) | No matching owner fork verified | Official plugin/theme index, not itself a plugin to install |

**Separate, optional project not counted in the six:** [eugeniughelbur/obsidian-second-brain](https://github.com/eugeniughelbur/obsidian-second-brain); [your fork](https://github.com/www-infinity4/obsidian-second-brain) exists. Its commands and memory architecture need compatibility and permissions review before execution. Your older [www-infinity4/Obsidian](https://github.com/www-infinity4/Obsidian) exists independently and is not a fork of the post's upstream projects.

**Recommendation:** Use the already-forked foundation and skills in this first release. Evaluate the wiki and selected templates next. Link to the gardens, Canvas spec and plugin catalog without mass-forking or mixing their source trees; these are references, not missing runnable services. Existing forks do not imply code has been installed, integrated, executed or deployed.

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