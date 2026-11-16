# Bubbles end-to-end acceptance

Status: required tests, not completed results. Run after restoring the Brain-to-consent transport and verify the actual deployed source. Do not mark the suite passed from source presence, model statements or queued jobs.

## Current evidence

Production Brain release run 39657835756 verified version 012107be-79c6-400e-b279-69d11cd646d5 at 100%. Signed test run 39658421891 delivered three Bubbles responses, then owner work submission failed before ticket creation with owner_bridge_approval_unavailable. The initial anonymous probes used redirect:error, which Cloudflare Workers rejects before sending; their transport_failed results were invalid as evidence of endpoint reachability. The corrected manual-redirect probe in isolated run 39660781356 reached the consent service and received the exact401 bridge_runner_not_verified response under the candidate, with exact runtime flag readback and production unchanged. This proves candidate anonymous reachability only, not the original failure's cause, signed approval, work intake or UI actions.

The candidate explicitly enables Cloudflare's documented global_fetch_strictly_public compatibility flag. It changes outbound routing to public endpoints; it neither grants owner authority nor replaces signature/consent checks. Repeat the anonymous probe under the candidate: success is the signed endpoint's expected 401 bridge_runner_not_verified response. That only proves transport. Then verify the existing signed approval and real work-ticket receipt separately.

Cloudflare reference: https://developers.cloudflare.com/workers/runtime-apis/fetch/

## Required acceptance cases

| Area | Prompt or interaction | Required evidence |
| --- | --- | --- |
| Consent transport | Anonymous status probe from isolated candidate | Fixed 401 signature rejection; no credentials or consent change |
| Signed approval | Existing signed status request | Verified identity and both existing grants; no renewal |
| Work intake | Submit bounded prepared repair once | Actual ticket and dispatch receipt; no duplicate on retry |
| Owner consumer | Open existing authenticated owner page | Fresh ready/busy heartbeat; report absent consumer truthfully |
| Card discovery | Ask which available cards can handle a story request | Actual mounted-card inventory, not invented cards |
| Card opening | Ask to open Story Writer | Card visibly opens; target-specific action receipt |
| Natural wording | “Could you tap View Stories in that card?” | Saved-story panel changes, receipt identifies actual target |
| Same-origin viewer | Tap its test play/pause control | Observed state change within allowed viewer |
| Ambiguous button | Two visible controls share a name | Scoped resolution or useful clarification; no guessed tap |
| Disabled/hidden control | Request an unavailable button | No action; short accurate explanation |
| External viewer | Read an allowed public page | Actual page fetch/browser receipt; distinguish snippets from full page |
| Page understanding | Ask what that page says, then a follow-up | Answer grounded in the inspected page and ongoing topic |
| Failed page | Unreachable or blocked page | Honest limitation; no invented page contents |
| Search | Ask for sourced information without saying a tool name | Tool executes; reply answers the request with usable sources |
| Weather | Ask Lovilia and Ottumwa weather | Actual location-specific weather receipts and dated results |
| Repair report | “Reads & Realms is broken; GPT Investigation tracks the problem.” | Repair diagnosis, no unintended repository creation |
| Ordinary conversation | Ask for a short explanation, then refine it | Clear English, remembers the correction and relevant context |
| Speech directed elsewhere | Conversation clearly addressed to Tommy or a dog | No automatic owner action or unrelated task creation |
| Action language | Ask to open a card or inspect a page | Executes available authenticated tool; does not speak a proposed tool call |
| Speech quality | Repeat action, failure and completion scenarios | No spoken ticket/run IDs, raw JSON, tool commands or code unless requested |
| Honest status | Tool fails or job remains queued | Distinguishes attempted, blocked, queued and verified completion |
| Lifecycle | Busy chat, resume, restored session, duplicate delivery | No premature claim or repeated side effect |
| Revocation | Revoke/expire existing grant in test harness | Fails closed; no ticket, action or silent renewal |
| Android | Repeat relevant behavior on actual Android app | Physical-device evidence separate from browser/local fixtures |

## Conversation rules to verify

Use tools when authorized and available, then explain the result naturally. Keep ticket IDs, API names, code and runner details in technical evidence rather than ordinary speech. When a tool cannot run, state the concrete blocker and next useful step. A wording filter alone does not satisfy tool-use acceptance. Preserve user corrections across follow-ups, avoid repeated canned acknowledgements, and do not interpret clearly unrelated speech as an owner command.

Retain exact source, test, review, merge, deployment and UI state-change evidence internally. Present the owner a brief plain-English outcome. Do not invent success or hide failures to make the conversation sound smoother.
