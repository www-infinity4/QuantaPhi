# Personal Bubbles hashtags, source verification, and community routing

This change is **stacked on PR #641**. PR #640 separately implements the owner's `#bubbles` X-account scanner. Merge/reconcile them before enabling overlapping scanner routes. This is source under review, not a deployed service.

## Two distinct channels

### Personal bubble (`#albert` example)

Fred can use Customize Bubbles to name his assistant **Albert**, open **Your own Bubbles hashtag**, select X and enter his account handle. The Worker resolves that handle through X's official numeric account lookup (where provisioned). Bubbles creates a fresh random verification challenge and shows:

    #albert verify <unique challenge>

Fred posts that exact sentence from the actual connected X account, selects Verify, then Scan my hashtag. The server fetches that numeric account's recent official posts, checks `author_id`, validates the exact `#albert` token, and saves matching instructions in **Fred's wallet-scoped inbox**. Hashtags by unrelated accounts have no authority, even when spelled identically. Changing the bubble name or account invalidates the previous proof. Repeated posts do not duplicate inbox rows.

A wallet session is needed to access the private account profile and inbox. Account identities cannot be borrowed from usernames typed by someone else. The social proof grants access to that account's public posts only; it does not authorize GitHub code changes, transfers, cookies, private messages, other users' devices, or modifications to QuantaPhi.

**Facebook Page** is an unconnected provider scaffold. Meta Graph Page access and proof of Page ownership/approved permissions are required. A normal Facebook personal profile cannot be assumed readable or controllable from the outside, and no functionality bypasses Facebook permissions.

### Public `#bubbles` community channel

Public proposals have a separate GPT review and can be offered as *research, UI fixes, contextual sponsor candidates, alternate placement, or rejected*. GPT is a relevance adviser, not an owner-token issuer. Low-risk research can be investigated in read-only workflows; site edits still need a scoped tenant's verified repository/domain rights and tested change receipts.

Examples:
| Public suggestion | Decision candidate | Suggested placement |
| --- | --- | --- |
| `#bubbles draw dicks on QuantaPhi` | Reject public-page vandalism | None |
| `#bubbles make the words more readable on QuantaPhi` | Prioritize UI accessibility investigation | Existing UI/readability |
| `#bubbles add Xavior AI to its best fitting place on QuantaPhi` | Relevant integration proposal | AI Sources / Explore, unless another placement is justified with permission |
| `#bubbles do research on iodine #krIswatson` | Relevant research | Learn/research |
| `#bubbles add my AI to Fred's Media Star card` | Reroute; third-party card insertion not authorized | AI Sources / Explore |
| `#bubbles add Bitcoin advertising near Fred's Media Star` | Review disclosed, contextual advertising | Adjacent sponsor spot, not inside Fred's editorial card |

## GPT and inspection

The server only calls the official OpenAI Responses API when a server-side `OPENAI_API_KEY` is configured. Default model is `gpt-5.1` with `reasoning.effort=high`; a different compatible model may be selected by `COMMUNITY_GPT_MODEL`. Budget and rate limits are required. Missing provider access means `needs_review`, never a fabricated AI verdict. Model assessment can improve placement, but may not override the deterministic card-owner / sensitive-access restrictions. Every code change still needs verified repository authorization and tests.

## D1/Cloudflare rollout

1. Review and apply `schema-bubble-personal-social.sql` to the **existing** authorized `WORK_DB` after backup. This is additive; do not reset any wallet, ledger, or previous tickets.
2. Preserve and verify existing `BOT_WALLET` service binding for validating signed-in users through `/v1/wallet/state`.
3. Configure `X_API_BEARER_TOKEN` as a Cloudflare Worker secret. The X provider plan must permit `GET /2/users/by/username/{username}` and `GET /2/users/{id}/tweets`. Server reads are bounded and fail closed when unavailable. No need to put API keys in browsers or GitHub.
4. Keep `COMMUNITY_SUBMISSION_SALT`, `OPENAI_API_KEY`, and existing `WORK_DB`, `WRITER_OWNER_HASH`, `CLOCK`, `MODELS` unchanged and protected; verify all bindings before any deploy.
5. Run `node --test test/bubbles-personal-social.test.mjs test/bubbles-community-upgrades.test.mjs`, plus existing Brain owner tests and device-width UI checks.
6. Confirm two different wallet users cannot claim the same verified X ID, cannot see each other's inbox, and cannot dispatch to a site without permission. Review actual D1 write receipts and live service logs.
7. Keep the Infinity Platinum APK security hold intact.

## Next capabilities, not claimed live

- Page-level Facebook Page read connection using official Meta authorized app review.
- Verified tenant-owned website repositories/domains, scoped execution grants, and owner-configurable automation policies.
- Continuous authorized polling and rate/budget controls, not relying on a user leaving a browser tab open.
- Proven source-based bug reproduction and independent validation before immediate low-risk changes.
- Creator/advertiser contracts, anti-fraud review and separate StarCoin reward policies.

No public API scan, account challenge, or live GPT review is verified until the Worker is deployed, its schema is migrated, account proof is completed and actual receipts are returned.
