# Shop Phi and Ad Phi action card

Oracle Octaves shop window on the QuantaPhi home page, reusing Shop-Phi's topic-based eBay buy-it-now lane, WidgetPhi's owner-protected shop item contract, and ControlPhi's Ad Phi offer connection.

Users can write an item listing with title, image URL, price/currency, seller, description and seller item/contact URL. Drafts save locally and can be exported. External listings open in QuantaPhi's existing viewer, with an original seller link available. Collect stores the exact item in quantaPhiCollected; Star saves it, and Share sends its original seller URL. No checkout or balance is invented.

Without approved inventory the card displays an explicitly labeled marketplace shopping source; it does not pretend a search link is an individual product. Ad Phi's next-offer API supplies sponsored offers when available. Empty ad inventory leaves shopping available. No AdSense controls are modified.

## Authenticated publishing

Set `window.ShopAdPhiConfig = {apiBase:'/widgetphi', siteId:'verified-site-id', instanceId:'verified-shop-card-id'}` before loading the card, using actual provisioned owner site/card IDs. The same-origin prefix must proxy WidgetPhi's catalog API with its existing trusted owner session; browser credentials are never taken from localStorage or spoofed owner headers.

The deployment must already provision a shop-phi card. Publish listing configures its Shop Phi profile, stores the draft item, and publishes that item using the existing API. It does not publish an entire private site. Site/card publication remains with existing owner controls. The Published shop button loads the public catalog. Without configuration no public publishing button is offered; Save listing draft says local-only.

The existing publisher supports descriptions up to 650 characters. Longer drafts (up to 20,000) are preserved locally; publishing asks for a shorter public description. Direct sales still require a seller checkout/contact destination. Native order handling/payment settlement are not implemented here.

Sources: www-infinity4/Shop-Phi/index.html; www-infinity4/WidgetPhi/src/widgets/shop-phi.js and cloudflare/shop-phi-api.mjs; QuantaPhi/wallet-runtime.js Ad Phi next-offer API.
