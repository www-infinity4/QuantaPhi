# Infinity Platinum · Android browser preview

> [!CAUTION]
> **SECURITY HOLD — DO NOT INSTALL OR DISTRIBUTE THE PREVIEW APK (October 17, 2026).**
> Avast flagged an installed preview build. Source review separately found globally enabled cleartext HTTP traffic. The actual cause of the antivirus detection is unverified. This is not proof of either a false positive or a trojan. The old GitHub Release asset may still be directly accessible; do not download or install it. Public website download and automatic release publishing are being disabled while binary inspection, multi-engine scanning, signing/provenance verification and on-device review are pending. Users who installed the preview should uninstall it and run Play Protect or antivirus scans.


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
  access is disabled. Mixed HTTPS/HTTP subresources are blocked. Plain HTTP navigation is disabled in the security-hardening source. No replacement APK is cleared for release.
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
