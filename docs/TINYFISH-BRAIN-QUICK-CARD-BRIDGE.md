# TinyFish read-only Quick Card broker — integration status

The live Cloudflare bindings have already been added to `bubbles-tools` and `infinity-brain-clock` as `TINYFISH_BROKER` pointing at `continuity-session-coordinator` (production). The same 64-hex-character secret `TINYFISH_BRIDGE_TOKEN` is saved privately in all three Workers. The upstream `TINYFISH_API_KEY` belongs **only** to the coordinator. Never copy either secret into a file, browser, README, screenshot, URL, GitHub action output or chat.

## Unfinished release gate (do not claim this is live)

The existing `continuity-session-coordinator` deployment currently has a five-minute scheduled observer, public read-only `/health` and `/status` routes, and static page assets. Its live main and view modules have **not** been replaced on this branch; do not redeploy the coordinator from a partial source tree.

To activate the source module after staging an exact, audited snapshot of its complete currently deployed Worker modules, add to its worker module:

```js
import {tinyfishBroker} from './tinyfish-broker.mjs';
```

At the beginning of `fetch(request, env)` after computing the path, **before** the existing GET-only guard:

```js
if(path==='/internal/tinyfish') return tinyfishBroker(request, env);
```

Preserve the existing five-minute scheduled handler, Durable Object/D1 bindings, views, source revision and all other routes verbatim. Never replace the coordinator with only `tinyfish-broker.mjs`. Upload/stage the complete module set with inherited existing bindings, compare the exact pre-/post- binding identities and routes, verify test receipts, and only then promote.

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
