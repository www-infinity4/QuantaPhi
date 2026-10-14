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

## Callable Resonance tool

Bubbles' deterministic `resonance.calculate` tool uses the owned v3 Resonance
Calculator's 33-material database, ideal LC formula, wavelength and ideal
transformer impedance/turns ratios. Say "Bubbles, calculate resonance at
10 microhenries and 22 picofarads." Missing or invalid units are rejected;
nothing is assumed from unrelated personal research. A direct `POST /v1/assist`
with `{"request":"Calculate resonance","tool":"resonance.calculate","args":{"l":10,"lUnit":"uH","c":22,"cUnit":"pF"}}`
returns a structured result and calculation receipt, without requiring an AI
binding, paying tokens, or creating a bot job. "Open the resonance calculator"
offers `https://quantaphi.org/resonance.html` (the v3 visual interface).

Robot Brain provides `POST /tools/resonance` with an owner session bearer token
or authenticated runner identity. It accepts the same `args` object or a
spoken `request` containing both units, and returns only a deterministic
calculation, not an asserted physical experiment or a job completion. No
unauthenticated owner work access is granted.

Material roles/atomic-number comparisons are a separate *symbolic* track and
never evidence of resonance or energy transfer. This estimator assumes ideal
LC components, ignores parasitics and loaded Q, and does not calculate magnetic
metal skin depth using a nonmagnetic permeability assumption.

Deployment of the updated Workers remains separately required. Merged code or
passing CI does not prove a Cloudflare production deployment; confirm its
`/health` or an authenticated tool receipt before claiming it is live.
