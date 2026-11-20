# Gary & Family Lounge — birthday TV / discovery extension

This extends /gary/index.html for Gary and family without modifying the original birthday dedication, Westerns content licensing, platform wallet or owner Robot Brain.

## Implemented in source

- Big-button remote: Western Archive films remain on-page; CNN, LiveNOW FOX, CBS News 24/7, ABC News Live, NASA+, PBS, Pluto, Tubi and Netflix provide verified **official-player links**. Restricted services cannot be embedded or silently cast from this site. CNN subscription or TV-provider and Netflix account requirements are disclosed.
- Search widgets: a Hardee's deals request builds official Hardee's, McDonald's and Wendy's comparison source cards. No prices, coupons or sponsored impressions are invented. Unknown queries link original Google Search and News. Explicit The Chicks searches recommend the musician's official site, never unauthorized album playback.
- Bubbles: the existing real lazy-load /bubbles-embed.js, same conversation ID. Editable local nickname, applied on reload. Explicit user-approved “Share draft with this website” input can select the remote or create a source-linked card, not execute a Robot Brain job. Guest chat works independently of login.
- Voice remote: browser Web Speech Recognition where available only after a direct tap; one recognition action, not passive audio monitoring. Bubbles' actual conversational voice is separate.
- Seven-day Iowa weather: NWS API points lookup then the official forecast URL. Select Ottumwa, Oskaloosa, Des Moines or Iowa City. API failure shows no fabricated temperatures.
- Music: real existing Infinity Radio catalog using its previous safe-host validation; Play, Next, Pause and Stop. SomaFM uses the original authorized provider player instead of republishing personal-use radio streams.
- Discovery carousel: original provider destinations, pause, previous and next, large readable tap targets. Fullscreen can assist device Screen Cast, but cannot force TV pairing.
- Opt-in local relevance: explicit interest checkboxes and page selections reorder verified cards only on that browser. Clear removes only page prefs, not Bubbles history or wallet.
- Google trends: existing QuantaPhi imported Google Trends RSS feed with required schema, original source URL and timestamp age checks. Only matching opted-in topics appear. Stale/unavailable trends are not presented as live.

## Limits

This extension does not claim direct Netflix integration, personalized watch history from other subscribers, arbitrary pay-TV playback or actual receiver-side casting; those depend on licensed first-party providers, verified user permissions and supported hardware. Netflix official Top 10 is a link, not an invented AI-personalized account feed.

ChatGPT Voice is opened from its official website/app; user taps Voice or enables supported Start with Voice in ChatGPT Settings. A QuantaPhi website cannot activate another app's microphone or import OpenAI account memories.

There is no ambient reaction capture, passive microphone spying, automatic GIT/Bubble Bit issuance, ad revenue or wallet settlement. Site source files and customer-specific use are distinct provenance/valuation candidates, not receipts.

## Verification

Focused tests: node --test test/gary-birthday.test.mjs test/gary-family-lounge.test.mjs

Review /gary/ live for: Bubbles opens and genuinely replies without sign-in; one-shot remote selects official provider (no fake iframe); Iowa API forecast or explicit failure; radio plays/stops on tap; restaurant comparison has three source links; Google source/opt-in relevance hides unrelated topics; nickname edits without touching the user's wallet; layouts at 320, 360, 393, 720px.

References: https://www.weather.gov/documentation/services-web-api ; https://help.cnn.com/Answer/Detail/000001022 ; https://www.livenowfox.com/where-to-watch ; https://www.cbsnews.com/live/ ; https://abcnews.com/live ; https://www.netflix.com/tudum/top10 ; https://trends.google.com/trending?geo=US ; https://help.openai.com/en/articles/20001274-chatgpt-voice
