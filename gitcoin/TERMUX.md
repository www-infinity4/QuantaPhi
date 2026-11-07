# GIT Coin — Termux local SQLite collector (pending only)

This extends the draft GIT collector in QuantaPhi PR #1675. It **does not mint coins, make income, credit the Cloudflare wallet, or trade assets**. The SQLite database holds traceable metadata for each line claim without storing actual code text. Every line, including excluded lines such as a trivial `</a>`, gets a receipt. A candidate's preliminary `eligible` marker is not a verified award; Quant AI independently reviews useful, genuinely new code.

## Requirements

- Android Termux with `git`, `gh`, `node` (20+) and `python3` available. No npm packages, API keys purchased or external database are necessary for local storage.
- `gh auth status` succeeds and the target GitHub repo is accessible to the signed-in user. A commit must be pushed to that repo before scanning.
- The scanner's own QuantaPhi checkout is a separate tool directory. You may scan any locally cloned GitHub repository you are authorized to access.

## Termux commands

```bash
cd ~
git clone --depth 1 --branch feat/gitcoin-termux-serial-card-20261107 https://github.com/www-infinity4/QuantaPhi.git quantaphi-gitcoin
python3 ~/quantaphi-gitcoin/gitcoin/termux-ledger.py scan --worktree ~/my-repo --repo YOUR_GITHUB/my-repo --intent website --builder human
python3 ~/quantaphi-gitcoin/gitcoin/termux-ledger.py balance
python3 ~/quantaphi-gitcoin/gitcoin/termux-ledger.py receipts
```

Replace `~/my-repo` and `YOUR_GITHUB/my-repo` with your own clone and repo. To scan a different commit pass `--commit SHA`; to label the build intent use `website`, `app`, `repair`, `test`, `integration`, `data`, or `other`. A `--builder bubbles` or `--builder gpt` value is an **unverified claim** until separately signed agent-job evidence and the user-approved recipient grant are confirmed. Never collect the user's work as an operator payment unless that consent exists.

SQLite location: `~/.quantaphi/gitcoin/receipts.sqlite3`. It contains only IDs, hashes, path/line, repo/commit, builder claim, preliminary status and remote GitHub existence check. Local directory and database are permission restricted. A scan also reads the authenticated collector from `gh api user` and binds that login immutably to the locally stored pending receipts. This does not establish Git commit authorship. Each locally unique `GIT-P-<64 character receipt hash>` is a pending reference, not a minted coin serial. The authoritative shared server ledger assigns `GIT-000000000001`-style global award serials only after verified acceptance and authorized wallet settlement. The script checks the local Git origin matches `--repo`, verifies the pushed commit through authenticated `gh api`, uses the existing `gh-gitcoin.mjs` collector to calculate provenance, checks all receipt hashes and classification totals, and inserts each line at most once.

`balance` deliberately prints `settled_gits: 0` and `verified_wallet_balance: null`. Real issuance would require a verified commit on the repo's default branch, passing CI, Quant AI quality review, independent author/agent attribution, authenticated customer-beneficiary consent, and an idempotent owner-scoped Cloudflare D1 wallet transaction. Neither the local database nor client JavaScript may award a spendable coin.

## Copyable QuantaPhi GIT card

The owner's GIT Coin quick card is now staged in the QuantaPhi Oracle carousel as `gitcoinQuickCard` (deep link `/?card=gitcoin`), with a matching guide at `/gitcoin.html`. Both offer **Copy for Termux** and **Copy for AI**. Users enter their own `owner/repo`; scripts clone the collector to `~/quantaphi-gitcoin`, clone the user-owned repository to `~/gitcoin-workspaces/owner/repo`, then scan and display pending SQLite totals and locally serialized receipts. The setup installs standard Termux packages and uses the user's own `gh auth status`; it never asks users to paste personal access tokens into an AI chat.

The copy payload is created locally by `gitcoin/setup-snippets.mjs`, with no browser API or account tokens sent anywhere. The commands collect provisional GIT line receipts but **do not award a spendable currency**. Each source line may receive an evidence receipt including lines with no immediate economic usefulness. Quality review and issuance are separate from collection.

**Provider distinction:** GPT Coin is an optional third-party/provider-issued asset design, not a QuantaPhi-minted currency. Users can construct their own local proof records, but those are not official GPT-issued coins. A GPT-provided opt-in issuer and independently authenticated importer would be prerequisites for legitimate provider-issued credits. Bubbles Bits remain QuantaPhi's separate user-criteria-specific, verifiable tool-iteration units; the browser's iteration display must not imply backend wallet minting.

## Bubbles integration boundary

`agent-attribution.mjs` stages a **pending** owner/operator allocation only when customer consent, signed Bubbles job evidence, and the destination wallet are independently checked by the backend and all IDs agree. No current Bubbles/Wallet endpoint is connected by this change. Bubbles-generated eligible code earns 1 GIT per independently verified new accepted code line for the verified Bubbles owner/executor wallet, with the requesting user retained separately in the award ledger; merely running code earns no GIT. The existing `gitcoin/verification.mjs` is still responsible for independent source/CI/Quant AI verification; an authorized server later settles to the isolated `gitcoin_awards` D1 table. User-owned source and code-sharing rights remain with their lawful holders unless they separately agree otherwise.

## Verification

```bash
python3 -m unittest discover -s test -p 'test_termux_ledger.py'
node --test test/gitcoin-agent-attribution.test.mjs test/gitcoin-entry.test.mjs test/gitcoin-setup-snippets.test.mjs test/gitcoin-card.test.mjs test/gitcoin-carousel.test.mjs
```

See `gitcoin.html` for a readable public QuantaPhi entry page. The global GIT marketplace, IBM/tech vendor acceptance, GPT third-party settlement and deployed wallet balance integrations are **not** claimed or enabled. Gitcoin's existing GTC token is a separate product.