# QuantaPhi homepage V5 — reversible on-site trial

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1315

## What is being merged

- `homepage-v5.html` is the **recovered Continuity Builder V5 HTML design preview**, published on a same-origin trial path. It is explicitly a simulation; card imagery, time/season and sponsored examples are not the real ad backend.
- `index.html` keeps the existing Bubbles/search/radio/Oracle code and adds one discoverable link above the Oracle carousel to the trial. The existing home remains the default.
- V5 includes a visible `← Live QuantaPhi` link and `noindex,nofollow` meta. It uses namespaced device-local demo settings/follows only and does not write to the existing Follow/Quant/wallet ledgers.
- No ad-serving migration, account permissions, Cloudflare release, MyChart integration or clinical data movement occurs.

## Rollback

If the owner rejects V5, create an expected-head GitHub revert of **this trial PR's merged commit**. That removes the V5 page, the corresponding trial link, and its test/workflow/docs while preserving independent repository changes merged afterward. Do not force-push main, reset Cloudflare state, or roll back unrelated PRs. Use an ordinary revert PR after CI/review if branch protection requires one.

Review URL **only after an actual deployment/readback**: https://quantaphi.org/homepage-v5.html — do not equate GitHub merge with a deployed Cloudflare asset. Current homepage at https://quantaphi.org/ remains the reliable fallback.

## Acceptance gates

1. Exact PR head CI passes including `node --test test/homepage-v5-trial.test.mjs`.
2. Independent review verifies no tampering with old homepage controls, privacy or unapproved campaign claims.
3. Perform guarded expected-head merge, recording merge SHA.
4. Independently verify HTTPS status of both / and /homepage-v5.html and the link from the homepage, with no broken music/search/player.
5. Real Android mobile widths 320, 360 and 393 px are separate acceptance, not inferred from CI.

## Next version

Converting the mockup into the actual default homepage requires wiring authentic Oracle/ShopPhi components and approved, non-invented inventory. Do not replace `index.html` with these preview fixtures.
