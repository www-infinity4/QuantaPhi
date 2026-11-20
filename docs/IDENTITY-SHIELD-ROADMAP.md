# Infinity Identity Shield · staged build and Bubbles research charter

Status: first public-information Quick Card and public-source monitoring code staged in GitHub. This is **not** a live identity monitoring service.

## Operating objective

Give people a single readable protection view with evidence-backed alerts from accounts they individually authorize. Distinguish unusual events, confirmed abuse, published policy changes, and system failures. A user should never need to type an SSN into an AI chat.

## Stage 1 · Public information research (this PR)

- Oracle Quick Card with original artwork, verified official SSA/FTC links and separate capability statuses.
- Scheduled GitHub Actions checks of only four explicitly allowlisted public agency pages, in a Python stdlib script.
- Published JSON receipt shows each public source URL, content SHA-256, last check, success time and whether a possible source change needs review. A network failure shows unavailable. No page contents, account credentials, SSNs or private documents are uploaded or stored.
- Bubbles/research specialists review changed pages **as untrusted source data**, classify whether relevant guidance actually changed, and write a source-backed strategy note. A changed digest is not proof of a regulation change or identity theft.
- Manual regression, readback, GitHub workflow, Cloudflare routing and Android acceptance required before calling the public monitor live.

## Stage 2 · Authorized personal account integrations (not implemented)

- Design a per-user consent receipt: issuer, purpose, provider, scope, revocation, expiration, session binding and audit metadata.
- Review whether credit bureaus or regulated partners supply permitted account alerts, disputes and freeze status through contractual APIs. No API or access should be claimed without developer agreement, credentials and authenticated end-to-end tests.
- Use official SSA account portal for user-directed manual review; SSA's personal account login does not create general-purpose SSN-usage monitoring privileges. Never scrape protected pages or collect Login.gov/ID.me credentials.
- Build honest monitoring coverage and alert freshness: connected source, oldest/newest observation, failure mode and verified alert provenance. No “all clear” if providers are disconnected or offline.

## Stage 3 · Protected private vault (security hold; issue #1506)

- Default to storing no SSN. Only collect a particular identity attribute when a verified, purpose-limited provider flow actually requires it.
- If legally authorized SSN processing becomes essential, require independent threat model, proper data controller/processor arrangements, strong encryption at rest and in transit with independently protected keys, audited key rotation, strict tenant boundaries and consent, short retention and deletion, abuse monitoring, and professional penetration testing.
- Never put SSNs, bank details, ID photos, OCR text, credentials, access tokens, or account activity into GitHub, GitHub Actions logs, public D1 records, browser localStorage, Bubbles prompts, analytic events or advertising feeds.
- No claim of 100% security; fail closed on uncertain authorization.

## Stage 4 · Evidence-based alerts and recovery (not implemented)

- Only issue a “possible identity misuse” alert after a verified, authorized source reports a relevant individual event. Explain what source, timestamp and evidence triggered it.
- Separate identity proof, credit inquiry, account opening, SSA earnings discrepancy, and actual fraudulent activity; a signal alone is not guilt, identity theft proof or a confirmed SSN leak.
- Give users manual verification and dispute steps. Credit freezes/IRS IP PINs and FTC recovery actions link to official providers; never claim QuantaPhi performed those actions without authenticated receipts.
- Keep notification delivery secure, private, idempotent and user-controlled; test false positives, clock differences, stale sources, provider outages and account closure.

## Bubbles strategy research queue

1. Map official SSA my Social Security account notices and earnings/benefit exports, including what is and isn't authorized for third-party automation.
2. Evaluate approved credit data-provider contract requirements and monitoring coverage without requesting any user SSN in chat.
3. Compare passkeys, cryptographic consent receipts, key custody and independent security audits for a potential high-assurance identity vault.
4. Define a source-event schema and alert classification taxonomy with explicit evidence/coverage limitations.
5. Run a weekly public-agency-source monitor, then produce concrete proposed code tickets for genuine changes with independent review.

Work remains separate from financial account connections, Bubbles wallet and account settings. Refer to issue #1765 for public research and #1506 for private identity-vault security.
