# Open Browser Bridge (self-hosted alternative)

This is an original integration scaffold, **not TinyFish source code**. It uses Playwright (Apache-2.0) for user-authorized browser tasks. No paid browser API required. The machine running it still needs Node.js, Chromium, and hosting resources.

## Safety model
- Browser runs locally/on an owner-controlled worker, never inside public Quick Card JavaScript.
- Login secrets, cookies, storage state and screenshots stay on the owner's machine; never commit them to Git.
- Every job has an explicit allowed hostname, action, and deadline. No anti-bot bypass, CAPTCHA evasion, rate-limit circumvention, or covert scraping.
- Public-facing posting or account changes require a separate owner approval and provider-compliant API flow. X posting must use the official X API, **not** browser automation.
- Do not automatically submit developer terms, payments, account changes or irreversible actions.

## Security limitation

The exact-hostname HTTPS policy rejects alternate ports, loopback literals and local hostnames. The DNS preflight and per-request check **also reject private, loopback, link-local, reserved, mixed and failed DNS answers**, and Chromium's sandbox is requested. The request policy is installed at **browser context** scope before any page is opened, so the first navigation of popup/new-tab pages is also checked; page-only interception misses that initial request. The screenshot-only scaffold now closes **all WebSocket connections** at browser-context scope, before page creation; Playwright's HTTP route handler alone cannot intercept ws/wss. A missing WebSocket interception API fails closed. These checks are defense in depth, **not complete DNS-rebinding/SSRF protection**: Chromium may resolve a hostname again after Node's check, and network requests can occur outside route interception. Use an independently verified network egress firewall/namespace with private ranges denied and DNS pinning or equivalent protections before any authenticated or multi-tenant use. Chromium sandbox requires a supported non-root host with user namespaces; do not disable it to make a broken host work. No website login, paid service, X posting or provider approval is included.

## Deployment acceptance checklist

Before enabling authenticated or multi-tenant use, a reviewer independent of the author must record evidence that the browser process is non-root and sandboxed, and that host-level egress isolation blocks loopback, RFC1918, link-local, metadata endpoints, IPv6 local ranges and DNS rebinding even when Chromium resolves independently of Node. Run a real Chromium integration test against a controlled DNS-rebinding target, including popup navigation and WebSocket attempts; record observed network connections and failure results. Reviewers must verify screenshot and receipt files cannot expose credentials or other users' sessions, and that the worker has no wallet, GitHub or Cloudflare write credentials. Do not mark this checklist complete from unit tests or green CI alone. Obtain separate approval before provider account actions.

## Run
```sh
cd tools/open-browser-bridge
npm install
npx playwright install chromium
node browser-bridge.mjs https://example.com
```

Run policy tests without installing browser packages: `node --test tools/open-browser-bridge/*.test.mjs` from the repository root. The dedicated GitHub workflow runs URL, DNS and context-routing tests and syntax checks without using paid browser services.

This first milestone opens an allowlisted page, prints its title and saves a screenshot locally. A future owner-authenticated Bubbles job runner can add consented workflows, persistent session encryption, signed receipts, and a Quick Card UI. This scaffold is **not deployed**.
