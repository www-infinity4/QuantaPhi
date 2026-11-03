# QuantaPhi autonomous site integrity guard

**Scope:** source scan of up to 400 tracked HTML files, checking literal escaped HTML text nodes, duplicate IDs, empty image sources and unresolved tracked local assets; plus public Chromium/393px Android-width checks of four allowlisted QuantaPhi pages for page exceptions, broken displayed images and same-origin HTTP errors. The scanner does not click payment, wallet, account, Share or Collect controls or access authenticated sessions.

**Self-repair policy:** only a deterministic literal \n or \r between adjacent section, article or div tags in `index.html` or `platinum/index.html` is automatically rewritten. JavaScript/style blocks and comments are excluded. Never guess a missing image or asset URL, rewrite a third-party page, fix login, issue purchases, delete cards, change wallet balances or operate a Cloudflare database. All other findings are diagnostics in the Actions artifact.

**Cadence:** GitHub Actions requests a run every five minutes, on relevant main pushes, or manually via workflow_dispatch. GitHub schedules are best-effort, not a guaranteed real-time watcher. The first run creates a branch and normal pull request if a provable source repair exists. Later runs can merge that PR only when the source diff is exactly the single allowlisted repair, current main still matches the original base, the dedicated guard check and all other returned CI checks are green, the PR is mergeable/clean and GitHub accepts the expected-head merge. Repository review/branch protection may block it. No direct commit to main, no bypass of security gates, no unverified deployment claims.

**Commands:** node --test test/site-integrity-guard.test.mjs test/site-integrity-publish.test.mjs; node scripts/site-integrity-guard.mjs (read-only local); node scripts/site-integrity-guard.mjs --apply (local safe repair); node scripts/site-integrity-guard.mjs --live (requires Playwright + Chromium). For safety use --apply only in a disposable checkout, never a dirty working tree.

**Evidence:** site-integrity-evidence/report.json records scanned files, findings, exact before/after hashes for guarded edits, and live findings. Passing source CI proves a source candidate, not Cloudflare deployment. Investigate any browser or network finding and add a narrowly scoped repair rule plus RED/GREEN test before extending the write allowlist.

## 2026-11-03 source/asset verification

- The Platinum page contained a literal escaped newline between adjacent sections. A test now protects that visual fix, with the Android APK security hold retained.
- The standalone physics form referred to `/style.css`, which returned HTTP 404. It now uses a first-party `/physics-card.css` with readable touch controls. Its former `Verified buyers` display was a local design-submission counter, **not purchases**, and now says `Designs saved on this device`.
- A Git file absent from this repository is *untracked*, not automatically absent on the deployed website. `/TV-Database/js/auth.js` and `/TV-Database/js/starquest-cloud-ledger.js` were confirmed publicly served without modification. Public asset probes now distinguish HTTP failures from repository mapping.
- The live browser sample includes the homepage, Platinum, physics form, Storybook, disability housing, Coliseum and Quick Card builder; it is not exhaustive coverage of every card or account flow.

Autonomous promotion remains limited to exactly one allowlisted HTML file per bot PR, verified against its original SHA and the deterministic transformation. The broader missing-asset and runtime findings are diagnostic and not automatically rewritten.
