# QuantaPhi consent-based outreach · October 2026

## Product links
- Product preview: https://quantaphi.org/infinity-launch.html
- Live interactive StarMaker Quick Card demo: https://quantaphi.org/starmaker-embed.html
- Existing QuantaPhi: https://quantaphi.org/
- Bubbles AI: https://quantaphi.org/bubbles/
- Repository evidence: https://github.com/www-infinity4/QuantaPhi
- StarMaker integration dependency: https://github.com/www-infinity4/QuantaPhi/issues/1118

## What is built
A standalone interactive StarMaker demonstrator reuses the original `mountCardTools` renderer, giving users verified song discovery, opt-in Music Quant matching from their own browser/wallet context (where available), an explicit local microphone recorder, and the existing Follow / Star / Collect / Share / +1 Build controls. Official StarMaker features with no integration rights remain official-site/app handoffs. Its independent portable iframe is copyable; successful embedding depends on the hosting origin's CSP and frame headers, which should be tested externally.

The public marketing page embeds this working Quick Card, accurately separates source code features from external integration ambitions, and links checkable PRs. Email templates are HTML-safe static preview cards with deep links to the actual interactive experience: Gmail, Outlook and other email clients do NOT run website iframes or app JavaScript.

## Campaign tracks
1. **Potential API/technology partners**: individual relationship-based outreach about source integrations and OAuth (use `starmaker-partner-demo-email.html` with relevant provider substitutions only when verified).
2. **Developers / creators**: opt-in newsletter with demonstration, embedded-card instructions and source code.
3. **Commerce / financial partners**: describe proposed Visa, Chime and checkout work as integration research, not endorsed or transacting. Obtain approved processor onboarding and payments compliance before launch.
4. **Robotics research partners**: distinguish software Robot Brain jobs from speculative physical drone/transformer research.

## Bulk-send launch gate (no invented mailing list)
- Acquire subscribers with affirmative consent or documented legitimate relationship; save source/time/consent evidence. No scraped, purchased or guessed addresses.
- Obtain and publish an accurate sender postal mailing address; do not substitute an invented address for `{{POSTAL_ADDRESS}}`.
- Provide a working unsubscribe endpoint, process opt-outs promptly, preserve a suppression list, include accurate From and subject line. Replace `{{UNSUBSCRIBE_URL}}` with a per-recipient mechanism.
- Configure SPF, DKIM and DMARC for any actual campaign sending domain, check unsubscribe/list headers, provider volume limits, bounce handling, and branded link TLS.
- Use a real campaign service or CRM with verified consent; a Gmail account alone is not a bulk mailing platform.
- Send one test to a controlled inbox, verify rendering and card link, then a small consenting pilot, then gradually expand based on bounces/opt-outs. Keep an immutable send/consent ledger.
- Do not include payment requests, fake account connections, unverifiable traffic metrics, or claims that StarMaker/Visa/Chime are partners.
- This repository intentionally does not contain recipients, customer credentials, unsubscribe lists or a functioning bulk mail sender.

## Proof gate
Only claim deployment after actual deployed site navigation and mobile browser tests. GitHub merge alone is not proof of production release. Test the portable iframe on at least one external origin; absence of a frame-ancestors permission check is not proof that all websites can embed it.

## Template files
- `outreach/starmaker-partner-demo-email.html`: personal developer outreach with linked working mini card.
- `outreach/infinity-campaign-email.html`: opt-in commercial campaign template (must fill legal fields).
