# Fred card implementation facts — October 24, 2026

Read together with BUBBLES-QUICK-CARD-EXPANSION-20261024.md. These resolve routine
choices that the failed reader incorrectly requested from the owner.

## Official assets observed in real rendered pages

Cloudflare Browser Rendering /content loaded both official pages successfully
on October 24 with a 360x800 viewport. The following URLs were explicitly present
in their returned HTML; they are not guessed favicon destinations.

| Card | Source | Observed logo | Observed share image |
| --- | --- | --- | --- |
| Xavior | https://xavior.ai/ | https://xavior.ai/xavior-logo.png | https://xavior.ai/og-image.png |
| Bridge Workshop | https://bridgeworkshop.com/ | https://bridgeworkshop.com/logo.png | https://bridgeworkshop.com/og.png |

Xavior's HTML supplies a 515x128 logo. Bridge's HTML supplies a small 26x26 logo
and 1200x630 Open Graph image dimensions. Verify actual image response/display in
the card; the page metadata alone does not verify image bytes or future uptime.
Keep source attribution and graceful failed-image rendering.

## Defaults already covered by the owner request

No owner confirmation of routine image choice, CSS, label or initial status is
required. Implement two working independent interactions: Xavior campaign drafting
(clearly draft-only, never sends outreach) and an originally authored Bridge
practice hand/explanation (not the provider's paid lesson or a connected coach).
The provider entry links remain real and correctly labelled.

Card readiness and provider-account connectivity are different states. Admit a
card to Public only after its local interaction/rendering/tests pass. Show its
draft-only or independent-practice label. Do not mark a working local interaction
unavailable solely because the provider account API is not connected. An actual
unavailable integration must stay hidden/disabled as appropriate; never represent
it as connected. Public admission never grants sending, login or payment powers.

## Actual application paths

The live source catalog and renderer is root source-quick-cards.mjs, NOT
src/source-quick-cards.mjs. It exports QUICK_CARD_SOURCES, PUBLIC_SOURCE_IDS,
findSourceCard and isPublicSourceCard. starterCard/mountShelf create the source
card DOM. quanta-card-experience.mjs exports createCardArtwork and mountCardTools.
oracle-card-deck.js registers sourceReady cards when quantaphi:source-cards-ready
fires. Inspect actual source/tests and wire these existing paths. A separate new
catalog file that no running page imports is not an implemented card.

Reuse the actual existing Star/Collect/Share, +Follow, search, wallet and app-area
paths rather than inventing source classes, selectors, functions or API fields.
Add functional mounted-DOM interaction and persistence/isolation tests. A test
that merely checks the new definitions is insufficient.

The first review is pre-test patch review. It must assess exact implementation;
the later test, arbitration, commit, target CI and deployment stages must supply
their own actual receipts. Do not demand a future PR/CI/deployment receipt before
the pre-test reviewer can assess the source. Never fabricate those later receipts.

Prior failed candidates/tickets were not merged or deployed. This facts sheet
does not authorize bypassing immutable edits, independent review or release holds.
