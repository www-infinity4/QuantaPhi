# Infinity Phone: one web key, cellular onboarding and portal dialing

The owner's desired UX is **one Infinity Phone application and identity**, with its own dialing/search interface for visiting the web and opening Infinity apps. This file distinguishes that experience from the underlying cellular security hardware, which cannot safely or legally be replaced with a website password.

## Identity and activation

**Already implemented:** a person picks `quantaphi.org/phone/<alias>` and receives a randomly generated owner secret stored on their device (currently browser localStorage, with explicit private backup). This key authenticates ownership of that one Infinity *web phone line*. The switchboard stores a cryptographic hash, not the plain owner key. The browser can call a second registered web line while the handset has working Wi-Fi or mobile data.

**Separate physical network key (not active yet):** an Infinity-operated LTE network must authorize the handset's modem and its SIM/eSIM through the network core. An operator-issued subscriber profile (IMSI, K and related private fields) is provisioned into compatible SIM/eSIM hardware and the core's protected subscriber database. This is separate from the QuantaPhi web owner key; do **not** display SIM authentication secrets in the page, derive them directly from the web key, download them as a JSON file, or read them from arbitrary Android device identifiers. The user's phone number alone is not LTE authentication.

### Provisioning sequence for a real pilot

1. Infinity deploys an authorized cellular radio with spectrum/SAS coordination, Open5GS or another suitable EPC, real IP uplink and appropriate firewalling.
2. User installs Infinity Platinum using already available Wi-Fi, existing mobile data, factory preload, or a *local* non-Internet enrollment path. The site cannot be loaded over a radio link that has not yet established connectivity; app download cannot bootstrap itself from nothing.
3. User consents to enrollment in the Infinity cellular pilot using the saved Infinity web-line identity and separately verifies person/account control where needed. Robot Brain may orchestrate the request, **not** extract confidential SIM keys or device identifiers without authorization.
4. Operator approves eligibility and issues a protected SIM/eSIM profile through an authorized provisioning mechanism. No invented SIM activation, number assignment, or provisioning receipt.
5. With a compatible handset inside coverage, modem authenticates to Infinity's LTE radio/core, gets real IP connectivity and can reach third-party sites through the first-party Platinum browser.
6. QuantaPhi shows subscriber identity and a **real radio/core confirmation** (attach, IP allocation, network name, signed backend receipt). A browser `fetch` check only says the current network reaches a URL; it does not prove radio attachment to Infinity.
7. Calls to other web subscribers go through Infinity Switchboard. PSTN calls/SMS and externally reachable real phone numbers need their own provider and compliance stack.

## Infinity Portal QuickDial

Web phone dial codes open existing first-party destinations without giving away the owner key:
- `*100` — QuantaPhi home and search;
- `*101` — Infinity Platinum browser (including external web destinations);
- `*102` — Bubbles on the QuantaPhi page;
- `*103` — Robot Brain owner sign-in and verified jobs;
- `*104` — Infinity Cellular network readiness;
- `*105` — Infinity Phone web-call interface.

These are **app shortcuts, not telephone numbers**. None require the user to re-enter the phone key merely to navigate; Robot Brain still enforces its established owner authentication for work and private records.

## Social-network account phone numbers

A site such as X/Twitter, Google or Yahoo may require an actual verified, SMS/voice-capable conventional number. A generated Infinity URL or an invented sequence of digits is not such a number. Infinity cannot claim a real PSTN number or receive external verification codes until that number is legitimately assigned through a telecommunications provider and an SMS/voice gateway is provisioned. Create Infinity website dial routes on demand without publishing unknown people's identities or private phone-number mappings.

## Privacy and permission requirements

- Device identifiers and SIM credentials must not be silently ingested by the Robot Brain. Collect the least data necessary with opt-in purpose, account-level authentication, retention limits and revoke/delete controls.
- Web line secret must not leave the first-party phone registration/authentication endpoints. QuickDial and search do **not** transmit it to third-party websites.
- Quant search/collect accounting must be user-visible, opt-in where required, and respect sites' privacy and access restrictions; it is not a license to intercept passwords, SMS or third-party browsing content.
- Protect internet and emergency access outside pilot coverage using existing carrier or Wi-Fi service until independent emergency support is certified. `/cellular/` must not claim it can deliver coverage today.

**Acceptance for any claim of activation:** independently verifiable radio/attach/session evidence + a real upstream Internet packet test using the Infinity network, not merely a saved key, checked box or robot job.
