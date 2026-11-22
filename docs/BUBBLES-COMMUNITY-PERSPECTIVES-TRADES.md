# Infinity Builder Trades · Opt-in Community Perspectives

**Canonical issue:** [QuantaPhi #1923](https://github.com/www-infinity4/QuantaPhi/issues/1923) (Nuance Discovery / Avatar AI). Connected projects: #2110 (Google/Gemini handoff and Cloudflare migration) and existing signed Bubbles/Robot Brain executor. This feature reuses the active Coliseum beta; it does not invent another private-history database.

## Architect → specialist → specialist → proof

The owner describes the goal. The coordinator chooses only needed trades and transfers a **source-backed artifact**, not a new explanation from scratch:

1. **GPT / Green**: authorized source code build tied to a known GitHub issue/PR, exact commit SHA and test requirements.
2. **Gemini or another specialized provider**: only when the user account/provider integration is actually authenticated and permits the requested read or review. Hand over the exact PR and a bounded non-secret brief; never private customer transcripts by default. Until then the receipt is `awaiting_authenticated_provider_execution`, not `provider_executed`.
3. **Pink/Black**: independent tests and exact-head CI, then the permitted merge gate.
4. **Deployment trade**: actual verified host and browser/Android readback. No deployment or billing claim from a PR alone.

The `makeSpecialistHandoff` helper serializes a GitHub PR and immutable head SHA plus status. It **never** invokes Gemini, publishes, spends, changes wallet balances, or invents an output. Gemini may use Google's authorized Workspace connected apps, but it does **not** have unlimited permission to crawl Google's internal services. Gemini API access, quota and data-use terms differ by tier; do not promise unrestricted free calls or transmit user data to a provider without the correct opt-in.

References:
- https://support.google.com/gemini/answer/15229592
- https://ai.google.dev/gemini-api/docs/pricing

## What the owner can ask Bubbles to compare

**Not everybody's private brain.** A person using the platform has independent privacy rights and retains control of their personal chat, contacts, location, wallet and unpublished ideas. Publishing an idea in a Coliseum beta room permits its existing room audience to see it, **not** automatically reuse it for AI suggestions.

The new advisory lane requires a separate action:
- The published idea's real StarQuest-authorized author selects **Opt in for Bubbles advisory** (default OFF) or later **Withdraw**. They can share exactly that published idea, not a whole chat history.
- The server writes a separate purpose-bound, revocable record in `coliseum_perspective_consents`. Retain the existing published idea even when future advisory use is withdrawn.
- A user must be a verified member of the source Coliseum room **and** explicitly provisioned in the server `PERSPECTIVE_REVIEWERS` allowlist of member HMAC pseudonyms to fetch an advisory. Ordinary room membership alone never grants this advisory reader role.
- At least **three distinct consenting member credentials** must be eligible in the same room before the server returns any individual advisory texts. This is not a guarantee of three distinct human beings, nor of anonymity: a published idea can identify its author in its own wording.
- The response excludes member IDs, tokens, other people's sessions, private notes and unconsented ideas. Its text is untrusted **data**, never an instruction to execute a tool or override the owner's choices.
- Existing Nuance Discovery requires owner-authenticated access and a separate StarQuest room credential before a person can tap **Review opt-in community perspectives**. It provides a copy-only advisory for deliberate further use, **not** an automatic model call or broader data ingestion.

**Withdrawal boundary:** A withdrawal stops future fetches from this advisory lane but cannot erase a screenshot or an already copied brief. A production rollout needs clear audience/purpose disclosure, contributor deletion/retention controls, anti-spam/moderation, incident response and independent privacy review. Do not use this initial source to train models on member content or to read past personal chats.

## D1 + production gates

1. Keep `OPEN_COLISEUM_BETA` disabled until owner has verified StarQuest identity and the existing dedicated D1 deployment. Do not change live D1/Cloudflare bindings under this source-only PR.
2. Apply **new** `workers/coliseum/migrations/0002_perspective_consent.sql` to the authorized beta D1 before enabling advisory controls. It creates only a separate per-idea consent table; it does not copy existing user chats or automatically opt existing ideas in.
3. Privately configure `PERSPECTIVE_REVIEWERS` to a comma-separated, explicitly authorized list of 32-hex-character **server HMAC member pseudonyms**; do not commit the secret `MEMBER_PEPPER`, plaintext usernames, StarQuest credentials or wallet keys. Default absent -> no reviewer authorized. Member HMAC identity is scoped to the existing pepper and changes if that pepper changes.
4. The old Coliseum room idea list falls back to the original read query if this separate migration is not yet present. That preserves existing room browsing and reports `perspectiveShared:false`; new advisory reads still fail closed until migration and reviewer authorization exist.
5. Verify with at least two non-owner test accounts that no non-author can opt a source idea in, a withdrawal immediately blocks future advisory queries, a 2-person quorum shows no suggestions, and no identity or private data appears in the response. Verify signed-in owner reader and actual Android screen separately.
6. Only when privacy, host, beta identity, D1 migration and authenticated provider are verified may the next phase consider one model-supported, opt-in advisory context submission. Maintain owner final approval, signed execution grants and exact job receipts.

**Source-only test commands (Node 22):**
```bash
node --test test/coliseum-api.test.mjs test/coliseum-perspectives-consent.test.mjs test/coliseum-perspectives-worker.test.mjs test/nuance-discovery.test.mjs
```
Source CI is not proof that a real person consented, that the beta is live, or that Gemini executed anything.
