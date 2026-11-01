# TICKET-1307 — Recovered Integra X tour / authorized browser replies

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1307

## Recovered request
Owner screenshot included: "Have Integra introduce people to Twitter with the Integra account in the card. Like a tour guide around developer everything you can do with twitter. She will be able to respond with our cloud browser we created last night that has to be finished."

- **Source**: owner-provided Android screenshot in conversation. Transcription stored in issue; screenshot image is not public GitHub media.
- **Priority**: public guided tour first, then owner-only browser readback, one consented Integra reply, API sign-in/feeds/Spaces and Android acceptance.
- **Related**: merged PR #1306 (public X draft composer); open issues #1284, #1210, #1278; draft PRs #1156, #1259.
- **Status**: 🟡 `implementing` / `review_pending` once this PR opens. Full story is **not** complete.
- **Estimated progress**: A public-tour source milestone is staged, about **15%** of full issue acceptance (seven verified steps, CI/live/readback still pending; owner-only browser/replies still blocked).
- **Sessions spent**: 1 documented implementation session.
- **Sessions remaining estimate**: unknown; depends on real provider/browser permissions and reviews.
- **Agent lease**: not claimed / no coordinator-issued lease, so no claimed expiry or fence; isolated new branch, no existing owner session/PR altered.
- **Branch**: `feat/integra-x-tour-1307` from main. **Exact head/PR**: read the PR and latest GitHub checks; this checkpoint is not an assertion of merge/deploy.
- **Files staged**: `quanta-integra-x-tour.mjs`, `quanta-card-experience.mjs`, `quanta-card-experience.css`, focused Node and Android browser tests, CI registration.
- **Guardrails**: no wallet/identity/token changes, no X credentials, no API writes, no public visitor access to owner's @IntegraAI browser; all guide text explicitly static and source-linked.
- **Next executable action**: run exact-head GitHub CI and Android QA, address review findings, merge when policy checks are satisfied; then independently verify actual card rendering. After that inspect signed-in browser PR #1156 and permitted test credentials; do not turn a separate browser run into an automatic site-user entitlement.
- **Owner actions**: none for the public self-guided tour; verified owner-only backend/profile provisioning may require explicit separate authorization.
