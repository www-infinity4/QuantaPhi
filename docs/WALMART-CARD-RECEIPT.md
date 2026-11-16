# Walmart product card — October 24, 2026

Owner-selected first item: bettergoods Woodfired Crust Mediterranean Pizza,
single serve, 5.7 oz, frozen, Walmart item 19668500198.

Observed in the actual Walmart browser product page: $3.87, Walmart seller,
product photo, one-time purchase and Add to cart control. No cart or purchase
was submitted. The browser used its default Sacramento Gerber Rd store; this
is not a verified price or availability for Lovilia. Card prices are explicitly
labelled dated observations and Walmart confirms the visitor's own final price.

The same product page displayed related real items and source photos:

| Walmart item | Product | Observed USD |
| --- | --- | --- |
| 19668500198 | bettergoods Mediterranean, 5.7 oz | 3.87 |
| 5463970979 | bettergoods Italian Wood-Fired Margherita, 14.6 oz | 6.92 |
| 45209432 | Tony's Cheese Pizzeria Style, 18.9 oz | 2.96 |
| 17389669530 | bettergoods Cauliflower Thin Crust Chicken Sausage, 13.2 oz | 6.57 |

Image URLs and canonical product destinations are in walmart-card.mjs. They
came from the rendered Walmart page, including the real Walmart spark logo.
No fabricated product photography, checkout, endorsement or live catalog API.

The Walmart card is first on normal homepage opens. Explicit card deep links
remain respected. Outer Next/Public/For You/Following uses existing shared
Quant ranking; inner Next Walmart item uses the same ranking library over the
four verified products, with bounded signed-in interest weights when available.
Without a configured catalog feed, this is four dated picks, not the whole store.

Walmart sends X-Frame-Options SAMEORIGIN and CSP frame-ancestors excluding
quantaphi.org. A same-origin proxy iframe cannot provide its authenticated
checkout. Buy therefore navigates to the actual HTTPS Walmart product in the
current top-level browser. The installed native Infinity Platinum WebView can
retain normal HTTPS navigation; that path has not been verified on the owner's
phone. The web card does not launch a withdrawn APK or claim a nested browser.
Bubbles overlay currently sends outside HTTPS links to Android's default browser.

Keep next-item rendering, dated pricing, source image fallback, active-card
eligibility, purchase URL matching and the native/web distinction in future
changes. Do not label snapshot prices live or weaken the Platinum release hold.
