# QuantaPhi genuine ChatGPT website viewer

Date: 2026-10-27
Scope: source website Quick Card / Android carousel / full screen.

The new `ChatGPT` Quick Card opens the genuine `https://chatgpt.com/` site and its sign-in. It offers a user-initiated iframe attempt in the original carousel card and a full-screen first-party frame shell at `/website-viewer.html?site=chatgpt`. Both show direct official-site links at all times.

**Important:** This is real website navigation, **not** an OAuth grant, API session, or a mirrored ChatGPT account. ChatGPT controls `frame-ancestors` / `X-Frame-Options` and third-party cookies. If browser or site rejects embedding, the fallback opens the actual website in a new tab. The frame `load` event is never treated as proof of a successful sign-in or provider response. QuantaPhi cannot read private messages inside a cross-origin iframe. No website password, cookie, account content, token or private response is intercepted by this module.

The original carousel node, direction tabs, Share/Collect/Star/+1 Build, StarMaker, Bubbles and wallet remain intact.

Release: review source, run `node --test test/chatgpt-official-viewer.test.mjs` and existing Quick Card/browser tests, publish via GitHub Pages, verify `/?card=chatgpt`, `/source-quick-card.html?card=chatgpt`, `/website-viewer.html?site=chatgpt` at Android 360/393px and confirm sign-in opens the genuine domain. Record whether iframe is blocked; **do not** remove destination security headers or trick users into supplying passwords on QuantaPhi.
