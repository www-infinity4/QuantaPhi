# X Money → Infinity Money: source-backed product and Quick Card roadmap
Date: 2026-10-27
Owner surface: QuantaPhi /x-money.html
Status: X Money outbound-discovery card implemented; Infinity Money banking and telecom are **design only**.
Privacy boundary: never collect SSN, bank or card credentials, passkeys, verification codes, or payment tokens in a QuantaPhi Quick Card.

## 1. Verified X Money offer (official sources)
- Main: https://money.x.com/en
- Product FAQ: https://money.x.com/en/i/faq
- Official updates: https://x.com/XMoney
- X sign-in: https://x.com/login?redirect_after_login=https%3A%2F%2Fmoney.x.com%2Fen
- Banking announcement: https://www.crossriver.com/newsroom/cross-river-powers-x-money-first-p2p-payments-experience-built-into-us-social-media-platform
- At source check 2026-10-27: X Money rolling out in U.S. for adults 18+; requires X account in good standing, verified U.S. phone, identity verification and acceptance of account terms.
- Features: account funding, direct deposit, P2P transfer, bill payment, account details, Visa debit card (virtual and physical), up to 6% APY and up to 3% cashback depending on eligibility, passkeys, transaction controls, customer support.
- Deposit accounts held by Cross River Bank, Member FDIC; additional FDIC pass-through insurance via network sweep requires program terms/limits. X Payments LLC is not an FDIC-insured bank.
- Do not advertise a guaranteed APY, 3% rewards for everyone, eligibility for everyone, free metal cards for everyone or automatic insurance for QuantaPhi funds.
- X owns the sign-in, onboarding, KYC, product terms, account records and customer support. No X consumer-money API or affiliate agreement has been established for QuantaPhi.

## 2. Build parity by using the right partners, not copying X's private software
| Ability | Actual Quick Card today | Prerequisite to independently offer it |
|---|---|---|
| X sign-in / product discovery | Official deep-link to X sign-in + FAQ | Nothing additional for outbound link |
| Pay/send/receive USD | No; users go to X or licensed providers | Money transmission counsel + licensed payments/bank partner; KYC/AML/OFAC risk controls; dispute and refund policy |
| Bank balances, APY, debit issuance, cash sweep | No; no partner or deposit product | Regulated bank/BaaS underwriting, program documents, disclosures, PCI standards where applicable |
| Unified StarCoins / Quants | Existing project wallet is separate | Provenance, financial accounting, reconciliation and limitations: tokens not bank deposits or guaranteed value |
| Real website phone number | Directory links only, no issuance | Telco number provider, number availability and ordering, ownership validation, billing authorization, A2P registration where applicable |
| AI receptionist | Architecture only | Explicit business consent, voice webhook signature verification, recording policy, call transfer, rate/abuse limits |
| One card linking checkout + contact + payments | Research/build intent; only safe outbound links | Partner contracts; tenant isolation; verified domain/organization owner and refund/customer-support flow |

## 3. Phone-number design (separate from X Money eligibility verification)
A public business-directory number is not a number we own, assign or can port without permission.

1. Business owner claims a domain with a verified DNS challenge or verified email on the domain, not merely a claimed name.
2. Identify desired use: directory listing, website call button using existing number, or purchase a new carrier-provisioned DID. Ask only for necessary business data.
3. For the DID path, owner signs into a provider like Twilio/Telnyx; verify country/region and emergency limitations; display exact charges; explicit purchase consent.
4. Check availability through the provider API, then provision via **server-side** authenticated provider action with idempotent request ID; record provider number ID in private tenant DB. Never put provider keys in HTML, repo or client JS.
5. Carrier inbound webhook → signature verification → tenant mapping → published contact rules → interactive voice responder or human transfer.
6. Record calls only with required disclosure/consent; encrypt stored transcripts, minimize retention, permit access revocation and deletion.
7. U.S. business SMS requires A2P 10DLC brand and campaign registration and opt-in/opt-out. No unsolicited promotion, impersonation or verification-code harvesting.
8. Abandoned/exchanged numbers must be delisted, webhooks disabled and directory references corrected.

Source architecture:
- https://www.twilio.com/docs/phone-numbers/api/incomingphonenumber-resource
- https://www.twilio.com/docs/usage/webhooks/voice-webhooks
- https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/quickstart
- https://www.twilio.com/docs/trust-hub/registrations

## 4. Public source research bot roles and accountability
**Observer**: periodically inspect /en, /en/i/faq and @XMoney public release posts. Detect dated source changes and mark claims as current or stale. Never copy private UI or scrape private user accounts.
**Product mapper**: maintain feature matrix with source URLs, exact publication dates, eligibility, economics and any geography carve-outs. Separate live from announced, rumored or simulated.
**UX designer**: compare public accessibility, mobile interaction, sign-in clarity, trust disclosures and real-outbound action completion. Produce original design; do not clone X brand assets, authenticated pages or trademarked material to impersonate X.
**Telecom engineer**: design provider-backed numbering and webhooks, and verify emergency service, consent, A2P, recording, anti-spam and carrier cost.
**Payments/Compliance reviewer**: no money-movement release until banking partner legal approval, KYC/AML, onboarding, product disclosures and independent security audit are documented.
**Integra validator**: test observable browser results, inaccessible links, redirects, and safe navigation. Never claim a payment/account was created because a browser clicked a button.
**Bubbles builder**: prepare separate small PRs with tests and evidence; no unverified owner commands or secrets.
**Ledger agent**: log commits, PRs, releases, provider approval, owners, blocked status, screenshots and verification readbacks; discrepancies block production claims.

## 5. Release gates and test matrix
- X Money links use HTTPS and destination host x.com / money.x.com; no fake login fields, no embedded password collectors.
- Never show simulated balance as real; always label concept graphics, wallet and planned numbers.
- Validate that page sign-in button opens X; compare Money tab requirements to current official FAQ.
- Verify X and Infinity money separated visually and textually.
- Mobile widths 320, 375, 430; Android focus and touch >=44px; reduced motion, browser share fallback.
- New phone-number purchase and SMS controls **disabled/not implemented** until provider approval.
- No proof of an FDIC-insured QuantaPhi account, no automatic finance data access, no claims of signed partnership without contracts.
- Promote only after GitHub PR merged, homepage/CDN served, official outbound links work and live browser screenshot or content readback proves the page responds.

## 6. Next engineering milestones
A. Keep original-source X Money discovery card available in QuantaPhi and Bubbles card catalog.
B. Build a source-update matrix with evidence/date and optional low-volume weekly notifications.
C. Extend existing Directory Quick Card: public verified business phone + website + click-to-call (first; no newly provisioned numbers).
D. Add optional telecom provider connect/setup; legal/compliance review before purchase, messaging and receptionist activation.
E. Create payments-partner feasibility document; do not process USD through the proprietary StarCoin ledger.
F. Build merchant routing and idempotent paid-referral receipts only with authorized agreements; protect all customer data.

This repository document is an engineering plan, not a representation that partner agreements, approvals or real account functions are in production.
