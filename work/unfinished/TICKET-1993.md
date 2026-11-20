---
issue: 1993
project: "Schools, daycare and babysitting licensed-photo Oracle Quick Card"
state: source_tested
dot: "🟡"
progress_percent: 55
progress_basis: "Existing Oracle viewer integration, static licensed catalog, manual category/photo navigation and Node/Android tests authored; exact-head CI, independent review, merge, Cloudflare browser and physical Android acceptance not complete."
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT GitHub connector · scoped feature branch"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feat/education-care-gallery-20261119
pr: null
merged: false
deployed: false
live_verified: false
blocker: "CI and independent review pending. User photos include identifiable children and a watermarked stock image: do not publish them without adequate publisher rights and guardian permissions."
next_action: "Verify exact-head GitHub Actions Node and Android-width browser results; repair any failures, obtain independent review, guarded merge then live/Android readback."
---
# Schools / daycare / babysitting photo gallery · November 19, 2026

Owner request: public Oracle carousel includes school, daycare and babysitter-related photographic Quick Cards. Ten example images supplied in conversation are **reference only**, not authorized public assets.

## Source-checked assets (public candidates, no identifiable children)
- Elementary classroom · Sydney.lorraine5 · CC BY-SA 4.0 · https://commons.wikimedia.org/wiki/File:Elementary_Classroom.jpg
- Preschool classroom · Gammon-m · CC BY-SA 4.0 · https://commons.wikimedia.org/wiki/File:Preschool_Classroom.jpg
- Early Learning Environment · Trickymac · CC BY-SA 4.0 · https://commons.wikimedia.org/wiki/File:Early_Learning_Environment.jpg
- Baby toys · Mvolz · CC0 1.0 · https://commons.wikimedia.org/wiki/File:Baby_toys.jpg

Each visual displays a visible creator, original-source link and license link. These are illustration photos, not source-verified local childcare services, caregiver credentials, actual childcare appointments or recommendations. Do not mix child imagery with the site's 21+ publisher section.

## Source work and acceptance
- Reuses the original Oracle single-card viewer with an original `#educationCareQuickCard` DOM node; no independent carousel shelf and no duplicate player.
- Source-defined filters, previous/next, captions/credits, explicit no-vetting notice; controls target 48px, 320/360px tests.
- Test-first GitHub commit `6a842263e09fce3a49ddc33207c1d64a3dbaf013` (RED test authored before implementation; no executed RED run claimed).
- Checks authored: `test/education-care-card.test.mjs` and `test/education-care-card.browser.spec.mjs`, wired into existing interactive-card CI. Passing CI not yet claimed.
- No uploaded child photo is copied, mirrored, scraped, published, or analyzed for identity. No extra child profiles, private metadata or cross-card behavioral tracking. No payment or provider endorsement.
- Independent review, merge, actual Cloudflare deployment, live browser, real photo delivery and physical Android acceptance remain distinct unverified stages.
