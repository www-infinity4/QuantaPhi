# Collectible Quick Card set — release gates

**Issue #1830.** The Media Star Developer carousel links to a local, consent-only collectible draft page. It is NOT a purchasable set, creator payout, verified scarcity registry, crawler feed, or image ingestion service.

## User journey
1. User explicitly selects the free cover and 2–30 images from a device. File picker is not an album scanner; no automatic read of saved pictures or other visitors' Quant activity. User separately opts in to a local suggestion.
2. The browser computes SHA-256 digests solely to reject identical selected files; no file data is submitted. The creator states ownership or licensing; the platform must review evidence separately.
3. Creator sees one free cover and a proposed 1 Star Coin per numbered collectible. **Ten paid images plus a free cover = ten possible unlocks, ten Star Coins**. All are currently UNAVAILABLE for purchase. Existing owner images must not be repurposed for another user's card without consent.
4. Creator may copy a GPT build brief and open official ChatGPT via the existing QuantaPhi viewer. No file transmission to GPT happens automatically.

## Rarity and provenance
- Hash digests establish byte-equality, not legal ownership. A signed first-publication record, authenticated creator, license, edition cap, declared original asset chain, source evidence, moderation, counterclaims and takedown appeals are required before public minting.
- Exact hash and optional perceptual comparison may flag other uploads; avoid falsely labeling transformed works and fair uses as stolen. No technology can guarantee screenshots, re-uploads or off-platform resale are impossible.
- A re-upload must not inherit the original creator's right to sell or bypass the original set's signed lineage. Rejection needs due process and appeals.

## Payments and wallet authorization — NOT IMPLEMENTED
- Build a separate, first-party creator ledger using Cloudflare D1. Do not copy Fred's protected Curio Spotlight ledger, fixed recipient, X recordings or payout routes.
- Creator is server-authenticated and owns fixed recipient binding. A buyer explicitly chooses each previously unseen piece. Signed-in server validates content, available balance, account and campaign status before atomic, idempotent debit + creator credit + entitlement receipt. Duplicate click or refresh returns the existing entitlement without a second charge.
- Keep viewer debit, curator credit, proposed Infinity content-attribution coins, Quants, cash, Stars and other token types in distinct reconciled entries. Never invent settled spendable coins. Handle refunds/reversal, locked-content removal, deleted account, disputes, abuse and stolen artworks.
- Serve the original protected image only AFTER server-side cryptographic entitlement validation. No client-controlled flag, public asset URL or browser-only check can protect paid bytes.
- Do not profile or serve public ads based on saved images without separate user consent and documented privacy controls. Do not infer sensitive traits.
- Prior to monetization: privacy/IP review, accessibility/Android browser test, authenticated creator and buyer accounts, D1 migrations with receipts, financial/compliance review, independent security tests, owner-approved merge, production readback and wallet reconciliation.

Current proof: draft-only front-end with focused Node tests; no public collectible set, unlocked paid image, automatic AI analysis, D1 database or commercial entitlement is claimed.
