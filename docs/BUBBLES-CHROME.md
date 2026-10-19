# Bubbles in Chrome and as an Android overlay

## Install the Chrome app
Open https://quantaphi.org/bubbles-chrome.html in **Google Chrome** and use **Install Bubbles in Chrome** if Chrome offers the prompt, or **Chrome ⋮ → Install app / Add to Home screen**. Chrome shows Bubbles as a standalone installed web app with its own icon. The app launches the QuantaPhi Bubbles website on the same origin, so a valid Chrome website session is available without manually copying wallet tokens. It is **not** a shared Android-WebView or ChatGPT session, and server-side login expiry still applies.

The manifest identity is pinned to `/bubbles-chrome.html`, with real 192px and 512px icons. The service worker caches **only** the public, unauthenticated offline landing page and app icons, not personal chat, wallet state, authentication endpoints or private pages. Offline Bubbles cannot perform online tasks or access a cached wallet.

## Let Bubbles operate Chrome on Android
Open the **Bubbles Preview 5 APK** (v0.42.0 or higher), tap Recommended setup and approve microphone/overlay permissions, then enable **Brain workflow learning** under Android Accessibility. Open the Chrome app using the Bubbles settings shortcut or say **“Bubbles, open Bubbles in Chrome.”** The command requests the URL in Chrome; it does not assert Chrome actually opened until the foreground view verifies it.

Examples while Chrome is visible:
- “Bubbles, read Chrome page.”
- “Bubbles, tap Search in Chrome.”
- “Bubbles, scroll down in Chrome.”
- “Bubbles, open QuantaPhi in Chrome.”
- “Bubbles, open Chrome then tap Search then type cats into Search” (bounded spoken workflow; UI confirmation remains required for sensitive controls).

Chrome-specific commands require the real visible foreground app package `com.android.chrome`. If Chrome is not foreground, no action occurs. Accessibility can read the currently visible page, scroll, tap exact accessible labels, and type into explicitly selected safe fields. It cannot inspect hidden Chrome tabs, bypass website security, read protected password fields, silently click permission prompts, or install desktop extensions on Android Chrome.

For continuous **session** assistance Bubbles can remain listening with the overlay and screen-follow mode turned on. This means fresh screen evidence on user turns, not background capture of every screen frame or video. Android MediaProjection consent is separate for video recording, and reapproval may be required by Android for a new recording.

A website-only Chrome installation does not wake up with “Bubbles” or float over other Android apps. Those features require the native APK and the user's explicit Android permissions.

## Verification
Run `node --test test/bubbles-chrome-pwa.test.cjs` and `javac` + `ChromeControlPolicyCheck`, or inspect GitHub Actions **Bubbles Chrome app and Android page-control contracts**. Passing tests do not prove installation and command operation on a Motorola phone.
