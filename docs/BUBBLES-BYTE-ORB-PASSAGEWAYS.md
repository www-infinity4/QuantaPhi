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

## Symbolic signal-cavity receiver · November 22, 2026 extension

The owner described a stream interpreted as black standby → white available light → yellow arriving data → red inspection → orange selection. Blue/green/purple represent the specialized result paths. The intermediate colors may be **control-plane guides**, not pixels painted onto the finished screen. The "hole" or cavity is represented as an aperture mask that passes or blocks a packet without having its own visible color.

This is now a small, fully **synthetic** and **bounded** software model in `bubbles-color-cavity.mjs`, and an opt-in receiver demo in `wallet-color-passage-lab.html` + `wallet-color-passage-lab.mjs`. It is **not** an engineering assertion that television receivers process black/white/yellow in that order. Real broadcasts use encoded stream formats, decoding and rendering; LCDs and OLEDs form their light with different physical technologies. Color identifiers and software filter choices do not establish an independent transport protocol.

- `routeCavityFrame` accepts at most 128 **metadata-only** synthetic packets, each with a routing label and a byte count, with no content, user identifiers, access tokens or device state. It selects only a caller-requested channel through a Boolean aperture array; invalid channels, payloads, byte counts, masks and oversized batches fail closed.
- `COLOR_CAVITY_STAGES` carries the labels black (standby), white (illumination), yellow (incoming), red (inspect), orange (decide), blue (research), green (build), purple (review). The output lists the requested channel and count/weight only; it never claims physically emitted RGB filter colors or a real decoded payload.
- `reduceCavityFrames` sums bounded frame receipts without accumulating raw packets. Simulated trillions of bubbles are a **scaling metaphor**, not a claim to allocate or process trillions of browser elements.
- The demonstration offers an explicit **Enable white signal**, requested-channel picker, a cavity-open/closed toggle, one-frame advance and optional slow playback. No playback starts by itself; it stops on page hide. Reduced-motion preference disables auto-play, and a static frame-step remains available. All controls are locally synthetic and never unlock the wallet.
- Even perfect visual alignment is not actual authentication, data transfer or money movement. An authenticated server is required for any real device stream. Neither this patch nor the existing RGB window branch authorizes any new database, login or permission.

Source tests: `node --test test/bubbles-color-cavity.test.mjs test/wallet-color-passage-lab.test.mjs`, included in the Bubbles unified CI. Exact-head checks and live-device acceptance remain separate. PR #2120 stays in draft while the pre-existing public Bubbles health endpoint returns `Bubbles health: missing JSON response`.

Display technology background:
- Dolby Professional Support, [Display Technologies Overview](https://professionalsupport.dolby.com/s/article/Display-Technologies-Overview)
- Stanford, [Display technologies for vision science](https://stanford.edu/~wandell/data/papers/2016-Handbook-DisplayCharacterization-Galleys.pdf)
