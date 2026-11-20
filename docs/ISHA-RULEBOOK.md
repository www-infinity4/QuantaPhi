# ISHA Book — Infinity evidence, proposed standards and Bubbles response guide

**Owner project:** QuantaPhi / Bubbles. **Canonical work:** [QuantaPhi #1907](https://github.com/www-infinity4/QuantaPhi/issues/1907), media/rights policy [#1315](https://github.com/www-infinity4/QuantaPhi/issues/1315), public Tor evidence workspace [#1974](https://github.com/www-infinity4/QuantaPhi/issues/1974), licensed media discovery [#1603](https://github.com/www-infinity4/QuantaPhi/issues/1603).

**What it is:** A living, editable collection of observations, safety flags, standards and measures to propose and review. Not a substitute for law, emergency support, a legal finding, official investigation, or a replacement for safety safeguards. Users may propose and edit drafts; proposals do **not** automatically activate enforcement, block accounts, publish allegations, mint coins, or change Bubbles' tool permissions.

## Rules for the rulebook

1. **Document first, classify second:** Every observation has a date, category, basis, source or explicitly `unknown`, and uncertainty; preserve distinctions between a user report, direct observation, official finding and independent corroboration.
2. **No automatic guilt:** A website link, IP address, Tor gateway, screenshot, cryptocurrency label, file hash, public GitHub mention or anonymous comment is not proof of the uploader, server operator or author. Do not name a person without strong direct evidence and appropriate authorization.
3. **Protection remains mandatory:** Never help retrieve, preview, classify by content frame, mirror, bundle, monetize or distribute child sexual abuse imagery, whether on clearweb or onion services. Do not fetch graphic material to make an evidence record; only use permitted non-graphic metadata.
4. **Consent and content rights:** Adult media may only enter an approved card with verifiable age/consent/publisher rights and relevant provider permissions. Neither disability nor a protected characteristic makes consensual adult content inherently exploitative. Do not scrape sites or bypass login, payment, DRM, or restrictions.
5. **Measured response:** Use calm, nonjudgmental language for distress, threats or self-harm, provide clear safety boundaries and appropriate immediate support when danger is urgent. No blanket promise to ignore emergencies.
6. **Proportionate flags:** Prefer `needs evidence`, `hold publication`, `human review`, and `correction requested` over allegations or automatic punishment. Include reason, timestamp, evidence scope, and a way to reconsider a false positive.
7. **Governance:** Label user-authored norms as `draft proposal`; evaluate alongside applicable legal obligations and rights. A rule entered into this book is not enacted national or international law and cannot override legitimate safeguards.
8. **Data minimization:** Do not compile private browsing histories, deanonymize Tor users, harvest visitor identities, follow redirect chains to private hosts, or claim to know every visitor's IP. Analytics require source-verified aggregate scopes and consent as appropriate.
9. **No phantom execution:** An idea, approval, test, PR, merge, deployment, physical Android acceptance, provider API connection, and signed Bubbles runner receipt are separate statuses.

## Initial six observation categories

The app seeds only six editable **drafts**, not an exhaustive permanent policy set: child protection; media publication rights; source provenance; proportional safety; fair treatment; and standards proposals. Owners can create additional entries when a real case warrants it. Preserve the separate mandatory protective safeguards even if all drafts are edited or deleted.

### Bubbles decision record

| Field | Requirement |
| --- | --- |
| ID | Stable ISHA-number |
| Area | Safety / provenance / media / standard |
| Observation | What was actually observed, without speculation |
| Evidence | Public source URL or explicit unknown |
| Measure | Testable recommendation with scope, units where relevant |
| Status | `draft` until authorized review (UI intentionally cannot enact rules) |
| Reviewer/date | Reviewer and UTC timestamp when available |
| Correction | Record appeal/correction and preserve prior receipts |

The **ISHA Book** route is `/isha-rulebook.html`; Bubbles' existing app Quick Card catalog maps `isha book`, `isha rulebook`, `safety rules` and `infinity standards` to this route. The static editor writes only to the **current browser's localStorage**. Export CSV for spreadsheets and JSON for exact validated backups. The app never automatically searches the web, follows onion URLs, uploads evidence, streams videos, or connects to model/runner grants.

## What is and isn't currently Tor

- The [Tor Project](https://support.torproject.org/tor-browser/features/onion-services/) uses direct `.onion` service identifiers in Tor Browser. A `.onion.ly` hostname is a third-party clearnet gateway, **not** the onion service itself.
- A static HTTPS QuantaPhi page cannot truthfully be described as an embedded Tor Browser merely because a text field accepts a `.onion` name. Actual Tor transport needs a separately reviewed, deployed Tor-capable client. Source, user consent, and Android app integration must be evidenced independently.
- The existing [Infinity Open Browser Bridge issue #1287](https://github.com/www-infinity4/QuantaPhi/issues/1287) and draft [PR #1286](https://github.com/www-infinity4/QuantaPhi/pull/1286) are for an owner-controlled public HTTPS browser, not verified onion routing. Keep them separate.
- Approved media discovery can use source-licensed YouTube/publisher metadata and embeds via [QuantaPhi #1603](https://github.com/www-infinity4/QuantaPhi/issues/1603), with no arbitrary adult media scraping or site-wide copying.

## Naming and domains

- `.ky` is an existing [Cayman Islands country-code TLD](https://www.iana.org/domains/root/db/ky), not an unused personal extension.
- A public `.kris` root extension cannot be created by changing website DNS or by renaming `.onion.ly`. New public top-level domains require [ICANN's formal gTLD application and delegation process](https://newgtldprogram.icann.org/en/application-rounds/round2/applicant-journey/prepare-to-apply). Until then, use a name beneath a domain you control (for example a subdomain of quantaphi.org) for ordinary HTTPS paths, with proper DNS/SSL.

## Verification and limits

- `node --test test/isha-rulebook.test.mjs` tests Bubbles card mapping, onion/gateway separation, trusted HTTPS evidence URLs, draft-only rule creation, strict JSON backup, and spreadsheet formula injection neutralization.
- `node --check isha-rulebook-ui.mjs` checks standalone browser module syntax. The new workflow also checks these in GitHub CI.
- Physical Android and in-card Bubbles runtime operations remain **unverified until observed**, and joining a Quick Card catalog does not itself prove a live voice tool route.
- Independent reviewer approval, merge, deployment, canonical-origin browser readback and Android acceptance require separate real receipts.
