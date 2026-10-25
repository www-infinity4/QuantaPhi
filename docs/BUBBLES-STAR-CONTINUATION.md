# Bubbles literal-star routing

The owner clarified that a single `*` in Bubbles must make Bubbles drive the
owner's ChatGPT conversation history. ChatGPT continues the unfinished work.
The star route therefore uses `bubbles-cloud-browser.mjs` and the latest-eight
controller, rather than dispatching the internal repository builder.

See [the ChatGPT continuity contract](BUBBLES-CHATGPT-CONTINUITY-ROUTER.md) for
account selection, the five-day gates, bounded sends, repeat protection, current
browser/session limitations, and production acceptance.

`bubbles-star-continuation.mjs` retains its read-only ticket selection and
one-dispatch helper for existing internal work flows. Its presence and tests do
not mean that the Bubbles star command runs those helpers. Existing Brain jobs
and their receipt verification remain separate from browser conversation
continuation. Neither a queued job nor a ChatGPT reply proves completed work.
