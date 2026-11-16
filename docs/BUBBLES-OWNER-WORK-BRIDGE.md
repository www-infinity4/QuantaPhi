# Signed owner work intake

This route has a verified production release and a real ticket-intake receipt below.
That is **not** proof of runner execution or an owner-page tap. The public
`assist` response and browser-polled `submit` queue are separate from Brain work tickets.

`POST https://infinity-brain-clock.marvaseater.workers.dev/owner/bridge-work`
accepts the existing Moltnook `bubbles-owner-message.yml@refs/heads/main`
GitHub OIDC identity, audience `bubbles-owner-message-bridge`.
Body: `{"repository":"www-infinity4/QuantaPhi","request":"bounded owner repair instructions"}`.
RecordB is the other permitted repository. Requests are limited to 1800 characters.

The Brain verifies the JWT signature and exact workflow claims, then calls the
deployed Bubbles signed status route with the same identity. That route verifies
both existing five-day grants on every request. Revocation, expiration, wrong
identity, or unavailable consent fails closed before ticket creation. No owner
session is fabricated, no grant renewed, and no new secret or binding is added.

Intake uses the existing owner partition and automatic ticket creation; Green's
normal Yellow/Blue planning, independent Pink review, tests, Purple arbitration,
PR and target-CI gates remain in the existing repository engine. This identity
cannot claim writer leases, operate a wallet, approve blocked jobs, or release
production. One run/repository has a stable submission identifier. Retrying an
existing ticket does not revive blocked work or dispatch it again. A conflicting
payload returns a conflict without replacing the existing request.

Only ticket ID, repository, status, deduplication and dispatch status are returned.
Private request text, conversation contents and credentials are not returned in
the receipt. A saved or dispatched request is never reported as completed.
Physical Android and live deployment acceptance require separate evidence.

Future sessions: read this file, check whether the exact source is deployed,
then send a bounded repair through the existing signed workflow. Follow its
ticket into the repository-engine run and inspect actual PR/test receipts.
Do not substitute a public model conversation or an idle writer run for intake.

Validation: `node --test test/brain-owner-work-bridge.test.mjs test/brain-clock.test.mjs test/brain-owner-runner-request.test.mjs`.
Production release retains the existing singleton Brain canary and owner-release
gates; adding this source does not authorize bypassing those gates.

## Verified source and staging — October 21, 2026

PR #856 merged as `ca40684a16fa977f3a3576b62e30c269099c3e51` after 14 successful CI checks; 58 focused local checks passed.

Moltnook [staging run 39654973031](https://github.com/www-infinity4/Moltnook/actions/runs/39654973031), job `119412714059`, verified source tests, bundle, existing credential and exact binding parity. Immutable candidate `012107be-79c6-400e-b279-69d11cd646d5` has zero production traffic. The production deployment remained unchanged.

This paragraph was the pre-release checkpoint. The later evidence below supersedes its deployment status, but not the independent runner, owner-UI or Android requirements.

## Verified production and intake — October 21, 2026, 19:28 UTC

- Moltnook isolated canary [39660781356](https://github.com/www-infinity4/Moltnook/actions/runs/39660781356) verified candidate public endpoint reachability with a fixed anonymous HTTP 401. The previous `redirect:error` probes were invalid as reachability evidence, not proof of a transport defect. See `docs/BUBBLES-END-TO-END-ACCEPTANCE.md`.
- Guarded owner production release [39661658507](https://github.com/www-infinity4/Moltnook/actions/runs/39661658507) completed, reporting exact 100% deployment readback. That verifies the release, not execution of an owner repair.
- The bounded owner workflow [39661949801](https://github.com/www-infinity4/Moltnook/actions/runs/39661949801) independently checked existing five-day signed approval (HTTP 200, exact run identity) and POSTed one work request to production `/owner/bridge-work`.
- The production intake returned ticket `IW-20261021-774371F7`, `status: ready`, `execution.status: queued_for_runner`, `deduplicated: false`, and `completed: false`. This **proves ticket creation and dispatch acceptance only**. Never resubmit this request merely because runner/phone acceptance is pending.
- At intake, the signed consumer observation was `not_observed`. The website's authenticated Story Writer **View Stories** state change, actual runner claim/PR/target CI, and physical Android tap were not established by this receipt. Follow the distinct runner workflow and compare its actual output with the acceptance matrix before reporting completion.

For future sessions: begin with the above verified ticket and run links. Check newer engine receipts and any resulting PR before considering another dispatch. Do not reset five-day authorization, request a new key, repeat the same ticket, treat generic chat as execution, or speak raw job identifiers to the owner.
