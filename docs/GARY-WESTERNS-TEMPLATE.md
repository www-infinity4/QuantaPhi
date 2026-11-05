# Western Birthday Quick Card — reusable template and Gary instance

## What was built

The public birthday URL is /gary/ after the site's deployment publishes this branch. It uses:
- A birthday dedication from Kris to his dad Gary.
- A single lightweight on-page YouTube-nocookie film player with full-length selections from the verified Grjngo Western Movies publisher.
- The existing /bubbles-embed.js module, which talks to the existing QuantaPhi Bubbles Worker rather than a simulated responder.
- A readable, phone-sized interface with buttons and film photographs loaded from the video publisher.

The page is NOT a new live-TV broadcast service. YouTube licenses, geography, embeds and availability can change. Film links are publisher URLs; the embed is loaded only on a user click. When an uploader disables embedding, the visible original-source link is the truthful fallback. The original publisher serves content, ads and playback controls.

## Reusable template versus an individual use

Template: templates/western-birthday/player.mjs

Instance: gary/index.html + gary/films.mjs + gary/main.mjs + gary/style.css

- Template receipt candidate: independently tested reusable validation, poster and embed logic. Future builders can use this in a different birthday page, card, restaurant TV page or approved media room.
- Instance receipt candidate: Gary's user-requested configuration, greeting, approved film sources and UX are specific customer intent applied to the template. An instance may be valuable as a unique use even when no underlying template logic changes.
- Valuation should distinguish **template reuse potential (a peak)** from **individual configured use (many smaller, usually flatter contributions)** using actual customer demand, reuse counts, original creativity, evidence and acceptance.
- This is a design for **usefulness scoring**, not an automatic change to GIT issuance. A proposed 1 verified GIT per eligible accepted newly added source line still requires signed builder/customer provenance, content hashes, repository commit, tests, deduplication, Quant AI validation, and authorized wallet settlement. This page does NOT mint GITs, Bubble Bits, Quants or Star Coins.

Suggested future record fields: template_id, template_version, instance_id, customer_intent_hash, actor_signature, parent_template_hash, commit_sha, source_paths, acceptance_receipt, downstream_reuse, quality_grade, independent_valuation, settlement_status. Never use simple view or click counts as payments.

## Bubbles memory and privacy

No sign-in is required to open the Bubbles widget and chat. Built-in visitor storage supports optional notes and locally retained conversation on that browser, disabled by default. A visitor must deliberately enable it. Synced, wallet-scoped Cloudflare D1 memory is a separate optional verified-wallet flow, not a public guest identity. A returning anonymous browser cannot prove that its user is Gary. Never use a URL parameter, cookie, name string, IP address or localStorage key as identity for server-side private history.

There is no custom shared account or login created for Gary here. If cross-device private memory is needed, Gary must verify his own Unified Wallet identity through the existing Bubbles memory settings; the site's owner session and Robot Brain remain inaccessible to this page.

## Acceptance and safe deployment

1. Run node --test test/gary-birthday.test.mjs (Node standard-library test runner, no npm install).
2. On a preview of /gary/, confirm artwork, movie selection, user-initiated play/pause and no background audio when changing films.
3. Verify the publisher embed is playable from that user's region and does not fail due to provider frame restrictions. If blocked, keep the official-source fallback visible rather than claiming playback worked.
4. Open Bubbles on the page, type a question, confirm a **real** worker reply (not just its bubble UI), and verify no sign-in needed for guest chat.
5. Turn on local memory from inside Bubbles, reload, verify local persistence, then turn it off and verify deletion. Test verified wallet sync only after separate authorized sign-in. Never share the owner wallet.
6. Confirm 320px-wide readability, keyboard access, screen reader status, and no resource errors. Verify /gary/ live before sharing the URL with Gary.
7. No new Cloudflare D1 table or wallet mutation is required for this page. Do not represent a staged PR or published source as a deployed birthday site.

Verified reference film: https://www.youtube.com/watch?v=pH15fIh7xrg (publisher states its movies are legally licensed). Second curated source: https://www.youtube.com/watch?v=CDLk7SJLuGU (same publisher).
