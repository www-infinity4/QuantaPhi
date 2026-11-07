---
issue: 99
project: "Fred's Spaces · Media Star source playback and radio launcher"
state: implementing
dot: "🟡"
progress_percent: 45
progress_basis: "Existing wallet and real X link preserved; source-level radio launcher and regression tests authored. Exact-head CI, deploy, replay audio and Android acceptance not verified."
sessions_spent: 2
sessions_remaining_estimate: unknown
agent: "ChatGPT via GitHub connector; no Moltnook coordinator lease claimed"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feat/media-star-fred-launcher-otc-featured-20261107
head_sha: e9e701d6c694e8cf397e9c7431ae3647b4f8f7e6 (latest verified source before this documentation checkpoint)
pr: 1820
tests: "13/13 targeted source and payout checks passed; prior image-quality CI passed; latest full exact-head CI and Android browser QA must be checked after final checkpoint"
merged: false
deployed: false
live_verified: false
blocker: "PR #1820 is still draft/unmerged, real QuantaPhi deployment/readback absent; the external X recording is not licensed for embedding and live StarCoin owner payout configuration is unverified."
next_action: "Inspect exact-head QA including 360px Fred direct Play, checkout readiness and owner receipt tests, obtain independent review then release approval, merge and verify the actual public site/Android display."
---

# Ticket #99 · Fred's Media Star playback and launcher

Continues https://github.com/www-infinity4/QuantaPhi/issues/99 without making a second Media Star template.

- The compact aqua Infinity-style top radio button calls the ORIGINAL Oracle deck's `data-oracle-spotlight="fredSpacesRadio"` handler; it creates no duplicate player, wallet, debit or episode data.
- The original Fred card displays the free featured Bitcoin and Coffee source `https://x.com/i/spaces/1OyKAjYPeXqGb`. Source starts on X; this is not a licensed embedded audio feed.
- Existing Worker `fred-spaces-ledger` handles 1-StarCoin curator unlocks only after readiness and user confirmation. The new launcher cannot charge. Never bill for a promised QuantaPhi-hosted audio stream.
- The existing #1315 Blue Star and Neosporin genuine OTC cards are editorially featured; this is NOT a measured popularity trend or paid sponsor rank.
- Added Node source-safety and mobile Playwright checks; no green CI/live evidence is claimed in this checkpoint.

## Boundaries
Verify X's actual player capabilities and rights separately. No recordings copied, no new external credentials, no product health recommendations beyond existing factual labeling, and no changes to wallet ledgers. Pre-release real Android verification remains required.


## November 7, 2026 · owner reports Fred invisible; repair to direct Play and owner payout

- Diagnosis: original PR #1820 remained `draft` and unmerged, so the website could not show its new Fred launcher. Original button only scrolled to a separate card before the visitor could open X, despite an already working `Bitcoin and Coffee` X Space URL.
- Green repair in the SAME PR: move `#fredSpacesQuick` immediately below the primary Search row (ahead of News, site traffic and medicine cards), with large readable Android-first **Play** anchor directly to `https://x.com/i/spaces/1OyKAjYPeXqGb` and a separate `Next Fred Space · 1 StarCoin` button plus `Open Fred's full card`. No replay audio is rehosted, simulated or licensed through QuantaPhi.
- The Next button uses existing `fred-spaces-radio.js` `more()`, explicit user confirmation and `fred-spaces-ledger` POST; pressing Play is always free. A newly unlocked original X link synchronizes to the top Play anchor only if it is the free first, an actually unlocked episode, or the authenticated owner preview. Provider may require X sign-in and playback may be unavailable.
- Identified source/backend mismatch: website previously claimed the fee went to Fred, while `www-infinity4/TV-Database/workers/fred-spaces-ledger/index.js` atomically credits `media_star_owner_config`'s **QuantaPhi platform-owner account** when configured. Now the UI names the correct platform-owner beneficiary and reports a successful credit only when `charged===1`, `creatorPaid===true`, `ownerPaid===true`, `recipient==='platform-owner'` AND `receiptReference` all agree. A mismatch displays an incident and warns not to retry.
- New TDD/Android tests target near-top placement, original one-tap link, same source card, safe paid-next control, wallet-disabled/no-charge behavior, exact owner receipt requirements; the older ShopPhi Playwright strict selector that broke previous CI was corrected with `exact:true`.
- Independent source inspection: 13/13 focused static/safety checks passed at source `e9e701d6c694e8cf397e9c7431ae3647b4f8f7e6`. GitHub CI at that SHA showed 55 successful workflows and 6 in progress when checked. The final checkpoint commit triggers a new exact-head run; do not claim CI, live payout, actual Fred audio embedding, merge, deployment, or Android acceptance prematurely.
- Original Blue Star/Neosporin featured shortcuts and all eight reviewed OTC seed records remain unchanged. No rank claim ("most clicked") is invented.
- Release gate: latest-head full CI pass; independent code/payment policy review; confirmed platform-owner payout configuration; permitted merge; actual `quantaphi.org` and Android first-screen readback. The first Space works independently of any payout readiness.
