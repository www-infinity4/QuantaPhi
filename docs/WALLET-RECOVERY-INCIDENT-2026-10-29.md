# Owner wallet recovery incident — October 29, 2026

The owner recovery issuer could reject a successful Cloudflare Access sign-in
before creating a one-use recovery grant. Two independent service bugs were
confirmed. Neither failure branch reaches the grant insert, device enrollment,
or balance-writing code.

## Confirmed causes and history

| Change | Defect or repair | Evidence |
| --- | --- | --- |
| #730, October 19 | The new recovery form used `Referrer-Policy: no-referrer` while requiring an exact same-origin POST. The first issuer also relied on a nonexistent `ctx.access` API. | Commit `9ce6c395e076635f662589dbf3aa1598ff0d8959`; source history. |
| #731, October 19 | Replaced `ctx.access` with signed JWT verification, but used `fetch(..., {redirect: 'error'})`. Workerd rejects that value before any network request. | Source history; the actual Workerd regression test recorded zero outbound requests and a construction exception. |
| #1225, October 29 | Added bounded session candidate verification and constant diagnostic reasons. The Node fixture did not expose the Workerd redirect incompatibility or browser form behavior. | Exact source diff and the later runtime/browser reproductions. |
| #1226, October 29 | Replaced the unsupported redirect option with `manual` and rejected every status other than 200. | Actual Workerd signature verification passed; 301/302/303/307/308 fixtures remained rejected. |
| Current repair | Use `same-origin` only on the code-generation form. Keep `no-referrer` on pages containing a recovery code; keep the exact Origin and Fetch Metadata checks. | Real Chromium navigation POST succeeds at desktop and phone sizes. |

The Fetch standard makes a navigation POST inherit the form document's referrer
policy. With `no-referrer`, its Origin is serialized as `null`. The original
issuer then rejected that POST as `invalid_session` even after the signed JWT
passed. Fixing the signing-key request exposed this previously masked form bug.

References: [Fetch Origin algorithm](https://fetch.spec.whatwg.org/#append-a-request-origin-header)
and [Workers Request redirect support](https://developers.cloudflare.com/workers/runtime-apis/request/).

## Browser reproduction and test gap

Chromium 153.0.8010.0 submitted the original form with `Origin: null`, received
403 `invalid_session`, and caused zero synthetic grant writes. The repaired form
submitted its exact origin, received 200, and caused one synthetic grant write
for the configured fixture account. The returned code page retained
`Referrer-Policy: no-referrer`. Both desktop and phone-sized contexts passed.

Previous tests constructed POST requests with an Origin header by hand. They
therefore bypassed the browser behavior that caused the failure. The permanent
browser regression now submits the actual returned HTML form. A dedicated CI
workflow runs it alongside the signed-session and account-isolation tests.

The browser fixture uses fresh synthetic RSA keys, a synthetic owner, and an
in-memory grant database. It does not establish a successful authenticated
production recovery or phone reconnection, and it does not contact production.

## Impact review

The failing verifier is called only by `/v1/wallet/issue-recovery`, whose live
Access application is restricted to the configured owner and exact path. It is
not called by normal wallet state, history, import, mint, spend, or redemption.

Comparing pre-repair commit `4349320f0053be01f80d5a71e99e38439e7107f7` with the
repair found the following byte-identical sections:

- Wallet client, device-token authentication, balances, and Infinity history.
- Recovery redemption, legacy import, minting, and spending.
- Route dispatch after excluding the added health diagnostic field.
- The separate `bot-work-credit.mjs` module.

Additional behavioral tests exercise the complete Worker dispatcher with two
synthetic existing accounts. Each receives its own balances without any Access
configuration or key request. Missing/unknown device credentials receive 401.
A different account ID supplied in a history query cannot change the verified
owner.

Read-only production queries found zero recovery grants and redemptions from
the first October 29 verifier deployment at 16:26:51.737 UTC through the review.
Those failed attempts therefore did not enroll devices through recovery. The
queried unified ledger also had no events in that interval. Older recovery
records exist; this review does not attribute their origin to the browser issuer.

Available observability queries returned no retained events for this Worker.
Consequently, there is no reliable request count or affected-user count. Code
scope and these checks support an owner-recovery outage; they do not prove that
all other user behavior is free of unrelated defects. Signup email linking and
browser account selection require separate work and are not repaired here.

No production database writes, balance adjustments, account merges, device
removals, Access policy changes, or credential rotations were performed for this
repair. Release details and production source/settings readback belong in the
pull request receipt.
