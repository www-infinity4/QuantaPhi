# Integra AI on X + Bubbles Quick Card APK bridge — October 25, 2026

## Implemented in this draft
- \`quick-card-apk-bridge.mjs\` exposes one **Open Bubbles** link and a verified **Install Bubbles APK** download in existing QuantaPhi cards with a supported source ID. The download ONLY resolves to the existing versioned GitHub Bubbles preview when \`/api/apk-releases\` confirms availability; otherwise it remains unavailable. No third-party APK, misleading embedded installer, silent install, or generic per-card search input.
- Included in the home page, source card viewer, feed card viewer, creator card builder, and Bubbles card host. Responsive Oracle Octaves card controls. Branch/CI verification is required before merging.
- \`integra-x-reply-policy.mjs\` defines fail-closed reply eligibility including X written AI approval, official API setup, prior recipient opt-in, user-selected watched accounts, question detection, opt-out, one reply per post, and public post existence. It **does not post**, store credentials, scrape X, or create an X account.

## Not implemented or independently confirmed
- The APK downloader does not silently install or launch Android packages. Android prompts the user. The present Open Bubbles link opens the existing **web chat**, not an Android deep link (native deep link requires a verified Android release and testing).
- The card ID/title travels in the URL for a future native/web handoff. The chat does **not yet consume** it to automatically open third-party card surfaces.
- Integra's X handle, its email identity, official X API OAuth app, written AI reply approval, and Google account do not yet exist in these changes. No automated public replies are active.
- Browser-rendered X scraping is not used for this new bot. X requires official API use for automated activities; the older owner's public reader is separate and remains review-only.
- Google/Facebook/Instagram/TikTok pages cannot be forced into cross-origin frames when blocked. Use permitted deep links, authenticated provider APIs, and first-party search/result cards; never request or persist personal passwords in an APK.
- Google Workspace or another verified identity provider is required for a Google-login-capable service mailbox; Cloudflare Email Routing by itself does not supply a Gmail/Google identity or a full mailbox. No address is claimed to be provisioned.

## Next verified work
1. Confirm card selector coverage and user taps on a real Android device; inspect and execute Node tests and CI checks; collect browser receipts for install/unavailable states. Fix any CSS conflicts before merge.
2. Create official Integra X account and its separate service identity through owner-driven signup/verification; request X's written approval for AI auto-replies and acquire properly scoped OAuth tokens stored as encrypted secrets.
3. Integrate approved X API event intake and opt-in controls with Cloudflare Worker + deduplicated D1 reply ledger, apply the policy before each post, use existing Google-backed Bubbles research via authorized APIs, and log actual X post IDs.
4. Implement Android app/deep-link routing and safe in-chat first-party app adapters for Google/X/Facebook/Instagram/TikTok and shopping cards, each respecting service permissions and interactive restrictions. Validate foreground/overlay behavior on the phone.
5. Set up QuantaPhi-controlled mail routing/mailbox as a separate task, with MX/DKIM/SPF/DMARC verification and account protections if actual sending is needed.

Security holds remain in force for Infinity Platinum. \`Integra\` also serves the independent safety/integrity gate, so publication never implies validation without external evidence.
