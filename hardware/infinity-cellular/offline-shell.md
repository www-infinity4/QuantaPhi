# Infinity Platinum / Phone: scoped offline shell

## What is really available without network connectivity?

After the user opens `https://quantaphi.org/platinum/` and `https://quantaphi.org/phone/` at least once over a working Internet connection and the service workers **complete installation**, each of these pages can be reopened from the same browser/WebView origin even if Wi-Fi and cellular data are subsequently unavailable.

- **Platinum:** existing saved website tiles, tile editing, notes and local Phi projects remain accessible using current first-party local browser storage. An offline search of tile titles/URLs/notes is provided. External websites and current AI search answers are not available without connectivity.
- **Phone:** the public dialer user interface and existing on-device drafts/owner web-line record can load offline. `4-333-3333#` and `*100` are *application shortcuts*, not a physical connection or a completed phone call. The live Switchboard health check shows disconnected when unreachable. Calls, X/Google/SMS verification, new line registration and Robot Brain actions require Internet and appropriate servers.
- **Bubbles:** the existing Bubbles implementation remains on QuantaPhi. This change does not introduce a second Bubbles database or pretend cloud inference runs on a disconnected handset. To offer a genuinely local Bubbles language model, voice recognition, or offline search index, those components require separately bundled/licensed models, a memory/storage design and testing against available RAM/storage.

## Offline cache boundary

Two Service Workers with narrow scopes:
- `/platinum/offline-sw.js`, scope `/platinum/`
- `/phone/offline-sw.js`, scope `/phone/`

Each caches only versioned public static HTML/CSS/JS and the single shared public Phi project adapter. Navigations to the canonical public shell use **network-first**, falling back to its existing cached page after a connection failure. Static assets use **cache-first** within the known immutable versioned list. No broad origin interception.

**Never** cache authenticated or arbitrary API responses, QuantaPhi homepage search results, Cloudflare D1, webhooks, phone aliases/number pages, SMS, SIM/owner secrets, tokens, Bubbles sessions, Robot Brain commands, or third-party browsing. Users' local browser data is deliberately stored by existing first-party application code rather than copied to service-worker caches. The service workers do not bypass TLS, native permission dialogs, or spectrum licensing.

Updating the service-worker versions will rotate their cache namespace. On a failed pre-install, the worker does not activate partially, so it does not replace an older functional offline installation with incomplete assets. Browsers and Android may evict cached app files when storage is constrained; offline availability cannot be guaranteed indefinitely without Android app-bundled assets.

## Native dialer and system status accuracy

Gemini's suggested manifest was not implemented. The XML namespace `http://android.com` is incorrect: Android uses `http://schemas.android.com/apk/res/android`. Declaring `ACTION_DIAL` does **not** automatically intercept the stock dialer or grant the app the default-dialer role. Becoming the default phone UI requires the user's approval, a full `InCallService`, incoming and ongoing call UI, and emergency-service handling by the OS. `PROCESS_OUTGOING_CALLS` was replaced by `CallRedirectionService` for Android 10+; an app cannot universally snoop keypad presses. The browser's `window.statusBar.hide()` does not exist as a portable web API. The existing **INFINITY** badge is inside Platinum and describes connectivity honestly; it does not overwrite Motorola's real LTE indicator.

Official Android docs: https://developer.android.com/develop/connectivity/telecom/dialer-app ; https://developer.android.com/develop/connectivity/telecom ; https://developer.android.com/guide/webapps/service-worker

## Validation

`node --test test/infinity-offline-shell.test.cjs` verifies offline replay of public shell assets and that wrong-scope URLs, authenticated requests, phone aliases, external traffic, and POST do not pass through the shell cache.

`node --test test/infinity-platinum.test.cjs test/infinity-quickdial.test.cjs test/platinum-phone.test.cjs` preserves the existing navigation, Bubbles links and web calling contract.

The first online installation of the Service Worker is mandatory; neither a dialer code nor an offline URL alone creates Internet access.
