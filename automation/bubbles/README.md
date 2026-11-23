# Bubbles Automation — ten consent-checked programs

QuantaPhi issue #1913, related #1908 and Android #1231. This module is a
source-tested, dependency-free set of policies, import parsers and integration
adapters around the EXISTING Android app and Moltnook engine. It is not a new
background daemon, provider credential collector, public API or live deployment.

Existing native capture: android/bubbles-overlay ScreenCaptureService.java
and SharedScreenAudioMuxer.java. Require per-session Android MediaProjection
approval, active microphone grant and foreground recording notification.

Existing Android UI and speech: BrainLearningService.java, SpeechEnergyWindow.java,
SpeechTranscriptGate.java and SpeechSourceGate.java. Accessibility screen reads
must be explicitly requested; skip password fields and sensitive controls.
The voice-presence.mjs energy prefilter cannot identify people or replace
trained WebRTC or Silero VAD. Never start recording from ambient noise.

Existing owner cloud browser: workers/bubbles-cloud-browser/chatgpt-bridge.mjs
and consent.mjs. This stays separately authenticated; website sign-in does
not provide an API token or authorize extracting provider data. Provider terms
and per-user permissions are not bypassed by Playwright or Docker.

History parser: history-export.mjs accepts owner-selected ChatGPT JSON and
compatible Gemini Takeout activity formats, emits account-scoped deduplicated
records for LOCAL PRIVATE staging. It does not save, upload, scrape, or index
records until a verified private store is connected and owner approval exists.

Color webhook: ticket-webhook.mjs verifies GitHub HMAC from Oracle-Octaves
and returns a proposed role handoff. Only the separately signed Moltnook
repository engine may claim a lease and run code. Replay protection and
durable idempotency still require the already authorized backend.

Repo memory: repo-memory.mjs proposes source-pinned files on a reviewed
QuantaPhi branch, not automatic pushes into unknown repositories.

Publishing: release.mjs is an exact-head CI and independent-review preflight.
Only a permitted GitHub API merge and distinct Cloudflare/Android readback
can establish delivery. No forced cache refresh is performed by the plan.

SIP dialer: dialer.mjs verifies the signed 4-333-3333# provider event.
SIM/caller ID is not authentication. Before callback/WebRTC execution connect
a trusted SIP provider, single-use nonce store, device challenge, and per-call
user consent. No paid Twilio account or gateway is provisioned here.

Wallet/session: session-watchdog.mjs is read-only and requests the authorized
provider reauthentication flow on Guest status; it never restores secrets
from backups or changes balances, tokens or payment ledgers.

Test with: node --test automation/bubbles/automation.test.mjs
No npm or paid runtime required. CI workflow: bubbles-automation-gates.yml.

Status: source modules and tests staged. Real backend wiring, account grants,
native Android tests, SIP/WebRTC provisioning, history storage, independent
review, merge, production deployment and live device acceptance remain separate.
