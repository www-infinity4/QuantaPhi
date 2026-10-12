# Bubbles working companion tools

The native overlay keeps voice interaction available above other apps. Both
web and native clients now submit addressed requests to the deployed
`bubbles-tools` gateway. Ordinary conversation still uses the existing Oracle
service binding. A deterministic router recognises news and repository-creation
requests without accepting model-generated network destinations or code.

News fetches dated Google News RSS headlines. Google currently returns HTTP 503
to the Worker, so the explicit fallback is the existing News Phi source feed.
Brain announces the substitution; source links and publication dates are returned.
No remembered or undated headline is presented as current news.

Repository creation is **blocked**, not queued: the current deployment has no
authenticated GitHub repository-creation adapter. The existing owner repair
runner is not a generic create-repository API. Native account pairing, per-owner
GitHub capabilities and a creation adapter must be connected before this tool
can perform the write. Never reuse a public page's Origin header as GitHub auth.

Every result includes a receipt ID, tool, status and source/failure information.
The Android app stores up to 30 local receipts including the original request,
response and sources. These are activity data ready for future Quant ingestion;
they are not minted tokens or wallet settlements. No wallet synchronization,
GitHub write, phone filtering or device control is claimed by this release.

Validation: command routing, date/freshness validation, duplicate rejection,
foreign-origin rejection, chat forwarding and disconnected-write behavior have
Node tests. Android CI compiles the client. Real-device voice and background
behavior still require testing after installing the updated APK.
