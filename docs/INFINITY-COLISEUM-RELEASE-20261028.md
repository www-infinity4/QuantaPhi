# Infinity Coliseum — Zeus 6.2 release candidate (October 28, 2026)

Zeus 6.2 is an independent Infinity/QuantaPhi experience edition, not a newly trained model or an official OpenAI/ChatGPT version.

## Built in source
- Ported Coliseum, four Greek-god editions, nine sectors, local idea drafts, branching, private notes and Chat/Build toggle onto the latest QuantaPhi main without overwriting the current carousel.
- A Zeus card in the Oracle rotation with the established Follow, Star, Collect, Share and +1 Build actions.
- Cloudflare D1 shared-room API under workers/coliseum/worker.mjs with real StarQuest verification for each authenticated request, HMAC-pseudonymized members, one vote/member/idea, shared messages, project branches, atomic 1,000-member free-edition capacity and rate limits.
- Opt-in live-room panel wired to an independent Worker endpoint, while keeping existing private drafts on-device. It shows that the beta is offline when not enabled.
- Unit and integration-contract tests and a dedicated workflow.

## Activation — required checks
1. Review PR and all CI; test browser/mobile at 320/360/393/720px.
2. Create a **new dedicated** D1 database named infinity-coliseum, not a wallet/Brain database; apply only workers/coliseum/migrations/0001_coliseum.sql.
3. Deploy bundled worker at workers/coliseum/worker.mjs to an isolated Cloudflare Worker named infinity-coliseum. Bind COLISEUM_DB to the new D1 database; confirm the import of ../../coliseum/room-api-core.mjs is bundled.
4. Provide the encrypted MEMBER_PEPPER Worker secret (32+ random characters). Never commit the secret or StarQuest credentials. Changes to the pepper require membership migration planning.
5. Supply BETA_ALLOWED_MEMBERS as an explicit comma-separated list of preapproved HMAC member IDs, not raw usernames. Users must already have actual StarQuest devices/accounts.
6. Maintain OPEN_COLISEUM_BETA=false until a two-account end-to-end test passes and moderation, abuse reporting and data deletion/export requirements are reviewed. The API fails closed if any secret, D1 binding or allowlist is absent.
7. Verify real StarQuest account authentication, rejected incorrect credentials and cross-origin requests, two different invited members' posts and votes, 1,000 capacity under simultaneous joins, source timestamps, D1 persistence, and on-device controls. Review quota, cost and abuse policy.
8. Add human moderation and appeal/report tools and verify privacy/terms before broader public chat. Do not make an unmoderated public board.
9. Only then merge, deploy actual production assets on quantaphi.org, verify service and provide real release receipts.

## Billing and official recognition
Free, invited beta: Zeus 6.2 and Hermes 6.6. Athena 7.0 at proposed $23/month and Hephaestus 7.3 at proposed $100/month remain concepts; no payment or subscription is implemented. Before billing: PayPal merchant verification, sandbox and signed webhooks, refunds/cancellation, secure entitlements and limits.

Publish under Infinity/QuantaPhi branding as its own verified-domain product. Do not call it OpenAI's newest model or use GPT/ChatGPT marks as part of the product name. An approved AI API may later be connected with disclosure of its actual provider, real model ID and metered pricing. New custom GPT creation for personal ChatGPT accounts is unavailable in the October 2026 OpenAI documentation; plugin distribution is a separate possible path.

## Readiness
This is a source-level release candidate until approved CI, D1 migrations, identity/moderation tests, reviewed merge and live deployment receipts are established. Do not claim live users, AI responses, payments or release solely from committed files.
