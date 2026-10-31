# Infinity Coliseum — Zeus 6.2 product and release plan (October 27, 2026)

Owner concept: Zeus 6.2 first; other independent Greek-god product editions for sector-based collaborative building.

## Truth in marketing
- Editions 6.2, 6.6, 7.0 and 7.3 are Infinity product versions, **not OpenAI model IDs** or claims of unreleased ChatGPT models.
- Never market "ChatGPT's newest model Zeus" as a fact. Label the actual AI provider and API model ID when a verified supported integration exists.
- Chat/Build is an original Coliseum experience. Do not copy any other company's proprietary advertisement, UI code or authentication.
- The first revision is device-local only: no real group chat, real votes, memberships, or paid AI access.

## Model card program
Zeus 6.2 — Free — discovery, first pitches, beginner builds — prototype.
Hermes 6.6 — Free — research, team routing, rapid prototypes — concept.
Athena 7.0 — Coliseum Pass at a proposed $23/month — cross-sector business and build rooms — concept.
Hephaestus 7.3 — Forge Pass at a proposed $100/month including Coliseum — advanced engineering and creation — concept.

Each edition has a planned cap of 1,000 active authenticated members. A future backend must enforce the cap atomically and display true counts, with an opt-in waitlist and no invented availability.

## Backend rollout
1. Identity: use QuantaPhi wallet/passkey or approved OIDC. Every public member has a verified identity and room-scoped permissions. Keep guest drafts private until explicit publish. No fake sign-ins.
2. Group builder: Cloudflare Durable Objects serialize real-time room events; D1 stores authenticated memberships, project lineage, votes, subscription entitlements and receipts. Split large editions into smaller topic rooms under the shared 1,000-member limit.
3. Joust: human users vote on an IDEA, not the worth of the individual. One verified vote per member per round. Provide support, constructive critique, requests for revision, and fork. A visible quorum/threshold governs proposal progression; AI contributions are clearly marked as nonhuman and do not count as human votes.
4. Declined idea: propose appropriate sectors, voluntary private continuation, or an opt-in branched project. Do not remove a paying customer from all membership because their idea was unpopular; handle misconduct separately with clear rules and appeal.
5. Fork: preserve parent project lineage and source permissions. Never copy private conversation histories or move members without permission. Two teams may split productively.
6. Chat/Build: real Chat tab will show participant messages under verified identity; real Build tab will have project pitch, tasks, source-backed research, milestone receipts and reviewable artifacts. Local prototype presently provides device-only draft interactions.
7. AI Builder: integrate currently available supported APIs and disclose provider, model ID, usage, privacy and costs. Let AI propose successor Infinity experience editions, compile prototypes and compare evidence; no release, billing or claiming a newly trained base model without owner approval and validation.
8. PayPal: after verifying the seller merchant, create legitimate subscription products/plans using supported PayPal onboarding, server-based APIs/SDK, signed webhook verification and idempotent receipts. Confirm API/SDK eligibility first. Never grant access based only on a user-facing payment success URL, and never commit PayPal address, phone or API keys publicly. Support cancel, billing period, receipts and refunds policy.
9. Security: per-user privacy, strict authentication, anti-abuse, transaction-safe capacity, consented invitations, exports/deletion and moderation audit.

## Release acceptance
- Source page /coliseum/ exists with Zeus, Hermes, Athena and Hephaestus editions.
- Original Zeus Quick Card registers in the Oracle homepage carousel and retains Follow, Star, Collect, Share and +1 Build.
- Mobile and keyboard tests at 320, 360, 393 and 720 pixels.
- UI does not claim fake users, AI responses, current seat counts, subscriptions or third-party partnerships.
- Run unit tests and browser QA. Staging, code review, payment sandbox verification, wallet receipts and real production deployment are separate. A draft PR is NOT a live launch.
- The owner-designated PayPal contact and phone number are deliberately not embedded on the public page.

## Future roadmap
Release Zeus prototype; build real identities and room backend; integrate a licensed currently available AI model; connect PayPal sandbox and test cancellation/entitlements; launch paid rooms only after working access; expand Hermes, Athena, Hephaestus; let AI propose and benchmark further Greek editions subject to independent human approval.
