# Bubbles Android security/Google Play path — October 18, 2026

## Verified findings from source
- Bubbles declares microphone, overlay, media projection and an exported, system-protected Android Accessibility service in its manifest. The latter can read visible screen text and take screenshots.
- In `ScreenVision.describe()`, a user-requested screenshot **is uploaded to the Bubbles Cloudflare /v1/assist endpoint**. Previous onboarding text claiming "Captures stay on your phone" was misleading about screenshot analysis.
- Android/Google Play permission approval is not a certification that a sideloaded APK is safe.
- Google Play Integrity is **not a malware scanner**, and adding it to a sideloaded debug APK would not prove the binary is harmless.

## Source changes in this draft PR
1. Explain screenshot upload, optional local learning, ten-minute remote phone tool, and potential exposure of other apps' visible data in a separate affirmative-consent dialogue before opening Android Accessibility settings.
2. Reject screen inspection, learning-event capture, taps/scrolls and phone-tool requests unless the owner has agreed to the disclosure **and** Android Accessibility is connected.
3. Allow the owner to revoke the in-app consent immediately, stopping phone control and queued learning; direct them to Android Settings to revoke the system permission too.
4. Change the landing-page text to distinguish locally saved recordings from screen images transmitted for cloud analysis.
5. Do not alter mainline APK distribution, signing or unrelated Platinum quarantine.

## Release blockers — not solved by this PR
- Google Play's Accessibility policy restricts autonomous planning/execution through Accessibility services by non-accessibility-tool apps. Bubbles' remote AI-driven phone-control mode needs a **policy and security review**; a consent dialog does not make prohibited automation permissible. For a Play build, consider removing that functionality entirely and using explicit, user-initiated Android actions rather than Accessibility automation.
- Audit app-originated network destinations, dependencies, exported components, WebView JS bridges and credentials. Check that screenshots do not contain account secrets, permission dialogs or payment data before allowing remote analysis. On-device only screen processing is preferable for sensitive information.
- Scan the **compiled APK** with Google Play Protect, Android lint and independent malware/static tools. A clean scan is not proof of safety and a positive detection cannot be dismissed without investigation.
- Ship through a correctly configured Google Play Console closed testing track with Play App Signing, Data safety and privacy disclosures, where eligible. Sign release artifacts with protected keys. Debug GitHub artifacts are not official Play packages and must not be promoted as safe releases.
- Preserve the **Infinity Platinum APK security hold** until its separate issue and binary audit are closed. No bypass or antivirus evasion is part of this work.

## Google documentation
- Accessibility API policy: https://support.google.com/googleplay/android-developer/answer/10964491
- Privacy best practices: https://developer.android.com/privacy-and-security/about
- Play Integrity API: https://developer.android.com/google/play/integrity/overview

**Status:** source review and consent patch only; Android build, device tests, binary malware scan, Play policy approval and store release remain separate evidence requirements.
