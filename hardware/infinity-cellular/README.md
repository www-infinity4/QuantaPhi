# Infinity Cellular: buildable private LTE pilot

**Owner goal:** Infinity Platinum devices should access the public Internet through an **Infinity-operated cellular radio network**, without each end-user needing their own third-party cellular subscription. `quantaphi.org` is the management/control interface and Infinity Phone service; it does not physically provide wireless spectrum or Internet bandwidth. No hardware has yet been installed, and no cellular service is claimed as active.

## Physical architecture

```
Approved 4G LTE Band 48-capable phone or modem
    + provisioned, operator-controlled test SIM
      ↕ authorized 3.5 GHz CBRS radio
FCC-certified CBRS CBSD/eNodeB + SAS spectrum access
      ↕ site Ethernet/fiber/fixed-wireless LAN
Open5GS 4G EPC core (MME, HSS, SGW, PGW/UPF)
      ↕ routed IPv4/IPv6 gateway, firewall, DNS
Independent, funded upstream Internet link
      ↕ public Internet (all permitted sites and apps)
Infinity Platinum site + Infinity Switchboard over that data link
```

The **first proof** is an ordinary user device with its non-Infinity cellular connection disabled, joined to the authorized Infinity test radio/SIM, receiving a private network IP address, resolving DNS and loading `https://quantaphi.org/cellular/` and unrelated public websites. Record packet counters on the gateway, effective throughput, signal conditions, handover behavior (if more than one site), and uptime. Website fetches using the existing phone carrier are not proof of the private LTE connection.


## Motorola Moto G Pure compatibility finding (October 2026)

The Motorola Moto G Pure has a **physical nano-SIM** slot and LTE/Wi-Fi capability, but published specifications for Moto G Pure models do **not** list LTE Band 48 (the U.S. CBRS band used in this pilot). Carrier variants can differ, so confirm the exact XT2163 model before purchasing radios. A casing coating, SIM tray, app, bootloader change or web identity key does not add a missing LTE RF band. The SIM authenticates a subscriber to a network; it does not provide a base station or the global Internet connection.

A compatible external **Band 48 LTE router/gateway**, linked to the Moto G Pure over its existing Wi-Fi radio, is a possible first demonstration while retaining the Motorola handset. This remains a cellular access network at the gateway, not a direct Band 48 LTE connection from the Moto G Pure. Alternatively, choose a future Infinity phone or modem with verified CBRS support. Other Moto LTE bands may require separately licensed spectrum; they are not free-to-transmit merely because the phone can tune them.

Motorola's model-specific SIM instructions: https://en-us.support.motorola.com/app/answers/detail/a_id/162282/ . Published LTE bands: https://www.videotron.com/en/support/mobile/devices/moto-g-pure and AT&T XT2163-6: https://www.att.com/device-support/article/wireless/KM1476048/Motorola/MotorolaXT21636/ . No access to the user's actual modem, SIM authentication material or coating was performed in this software assessment.

## Radio and spectrum

- In the United States, pursue **CBRS General Authorized Access** in 3550–3700 MHz, subject to current FCC Part 96 conditions and SAS management, certified CBSD hardware, and any professional installation or registration requirements. GAA does **not** grant exclusive or guaranteed coverage. Never transmit before authorization, coordination and technical compliance.
- LTE Band 48 is not supported by every handset. Verify real device hardware / software band support, not the existence of an LTE icon or Android API string.
- Use vendor-certified CBRS radio firmware; avoid unapproved SDR transmitters on licensed or shared bands.
- Test SIMs and authenticated operator-issued subscriber credentials are necessary. An ordinary public website login does not register an LTE modem to the network; a user-entered web “key” is **not** a replacement for USIM authentication. Keep IMSI, K, OPc and other secrets off public webpages.

## Core network

- Use a provisioned Linux server running a current Open5GS 4G EPC for an isolated lab. Open5GS can manage LTE subscriber sessions but its published feature list includes **no emergency calling**, so it cannot be sold or advertised as a complete emergency-capable phone service without additional compliant components.
- Run the core behind operator-controlled networking, not directly exposed through QuantaPhi front-end or Cloudflare D1. Cloudflare Workers can serve a provisioning interface, but LTE GTP transport, S1 signaling and the user plane need appropriate private server-side network paths.
- Firewall between cell site and core; restrict administrative network access and rotate credentials. Ensure packet routing, DNS, IPv6 or IPv4 NAT to the upstream interface. Monitor session status, packet loss, call quality, and spectrum grants.
- Keep `/cellular/` as an **operator planning and honest diagnostic UI** until actual node attestation and real-device testing exist.

## Upstream Internet and who pays

Even an Infinity-owned LTE site must connect to the worldwide Internet via one or more legitimate upstream networks: paid wholesale fiber, authorized fixed wireless, or independent infrastructure with upstream peering/transit. No software, free website, web address, key, or Cloudflare Worker creates that external connection without transport. Giving users **free-to-them** Internet access is a possible product choice if Infinity or a sponsor pays the installation, site power, hardware, SAS and backhaul costs.

An existing carrier used **only** for backhaul is a temporary transitional design, **not** genuine replacement of that carrier. Never claim independence while depending on third-party cellular backhaul.

## Phased rollout and milestones

1. **Software readiness (now):** honest status/diagnostic page, documented LTE data path, exportable pilot checklist, no user secrets on public sites.
2. **Legal network site:** select controlled pilot property, secure rights to mount equipment, establish CBRS spectrum/SAS pathway, source certified radio and backhaul, verify test device compatibility.
3. **Core lab:** provision secure Open5GS EPC and SIMs, prove radio attach, IP/DNS, and real Internet through an external uplink. No emergency voice claim.
4. **Controlled users:** first participants opt in, test throughput, availability, battery and supported-band constraints, affordability model. Preserve regular 911 access through their existing emergency-capable service.
5. **Expanded network:** additional cells, uplink redundancy, roaming/interconnection partnerships if desired, compliant emergency calling plan if launching regular phone service, provider obligations and security reviews.

## Software maintained in QuantaPhi

- `/cellular/` — Infinity Cellular network center, honest live QuantaPhi and Switchboard reachability checks, separately labeled unverified operator checklist.
- `cellular/network-plan.mjs` — deterministic pilot manifest validation. No checked box can turn `live` true. It does not enable RF transmissions or SIM provisioning.
- `/phone/` — Infinity Phone web-number Switchboard, dependent on an actual Internet path.
- `test/infinity-cellular.test.mjs` — confirms readiness gates, unchanged emergency/availability claims, website routes and the physical uplink requirement.

Sources: [NIST CBRS](https://www.nist.gov/programs-projects/citizens-broadband-radio-service), [NIST September 2026 three-tier CBRS](https://www.nist.gov/news-events/news/2026/09/validating-spectrum-cbrs-band-models-measurements), [Open5GS quickstart](https://open5gs.org/open5gs/docs/guide/01-quickstart/), [Open5GS features and limitations](https://open5gs.org/open5gs/features/).

**Safety acceptance:** no RF without certified equipment and legal spectrum coordination; no credential exposure; no unsolicited public number claims; no “cellular connected” status inferred from a browser fetch; no guaranteed nationwide/911 coverage.
