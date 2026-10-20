# Oracle Synapse Memory — Bubbles phase 1

## Purpose

Keep Bubbles' private conversation archive and tool receipts useful across its Android and website interfaces. A repo and category are **context labels**, not a claim that the assistant has personally understood, verified or independently executed something.

The model can retrieve a concept because it came from a particular project, such as a Radio/Clubhouse repository about audio hardware, and follow links to related Android playback engineering. This supports structured contextual retrieval; it does not create consciousness or guarantee that Bubbles knows who is speaking.

## Architecture

- **Verified identity:** Brain owner authorization must succeed on each surface. Chrome cookies do not travel into Android WebView. Never copy a cookie, SSH key, token, or OAuth credential into chat messages or a public repository.
- **Durable conversations:** `bubbles_messages`, `bubbles_sessions` and `bubbles_session_messages` reside in the existing private Cloudflare D1 database. Old messages that lack session identifiers enter a clearly labeled `legacy-history` folder, without reconstructing imaginary session boundaries.
- **Concept regions:** `bubbles_synapse_nodes` stores owner, repository reference, category, title, summary and provenance pointer. `bubbles_synapse_edges` connects nodes with typed relations `related`, `supports`, `contradicts`, `evolves`, `depends-on` and `part-of`.
- **Separation:** The repositories themselves remain code/source repositories. Owner-private concepts are *not* committed into public GitHub files. Repo names are retrieval scopes only, not authorization.
- **Meaning:** Category inference is deliberately weak. The Radio/Clubhouse label defaults to `audio-electronics`, QuantaPhi/CodePhi to `software`, and other names to `general`, unless the owner explicitly supplies a category. Inference is metadata, not verified truth.
- **Owner control:** `synapse-save` and `synapse-link` require `confirmed:true` from an owner-authorized client and pass strict identifier/size/schema checks. `synapse-query` returns bounded owner-scoped nodes and links. Do not wire arbitrary model tool output directly to a save or link operation.
- **Evidence:** Notes have a source pointer such as `conversation:chat_...` or `repository:owner/repo/path`; this lets Bubbles distinguish a requested feature from a tested and deployed one. The graph does not automatically promote an AI answer into an owner instruction.
- **No unexpected interfaces:** These capabilities belong behind natural conversation. Do not add a standalone memory dashboard or a dozen new launcher buttons.

## Voice audience context

The existing Android Vosk recognition path remains hands-free, with a visible foreground microphone notification and manual mute/stop. A conservative local audience filter now ignores a few clear phrases directed at dogs (such as “sit,” “good dog,” and “leave it”) before they can invoke tools. Explicit “Bubbles, ...” requests always pass. This is **not** speaker recognition; acoustic diarization, voice enrollment and multi-speaker evaluation remain unimplemented. Do not claim personal voice recognition or guaranteed protection against nearby speech.

## Verification and rollout

A CI pass validates code paths and SQLite/JavaScript/JVM regressions. It does **not** mean a real Motorola APK, signed-in website, GitHub tool, or Cloudflare Browser session responded. Deploy the Brain Worker after verified checks, test paired browser and APK sessions under the same owner, confirm new and old chats in History, and separately run real cloud-browser read-only probes with current consent. Each step needs a receipt.

The five-day ChatGPT-to-Bubbles bridge is a separately consented interaction channel. A queued request is not a completed conversation; blocked/expired requests must not be replayed automatically.
