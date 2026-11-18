# Oracle Octaves · Real carousel & contextual placement · source contract

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1315

## Source behavior
- This modifies the **existing original homepage** `index.html` / `oracle-card-deck.js`, not the rejected V5 layout. All native Oracle cards, radio, movie player, search, Bubbles and wallet live DOM nodes remain original.
- ONE `oracleCardDepartment` dropdown changes which original cards are eligible for the top Oracle carousel. Sports, News, Restaurants, Shopping, Media, Radio, Developers, Travel and Science are separate choices. Healthcare and 21+ require deliberate entry and are not advertising targeting categories. Use 44–49 px controls and the existing Oracle Octaves appearance.
- Public is broad curated discovery plus contextual relevance; For You is limited to the visitor's *explicitly chosen interest departments and followed cards*. Following is strictly visitor-chosen. Exact-card `Not for me` is persistent in first-party storage and can be restored. No phone sex/gender inference, health data, location probing or advertising access to private AI prompts.
- Paid campaign eligibility requires current approval, review, HTTPS creative and landing URLs, a dated verification not older than 60 days, a valid schedule and optional declared business-hours/dayparts/season/region constraints; unknown hours never become `Open now`. Winter gear should not be placed in July and expired election campaigns must not reappear as current ads. Neutral current government-office directory entries are not mislabelled political campaign ads.
- The existing age-controlled first-party publisher browsing card and restricted-ads server gate remain separate. A skipped adult category stays out of automatic discovery until a deliberately reopened preference. Ordinary browsing acknowledgment is not paid cannabis advertisement verification.
- The existing ShopPhi companion feed still consumes approved public Quick Cards and AdPhi responses, with verified source dates before entering automatic paid recommendations. Optional six-image stories play each actual creative image once, advance through complete approved pages and stop at the end without interrupting the movie. No generated or recycled placeholder images.
- `quick-card-builder.html` loads the real approved recent card API and offers an opt-in reviewed AdPhi check by visitor-chosen category. Nothing is copied to a new image field without explicit rights confirmation. A newly published card remains unlisted until review. No fabricated advertiser partnerships, royalty, paid conversion or merchandise rights.
- The public source API currently stores **one** official image per creator Quick Card. Multi-image ad stories can use 1–6 approved AdPhi source images; extending the first-party publisher DB beyond a single image requires a reviewed migration and is **not claimed shipped**.
- Current verified external product sources are discovery references, not QuantaPhi paid bookings. Example McDonald's official menu page: https://corporate.mcdonalds.com/corpmcd/our-stories/article/USmenuspotter.html . No merchant paid contract is implied.

## Acceptance and rollback
- Exact-head Node tests in `.github/workflows/oracle-live-placement.yml` plus existing mobile, Bubbles, wallet and Oracle checks.
- Independent review: race-free category changes, no stale paid creatives, no 21+ referral without separate verification, truthful creator image rights and correct follow/not-for-me readback.
- Expected-head merge permitted only after CI/review. Actual Cloudflare deployed routes/browser screenshots and owner's phone remain separate proofs.
- If regressions arise after merge, create a standard revert PR of that **one merge commit**. Never force reset `main`, mutate Quants or reinstate the rejected V5.
