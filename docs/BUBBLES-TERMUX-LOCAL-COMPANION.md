# Bubbles local Termux companion — staged October 27, 2026

This is an opt-in native Android/Termux **local transport foundation**. It does not create or claim a second ChatGPT/Oracle AI, make cloud calls, run arbitrary shell commands, bypass Android permission prompts, or change the main site. It is separate from Bubbles One's consented `com.termux.RUN_COMMAND` bridge.

## C13B0 / Termux

Requirements: installed F-Droid Termux with Python 3.13+, 50 MB or more free storage. No npm, node backend, API key, subscription, or GitHub personal-access token required. Check the PR and CI before installing anything on the device.

After this feature is released to a reviewed GitHub branch, the script can be installed under Termux with:

```sh
cd ~
mkdir -p "$HOME/c13b0-bubbles"
curl --fail --location --silent --show-error --proto '=https' \
  https://raw.githubusercontent.com/www-infinity4/QuantaPhi/main/scripts/c13b0-bubbles-termux-daemon.py \
  -o "$HOME/c13b0-bubbles/server.py"
chmod 700 "$HOME/c13b0-bubbles/server.py"
python3 "$HOME/c13b0-bubbles/server.py" selftest
python3 "$HOME/c13b0-bubbles/server.py" install
python3 "$HOME/c13b0-bubbles/server.py" status
python3 "$HOME/c13b0-bubbles/server.py" bench
```

**Do not use the `main` URL before the reviewed PR is merged.** Start is idempotent. To stop: `python3 ~/c13b0-bubbles/server.py stop`. Private one-time bearer token is stored with mode 0600 in `~/.local/share/bubbles-termux/owner-token`, never pasted into chat. Local loopback address is `127.0.0.1:18767`.

`install` creates a small startup hook under `~/.termux/boot/bubbles-companion`. For reboot startup, the owner must separately install and activate **Termux:Boot** from a compatible trusted source and allow Android background operation. Termux and Android can still suspend/kill the process due to battery policy; no guarantee of uninterrupted operation. The hook does not force a wakelock or expose any port over Wi-Fi/cellular.

## Transport and safety

`GET /health` — no private data, just local service uptime and explicit model `none`.

`GET /v1/status`, `POST /v1/roundtrip`, `POST /v1/dialogue/check`, `POST /v1/stop` — only local native clients with bearer authorization. Requests with a browser `Origin` header are rejected. No CORS headers are returned. Max 4 KiB per request, no shell or GitHub/wallet operation, and no transcript text stored. The dialogue checker only flags JSON-like tool syntax and possible speech-safe assistant text; it is **not** an AI, semantic intent compiler, or execution authorization.

`bench` measures median/95th-percentile **loopback HTTP** latency only, never cloud model/voice end-to-end time. A native authenticated Android endpoint integration would require an independent scoped credential handoff; a browser/WebView must not receive the local bearer credential or request arbitrary Termux execution. Never route private ChatGPT cookies, unified wallet material, or Cloudflare tokens through localhost.

## Voice status

QuantaPhi already contains `workers/bubbles-gpt-live/index.js`, `bubbles-gpt-live.js`, and Android Live microphone policy. Official GPT-Live `gpt-live-1` is a separately billed WebRTC API requiring a project API key and authorized session broker, *not* an entitlement included with ChatGPT Plus sign-in. As inspected on October 27, the deployed `bubbles-live` Worker had **no configured bindings**; production Live start is therefore not verified and should fail closed. The source-level voice UI is not evidence of a successful real-time audio call.

## Acceptance gates

1. `python3 -m py_compile ...` and `python3 ... selftest` on CI; `bench` only after running on Termux.
2. Owner Android StarQuest wallet login must be verified **inside Bubbles' WebView**, not inferred from a Cloudflare binding or this local daemon.
3. Probe local HTTP from the phone; confirm no public listener, no token/CORS leak, Termux:Boot recovery after reboot and Android background battery behavior.
4. Exercise a real Bubbles chat text response, a model tool-call result with a verified receipt, and live audio start/interruption/stop separately. Never claim remote coding actions, GPT-Live audio, or phone performance from synthetic tests.
