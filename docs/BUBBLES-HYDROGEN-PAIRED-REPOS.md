# Bubbles Hydrogen — two-repository planning handoff

Status: **proposal only**. Do not mark the two GitHub repositories, files, workflows, or electron link as created until GitHub returns readback/commit receipts.

## Owner's intent

Populate a Bubbles hydrogen repository with actual files and a GPT-expanded engineering plan. Link two GitHub repositories so each independently checks the state of the other, like two representations of the same conceptual electron. This is an **information-system analogy**, not an experimentally verified claim about electrons, hydrogen, time travel or physics.

## Resolve targets before writing

1. Bubbles lists repositories with its **authenticated read-only** `list_repositories` adapter.
2. The owner chooses **exactly two complete** `www-infinity4/<repo>` paths; Bubbles must not replace an unknown hydrogen repository with QuantaPhi merely because the word "Bubbles" occurs.
3. A read of both repositories confirms access and current default-branch state. A GitHub token must remain server-side and the existing owner grant must be checked at each write.
4. If one repository is missing, ask whether it should be created. Naming a hypothetical repository is not permission to create it.

## Proposed contents of each repository

- `README.md`: the distinct purpose of this repository, link to the other repo and setup instructions.
- `docs/PLAN.md`: GPT-expanded requirements, milestones, dependencies, acceptance criteria and unresolved scientific or technical assumptions.
- `data/electron-link.json`: schema-versioned conceptual peer record, identical `pairId` in both repos, the counterpart repository name and the agreed `stateHash` if a shared immutable payload is specified; never credentials or personal information.
- `schemas/electron-link.schema.json`: type and version validation.
- `scripts/check-peer.mjs`: read-only GitHub API comparison that verifies `pairId`, peer reciprocity, version and expected content hash, and emits a concise result. Fail clearly when the peer is inaccessible rather than claiming a mismatch.
- `test/check-peer.test.mjs`: isolated fixtures for matching, missing, changed, mismatched, unauthorized and malformed peer states.
- `.github/workflows/check-peer.yml`: bounded schedule and manual execution for the read-only peer check, uploading a diagnostic receipt. It must avoid recursive cross-repository writes or notification storms.

## Work sequence and receipts

1. **Yellow** reads existing source and writes a dependency-aware plan for both repositories. A plan is not a file write.
2. **Blue** proposes a minimal schema and documented bidirectional relationship.
3. **Green** builds files in separate feature branches (one per repo), preserving existing contents; opens PRs.
4. **Pink** tests schema consistency, reciprocal links, inaccessible/missing peer handling, deduplication and the no-infinite-loop rule.
5. **Purple** reviews actual PRs, CI runs and commits. Report merges and deployments only with independent receipts.

## Bubbles conversation requirements

- For `list my GitHub repositories`, run the authenticated inventory and speak its verified summary in English.
- For `populate these two repositories with files and make a GPT plan`, check that the two repo names are unambiguous and owner-authorized; queue two tracked jobs only then.
- If target names are missing, respond in natural English with the **one missing decision** and keep the user's project request in context.
- Never display `{"tool":"github","action":"list_repos"}` as if it were execution.
- Distinguish *planned*, *queued*, *commit created*, *test passed*, and *deployed* using verified artifacts.

## Acceptance criteria

- Both target repo names explicitly confirmed; no writes to an unrelated QuantaPhi default.
- Identical shared pair ID and reciprocal peer paths verified against GitHub readback.
- Read-only watcher in each repository detects real differences and never writes to its peer.
- Unit tests pass with simulated and authorized read-only fixtures.
- Two actual PR/commit receipts and subsequent CI checks, with no secrets printed.
- Bubbles speaks short English status messages and provides a human-readable report in chat.
