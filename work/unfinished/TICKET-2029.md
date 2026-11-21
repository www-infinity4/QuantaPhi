---
issue: 2029
repo: www-infinity4/QuantaPhi
branch: feature/ibm-viewport-ports
status: source_tested
dot: yellow
progress_percent: 25
progress_basis: "Estimated: local-only synthetic port prototype and focused tests delivered; real feed adapter, WebSocket, external rights review, CI, merge, Cloudflare/browser/Android remain unverified"
sessions_spent: 1
sessions_remaining_estimate: unknown
blocker: "Authenticated production feed/port transport and consent boundary not yet specified or verified"
next_action: "Inspect exact-head PR CI and independently review sandbox-only scope"
---
# Experimental Viewport Ports (issue #2029)
Owner-authorized two-track sandbox request 2026-11-21. Static /sandbox/ports/ uses local synthetic state and CSS/canvas drawing. No IBM affiliation or actual authenticated WebSocket, stock, wallet, cross-origin or production feed. Source tests run locally using Node 22; exact-head GitHub CI and release acceptance are independent open gates. Do not advance to live production data until source grants, permissions, transport and origin policy are verified.
