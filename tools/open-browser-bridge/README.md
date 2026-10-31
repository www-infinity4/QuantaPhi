# Open Browser Bridge (self-hosted alternative)

This is an original integration scaffold, **not TinyFish source code**. It uses Playwright (Apache-2.0) for user-authorized browser tasks. No paid browser API required. The machine running it still needs Node.js, Chromium, and hosting resources.

## Safety model
- Browser runs locally/on an owner-controlled worker, never inside public Quick Card JavaScript.
- Login secrets, cookies, storage state and screenshots stay on the owner's machine; never commit them to Git.
- Every job has an explicit allowed hostname, action, and deadline. No anti-bot bypass, CAPTCHA evasion, rate-limit circumvention, or covert scraping.
- Public-facing posting or account changes require a separate owner approval and provider-compliant API flow. X posting must use the official X API, **not** browser automation.
- Do not automatically submit developer terms, payments, account changes or irreversible actions.

## Security limitation

The current exact-hostname HTTPS policy also rejects alternate ports, loopback literals and local hostnames. **It is not a DNS-rebinding or private-IP network sandbox**: a trusted-looking hostname may resolve to a private address. Do not expose this starter as a public multi-tenant browsing service until network egress isolation, DNS/private-address protection, per-user authorization and independent security review are implemented. No website login, paid service, X posting or provider approval is included.

## Run
```sh
cd tools/open-browser-bridge
npm install
npx playwright install chromium
node browser-bridge.mjs https://example.com
```

Run policy tests without installing browser packages: `node --test tools/open-browser-bridge/policy.test.mjs` from the repository root. The dedicated GitHub workflow runs this test and syntax checks without using paid browser services.

This first milestone opens an allowlisted page, prints its title and saves a screenshot locally. A future owner-authenticated Bubbles job runner can add consented workflows, persistent session encryption, signed receipts, and a Quick Card UI. This scaffold is **not deployed**.
