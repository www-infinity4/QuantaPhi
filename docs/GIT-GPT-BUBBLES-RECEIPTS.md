# Quant AI: one-line GIT transfer and agent iteration receipts

Owner-requested contract (November 4, 2026). This is a proposed asset workflow, **not a deployed wallet or an existing cash balance**.

## One GIT is not permission to export a whole file

For `www-infinity4/Moltnook/guestbook/index.html`, a grant for line 13 returns only the literal line 13. A grant for line 15 returns only line 15. A recipient cannot escalate a line-13 grant to line 14, line 15, or the entire file. A source line naming Moltnook provides discoverable context, but does not contain the Moltnook site. Link access to a public repository is separate from Quant AI's restricted transfer permission. The same protection matters especially for private repositories.

The **server-only** module `quantai/line-transfer.mjs` exports `issueLineGrant` and `exportPermittedLine`. It signs the permitted repository, immutable commit SHA, file path, single 1-based line, recipient and expiration with HMAC-SHA256. The recipient receives one line of UTF-8 source, without the file or neighboring lines. Only the trusted backend may hold the signing key and source. Authorize the requester *before* issuing a grant; fetch source at the immutable commit, not a moving `main` branch; transport and store receipts securely. Revocation, quotas, ownership, licensing and confidentiality reviews remain integration requirements. This component does not prevent the recipient from independently browsing code in a public repository.

The output is a **code snippet**, not transferable ownership of original authorship, a legal license, a cash-value claim or an automatic GIT payment. One verified added line can be a candidate for 1 GIT under the separate quality policy. Boilerplate, copied code and closing tags do not automatically earn units simply because they exist in a file.

## Three independent transaction ledgers

| Unit | Recorded event | Verification | Intended beneficiary | Not enough on its own |
| --- | --- | --- | --- | --- |
| GIT | Newly added, qualifying source line in a GitHub commit | Signed task attribution, immutable diff, unique repo/commit/path/line/hash receipt, tests and Quant AI quality gate | Explicitly authorized human or agent/provider-linked wallet; Bubbles owner allocation requires signed owner instruction and verified mapping | A UI click, line read, unsourced pasted snippet or duplicate code |
| GPT Coin | A genuinely executed GPT tool/workflow iteration | Provider-authorized, uniquely identified tool result and policy-approved settlement | Account configured by provider and customer agreement | Hidden reasoning step, token count, model prose or a fake progress ticker |
| Bubble Bit | A genuinely executed Bubbles iteration specified by user criteria | Server-origin tool receipt and job/session attribution, independently verified for settlement | Requested customer/owner wallet according to the explicit reward rule | A periodic heartbeat, browser-only status, retries, duplicate receipts or narration |

A single job can contain many Bubble Bits and many lines eligible for GIT, but the events are **different**. GPT Coin and Bubble Bits count user-observable actions with distinct receipt identities; neither is literally a private chain-of-thought token. A GitHub push is only a proposed GIT candidate until the source line is attributed, checked, committed, and accepted. A deploy/test/search is an iteration event, not a GIT-producing source line unless it also adds independently verified eligible code.

## Bubbles as executor: a proposed receipt pipeline

1. Owner authorizes a specific project task and its beneficiary policy; Brain records the session, task and permissions.
2. Bubbles emits truthful per-step lifecycle (`started`/`completed`/`failed`) into the existing small live iteration display; receipts are unique, scoped to a verified session and persist server-side.
3. Authenticated GitHub work produces a commit; GIT collector records each new line as a pending candidate; the Quant AI quality gate independently approves or rejects it.
4. Ledger applies **exactly-once** settlement to separately named GIT, GPT Coin and Bubble Bit balances, preserving pending/rejected/settled status and the source receipts. Do not treat pending as settled income or cash.
5. The wallet shows separate totals and evidence links, with the owner-recipient authorization for Bubbles credited as executor. Reporting back to the same chat is required for claimed success.

**Integration status (November 4, 2026):** `bubbles-live-iteration-feed.mjs` displays observed iterations but no wallet credits. Draft QuantaPhi PR #1675 adds GIT line-claim and verification scaffolding, not live issuance. This PR introduces a testable *source-export restriction only*. It does not bind Cloudflare D1, authorize third-party recipients, deploy a Worker, issue coins or modify wallet balances.

## Verification

Run without npm dependencies: `node --check quantai/line-transfer.mjs && node --test test/quantai-line-transfer.test.mjs`. Targeted unit tests assert one-line isolation, separate line 15 grant, denied adjacent lines, tamper/replay-to-other-scope rejection, expired grants and invalid line indices.
