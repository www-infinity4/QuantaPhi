# Private Quick Card browser broker — source-only review

This is an **unprovisioned source prototype**, not a deployed service. The 116 Infinity accepted brand cards and their direct official-site links are **already published** through PR #1165 / main merge 5702024. Do not roll back their page presence.

## Trust boundary

- No public workers.dev endpoint, route, cron, OAuth grant, account profile, D1 binding, or browser session is declared. Only a reviewed Brain service binding may call `POST /internal/quick-card-browser`.
- Brain must independently authenticate its owner, validate consent, reserve a unique request ID in its Durable Object, enforce the daily paid-run budget, and associate status reads with the same owner/job. This broker does **not** replace those controls.
- The broker additionally requires `X-QuantaPhi-Broker-Token` to match a separately provisioned `TINYFISH_BRIDGE_TOKEN` secret. It must not be placed in public HTML, headers sent to browsers, GitHub, logs or prompts.
- Only fixed-source, public, mapped Infinity accepted **durable** brand actions are allowed. Search, AI-provider, signed-in, media, account, purchase, posting, and checkout actions are denied. Caller-provided URL, goal, cookie, profile, and arbitrary instructions are rejected.
- Only this private Worker should eventually hold its own provisioned `TINYFISH_API_KEY`. The owner's existing coordinator secret remains untouched; do not read, export, copy, delete or relocate it. Neither the key nor bridge token has been provisioned to this new Worker.
- Provider responses are capped and returned only over the private service binding. Brain must continue to filter same-site links and mark provider results unverified. Provider errors are deliberately generic.

## Not ready to deploy

The live Brain `TINYFISH_BROKER` binding currently targets `continuity-session-coordinator`, an observation-only Worker. Its source still expects a direct Brain provider key. **Do not point Brain at this broker or deploy either Worker from a partial Wrangler fragment.** Review the full existing Brain settings, service bindings, D1, source, and rollback first.

Before any release: independent code/security review; separate authorized secret provisioning without extracting the existing coordinator key; private service-binding reassignment; a reviewed Brain adapter translating its durable start/status receipts to this typed contract; exact-head tests; budget and per-user isolation tests; signed owner acceptance; and a real end-to-end provider receipt. Existing five-day wallet/provider grants remain distinct and revocable. Never infer that an authenticated ChatGPT or Gemini session exists from the StarQuest wallet.

This prototype is deliberately restricted to read-only public-brand navigation. It cannot make consumer ChatGPT/Gemini sign-ins work, automate purchases, or provide general visitor browsing. No paid API run has been initiated here.
