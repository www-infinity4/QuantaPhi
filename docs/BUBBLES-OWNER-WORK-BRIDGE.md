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
