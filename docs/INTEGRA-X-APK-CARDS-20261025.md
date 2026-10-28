# Integra AI on X + Bubbles Quick Card APK bridge — October 25, 2026

## Implemented in this draft
- \`quick-card-apk-bridge.mjs\` exposes one **Open Bubbles** link and a verified **Install Bubbles APK** download in existing QuantaPhi cards with a supported source ID. The download ONLY resolves to the existing versioned GitHub Bubbles preview when \`/api/apk-releases\` confirms availability; otherwise it remains unavailable. No third-party APK, misleading embedded installer, silent install, or generic per-card search input.
- Included in the home page, source card viewer, feed card viewer, creator card builder, and Bubbles card host. Responsive Oracle Octaves card controls. Branch/CI verification is required before merging.
- \`integra-x-reply-policy.mjs\` defines fail-closed reply eligibility including X written AI approval, official API setup, prior recipient opt-in, user-selected watched accounts, question detection, opt-out, one reply per post, and public post existence. It **does not post**, store credentials, scrape X, or create an X account.

## Not implemented or independently confirmed
- **Android 0.59.0 source upgrade:** A separate user-tapped **Open in Bubbles APK** control is now shown on Android Quick Cards, using `quantaphi-bubbles://card/<bounded-id>`. `BubblesCardLink.java` accepts only a one-segment card identifier; `MainActivity` consumes the VIEW intent exactly once, and `BubblesService` accepts `ACTION_OPEN_CARD` only with an already-running Bubbles session. The existing `FloatingOracleWindow` opens a registered first-party card through `window.QuantaBubbles.openRegisteredCardFromAndroid` without reloading or wiping the chat. A stopped app is not restarted by the link, and no voice, recording, accessibility or owner privileges are granted. The preview APK has **not** been signed/released or tested on the user's phone.
- The APK downloader itself still does not silently install Android packages. Android prompts the user. The `Open Bubbles` web link remains a reliable fallback when the APK is missing.
- A card ID/title still travels in the separate web fallback link; the web conversation recognizes a registered `sourceCard` and tries to open it. This mechanism shares no cookies with the Android app.
- `bubbles-provider-card.html` and `bubbles-provider-card.mjs` supply responsive in-chat public search panels for Google, X, Facebook, Instagram, TikTok, GUESS, and Pepe Jeans. They give users contextual source searches and a separate official-site link. They are not native installed third-party apps or logged-in copies.
- Integra's X handle, its email identity, official X API OAuth app, written AI reply approval, and Google account do not yet exist in these changes. No automated public replies are active.
- Browser-rendered X scraping is not used for this new bot. X requires official API use for automated activities; the older owner's public reader is separate and remains review-only.
- Google/Facebook/Instagram/TikTok pages cannot be forced into cross-origin frames when blocked. Use permitted deep links, authenticated provider APIs, and first-party search/result cards; never request or persist personal passwords in an APK.
- Google Workspace or another verified identity provider is required for a Google-login-capable service mailbox; Cloudflare Email Routing by itself does not supply a Gmail/Google identity or a full mailbox. No address is claimed to be provisioned.

## Next verified work
1. Confirm card selector coverage and user taps on a real Android device; inspect and execute Node tests and CI checks; collect browser receipts for install/unavailable states. Fix any CSS conflicts before merge.
2. Create official Integra X account and its separate service identity through owner-driven signup/verification; request X's written approval for AI auto-replies and acquire properly scoped OAuth tokens stored as encrypted secrets.
3. Integrate approved X API event intake and opt-in controls with Cloudflare Worker + deduplicated D1 reply ledger, apply the policy before each post, use existing Google-backed Bubbles research via authorized APIs, and log actual X post IDs.
4. Compile/sign the proposed Android 0.59.0 source, install on a real device with the correct signing certificate, then verify a card tap switches back to the previous app while the actual Bubbles overlay shows the correct card. Confirm that stopped service stays stopped, no duplicate microphone starts, no chat loss, and no untrusted provider URLs run. Add only provider-authorized richer interactions after those checks.
5. Set up QuantaPhi-controlled mail routing/mailbox as a separate task, with MX/DKIM/SPF/DMARC verification and account protections if actual sending is needed.

Security holds remain in force for Infinity Platinum. \`Integra\` also serves the independent safety/integrity gate, so publication never implies validation without external evidence.
