# Infinity accepted brand cards — October 27, 2026

The owner supplied 116 entries, grouped 29 / 22 / 45 / 20, and asked for priority
over other brands and genuine TinyFish website actions. Preserve every supplied
name, including model restrictions. Infinity acceptance is owner catalog curation,
not manufacturer affiliation or a blanket durability/lifetime-warranty claim.

## Implemented source

- `infinity-accepted-catalog.mjs`: 116 immutable curated records, trusted identity
  resolution and model/category qualifiers. Caller-supplied badges cannot assign
  accepted status to another site.
- `infinity-accepted-sources.mjs`: dated original website imagery and navigation.
  **111 sources observed, 106 source images, 341 action mappings**. No generic
  QuantaPhi image replaces missing brand artwork.
- Existing Oracle carousel and discovery feed admit all 116 owner-accepted cards, retain
  each card's real node, Follow / Star / Collect / Share / +1 Build handlers,
  preserve explicit card selection and strict Following membership, and prefer
  accepted brands within the least-exposed group. Every card remains reachable
  in complete rounds. Accepted cards have no generic Google search fields.
- `quick-card-tinyfish-actions.mjs`: primary website controls are direct links to
  observed destinations for every visitor. Optional Bubbles reads remain typed,
  authenticated actions. Owner verification precedes dispatch. Running or
  ambiguous starts block another run; recovery reuses the same request ID.
- `workers/infinity-brain-clock/quick-card-browser*.mjs` and the existing Brain
  route: authenticated, fixed-source browser tasks, bounded request/result streams,
  durable duplicate guards, manual result checks, server-only credentials and a
  16-start UTC-day pilot budget. Public brand reads use a fresh browser without
  owner account profiles or vault credentials. Payments stay on merchant sites.
- Terminal runs without same-brand source links do not count as completed reads.
  Provider output is still an observation requiring independent verification.
- Phone cards scroll internally; their carousel navigation remains available.

The reusable universal browser modules were adapted from the draft work in
PR #1156. This branch does not include its X publishing or Gemini prompt features.
Reconcile these three overlapping module paths before merging that other draft.

## Source holds

These appear in the carousel with their official website and an action-verification
notice. They have no automated website-action controls until verified:

| Entry | Observed limitation |
| --- | --- |
| Speed Queen | Official-page fetch timed out twice. |
| Casio (G-Shock/Classic Line) | Official pages blocked automated source reads. |
| Ronson | Ronson.com is parked for sale. Official brand information was found at Zippo; a matching shopping/repair action remains unverified. The parked domain is not an active card destination. |
| Fjällräven | Official source read blocked. |
| Fisher Space Pen | Official pages returned HTTP 429. |

Knipex's US official site was separately verified and used instead of its blocked
global homepage. Therm-a-Rest and MSR now redirect to their Cascade Designs
brand pages; those exact destinations were observed. The fi-series scanner record
preserves the supplied Fujitsu name while linking its current Ricoh/PFU source.

## Live acceptance evidence and blocker

TinyFish run `c6c18b10-fc73-4299-85c3-d5006add0459` clicked Framework's
**Shop all → Parts** and **Support → Knowledge Base**, and returned
`https://frame.work/marketplace/parts`,
`https://knowledgebase.frame.work/`,
`https://guides.frame.work/c/Framework_Laptop`, and an observed part link.
The agent also made an irrelevant knowledge-base search for the name of the
quick-card integration. That produced no article; it was not a required website
capability. The observed navigation is useful evidence for these destinations,
**not a live QuantaPhi-to-TinyFish runtime receipt or acceptance of every brand**.

The owner installed `TINYFISH_API_KEY` on `continuity-session-coordinator`.
A later binding inspection also found a private `TINYFISH_BROKER` binding and
bridge-token metadata on Brain. These settings do not supply the provider
adapter implemented here: this source expects a direct Brain key, and the live
scripts still lacked a broker route during the independent review. No secret
values were read, copied or committed. Preserve the current workers and secrets.

The October 27 owner follow-up explicitly requested that the cards be put on the
page. Publish carousel placement and direct website navigation independently of
the unfinished authenticated browser adapter. Do not hold the cards in an
unpublished draft because Bubbles reads await activation, and do not claim those
reads work. No production Brain/coordinator deployment is part of page placement.
Public multi-user metered browsing still requires per-user authorization and
budget integration. An authenticated live receipt remains required for that
separate integration.

## Validation

The targeted Node suites cover catalog completeness, model restrictions,
trusted URLs, priority/round coverage, guest and wrong-origin denial, stream
limits, fresh-profile isolation, receipt recovery, request-ID conflicts and
unverified provider output. Existing interactive-card regressions are included.
`test/infinity-accepted-browser.spec.mjs` adds phone-width and typed-request
checks to the existing Chromium CI job.

The source was also inspected in the managed Chrome preview at 390 × 844 via a
phone-width frame and on desktop. Collection and signed-out action behavior
were observed. Browser preview is not an Android APK or production device test.

Primary integration references:
- https://www.tinyfish.ai/blog/how-to-use-tinyfish-webhooks
- https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
