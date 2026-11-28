# Bubbles / Brain: owner-operated API staging

Continues [#1907](https://github.com/www-infinity4/QuantaPhi/issues/1907),
[#2110](https://github.com/www-infinity4/QuantaPhi/issues/2110) and
[#1110](https://github.com/www-infinity4/QuantaPhi/issues/1110).

The owner reports paying for the existing account
`392a60022046dd9f6d11b1d4b511a2ad` (Watsonkris611). Its invitation was
accepted, but the current ChatGPT Cloudflare connection still exposes only
the original account. Browser GitHub/passkey sign-in repeatedly failed.
This API path uses the owner's existing Termux, Python and GitHub CLI.

## One private token entry

In the owner's working phone browser, open
[Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens/),
then Create Token / Create Custom Token. For the remaining Bubbles setup,
use Account permissions **D1 / Edit**, **Workers Scripts / Edit**, and
**Workers AI / Read**. Select **only** the paid account above under Account
Resources. Do not select all accounts. No billing, DNS, user-account, media,
analytics or token-management permission is needed.

[Cloudflare's token instructions](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
explain account selection and that the token secret is shown only once.
[Permission names](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)
use Edit in the dashboard / Write in the API for D1 and Workers Scripts.
This staging operator uses only D1; the other two permissions are for the
separately reviewed Bubbles Worker/model connection that remains to be built.
An existing token scoped correctly to this account also works.

Enter the token at the operator's hidden terminal prompt. Never put it in
chat, a shell command argument, a public workflow input or a repository file.
The prompt fails instead of falling back to echoed input. The environment
variable `BUBBLES_CLOUDFLARE_API_TOKEN` is supported for the manual Actions job.

## Operator behavior

Use the exact reviewed source commit and SHA-256 supplied in the session's
handoff. Download and verify the file before running it. From a reviewed
checkout the commands are:

```sh
python3 scripts/bubbles-account-stage.py
python3 scripts/bubbles-account-stage.py --stage --connect-github
```

Default check makes a single filtered database-metadata request when the
database is absent. `--stage` creates or reuses **only** `bubbles-brain-core`
in the fixed account. It uses the native original schemas for `work_tickets`,
`brain_experiences`, `bubbles_chatgpt_bridge`, and their five existing indexes.
Unknown/incompatible schema, triggers/views or any core records stop staging.
Partial, compatible, empty staging can be resumed by an explicit owner run.
Known D1 provider `_cf_KV` and SQLite internal objects are not changed.

The client only accepts these fixed-account D1 paths, refuses redirects,
bounds responses and timeouts, and makes no automatic retries. An ambiguous
database create stops with `attempted_unconfirmed`; inspect/read back on the
next explicit run. Stage writes only schema, with no imported or synthetic
owner/job records. It never alters/drops existing schema or deletes records.
Only use an unattached staging database: these metadata/empty checks do not
establish a global fence against an external concurrent writer.

`--connect-github` separately stores this token in **www-infinity4/QuantaPhi →
Actions secret `BUBBLES_CLOUDFLARE_API_TOKEN`** through the existing authenticated
`gh` CLI. Its value is passed through stdin, captured child output is never
printed, and Cloudflare/debug environment variables are not inherited. An
existing dedicated secret is left unchanged; the original deployment secrets
are never selected. A metadata readback confirms a successful secret write,
not the future job's ability to authenticate. GitHub secret updates have no
atomic create-only option; avoid concurrent administration of this dedicated
name during the operator run. If the secret already exists, its value is not
read or verified; investigate the next manual check rather than replacing it.

The optional repository workflow runs offline tests for relevant PRs without
provider secrets. After review and an owner-approved merge, its manual check /
stage job can use the dedicated secret on main in this repository only. There
is no schedule, push-triggered operation or model call. Each manual run saves
a small sanitized receipt for seven days. This is not a permanent phone server.

## What remains

An empty schema is **not** restored Bubbles. This path never deploys a Worker,
changes traffic/cron/DNS, calls AI, changes billing, mints owner credentials,
renews grants or activates a writer. Preserve existing identities, keys,
private sessions, jobs and receipts in the original installation until a
consistent private export/fence/import and separately reviewed release.
Payment status, real model capacity, signed conversation, real engineering
execution and physical Android acceptance each need their own live receipts.

The final printed JSON contains only operation metadata and fixed reason
codes. It may be shared with the engineering session; it does not contain the
token, provider error text, account records or job contents. Schema checks and
failed operations remain distinguishable from production/chat verification.
