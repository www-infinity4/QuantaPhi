# TICKET-1701 · External viewer framing and permission security
```yaml
issue: 1701
project: "QuantaPhi viewer and edge framing security"
source_requests:
  - "Owner security request, 2026-11-05; unexpected Android pop-up/keyboard behavior has not been linked to QuantaPhi"
state: implementing
dot: "🟡"
progress_percent: 50
progress_basis: "3/6 milestones prepared: source audit, regression test, bounded source patch. CI, independent review and live/mobile acceptance not complete."
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT assistant — scoped source patch"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: null
repo: www-infinity4/QuantaPhi
branch: security/viewer-frame-boundaries-1701
head_sha: null
pr: null
tests:
  - "test/viewer-external-boundaries.test.mjs added; red checks reproduced before patch; execution in CI pending"
ci: []
merged: false
deployed: false
live_verified: false
blocker: "Independent security review, CI and live Android/headers verification not yet established; phone itself cannot be inspected remotely"
next_action: "Open PR for #1701, run exact-head Node security tests, inspect CI, require independent review before deploy"
```

## Source audit (2026-11-05)
- Main `index.html` loads Google Analytics and AdSense. This does not prove malicious software or an advertising-source infection. Review ad supply chain separately; avoid accidentally removing revenue without evidence.
- Existing `quanta-official-viewer.mjs` granted `clipboard-write; microphone` to an embedded third-party site, with no sandbox. The preview was opt-in and origin-pinned to `https://chatgpt.com/`.
- Cloudflare edge Worker applied framing protection to some pages, but not main QuantaPhi homepage or `website-viewer.html`.

## Proposed source changes
- Official-site iframe: `sandbox="allow-scripts allow-forms allow-same-origin"` with no top navigation, popups, downloads, mic or clipboard delegation. Retain explicit click and known provider allowlist.
- Edge Worker: `X-Frame-Options: SAMEORIGIN` plus `Content-Security-Policy: frame-ancestors 'self'` and `X-Content-Type-Options: nosniff` for homepage and standalone viewer; preserve intentionally embedded Bubbles subpages.
- Regression test: inspect iframe permission boundary and execute mocked Worker responses. CI and live header readback remain mandatory.

## Boundaries
- No claim about the Android device being infected, Google being responsible, actual phone remediation, global site safety, revenue/payout changes or all external content isolation.
- A dark/black screen is not effective against OS-level malware, screen capture or physical cameras. Require server-side authenticated data access, not client-side obscurity.
- Do not bypass owner APK security hold, change wallet, merge into production or grant access based solely on these source tests.
