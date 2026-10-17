# Bubbles + Robot Brain full-system test (October 17, 2026)

## Purpose

One safe diagnostic for Bubbles web and Android source contracts, the Cloudflare public live boundary, and the Moltnook color-bot network. **Green tests are not proof that Android voice, production execution, or a repository write actually happened.**

## Run the automated test

1. Open GitHub -> **QuantaPhi** -> **Actions** -> **Bubbles and Robot Brain full-system diagnostic** -> **Run workflow** (after this workflow is merged).
2. Default `live_ai_probe=false` uses real HTTP GET/denied-authorization boundary checks but makes **no public AI inference**. If you explicitly want an AI response smoke test, choose `live_ai_probe=true`; this uses the public Workers AI endpoint and may incur usage.
3. Open each job. The final **Diagnostic verdict** reports passing and failing suites and has an explicit manual-verification limitation.
4. Open the `bubbles-brain-public-diagnostic` artifact for exact live HTTP checks and errors. No credential or write receipt is invented.

The GitHub Actions job deliberately does not create production tickets, issue GitHub write requests, spend wallet tokens, make merges, release APKs, or touch the Platinum security hold.

### Automated coverage and limitations

| Group | What actually gets exercised | What is NOT established |
|---|---|---|
| Bubbles/Brain | Web routing, owner auth contracts, scopes, multiple repos, duplicate and bulk-approval gates, ticket/claim/merge receipts | Paired phone session, deployed worker revision, real runner execution |
| Android | Native source tests for voice attribution, TTS cleanup, overlays, capture, screen and WebView coupling | Installed APK, real microphone/audio, Android MediaProjection consent, physical screens |
| Moltnook | Color roster/routing, read/write restrictions, evidence, dependencies, reviewer and promotion policy | Real autonomous bot writing and merging a PR |
| Live boundary | Worker health, CORS blocked, owner endpoint inaccessible without auth; optional public AI reply | Authenticated owner, D1/DO binding health, actual Brain tool call, GitHub write |

## Speak this to the running Bubbles APK

> **Bubbles, run a read-only Robot Brain diagnostic. Do not create tickets, spend tokens, edit repositories, approve jobs, or deploy anything. Check whether I am genuinely owner-linked; inspect the live ticket and runner receipts if your authorized tools allow it. Report Red, Blue, Yellow, Orange, Green, Pink, Purple, and Black separately as PASS, FAIL or UNVERIFIED, and cite the real evidence for each. If you lack access, say UNVERIFIED instead of guessing.**

Expected behavior:
- Wakes only when addressed (or after tapping the orb); idle background conversation does not submit a command.
- Uses real authenticated tools instead of only generating chat text. It must label any request accepted by the API as **queued / dispatch accepted**, not *running*.
- Should show exactly which repo, job ID, run ID and evidence it read. If owner pairing fails, it must say so rather than fabricate data.
- Does not create a work ticket from this read-only command; no wallet or external side effect.

## Phone-only tests (human confirmation needed)

| Check | Pass condition |
|---|---|
| Wake/idle | Say something unrelated without 'Bubbles': no job or answer; say 'Bubbles, check robot brain tools': one addressed reply |
| Speech | Say 'Bubbles, say hello and do not read punctuation': smooth speech without spoken asterisks/slashes |
| Permission | Ask to share the screen: Android system permission prompt appears; denial causes no capture; authorized share stops on command |
| Recorder | Request screen and sound capture, approve Android consent, stop and save; verify actual MediaStore file and status message |
| Background microphone | TV/other person does not create a ticket; verify on actual phone; model cannot reliably distinguish voices without tested safeguards |
| Card catalog | Ask 'Bubbles, show Infinity Radio'; card appears with working controls; no false playback claim if stream unavailable |
| Screen understanding | Share a page, scroll, ask what changed; Bubbles should use a fresh visible frame rather than invent contents |
| Owner status | 'Check robot brain tools' shows an actual authenticated API result, or a precise block |
| Duplicate | Ask about the same existing ticket twice: no duplicate job or repeated completed-work announcement |
| Repo selection | Ask which repos a sample task fits; it can select QuantaPhi and/or Moltnook and correctly explain selected scope |

### One owner-authorized real canary (separate from read-only test)

This is the **only** way to prove the full pipeline from spoken request to verified GitHub write:

1. After verifying the owner session, explicitly approve **one harmless sandbox-only** task against the chosen repository. Never bypass an existing permission or security hold.
2. Bubbles must create a single ticket with explicit repo, idempotency key, acceptance criterion, and **queued** status.
3. A runner must claim that exact job with a lease and real run ID. This is **started**.
4. The engineer writes only to a `bubbles/` or otherwise authorized test branch. Green's commit SHA, a real PR link, CI status, Pink/Purple review and Black's evidence gate must be separately checked.
5. A task is **finished** only when the required test and requested merge/deploy receipts exist. No 'finished' for a mere dispatch acknowledgement, mock, draft, blocked step or unmerged PR.
6. Repeating the original spoken request must not create another ticket/PR. Owner-blocked or security-held work remains blocked.

**Stop the canary** on any unauthorized file write, missing immutable SHA or signer, bogus evidence, lost repo selection, repeated wallet mint, skipped owner decision, or claim of deployed APK without an independent binary audit.

## Known runtime blocker from October 17

Moltnook workflow run [39070714701](https://github.com/www-infinity4/Moltnook/actions/runs/39070714701) completed with failure in the Reader → Engineer → Pink → Purple step. The execution log reports `owner_input_required` and `excluded_path_required` on `www-infinity4/WidgetPhi` task `IW-20261013-WIDGET01/TASK-5`. This is a real block; successful unit tests must never mask it. The live adapter verification also reported a missing wallet-read credential and unverified image/fork execution. Do not widen write permissions automatically merely to turn the dashboard green.

## Release caution

Infinity Platinum is separately held under [QuantaPhi issue #525](https://github.com/www-infinity4/QuantaPhi/issues/525). This diagnostic is not a scanner or a release authorization. The Bubbles Android source tests do not create, sign, publish, or install any APK.
