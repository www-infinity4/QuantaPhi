# QuantaPhi Universal Quick Card contract (v1)

This is the shared card contract for QuantaPhi, Infinity Phi and Bubbles. Each card is small, directly interactive and retains Oracle Octaves styling. No service is "connected" merely because a visitor opened its website or signed in there.

## Already included in this branch
- `quanta-card-provider.mjs`: provider profiles from HTTPS official domain only (not display names), data-only capability manifest, official search/login endpoints and supported connector routing.
- `quanta-card-actions.mjs`: shared **Follow, Star, Collect, Share, +1 Build, Quick Search**, and a provider-specific official sign-in entry. A **Connect to Bubbles** control is offered only for the three provider accounts already present in the connector UI: GitHub, Google and Cloudflare.
- `published-quick-card.js`: supplies the original `website` to the shared capability resolver. Source cards already reach this toolbar through `mountCardTools`.
- The card manifest is an HTML data attribute (`data-card-capabilities`) for nonprivileged display/adapter discovery. It is **not executable code**, a credential, a downloaded APK, or an API token.
- Follow/Star/Collect are currently browser-local actions, not a wallet-scoped cloud save. Approved and catalogued cards appear in the Following feed; a newly published or unlisted user card must first be catalogued for feed inclusion.

## Mandatory per-card builder checklist
1. Confirm original provider domain and asset rights. Use a real supplied/provider image; do not draw a deceptive imitation brand sign-in.
2. Determine applicable actions: search, view, play, shop, write, order-tracking, etc. Hide capabilities absent from provider documentation or approvals.
3. Show **Follow, Star, Collect, Share** compactly; preserve a genuinely working card-specific search field when available. Keep builder/edit control optional.
4. Use official provider login or registered OAuth/OIDC authorization-code + PKCE. Never collect third-party passwords inside a QuantaPhi form and never copy WebView cookies.
5. The user must consent per account and permitted scope. Encrypt refresh tokens server-side, scope by verified QuantaPhi user, verify callback/state, check per-user connection from backend before declaring Connected, and support revoke/disconnect.
6. On Android, use verified HTTPS App Links / Custom Tabs for provider sign-in, then resume the originating Bubbles card via a state-bound return receipt. Never trust a deep-link alone as proof of authorization. **Do not embed APK binaries in HTML cards.**
7. For Bubbles tool use, map each visible card action to a server-side, least-privilege, typed adapter. No client JS gets access tokens. Feature flags/allowlists block unapproved providers.
8. For voice requests such as "buy me 100 coins", resolve meaning and items, show seller, price, quantity, tax/shipping/fees, and the final checkout confirmation. Never charge, post or send merely on transcription or passive listening.
9. Render actual API results with provenance/timestamps. On failure show **Sign in / Open original / Unavailable**, not fake counts, "Checking" forever, or a claimed completion.
10. Validate keyboard, touch and screen reader accessibility; portrait Moto G Pure layout; search behavior; popup-blocked Android handoff; token revocation; approval denial; device/session isolation; receipts; and both browser and APK views.

## Provider integration ladder

| Provider | Current quick card | Future gated integration |
|---|---|---|
| eBay | Official sign-in, item search, original-site checkout | Register eBay OAuth, Browse API and (if approved) member Order API. Order API production access is limited; no one-tap payment claim before approval. |
| X | Official sign-in, search, native compose | Registered X OAuth/user scopes, read/post adapters, per-post preview and confirmation. No X password storage. |
| Facebook / Instagram | Official sign-in, original-site discovery | Meta-approved Login and Graph API permissions for supported accounts/features. Private feed or ordinary Instagram consumer posting is not presumed available. |
| TikTok | Official sign-in, search / embeds | Approved TikTok API permissions and explicit publishing consent. |
| StarMaker | Verified official sign-in handoff, curated song picker and voluntary Music Quant suggestions | Request direct developer/partner authorization for OAuth, song/catalog/search, playback, recordings, duets and social write scopes. Do not reuse StarMaker's Google/Facebook sign-in as third-party access or infer a live API. See issue #1118. |
| JCPenney / GUESS | Verified original-domain shop entry | Merchant-approved product/catalog/checkout APIs if available, otherwise merchant-hosted cart/checkout. |
| Google / GitHub / Cloudflare | Official sign-in plus existing Bubbles account settings | Require existing account connector live grant, validated scope/receipt; do not claim any provider is currently connected without readback. |

## Next integration work
- `workers/bubbles-connections`: register and implement eBay/X/Meta adapters, provider-specific permissions, callback + per-user encrypted vault, not a generic credential scraper.
- `bubbles-embed.js` and `bubbles-ai.js`: explicit card action request → signed-in tool call → provider result receipt → small updated card. For unsupported operations offer an official-site handoff.
- Feed sync: authenticated follow/collect persistence keyed to wallet + provider account and reviewed permission scopes; preserve anonymous mode.
- Android: verified app link and Chrome Custom Tab sign-in return, no wallet token in intent URL, and no automatic write/payment.
- Commerce: item selection + order review/confirm + documented payment partner and receipt; fall back to official merchant checkout.
- Deployment proof: run node tests and Android/Chrome end-to-end. **This source branch is not a production deployment or proof of an authenticated eBay/X/Meta session.**

## Universal share-and-preview rule (October 28, 2026)

Every new QuantaPhi card and public website/card template should use **the same two-layer contract**.

1. **In QuantaPhi**: default `previewMode=interactive`. A visible **◫ Preview** action opens a mobile-friendly same-origin dialog containing the actual public interactive card in its first-party route. Preserve working Search, Play, Share, Collect, official-source handoffs and +1 Build. An author can choose `previewMode=visual` for an image-first popup with genuine **Open full interactive card** and official-source buttons.
2. **When shared on X, SMS, Facebook, etc.**: serve crawlable title, description and the **card's own publicly available licensed raster image** as `og:image` and `twitter:image` in the initial HTTP HTML response. Do not substitute `/preview.png` (generic site emblem), pretend an image exists, or take a screenshot of a protected provider session. When no real image is available, render a usable text card and offer the original interactive card on click.
3. The public creator publisher stores `preview_mode` on the card row. The D1 migration `workers/quick-card-publisher/migrations/002-card-preview-mode.sql` must run before its updated Worker is deployed. Existing rows default to `interactive`.
4. **Host limitations**: an external social platform owns whether and how a link preview renders. Normal image cards cannot execute buttons in another platform's feed. The **X Player Card** is a separate, conditional media iframe integration that requires HTTPS, compatible framing, supported media, and verification on X; do not turn it on indiscriminately for login, payments or third-party web apps.
5. Only approved first-party public routes can be framed by the universal modal. Protected wallet, account, owner and external login pages must open through their existing secure handoff. An iframe load event does not mean that a third-party account was authorized.
6. Every new brand/product/story card should explicitly choose an actual hero asset or record that none has been cleared for use. A card with no image is not considered image-ready for an X large-image preview. Create approved card artwork and verify crawler visibility as a separate readiness task. Never claim all earlier cards have artwork until inspected.

Verification: `node --test test/quick-card-preview.test.mjs test/quick-card-publisher.test.mjs test/quick-card-share.test.mjs`; mobile dialog test; persisted D1 readback; X crawler image URL verification and production route tests.
