# ChatGPT ↔ QuantaPhi / Bubbles: actual integration and release gates

Canonical owner issue: [#980](https://github.com/www-infinity4/QuantaPhi/issues/980). Related operator delegation: [#872](https://github.com/www-infinity4/QuantaPhi/issues/872); Developer Quick Cards: [#1790](https://github.com/www-infinity4/QuantaPhi/issues/1790).

**Status (2026-11-07 CT):** Two distinct paths. No approved ChatGPT website OAuth client or authorized ChatGPT plan-sharing partnership is verified. The original Bubbles chat runs the Cloudflare GPT-OSS model and is not equivalent to a ChatGPT subscription. The Android companion has separate, native, user-controlled Sign in with ChatGPT source; it does not authorize QuantaPhi's public commercial website.

## Direction A — inside ChatGPT: QuantaPhi MCP plugin
The repository now stages a noauth, read-only public MCP endpoint under the existing `bubbles-tools` Worker:
`https://bubbles-tools.marvaseater.workers.dev/mcp/public-cards`.

Only two public tools are defined:
- `quanta_public_builders` returns checked-in first-party creator/assistant URLs.
- `quanta_prepare_card_draft` validates a public HTTPS site and produces an original Quick Card form handoff as a URL **fragment**. The fragment is parsed and cleared by `quick-card-builder.js` in the original site. It cannot publish or trigger any network request by itself. Only the existing explicit publisher form may send the reviewed draft to `/api/quick-cards`; public discovery still requires moderation.

This is intentionally separate from `POST /mcp` that requires `BUBBLES_MCP_TOKEN`. The public server never calls LLMs, Cloudflare D1, GitHub, user connectors, OAuth, checkout, or wallet methods. No user-specific information is sent to it. Never paste the private MCP token into a ChatGPT plugin or publicly available HTML.

**Connection (after deployment and endpoint readback):** ChatGPT Plugins → Add custom MCP server → enter the exact HTTPS endpoint above → install. This only makes the two discovery/draft tools callable *inside ChatGPT*. It neither signs anyone into QuantaPhi with ChatGPT nor embeds ChatGPT in the QuantaPhi chat. The public endpoint must be validated live before inviting users to connect it. Public distribution/review requires separate provider guidelines.

Reference: https://developers.openai.com/plugins/build/app-quickstart and https://developers.openai.com/plugins/build/auth.

## Direction B — inside QuantaPhi: Sign in with ChatGPT and GPT-powered Bubbles

OpenAI's **commercial website** Sign in with ChatGPT is presently a limited partner trial. Official client ID request:
https://developers.openai.com/siwc/request-client-id
Partner interest form:
https://openai.com/form/sign-in-with-chatgpt-interest/

Request **both identity sign-in and eligible ChatGPT plan usage** for QuantaPhi.org and Bubbles, with separate customer consent. No form has been submitted and no client ID has been issued or deployed in this work.

Implementation, after issuance and separate sign-in consent:
1. Add a first-party QuantaPhi server route `/auth/openai` (not a chatgpt.com iframe). Use the OpenAI discovery document `https://auth.openai.com/.well-known/openid-configuration` for actual issuer, authorization, token and JWKS URLs. Create short-lived single-use transaction state bound to the logged-in first-party user/session, OIDC nonce, PKCE S256 challenge and exact registered callback.
2. Exchange the OAuth authorization code only from trusted backend code under the registered token auth mode. Validate ID-token signature with OpenAI JWKS and exact issuer, audience, nonce, expiry and subject. Link `(issuer,client_id,subject)` to the existing verified QuantaPhi user, not email alone. Create the first-party session; support link/unlink, re-consent and logout. Store no tokens in URLs, browser localStorage, public HTML, logs or user prompts.
3. **Identity does not imply plan use.** Ask separately for usage rights, verify the actual granted scopes/entitlements and server-verified model routing, enforce per-user quotas/revocation and provider limits. Eligible ChatGPT plan usage is not automatically voice, conversations, memory, connected plugins or unrestricted GPT agent tools. A fallback to existing Cloudflare Bubbles must be labeled truthfully as Cloudflare GPT-OSS, not "ChatGPT connected".
4. GPT-backed Bubbles on the website must use a supported user-delegated model runtime or a separately funded OpenAI API/ChatKit server, with a single existing chat panel, Cloudflare memory read/write only for that verified user's own consented context, and model/tool receipts in the same conversation. Do not copy the native Android direct-usage token to Cloudflare.
5. For account-bearing QuantaPhi MCP tools in ChatGPT, add OAuth 2.1 Authorization Code + PKCE with scope/resource/audience checks and per-user tokens. Read-only tools may remain public. Tool names and model text do not confer GitHub writes, Cloudflare account authority, wallet minting, payment or approval. Publisher actions must produce original form validation, review, signed request, actual stored artifact and post-action readback.
6. Preserve the original Oracle Octaves creator/player components, 44px phone controls, preview and editable history; no link-only ChatGPT "card" falsely advertised as on-site GPT. No new dead sign-in button should appear until official partner registration, server config, exchange verification and end-to-end user consent work.

Official website integration: https://developers.openai.com/siwc/website
Plan usage: https://help.openai.com/en/articles/20001542-using-your-chatgpt-plan-in-other-apps-and-sites
ChatKit for a self-hosted agent: https://developers.openai.com/api/docs/guides/custom-chatkit

## Acceptance matrix — no invented green receipts

- Public MCP: source/test expected on this PR; **deployment and external ChatGPT install unverified** until exact-head CI, independent review, authorized merge, Worker deployment and real plugin tool invocation.
- GPT-draft handoff: source and Android-width Playwright contract on this PR; **browser acceptance pending**.
- Website ChatGPT sign-in: **partner-client approval blocked**; do not advertise working until official client ID and real user login/callback/token verification.
- ChatGPT plan-powered website Bubbles: **not connected**. Do not charge existing owners, create an OpenAI API bill or silently consume credits.
- Bubbles GPT/Robot Brain writes: separate [#872](https://github.com/www-infinity4/QuantaPhi/issues/872) signed, least-privilege owner grant; no new privileges are created by this PR.
- Cloudflare D1/history or site deployment: **not changed** by this public plugin stage.
- Mobile/site acceptance: test small viewports, request intent/source identification, false-claim prevention, missing permissions, revoked sign-in, stale cards, actual stored and reviewed publisher output.

## Draft for OpenAI's partner interest form

Product: **QuantaPhi.org** (Bubbles conversational AI, Quick Card Builder, Media Star creator, Power Chain research tools). Requested capabilities: **Sign in and ChatGPT plan use for AI requests**, not identity only. QuantaPhi is an existing public Android-first website and Cloudflare-backed service. The requested integration would let each consenting visitor sign in with ChatGPT and use an eligible plan to power Bubbles inside original QuantaPhi Quick Cards and the original chat, with first-party privacy-scoped memory and tool-driven card creation. Each publish/build action remains separately authorized and moderated; no billing, wallet, GitHub writes or private ChatGPT history is inferred from identity. Existing Cloudflare GPT-OSS Bubbles remains a clearly labeled, free baseline. User plan usage and scopes would be revocable and bounded. We can provide exact callback URLs and security review after client registration.

This is copy for the owner's application; it is **not** an approval or a submitted form.
