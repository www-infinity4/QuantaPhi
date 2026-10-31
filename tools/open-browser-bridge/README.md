# Open Browser Bridge (self-hosted alternative)

This is an original integration scaffold, **not TinyFish source code**. It uses Playwright (Apache-2.0) for user-authorized browser tasks. No paid browser API required. The machine running it still needs Node.js, Chromium, and hosting resources.

## Safety model
- Browser runs locally/on an owner-controlled worker, never inside public Quick Card JavaScript.
- Login secrets, cookies, storage state and screenshots stay on the owner's machine; never commit them to Git.
- Every job has an explicit allowed hostname, action, and deadline. No anti-bot bypass, CAPTCHA evasion, rate-limit circumvention, or covert scraping.
- Public-facing posting or account changes require a separate owner approval and provider-compliant API flow. X posting must use the official X API, **not** browser automation.
- Do not automatically submit developer terms, payments, account changes or irreversible actions.

## Run
```sh
cd tools/open-browser-bridge
npm install
npx playwright install chromium
node browser-bridge.mjs https://example.com
```

This first milestone opens an allowlisted page, prints its title and saves a screenshot locally. A future owner-authenticated Bubbles job runner can add consented workflows, persistent session encryption, signed receipts, and a Quick Card UI. This scaffold is **not deployed**.
