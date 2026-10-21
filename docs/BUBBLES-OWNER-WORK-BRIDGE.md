# Signed owner work intake

Source implementation only until an exact Brain deployment and live ticket
receipt are recorded here. The existing public `assist` response and the
browser-polled `submit` queue are not executable Brain work tickets.

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

This intake is not yet live. No actual ticket/repair or physical Android acceptance is claimed. Next, refresh the isolated-preview and singleton release evidence from their old `19510f5` pins to this candidate and observed production baseline. Preserve isolated D1/DO, run the canary, and retain the existing owner-confirmed release guard. An unrelated passing workflow cannot substitute for these receipts.
