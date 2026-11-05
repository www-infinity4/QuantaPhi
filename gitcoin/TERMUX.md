# GIT Coin — Termux local SQLite collector (pending only)

This extends the draft GIT collector in QuantaPhi PR #1675. It **does not mint coins, make income, credit the Cloudflare wallet, or trade assets**. The SQLite database holds traceable metadata for each line claim without storing actual code text. Every line, including excluded lines such as a trivial `</a>`, gets a receipt. A candidate's preliminary `eligible` marker is not a verified award; Quant AI independently reviews useful, genuinely new code.

## Requirements

- Android Termux with `git`, `gh`, `node` (20+) and `python3` available. No npm packages, API keys purchased or external database are necessary for local storage.
- `gh auth status` succeeds and the target GitHub repo is accessible to the signed-in user. A commit must be pushed to that repo before scanning.
- The scanner's own QuantaPhi checkout is a separate tool directory. You may scan any locally cloned GitHub repository you are authorized to access.

## Termux commands

```bash
cd ~
git clone --depth 1 --branch feat/gitcoin-termux-sqlite-20261104 https://github.com/www-infinity4/QuantaPhi.git quantaphi-gitcoin
python3 ~/quantaphi-gitcoin/gitcoin/termux-ledger.py scan --worktree ~/my-repo --repo YOUR_GITHUB/my-repo --intent website --builder human
python3 ~/quantaphi-gitcoin/gitcoin/termux-ledger.py balance
```

Replace `~/my-repo` and `YOUR_GITHUB/my-repo` with your own clone and repo. To scan a different commit pass `--commit SHA`; to label the build intent use `website`, `app`, `repair`, `test`, `integration`, `data`, or `other`. A `--builder bubbles` or `--builder gpt` value is an **unverified claim** until separately signed agent-job evidence and the user-approved recipient grant are confirmed. Never collect the user's work as an operator payment unless that consent exists.

SQLite location: `~/.quantaphi/gitcoin/receipts.sqlite3`. It contains only IDs, hashes, path/line, repo/commit, builder claim, preliminary status and remote GitHub existence check. Local directory and database are permission restricted. The script checks the local Git origin matches `--repo`, verifies the pushed commit through authenticated `gh api`, uses the existing `gh-gitcoin.mjs` collector to calculate provenance, checks all receipt hashes and classification totals, and inserts each line at most once.

`balance` deliberately prints `settled_gits: 0` and `verified_wallet_balance: null`. Real issuance would require a verified commit on the repo's default branch, passing CI, Quant AI quality review, independent author/agent attribution, authenticated customer-beneficiary consent, and an idempotent owner-scoped Cloudflare D1 wallet transaction. Neither the local database nor client JavaScript may award a spendable coin.

## Bubbles integration boundary

`agent-attribution.mjs` stages a **pending** owner/operator allocation only when customer consent, signed Bubbles job evidence, and the destination wallet are independently checked by the backend and all IDs agree. No current Bubbles/Wallet endpoint is connected by this change. The existing `gitcoin/verification.mjs` is still responsible for independent source/CI/Quant AI verification; an authorized server later settles to the isolated `gitcoin_awards` D1 table. User-owned source and code-sharing rights remain with their lawful holders unless they separately agree otherwise.

## Verification

```bash
python3 -m unittest discover -s test -p 'test_termux_ledger.py'
node --test test/gitcoin-agent-attribution.test.mjs test/gitcoin-entry.test.mjs
```

See `gitcoin.html` for a readable public QuantaPhi entry page. The global GIT marketplace, IBM/tech vendor acceptance, GPT third-party settlement and deployed wallet balance integrations are **not** claimed or enabled. Gitcoin's existing GTC token is a separate product.