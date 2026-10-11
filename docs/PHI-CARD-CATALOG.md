# Phi Card Catalog — composable websites, not cloned apps

The live catalog frontend is at `/card-catalog/` once the QuantaPhi site Worker
serves the merged GitHub files. The source of truth is
[`catalog.json`](../card-catalog/catalog.json): each reusable element names
the actual existing Phi source, readiness, category and whether independent
customer data is needed.

## What a visitor can do now
1. Search for **Search Engine**, **Search Viewer**, **Scholastic Reader**,
   **Asteroid**, **Reads & Realms**, **Story Writer**, **Image Builder**, **Infinity
   Radio**, **Media Star**, **Code Phi**, **Bubbles AI**, **News Phi**, etc.
2. Pick an element, rename it and fill in options. For Search Engine and Viewer,
   choose **QuantaPhi-style**, **AI overview first**, **images first** or
   **links only**; use the interactive working preview.
3. Add chosen cards into a site blueprint and export the JSON file.
4. Copy embed code for **only the working search/viewer templates** and insert
   it into a website they control. The embed loader uses a separate iframe per
   card and a limited origin-checked `phi:research:search` /
   `phi:research:click` event bridge.

The iframe viewer attempts in-page display, but a publisher may block embeds.
Every source retains an original-source link. An iframe does not grant access
to the publisher's articles, private cookies or account data.

The **other registry entries are not yet standalone integrations**. Do not
claim an element can be embedded just because its source project exists. Their
adapter readiness moves to working only after independently tested packaging,
customer data isolation, and supported upstream permissions.

## Customer-owned Reads & Realms
The customer's **custom site name, reader brand, subjects, editorial content,
sources, and free/paid preference** form a tenant site configuration. The
existing original Reads & Realms engine supplies *structure and research skills*,
not its owner's source index or published stories. Customer libraries start
**empty**. A site owner can create a draft, attach original sources, review it
and publish a free story through the isolated tenant API.

Paid stories intentionally do not become public or charge a coin. Paid checkout
needs a licensed payment provider, approved pricing and transactional settlement
receipts first. Neither the owner's StarCoin ledger nor customer wallets are
the customer-publisher's implicit payment service.

## Managed Cloudflare database architecture
Normal signup should **not require visitors to register with Cloudflare**.
One platform-managed D1 database, `phi-card-tenants`, hosts the first
customer sites. Every mutable table is scoped to `site_id`. The site itself
has an authenticated `owner_id`, and all private API reads and writes first
verify the wallet-device credential against `IDENTITY_DB.account_devices`.
All card/story/event SQL is filtered by the verified site ID. Public reads
expose only editorially published **free** stories.

```text
Customer form → Phi owner identity session → /v1/sites → site ID
              → selected card instances → tenant-controlled D1 records
              → published reader feed → embeddable customer card
```

The platform manages D1 migrations, backups, usage limits, audit receipts and
future site-domain verification. The **customer owns their original content**
and can export a portable site blueprint; operating the platform database does
not imply ownership of the customer's writing. Avoid copying private Phi
indexes, other tenants' reader data, provider secrets or wallet histories.

A dedicated per-customer D1 database is a **future upgraded option**, not the
signup default. Provisioning must happen server-side via a scoped Cloudflare API
token kept in the admin Worker secret store after authorization, quota, billing
approval, migration and rollback checks. The client must never receive that
API token or a D1 database-binding identifier that grants access. Do not create
a database merely because an anonymous browser submitted a form.

## Existing authenticated API scaffold

- `GET /health`
- `GET /v1/sites` and `POST /v1/sites` — wallet-authenticated list/create
- `GET /v1/sites/:id/cards` and `POST /v1/sites/:id/cards` — owned cards
- `GET /v1/sites/:id/stories` and `POST /v1/sites/:id/stories` — private drafts
- `POST /v1/sites/:id/stories/:storyId/publish` — explicit editorial approval
- `POST /v1/sites/:id/events` — idempotent, authenticated research events
- `GET /v1/public/:slug/stories` — published free articles only

The backend lives under `workers/phi-card-catalog/` and needs a *separate*
Cloudflare Worker binding and D1 migration before it handles real requests.
The catalog UI currently exports blueprints locally; it does not claim a
customer's tenant database has been created just by filling out a form.

## Quality gates
`node --test test/phi-card-catalog.test.cjs test/phi-card-tenants.test.cjs`
and the `Phi card catalog and tenant isolation` GitHub workflow verify syntax,
inventory, routing, existing D1 SQL semantics, data isolation, idempotency, and
publication rules. Never share site owner device credentials, AI provider keys,
Cloudflare tokens, copyrighted private episodes, or paid content without proof
of entitlement.
