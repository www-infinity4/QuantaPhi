---
name: code-review
description: Independently review QuantaPhi Quick Card pull requests for credential exposure, unauthorized website/account access, unsafe wallet behavior, source authenticity, XSS/open redirects, Android usability, regression coverage, and Cloudflare deployment parity before publication.
---

# QuantaPhi Quick Card security and release review

For pull requests changing the Quick Card catalog, card website browser, Bubbles action controls, or QuantaPhi Cloudflare frontend, review the exact **head commit** and the full diff. Do not assume that CI success, a source registration, or a click simulation proves provider authorization or production behavior.

## Independent review checklist

- **Source trust:** Source registries accept only explicit IDs and HTTPS domains. Server calls must use registered destinations and validate returned publisher URLs. Reject untrusted URLs, redirects, userinfo, and source mixing. No scraping of provider login pages or authenticated data.
- **Truthful behavior:** Live source results display verified publisher links and receipts. Provider failures show errors; no fabricated feeds, provider login, completed action, stock value, payment receipt, or claimed deployment.
- **Output safety:** Render provider text as text, not unsanitized HTML or Markdown; validate links before display. Inspect DOM/URL parameter handling, clipboard/Share links, iframes, inline previews, and browser cross-origin boundaries.
- **Identity and wallet:** No provider cookies or tokens carried from ChatGPT, no private API call without provider consent, no client-only confirmation of sign-in. Follow/Collect/Build do not mint spendable tokens, reset balances, erase wallet receipts, or execute unauthorized purchases.
- **Availability and cost:** Keep website reads explicitly user-triggered, bounded, quota-controlled, and rate-limited. Never expose server API keys to browser code or make unbounded costly browser calls.
- **Accessibility and performance:** Check 320/360/393/430px Android widths, keyboard focus, labels, screen reader live regions, no horizontal overflow, no duplicate generic controls, and reasonable initial page weight. Verify all 56 cards can be resolved from search and deep links without loading 56 heavy providers at once.
- **Release parity:** If a frontend registry ID is added, ensure the corresponding Worker bundle also includes it and deploys before claiming live reader support. Validate current PR head checks, review requirements, merge SHA, Cloudflare Worker version, live URL readback, and receipt. Never bypass holds or claim that a GitHub merge is a deployment.

Leave actionable, file-specific comments with severity and reproduction steps for any failure. A Copilot Comment review is useful evidence but is not automatically a required GitHub approval. Mark publication ready only when all repository review/protection gates and real deployment verifications are satisfied.
