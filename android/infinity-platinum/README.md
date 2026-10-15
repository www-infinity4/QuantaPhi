# Infinity Platinum · Android browser preview

This is a separately installable Android application, **org.quantaphi.platinum.preview1**.
It is a browser UI around the **Android System WebView**, not an independent
Chromium binary and not a patched copy of Google Chrome. It requires an
up-to-date Android System WebView. Android 12 (Moto G Pure) is supported by
the declared SDK level, but real-device installation and permission behavior
must be tested on-device.

## Features implemented
- A mobile address bar, navigation back/forward/home, refresh using WebView,
  three selectable tabs and user-approved Android download handling.
- Android's Safe Browsing and TLS verification remain enabled. File/content
  access is disabled. Mixed HTTPS/HTTP subresources are blocked. Plain HTTP
  navigation is allowed for explicitly selected legacy sites, with an
  insecure-site indicator.
- Website start page at `https://quantaphi.org/platinum/index.html` with visual
  saved tiles, editable titles/links/notes, optional manually picked previews,
  same-device Resume and Code Phi / Create Phi project collection.
- Collect and Build from any visited website open the first-party Platinum
  start page. Only after the native owner explicitly presses Collect/Build,
  native code transfers an HTTPS URL and page title to a first-party
  JavaScript function. The project adapter returns a receipt. **No bridge**
  is exposed to third-party pages.
- Optional Android browser-role picker. Never silently takes the default.
- No token mint, subscription charge, ad-tracking installation, or
  password/cookie import from Chrome.

## Limitations before replacing Chrome as a daily driver
Some sites prohibit embedded WebView sign-in or popups; device-wide password
management, bookmark/cloud migration, browser extensions, private/incognito
tab isolation, advanced security controls, camera/mic permissions, automated
performance comparisons, accessibility audits and on-device testing are not
yet complete. Use the stock browser for sensitive authentication while this
is a preview. Tiles are stored in the Android app's QuantaPhi WebView local
storage and do not silently sync with the main Chrome profile. Actual
publishing requires the separate authenticated Code Phi workflow.

Never represent issue intake or CI success as a fully tested browser release.
