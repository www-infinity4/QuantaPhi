# QuantaPhi · Universal Quick Card upgrade contracts
Owner direction: October 30, 2026. This is an engineering contract, not proof a backend has been deployed.

## Public rollout rule
A card does not join Public, For You or Following until it has a usable front-end, authenticated backend where required, passing acceptance tests, genuine sources/assets, and a reviewed production deployment. Do not show a placeholder as if the feature exists. Each card retains its original ad/product artwork and working buttons. Rotate **QuantaPhi-authored** engagement captions without misrepresenting them as official messages from a third-party brand. Preserve accessibility, human control, and explicit account consent.

## Feature Quick Cards — ordered delivery
| Card | User-facing action | Server/verification boundary | Status on this branch |
| --- | --- | --- | --- |
| **Your Profile & Settings** | Set display name, interests and future notification preferences; onboard once | Current values are device-local. Verified account sync and passkeys require separate server review. | Local profile UI implemented; device acceptance pending |
| **My Following** | Follow a ready card; instantly remove from Public/For You and place in Following; unfollow reverses | Current storage is browser-local. Cloud cross-device persistence must be user-bound and conflict-safe. | Browser feed routing implemented; server sync pending |
| **Notifications** | Open in-app inbox and choose optional push subscriptions for chat, wallet and ad alerts | Consent, authenticated delivery, VAPID, unsubscribe and rate limits; notification preferences alone do not deliver messages. | Not built |
| **Deep Links** | Open a specific Quick Card, post, campaign, and original site action | Existing card routes must resolve; validate scheme/hostname and authorization. | Existing routes; acceptance/redirect expansion pending |
| **Language & Accessibility** | Choose language, text size, screen reader mode and keyboard navigation | Locale packs reviewed; dynamic scale and WCAG focus/readability checks. | Not built |
| **Wallet History & Receipts** | Inspect genuine transactions, earnings and ad-reward receipts | Signed immutable, idempotent ledger scoped to account. Never manufacture a balance. | Existing wallet services need verified read-only card |
| **Wallet Safety** | View fraud warnings and report suspicious activity | Server-side velocity, replay checks, risk triage; avoid invasive tracking or device fingerprinting without clear consent/legal basis. | Not built |
| **Campaign & Carousel CMS** | Owner/editor can schedule and cycle real campaigns; preview placements | RBAC, approvals, signed source inventory, expiration, takedown and rollback. | Existing card sources require consolidation |
| **Content Safety** | Report content; moderation status and appeal surface | Automated triage + human review for high-impact or ambiguous decisions; no unreviewed religious/security/military assertions. | Not built |
| **Card Analytics** | View useful CTR, source impressions, sign-in success and performance | Aggregate/consented telemetry; no raw chat or sensitive wallet tokens in metrics. | Existing traffic reporting requires event contracts |
| **Privacy & Data Controls** | Export data, request deletion and check retention | Identity verification, legal retention for financial records, separate erasure of non-mandatory user data. No blind ledger purge. | Not built |
| **Release Health** | View real build/test/deployment receipts | CI unit + browser checks, visual regression, SAST/DAST, consent gates, signed deployment verification. | Existing CI; expanded gates pending |

## Interactions for every ready card
- A distinctive, useful first-frame brand image or original media; no blank provider-name placeholders.
- Open, Follow, Share, Collect, +1 Build and any legitimate product/website action as applicable. No fake provider session.
- For multi-post campaigns, retain the campaign image and action controls; rotate only reviewed message copy and supported content data on meaningful interactions. Track engagement without requiring a post refresh or changing wallet balances.
- Public excludes every followed card; Following contains every saved card until explicit unfollow; For You recommends not-yet-followed cards.
- Profile onboarding may rank early until the visitor completes it. After completion it leaves automatic rotation, while Profile & Settings remains manually accessible.
- Use honest states: `planned`, `source committed`, `tests passed`, `staged`, `production verified`. Each requires evidence. Never advertise a planned feature as working.

## Mandatory tests before release
1. Simulate fresh profile, completion, refresh, return, and a second device with no synced profile; editing from Settings must remain available.
2. Follow/unfollow every family, including original apps, verified brands and source tools; verify no Public duplicates, durable storage on the same browser, and correct cross-tab updates.
3. Exercise 320px/360px/393px/720px Android keyboard, focus order, menu, TV lock-in, reload and original third-party widgets.
4. Ensure campaign art remains, note rotation does not alter ad disclosures or provider messages, and no impression is counted from hidden cards.
5. Verify no wallet/transaction mutation, account credentials, private chat, or push delivery side effects from profile and follow.
6. Reject production promotion until security holds and owner-approved deployment gates are satisfied.
