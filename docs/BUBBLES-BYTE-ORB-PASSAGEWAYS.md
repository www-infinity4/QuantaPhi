# Bubbles byte-orb and wallet color passageways

**Existing work:** [wallet identity #1906](https://github.com/www-infinity4/QuantaPhi/issues/1906), [Complete Me AI #1927](https://github.com/www-infinity4/QuantaPhi/issues/1927), [merged numeric colors #2119](https://github.com/www-infinity4/QuantaPhi/pull/2119).

## Why two related, but separate, flows?

The owner described a transparent window whose **color-coded holes** line up to form a data route, and a **size/weight orb** attached to a word that begins at the first letter. The metaphor is implemented in two separate security domains:

1. **Wallet window**: a verified account may already have a server-owned list of authorized app IDs. The original [device color graph](../workers/unified-wallet/device-color-graph.mjs) renders its fingerprint as eleven #RRGGBB tiles. The new `colorPassageStatus` reports exactly which tiles match another display, and only marks the **visual** passage aligned if all eleven match. **It never unlocks a wallet, decrypts a fragment, returns the underlying bytes, issues a session or authorizes a transfer.** Colors can be copied. Signed, origin-bound, single-use WebAuthn/server challenges remain essential for protected data access.
2. **Bubbles word orb**: the first *user-entered* word is encoded using local browser `TextEncoder` UTF-8. The numeric count of bytes determines a bounded orb size, and `Intl.Segmenter` identifies the first grapheme. A grapheme may be one letter, an accented character or an emoji. Byte count is only an encoding-size measure, **not a measure of meaning, value, truth, user intelligence or AI confidence**.

## Live interface additions in source

In the existing Bubbles composer, the **Bubbles typing help** details panel is closed by default. It offers:
- **Try training wheels:** opt in to a few literal, prewritten first-word completions from local code; never a generated prediction from private user memory.
- **Fade suggestions:** after accepted examples, the code reduces suggestions; typing continues entirely under the user's control.
- **Use suggestion:** explicitly tap to replace only the current, still-unfinished first word, with the cursor at the end; no auto insertion, chat send, tools, account reads or microphone actions.
- **Ease off:** turn assistance off without modifying the draft.
- **Byte orb:** when opened, display the first grapheme, UTF-8 byte count and a readable size-coded orb. No draft or transcript leaves the device for this feature.

The old chat Enter/Shift+Enter, send, voice, notes and owner runner remain on their existing paths. The helper doesn't send model requests. If it fails to load, the user's draft stays unchanged.

## Test-drive the "see-through color window"

Open `/wallet-color-passage-lab.html` after it is actually deployed on the site. This is a static **synthetic** lab:
- Generate **two entirely new random synthetic device labels** locally and an artificial account.
- Observe eleven color bulbs, aligned and displaying pale inner holes.
- Misalign one bulb to close the visual route, then realign.
- The page uses no camera, phone-file APIs, wallet token, credentials, storage or network calls, and never reads a real wallet. Its visual "open" indicator must always say **No wallet access granted**.

The lab is not a new authentication or account recovery route. It contains no owner's or customer’s device numbers or secrets.

## Important remaining acceptance

- The RGB lab and typing aid need real website/CDN release readback, native Android WebView visibility, touch controls, accessible screen-reader and keyboard testing. A tested/merged source alone doesn't establish production behavior.
- Real wallet login still uses legacy StarQuest token validation; account-scoped passkey enrollment, atomic challenge replay prevention, revocation, encrypted GitHub backup and two-account physical Android tests remain separately tracked in #1906.
- This layer does **not** auto-finish every sentence, infer a user's emotions, manipulate their words, or carry out work just because a prefix was typed.
- Source TDD and exact-head CI are necessary before source merge; actual signed Android/production acceptance is a separate proof.

## No npm test commands

```bash
node --test test/bubbles-byte-orb.test.mjs test/bubbles-byte-orb-ui.test.mjs test/wallet-color-passage-lab.test.mjs
node --check bubbles-byte-assist.mjs
node --check wallet-color-passage-lab.mjs
node --check bubbles-ai.js
```
