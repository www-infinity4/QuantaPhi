# QuantaPhi · Work Control & Evidence Ledger

**Standalone coordination dashboard. It has not been installed on quantaphi.org and does not modify repositories.**

A responsive, Oracle Octaves-inspired Android-first control room for Bubbles, Robot Brain, Copilot and QuantaPhi repository work. Start with five local work-ticket scopes: Bubbles tool routing, Follow persistence, neutral carousel copy, Image Studio quality, and Continuity Builder drift.

## Open and use

- Upload all files in this directory to a **new preview site** or Cloudflare Pages static project; do not overwrite the live QuantaPhi homepage by accident.
- To test locally: `python3 -m http.server 8080` in this folder, then open `http://localhost:8080`.
- No npm, backend, API key, sign-in, payment service, or editor permission is required.
- Work tickets and manually entered evidence persist to this browser's `localStorage`. Export the workspace JSON for backup or transfer. This is not durable multi-device or tamper-proof storage.
- Use **Repository radar → Read open PRs** for public QuantaPhi, Moltnook and continuity PR lists. You can track one in a local ticket without creating a GitHub issue. Open a ticket, enter an existing GitHub PR number, then select **Inspect public GitHub (GET only)** to perform live read-only pulls of source head, changed files, check runs, statuses, independent reviews and merge receipt. Private repositories and GitHub rate limits may prevent inspection. A public API snapshot only lasts for the current session; recheck the exact source head after any changes.

## Evidence / claim restrictions

- **Proposed** means ticketed only.
- **Source** can be confirmed only from actual public GitHub PR head and file listing.
- **Tests** entered manually are **recorded** only until externally corroborated.
- **Exact-head CI** means all retrieved GitHub checks completed successfully at the observed exact PR head, **not** a guarantee all branch-protection-required checks were checked.
- **Independent review** is a GitHub approved review from a different username bound to the exact observed commit. Approval is not merge authorization.
- **Merge** comes from GitHub's `merged_at` and merge SHA; never implies Cloudflare.
- **Deployment / browser / Android** manual receipts remain unverified because this page does not have a signed Cloudflare or actual-device verifier. It never displays completion solely from linked URLs or a model response.
- **Import** resets any earlier GitHub observations to unverified. The page never calls a GitHub/Cloudflare write API, never merges, never grants tool access, never mints wallet credits and never deploys.

### Production integration note

To embed on QuantaPhi, first select an existing issue/PR, inspect source and current security boundaries. The safe path would be an independently authorized read-only server adapter returning signed, scoped observations, not a front-end request for Cloudflare secrets. Require versioned work tickets, GitHub PR events at the correct head, required-check verification, reviewer policy, Cloudflare Worker/Pages deployment readback and browser/Android acceptance with immutable artifact pointers. Do not promote manually entered notes to verified status.

## Local verification

- `node --test tests/core.test.cjs`
- Browser automation in this build environment was blocked at local navigation (`ERR_BLOCKED_BY_ADMINISTRATOR`). Static HTML parsing, JavaScript syntax checks, pure evidence-policy tests and headless DOM-smoke tests were run instead. The UI still requires a genuine browser and Android acceptance pass before it is called browser-verified.

## Sources

- [Bubbles Color GPT Builder contract](https://github.com/www-infinity4/Moltnook/blob/feat/color-agent-intelligent-routing-20261106/docs/BUBBLES-COLOR-GPT-BUILDER.md)
- [Continuity Builder ticket](https://github.com/www-infinity4/QuantaPhi/issues/1321)
- [Brain execution ticket](https://github.com/www-infinity4/QuantaPhi/issues/1192)
- [Follow/Quick-Card related issue](https://github.com/www-infinity4/QuantaPhi/issues/1502)

The related issues are links to ongoing/previous work, not evidence of completion for any seeded ticket.

## Repository installation scope (November 10, 2026)

This PR copies the previously delivered single-file `work-control.html` into this repository. It does **not** replace the homepage, change Cloudflare, authorize bot writes, fix any existing PR, or make repository data private. The read-only public GitHub inspection uses no GitHub credentials. Open `/work-control.html` only after an independently reviewed source merge and separately verified site deployment. Production/browser/Android must be confirmed with fresh receipts; this documentation does not establish them.

Related work remains separate: Quanta feed/ads and consent [#1315](https://github.com/www-infinity4/QuantaPhi/issues/1315), Follow/Image Studio draft [#1883](https://github.com/www-infinity4/QuantaPhi/pull/1883), Bubbles probes [#1880](https://github.com/www-infinity4/QuantaPhi/pull/1880), and Continuity Builder [#1321](https://github.com/www-infinity4/QuantaPhi/issues/1321).
