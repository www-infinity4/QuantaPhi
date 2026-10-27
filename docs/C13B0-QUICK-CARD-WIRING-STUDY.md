# C13B0 Quick Card wiring study — source-to-card schematic

A reusable study surface at `/quick-card-wiring.html`. Its goal is to reuse **actual URLs and provider-controlled interfaces** whenever possible, rather than silently rebuild a platform.

## Source-of-truth wires

| Component key | Original source | In Quick Card | Authorization / actual proof |
|---|---|---|---|
| Provider | Official HTTPS host verified from URL | Provider name, original-source link | Never trust display name alone |
| Search | Observed official web search route | Text input or original link | Link works at original domain; no invented API |
| Account login | Provider's real, verified sign-in URL | Open original website/Chrome Custom Tab | Provider controls login; return is not proof of Bubbles access |
| Embedded site | Official URL | iframe only if provider permits | CSP frame-ancestors / X-Frame-Options can block |
| Public video | Provider's documented embed/deep link | Original media player | Follow player permissions/licensing |
| Private user data | Scope-specific authorized connector or explicitly permitted, user-authorized browser workflow | Bounded source-attributed preview with timestamp | Separate consent + server receipt; never reuse browser cookies |
| Follow/Star/Collect/Share/+1 Build | QuantaPhi verified component code | Shared actual card controls | Local ≠ server-ledger confirmed |
| External writes | Documented provider action or attended official website | User-initiated official action | Must require review/confirm for payment, post, follow, or send |
| Integra | Original domain, feature and security test | Validation receipt and unresolved issues | No release claim absent test evidence |

### Cloud browser vs. iframe

The original site can run in its own browsing context, sometimes already signed into that provider. A QuantaPhi parent page **still cannot read its DOM, tokens, password, cookies or private API responses** because of cross-origin controls. Cloud Browser / Work is a separate authorized browser session and can help people interact with websites in that session, but results cannot magically sync back to a different visitor's in-card logged-in session. Where the user explicitly authorizes a documented connector or a permitted browser workflow, store **only the bounded results with provenance and consent**, not session secrets.

No automatic copying of other sites' JavaScript or modification to bypass frame policies. No fake provider logins, scripted consent bypasses, or sensitive-data import via a proxy. External site links should stay visible.

## StarMaker example

- Source `https://www.starmakerstudios.com/en/songs`.
- Sign-in `https://www.starmakerstudios.com/en/web-login`.
- QuantaPhi independent interactive example `https://quantaphi.org/starmaker-embed.html`.
- Licensed karaoke tracks, duets and personal account remain on StarMaker absent approved access.
- Native local karaoke mic/backing/effects already exist separately in the QuantaPhi card.
- Neither inspecting the website nor clicking a link implies StarMaker API access.

## C13B0 cart

The repository provides `scripts/c13b0-quick-card-wiring.sh`: Termux Bash + Python standard library, no npm, no paid API, no prompts. The script produces:

- `~/C13B0-Quick-Card-Wiring/card-input.json`: editable original-source details and explicit source links.
- `~/C13B0-Quick-Card-Wiring/wiring.json`: filled keys, missing authorization slots and actual route status.
- `~/C13B0-Quick-Card-Wiring/index.html`: original website control surface and optional iframe test with fallback.
- `~/C13B0-Quick-Card-Wiring/WIRING.md`: validation checklist.

The defaults use StarMaker. To change websites, edit `card-input.json` then `python ~/C13B0-Quick-Card-Wiring/generate.py`, or call it with `--website https://example.com/ --title "My Quick Card"`. No GitHub automatic publishing occurs unless the owner chooses to publish using the existing `/quick-card-builder.html`.

## Integra review role

Integra is the validation-only reviewer on the Quick Card wiring plan, not the owner executor. As of creation of this document, **no new Integra Gmail, X, or Google profile has been registered** through the existing linked Gmail/Google account. An authenticated user must complete a provider-owned Google account signup and verification to make a distinct mailbox; the Gmail connector does not create accounts. Do not invent the address, assume access, store a password or show a connected badge without verified readback.

## Tests and release

- Node: `node --test test/quick-card-wiring.test.mjs`.
- Browser: `test/quick-card-wiring-browser.spec.mjs` through existing Android-width Playwright suite.
- Local Termux: Bash script syntax + run generator + inspect manifest; keep generated credentials empty.
- Deployment: GitHub merge is not proof that `quantaphi.org/quick-card-wiring.html` responds. Verify the public path before claiming live.
