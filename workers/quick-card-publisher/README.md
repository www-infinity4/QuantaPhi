# Quick Card Publisher — production and safety contract

Users open /quick-card-builder.html, enter an official HTTPS website, describe the
useful interaction, and publish. POST /api/quick-cards writes a durable D1 row and
returns https://quantaphi.org/cards/<slug> from the **confirmed database response**.
The first page opens immediately and is unlisted from front-page discovery.
Never show a made-up success URL if the POST fails.

The initial first-party card capabilities are (1) official open, (2) a real
same-host search template supplied by the creator, and (3) licensed/public
YouTube embed. Requested advanced interactions remain a visible **build request**
until implemented and verified. Do not iframe an external website that prohibits
it, simulate a third-party login, invent media, or misrepresent the provider.

Cloudflare D1 storage is isolated from owner wallet/Robot Brain data. Apply
schema.sql to a new D1 named 'quantaphi-quick-cards'. Bind it to the
'quantaphi-quick-card-publisher' Worker as CARDS_DB and install routes
quantaphi.org/cards/* and quantaphi.org/api/quick-cards*.
The public publisher has no wallet, GitHub or owner-authorization credentials.
Three unlisted links/IP/day is a coarse publishing throttle, **not**
a complete anti-spam system. Enable Cloudflare rate limiting / bot rules and
moderation before expanding anonymous distribution.

All new cards default to status=unlisted and are accessible only by known link.
A trusted moderator may change the D1 row to approved (never from an
anonymous API). GET /api/quick-cards returns approved cards only; those
are registered as real cards in the existing Oracle Choose a Direction
Public / For You / Following selector. Quant scoring determines order; inclusion
does not guarantee a particular slot. Removal sets status=removed. Monitor
and act on abuse/takedown reports, and add verified creator ownership before
self-service edits/deletions.

Share URL includes Open Graph metadata and Twitter summary-card fallback.
Other sites can iframe the canonical page if their own CSP permits it, but
X is not assumed to run arbitrary interactive HTML inside a post. Linked
X previews remain standard previews.

## X reading dependency — currently blocked

Existing separate branch/PR #644 (stacked on #642 and #641) implements
author-ID-pinned #bubbles draft-only intake and D1 cursor/dedupe. **Do not**
copy this unfinished stack into the publisher or accept X hashtags as owner
orders. Verify numeric @YahooPingcwlz X author ID against the X API,
configure X_API_BEARER_TOKEN and X_OWNER_USER_ID as secure server-only bindings,
reconcile the stacked PRs, run scanner tests and a genuine X read receipt.
Do not claim account reads until that evidence exists. Display explicit
last-checked/disconnected status and preserve other hashtags.

## Acceptance

- node --test test/quick-card-publisher.test.mjs
- Create an unlisted card via a real browser POST; verify 201 + D1 persisted row.
- Read canonical URL on another device; confirm title, real controls and OG metadata.
- Approve test row, check it can rotate in Public/For You, then remove it.
- Verify no wallet writes, developer impersonation, private tokens or accidental
  X execution; inspect deployed Worker/routes/DB binding and live HTTP receipts.

Deployment is complete **only** after live route, D1, browser and main Git commit
receipts are independently confirmed.
