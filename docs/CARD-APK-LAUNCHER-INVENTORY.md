# Card APK launcher inventory — source preparation only

Owner queue: [#1192](https://github.com/www-infinity4/QuantaPhi/issues/1192), tickets `IW-20261028-DD1151EC` and `IW-20261028-31E0757C`. The latter's reader blocked because it could not find a canonical stable card-ID inventory or a per-card configuration contract. **Neither requires an owner to retype the already published IDs.**

## Authoritative inventory and contract

- `infinity-accepted-catalog.mjs` exports the existing **116** accepted card IDs, names and official-source metadata. It is the identity authority; do not hand-maintain a competing list.
- `android/card-launchers/card-launcher-catalog.mjs` derives a stable, one-to-one source manifest per accepted card. Export `CARD_LAUNCHER_MANIFESTS` or call `cardLauncherManifest(id)`; reject unregistered IDs.
- Each manifest has `schemaVersion:1`, `cardId`, `applicationId`, `displayName`, `entryUrl`, `allowedOrigins`, `launchMode`, `publisher`, `thirdPartyPublisherApp`, `nativePermissions`, `releaseState`, `apkAvailable`, `twaVerified`, `signingVerified`. The module also exports `validateLauncherManifest` to reject altered manifests.
- The launch URL is **QuantaPhi's own** `https://quantaphi.org/?card=<stable-id>`, using the existing `oracle-card-deck.js` deep-link handling. It is **not** the third-party manufacturer's website or app.
- `applicationId` is derived deterministically from the card ID using `org.quantaphi.cards.<underscored_id>`; check Android package uniqueness and naming in tests.
- This inventory covers the 116 published accepted-brand cards **only**. The wider Quick Card ecosystem uses additional registries. Do not silently claim those IDs are included or use this subset to authorize bulk APK builds.

## Safety and completion gates

The manifest intentionally contains no native privileges, signing keys, private account sessions, download URLs, brand logos or provider OAuth credentials. `launchMode=owned_site_external_browser` is a safe **design contract**, not an installed Android launcher. A real native wrapper or TWA needs separate Android project code, owner-domain asset links if TWA, approved branding, signing, security scan, test build, verified artifact, independent review and physical Android acceptance.

**APK hold #525 remains in force.** A generated Gradle flavor, source manifest or successful unit test does not lift that hold. The separate website-to-APK plan is `docs/plans/website-to-apk-builder.md`. Do not publish an APK or show a working Download button until a real signed artifact and allowed release are verified.

Run `node --test test/card-launcher-catalog.test.mjs` and inspect exact-head CI. Existing unrelated ticket `IW-20261028-DD1151EC/TASK-1` failed an immutable edit match in Moltnook run 40630926200; its exact file/path is not established by the log and must be separately diagnosed from the edit plan, not guessed.
