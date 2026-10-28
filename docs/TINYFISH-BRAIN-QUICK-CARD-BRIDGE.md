# TinyFish read-only Quick Card broker — integration status

The live Cloudflare bindings have already been added to `bubbles-tools` and `infinity-brain-clock` as `TINYFISH_BROKER` pointing at `continuity-session-coordinator` (production). The same 64-hex-character secret `TINYFISH_BRIDGE_TOKEN` is saved privately in all three Workers. The upstream `TINYFISH_API_KEY` belongs **only** to the coordinator. Never copy either secret into a file, browser, README, screenshot, URL, GitHub action output or chat.

## Staging checkpoint — October 28 UTC

- Recovered deployed coordinator `entry.mjs`, `view.mjs`, `worker.mjs` as complete source without public credentials.
- Added protected `POST /internal/tinyfish` to the coordinator. The default GET routes and five-minute scheduled observer remain intact.
- Cloudflare staged (not deployed) version: `e8adb821-b120-46ee-9ea8-84200989f430`.
- Staged version bindings inspected: all 10 original bindings survived, including `TINYFISH_API_KEY`, `TINYFISH_BRIDGE_TOKEN`, `WORK_DB`, site and browser services.
- Version URL smoke: `GET /` returned the expected eight-track dashboard; `GET /health` returned service=continuity-session-coordinator and configuredTracks=8. `GET /internal/tinyfish` returned HTTP 405, while the old production version returns 404; this confirms the added route without exercising an API key. Version preview URLs were re-disabled afterward to restore original settings.
- Latest `bubbles-tools` production deployment had removed `TINYFISH_BROKER`; this was repaired directly via Cloudflare settings PATCH and verified. Follow-up deployments must preserve it using the Wrangler file.
- `wrangler.toml` now pins the existing service bindings, D1 and `*/5 * * * *` schedule; secret values remain out of source.
- No authenticated POST call through the coordinator, TinyFish upstream success, or browser/Android Quick Card click has been verified yet.
- Unit CI workflow added in the branch, but verified successful test output for this head is still unavailable; do not infer green CI from workflow existence.

**Production release remains blocked.** Do not overwrite the deployed coordinator until an authenticated POST smoke, source/regression tests, and rollback check are all complete. Continue with this exact staged version where possible, avoiding full worker replacement.

## Request path and scope

Quick Card source link → explicit 'Live card source' click → `bubbles-tools /v1/assist` (typed `tinyfish.fetch`) → private `TINYFISH_BROKER` service binding → authenticated `POST /internal/tinyfish` coordinator → TinyFish free Search/Fetch API → observed result and source receipt → card text.

The Brain has the same service binding, but *no Brain caller or automatic private tool execution is enabled yet*. Wallet, ticket and consent gates are unchanged. Search/Fetch only; agent navigation, signed-in actions, checkout, and paid automation require a separate reviewed adapter and per-user consent. Card button is an intentional no-op until Workers are deployed; on failure the card falls back to opening the original site without claiming a TinyFish result.

## Verification before calling connected

1. `node --test test/tinyfish-card-bridge.test.mjs`
2. Stage the coordinator, `bubbles-tools`, and card assets from the reviewed commit without removing settings/bindings.
3. Confirm requests without `X-Tinyfish-Bridge-Token` return 401 and do not consume the TinyFish key.
4. Verify one actual TinyFish read of a public page and a real card click returns source text, an observation time, and `receipt.status=complete`.
5. Verify existing `/health`, `/status`, scheduled observations, Brain owner access, cards, and Bubbles chat remain working.
6. Record an actual production deployment version and rollback pointer before announcing the result.

Do not treat Cloudflare binding readback, a passing unit test, or a GitHub commit as evidence of a successful TinyFish request.
