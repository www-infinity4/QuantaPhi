# Developer Library — source-backed building and reviewed changes

Canonical ticket: [QuantaPhi #1790](https://github.com/www-infinity4/QuantaPhi/issues/1790)

## What visitors can do now (after reviewed source merge)
- Keep using all five original, picture-first QuantaPhi developer Quick Cards: Media Star, Quick Card publisher, 501 Affiliates, Infinity Brands and Code/Create Phi. Their real forms and unsent drafts stay mounted when switching.
- Browse nine individually linked official Google/web.dev/Firebase/Android/Maps developer references and one first-party idea workshop. This is documentation discovery, **not** permission to copy Google's design/assets, nor a promise that Google APIs are keyless/free.
- Search 24 categories of public GitHub repositories via [the official Search API](https://docs.github.com/en/rest/search/search). The API exposes at most 1,000 search hits per query and has per-minute rate limits. The UI fetches 40 per page, shows real counts only and handles 403/429/unavailable honestly. A user can browse different topics and query refinements to access thousands of real source options, but **thousands are not claimed preloaded**.
- Preview basic public interface patterns inside an individual source card without executing source code. Inspect official links, repo identity, verified official GitHub favicon (raw user-uploaded avatars are intentionally not displayed), stars and SPDX license flag. A repository's listing or license name is not a declaration of legal permission to reuse its images/code.
- Describe a proposed improvement, see existing known feature status, preview a safe local pattern, copy a brief to the existing in-card Bubbles messenger, and explicitly prepare a GitHub Issue for a human owner/reviewer. This is not automatic source generation, code execution, PR approval or deployed functionality.

## Known site gaps and safe decisions
- Ordinary session-only profile UI already exists. Saved authenticated profiles, identity permissions, encryption and ID/SSN intake are incomplete: continue [#1506](https://github.com/www-infinity4/QuantaPhi/issues/1506). Never claim a new profile is absent or that visitors can collect private identity data.
- Carousel/Quick Card/affiliate builders exist. An improvement must be checked against the present actual code and mobile interactions before replacing a working component.
- Payments, wallet, restricted content, keys, user identity, platform moderation and provider OAuth scope changes require separate, stricter owner approval and tests. The visitor review form cannot authorize these.
- A local unsafe-content filter blocks obvious explicit spam, attempts to steal credentials and sensitive secrets. **It is only a UI pre-screen, not comprehensive moderation.** Public content, uploaded artwork and submitted code would require authoritative server-side review and rights validation before release.
- No visitor submits arbitrary HTML, JavaScript, images or external source to be run on quantaphi.org. All text is displayed with DOM text nodes rather than trusted HTML.

## Scalable data import (separate approval)
The `developer-catalog-import.yml` weekly and manual workflow (also on first push) collects candidate public repository metadata from GitHub's documented API with the Actions token. It backs off between requests and halts without overwriting data if too few responses are available or the API rate-limits it. A successful import creates or updates a **separate pull request** with `data/developer-source-catalog.json` for review. A reviewer must check rights, integrity, relevance and image provenance before merging that data; it does not approve any code from the linked repositories. On-site reading revalidates source domains and keeps only bounded metadata (not scripts) in memory.

A successful workflow dispatch or source PR is **not** proof of thousands of accepted cards. Actual record counts come from the reviewed snapshot. A Bubbles chat view is not proof of a working model/tool or a signed owner build.

## Release checklist
1. Test `node --test tests/developer-carousel.test.mjs tests/developer-discovery.test.mjs tests/developer-catalog-import.test.mjs`.
2. Run `test/developer-carousel.browser.spec.mjs`, `test/developer-discovery.browser.spec.mjs` and the original Android interactive-card regressions on PR exact head. Review source links and content security.
3. Confirm merge receipt independently. Confirm Cloudflare `/developer-discovery.mjs`, `/developer-discovery-core.mjs`, `/developer-discovery.css` and the homepage search work from a real Android browser; no forged counts.
4. Separately verify GitHub import workflow and candidate catalog PR, then the approved catalog data and live source count. Do not call the library fully populated before that proof.
