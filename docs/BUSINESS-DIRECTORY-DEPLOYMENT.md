# Infinity National Business Directory · Cloudflare deployment

The production directory is intentionally isolated from both the wallet and the legacy business API.

| Cloudflare Worker | Route | Binding | Purpose |
| --- | --- | --- | --- |
| `quantaphi-national-directory-api` | `quantaphi.org/api/business-directory*` | `BUSINESS_DB` → D1 `quantaphi-business-directory` | Read-only public search, counts, city queue and receipts |
| `quantaphi-national-directory-page` | `quantaphi.org/businesses*` | None | Static directory HTML + search JavaScript |
| `quantaphi-business-directory` | `quantaphi.org/api/business/*` | `BUSINESSES` | Existing legacy business discovery, **do not overwrite** |

The production D1 UUID is `51bfedfd-15e0-4695-ab80-0416ff2ea133`.

## Publication workflow

The authoritative page sources are `businesses/index.html` and `businesses/directory-app.mjs`. Generate the standalone page Worker by running:

```
node scripts/build-business-directory-page-worker.mjs
node scripts/build-business-directory-page-worker.mjs --check
```

Deploy using `workers/business-directory/wrangler-page.toml` and `workers/business-directory/wrangler.toml` respectively. Never deploy the national API to the legacy worker name, and never bind a wallet database. The page Worker serves only `/businesses/`, `/businesses/index.html`, and `/businesses/directory-app.mjs`, with a canonical redirect for `/businesses`.

The live Cloudflare route mappings should be verified after deployment, along with:

- `https://quantaphi.org/businesses/`
- `https://quantaphi.org/api/business-directory/health`
- `https://quantaphi.org/api/business-directory/records?state=CO&city=Denver`
- `https://quantaphi.org/api/business-directory/cities`
- `https://quantaphi.org/api/business-directory/receipts`

## Continuous data expansion

The `business-directory-import.yml` workflow resumes city imports every four hours, starting with Colorado before the other states. Every imported business must preserve a source identifier, valid location, attribution, license status, and an ingest receipt. Its output never grants sponsorship, checkout, owner-claim, inventory or sign-in rights. The separate Cloudflare Continuity Builder backlog keeps the next tasks and verification receipts available across chat sessions.

A queued city is not a populated city. A successful GitHub workflow is not by itself evidence that a fresh D1 batch was accepted; verify `business_ingest_receipts` and the actual listed record count.

## Deployment safety

Do not change the legacy `/api/business/*` routes, unrelated Cloudflare workers, finance ledgers, Wallet D1, or token balances to publish a directory card. Pages use text and original links if product-photo rights are unknown. Ad status defaults to not sponsored; business records alone never authorize paid ads.
