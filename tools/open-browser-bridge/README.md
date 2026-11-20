# Infinity Open Browser Bridge · isolated Tor research transport

This is an **owner-controlled browser automation bridge**, not the Tor Project's Firefox-derived Tor Browser and not a TinyFish source-code copy. The original Playwright URL/screenshot tool still exists; this branch adds an opt-in **Tor SOCKS5 transport and kernel-isolated Docker topology** for lawful, source-authorized public research. It does not provide Tor Browser's fingerprinting protections or a public interactive GUI. No paid browser API is required, but the Linux host must provide Docker and enough memory for Chromium.

## Network isolation design

The browser service is connected **only** to a Docker `internal: true` network (`172.30.211.0/24`). Docker is expected to block that network's direct access to external networks. The separate Tor service joins both that internal network and an outbound bridge, and exposes SOCKS5 **only at `172.30.211.2:9050`** to the browser's fixed IP `172.30.211.3`. Neither container publishes host ports. Browser TCP cannot directly reach the public Internet or host metadata; the Tor SOCKS endpoint is the intended egress. The Tor service's outbound network is not attached to the browser.

Defenses in depth: non-root process, Chromium sandbox (fails closed if unavailable), Playwright's upstream default-deny seccomp profile with user namespace syscalls, dropped Linux capabilities, read-only root, `no-new-privileges`, temporary writable filesystems and private receipt volume. The browser's direct DNS resolver is set to loopback; Chrome routes proxied domain resolution through Tor SOCKS5. Before launching, the code checks both Linux route tables for default routes and rejects a missing isolation signal or altered Tor proxy endpoint. HTTP/WebSocket URL filters operate at browser-context scope; metadata and local IPs are never allowed destinations. HTTP is accepted only for explicitly allowlisted v3 `.onion` services in Tor mode. Ordinary Internet pages require HTTPS and an exact host allowlist. `.onion.ly` gateways are not treated as onion services.

Security limits: an untrusted host administrator or compromised Tor sidecar can violate network boundaries. The image is not a substitute for the Tor Project's browser protections; it does not authenticate site claims or identify Tor service operators. The fixed `172.30.211.0/24` subnet must not collide with another local network. Do not attach the browser container to a normal bridge network or grant `NET_ADMIN`/`SYS_ADMIN`; do not disable Chromium's sandbox to make a failing environment pass.

The seccomp profile is sourced from [Microsoft Playwright's upstream file](https://github.com/microsoft/playwright/blob/main/utils/docker/seccomp_profile.json) at blob `fddc05fb520affb145404e6f6f647ca96af8087d`. Review updates before changing it. Docker's internal-network isolation contract is documented at https://docs.docker.com/reference/compose-file/networks/ .

## Run on a Linux host with Docker Compose

```sh
cd tools/open-browser-bridge
BROWSER_ALLOWED_HOSTS=example.com docker compose -f compose.tor.yml build tor browser
docker compose -f compose.tor.yml up -d tor
BROWSER_ALLOWED_HOSTS=example.com docker compose -f compose.tor.yml run --rm --no-deps browser network-probe.mjs
BROWSER_ALLOWED_HOSTS=example.com docker compose -f compose.tor.yml run --rm --no-deps browser chromium-smoke.mjs
BROWSER_ALLOWED_HOSTS=example.com docker compose -f compose.tor.yml run --rm --no-deps browser browser-bridge.mjs https://example.com
docker compose -f compose.tor.yml down
```

For an authorized onion target, explicitly add its **complete, valid v3 `<56 characters>.onion` hostname** to `BROWSER_ALLOWED_HOSTS` and use its direct `http://` or `https://` URL, not a clearnet gateway. If the Tor daemon has not bootstrapped, navigation may fail and must not fall back to direct network access.

The browser prints a bounded JSON receipt with the URL, title, selected transport and saved screenshot path. Screenshots are held in the private `browser_receipts` Docker volume and are not publicly served or copied into Git. The screenshot content may be sensitive, so use owner-authorized test pages only. `docker compose down -v` permanently removes these named volumes, including Tor state and receipts.

The original direct-mode command (`node browser-bridge.mjs https://example.com`) is a developer-only scaffold; its Node DNS checks do **not** constitute a network sandbox. Never use that mode with untrusted websites, credentials, or multi-tenant workloads.

## Test and release gates

`node --test tools/open-browser-bridge/*.test.mjs` covers URL, DNS, context, Tor route, and Compose policy. GitHub Actions `open-browser-bridge-policy.yml` also builds real Docker services and runs `network-probe.mjs` (direct IPv4/IPv6/private/metadata socket attempts) and `chromium-smoke.mjs` (non-root sandboxed Chromium plus blocked metadata navigation). These tests must be **observed passing on the exact current head**, not merely defined.

An independently approved security review, successful real Tor stream/circuit acceptance, signed owner-scoped job sessions, screenshot/session privacy checks, verified deployment and physical Android acceptance remain distinct requirements. No Bubbles execution adapter or APK is connected by this source patch. An official Tor Browser fork would require the Tor Project's separate Firefox/GeckoView source and release build system (https://gitlab.torproject.org/tpo/applications/tor-browser-build), not the Chromium bridge.
