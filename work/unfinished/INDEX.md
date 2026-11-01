# Open and unfinished work — agent routing index

Read [README](README.md) and root [AGENTS.md](../../AGENTS.md) before editing code. Entries below are routing pointers, **not** verified current percent-complete estimates. Each ticket's issue comments and latest exact-head PR/CI are authoritative. Agents must verify and update after each work session.

| Project | Canonical issue | Linked source | Dot | Progress | Sessions spent / remaining | Next verified action |
| --- | --- | --- | --- | --- | --- | --- |
| X #bubbles intake / build receipts | [#1210](https://github.com/www-infinity4/QuantaPhi/issues/1210) | [signed-in Integra intake receipt](https://github.com/www-infinity4/QuantaPhi/issues/1210#issuecomment-6539823684) | 🔴 | unknown | unknown / unknown | Deduplicate new Panasonic Power Chain request; implement one bounded card slice |
| Continuity Builder / agent orchestration | [#1145](https://github.com/www-infinity4/QuantaPhi/issues/1145) | [coordinator PR #1171](https://github.com/www-infinity4/QuantaPhi/pull/1171) | 🔴 | unknown | unknown / unknown | Verify current coordinator receipts and authenticated runners; continue safe source repair |
| Brain execution | [#1192](https://github.com/www-infinity4/QuantaPhi/issues/1192) | issue checkpoint | 🔴 | unknown | unknown / unknown | Obtain actual execution/result receipt, not just accepted status |
| Android homepage section settling / Chrome ANR | [#1190](https://github.com/www-infinity4/QuantaPhi/issues/1190) | [TICKET-1190](TICKET-1190.md) · section-scrolling repair branch | 🟡 | unknown — one bounded source repair, device ANR unverified | 1 / unknown | Run focused Node and mobile browser CI; independent review; 360/393px device performance and production readback |
| Bubbles Android and website | [#1231](https://github.com/www-infinity4/QuantaPhi/issues/1231) | [PWA draft #1144](https://github.com/www-infinity4/QuantaPhi/pull/1144) | 🔴 | unknown | unknown / unknown | Reconcile existing PRs, test sign-in and preserve security gates |
| Git-family Copilot → Gitpal release | [#1250](https://github.com/www-infinity4/QuantaPhi/issues/1250) | [TICKET-1250](TICKET-1250.md) · [QuantaPhi #1272](https://github.com/www-infinity4/QuantaPhi/pull/1272) · [#1273](https://github.com/www-infinity4/QuantaPhi/pull/1273) · [Gitpal #2](https://github.com/www-infinity4/Gitpal/pull/2) | 🟡 | unknown | 7 documented / unknown | Verify latest #1272 CI, then obtain independent exact-head security review; no merge/deploy until signed-in wallet isolation acceptance |
| Integra daily evidence-backed report | [#1278](https://github.com/www-infinity4/QuantaPhi/issues/1278) | [TICKET-1278](TICKET-1278.md) · [merged formatter #1280](https://github.com/www-infinity4/QuantaPhi/pull/1280) | 🟡 | 25% source milestone estimate; full integration incomplete | 3 documented / unknown | Wire bounded verified read-only receipts; X publishing remains disabled |
| X Developer Connect / Integra policy | [#1282](https://github.com/www-infinity4/QuantaPhi/issues/1282) | [TICKET-1282](TICKET-1282.md) · [merged advisory policy #1283](https://github.com/www-infinity4/QuantaPhi/pull/1283) | 🟡 | unknown | 3 documented / unknown | Implement independent server-side authorization and provider-grant verification before any X posting |
| Bubbles Personal Context + Bits | [#1296](https://github.com/www-infinity4/QuantaPhi/issues/1296) | [TICKET-1296](TICKET-1296.md) · [PR #1297](https://github.com/www-infinity4/QuantaPhi/pull/1297) | 🟡 | unknown | 2 documented / unknown | Verify focused CI, then authenticated ledger and real iteration integration |
| Bubbles Door Knocker | [#1298](https://github.com/www-infinity4/QuantaPhi/issues/1298) | [TICKET-1298](TICKET-1298.md) | 🟡 | unknown | 1 documented / unknown | Verify CI then implement durable queue and runner checkpoint delivery |
| Power Chain bulk-buy | [#1145](https://github.com/www-infinity4/QuantaPhi/issues/1145) | [draft PR #1260](https://github.com/www-infinity4/QuantaPhi/pull/1260) | 🟡 | unknown | unknown / unknown | Independent review and deployment/phone acceptance after CI |

**Never treat unknown as zero or fabricate 70%.** If the same issue covers multiple jobs, create one scoped numbered issue for the specific build after deduplication, then a `TICKET-<number>.md` checkpoint. New tickets are added as links here in a PR. The red/yellow dots here are preliminary routing indicators only; verify live status and leases before assigning.

## Ticket checkpoint template

```yaml
issue: 0
project: "Project name"
source_requests: []
state: scoped
dot: "🔴"
progress_percent: unknown
progress_basis: "acceptance criteria completed / total"
sessions_spent: 0
sessions_remaining_estimate: unknown
agent: unassigned
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: null
repo: www-infinity4/QuantaPhi
branch: null
head_sha: null
pr: null
tests: []
ci: []
merged: false
deployed: false
live_verified: false
blocker: null
next_action: "One specific executable action"
```

Keep the ticket body human-readable below the metadata with acceptance criteria, completed/remaining checklist, actual session receipts and reviewer/deployment gates.
