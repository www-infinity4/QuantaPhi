# Infinity Aluminum Coin Housing · manufacturability packet (#1919)

**Stage:** concept only; **source:** [canonical issue #1919](https://github.com/www-infinity4/QuantaPhi/issues/1919). **Owner authorization:** Work Order 008, 2026-11-11. **No verified inventory, prototype, CAD release, supplier RFQ, quote, tested electronic circuit or sellable product.**

The owner-described housing is a **brushed-aluminum exterior**, **matte-black interior**, **clear circular coin window**, **tamper-evident screw-down construction**, and a **small information display** proposed as a future feature. Proposed USB-C and wireless updating are **not** engineered, tested or promised. Do not infer a coin denomination, monetary value, weight or authenticity without original specimens and evidence.

## Primary historical sources recovered

1. [QuantaPhi issue #1919](https://github.com/www-infinity4/QuantaPhi/issues/1919): requirements, P01–P07 milestones, checkout prohibition.
2. [Sovereign Hard-Asset Coin repo: alloy-lattice PUF proposal](https://github.com/www-infinity4/Sovereign-Hard-Asset-Coin-Mint-Ledger-Heavy-Base-Metal-Architecture/blob/main/docs/coin-security/alloy-lattice-puf.md): **research only**. Enrolled alloy-to-chip coupling, NFC and unclonability claims require actual physical, electrical, environmental and adversarial tests. No security certification exists.
3. [QuantaPhi asset/wallet plan](https://github.com/www-infinity4/QuantaPhi/blob/main/WALLET-ASSET-PLAN.md): separate Infinity/Quant provenance and balances; a physical housing is **not** a minted or redeemable wallet claim.
4. Supplier capability examples, **not contracted partners or quotations**: [RivCut machining](https://www.rivcut.com/on-demand-cnc-machining), [CNCDrop process/pricing](https://cncdrop.com/pricing), [Future Present Labs prototype services](https://fpl.dev/services/cnc/). Published generic rates do not establish this design's unit cost.

## Mechanical architecture · passive pilot first

| Part | Proposal | Required engineering evidence |
| --- | --- | --- |
| Outer body | CNC-machined 6061-T6 aluminum, satin/brushed exterior, eased edges | Certified alloy batch, drawing, surface roughness, cosmetic samples |
| Back cover | Removable 6061-T6 disk with four captive or removable screws | Thread depth, torque spec, corrosion and cycle tests |
| Viewing window | Replaceable clear polycarbonate or acrylic insert, mechanically retained | Optical distortion, abrasion, UV and drop tests; adhesive compatibility |
| Interior | Reversible dark inert insert supporting the actual specimen without rubbing | Fit across tolerances, archival/coin-material compatibility, off-gassing evidence |
| Seal | Optional elastomer ring; no water resistance claim until tested | Compression stack, temperature and leak qualification |
| Tamper evidence | Single-use screw seal or serialized mechanical witness | Attempted removal testing and serial registry scope |
| Info label | Printed/engraved QR and provenance reference in passive version | Resolve to authenticated source record, never a made-up price |
| Electronic option | Future display/NFC secure element/USB-C or wireless path | Separate board, power, RF, safety and firmware package; no current mechanical fit claim |

**Do not change the actual metal coin or chemically coat it for the sake of the enclosure.** Archive/collection conservation and contact materials must be checked for each coin type.

### Dimensional capture before CAD

Use calibrated calipers and a documented photo of each **authorized actual specimen**. Capture coin diameter across multiple axes, thickness at several safe points (without damaging a collectible), rim relief and protrusions, and the desired visible face aperture. Record the measurement tool, date, uncertainty, coin owner and source. Never default to an assumed U.S. dollar size.

The source module `infinity-coin-housing-core.mjs` provides a *non-manufacturing* planning envelope from measured inputs D and T, in millimeters:

- Nominal concept cavity diameter = D + 0.60 mm (0.30 mm **provisional** radial clearance per side).
- Nominal concept exterior diameter = cavity diameter + 14.00 mm (7.00 mm **provisional** annulus per side).
- Nominal concept case thickness = T + 7.00 mm (the combined **provisional** front/back allocation).

These are **initial planning allowances**, not an established clearance fit, tolerance prescription, IP seal, fatigue guarantee or released mechanical design. A machinist must determine local stack-up, tool access, screw hole patterns, thread lengths, window retention, thermal expansion and actual minimum remaining wall after electronic cavities. An electronic version almost certainly needs a different envelope.

### Required CAD and drawing package

- Parametric native CAD assembly with explicit D/T measurements and configurable insert; export **.STEP** neutral solid model, **.DXF** cut profiles, PDF assembly and dimensioned part drawings.
- Exploded assembly, fastener schedule, replaceable wear parts, tool access, torque and assembly sequence, minimum edge distance.
- General tolerances and GD&T developed after machinist review; finish/polish specification with view window scratch criteria, inspected critical dimensions, traceable revisions.
- Actual bill of materials with per-line supplier, part number, verified quote/currency/quantity/expiry/tax/shipping, source link and substitution review.
- Clear passive vs electronic revision numbers; no interchangeable board/battery or wireless claims without RF testing.

## Electronics feasibility · separate gated track

1. **Passive pilot:** none. Physical coin display, serial label and provenance lookup are the first machinable version.
2. **NFC feasibility:** aluminum can detune/shield an antenna; verify field coupling and metal-compatible placement or RF-transparent window with a real prototype. Secure elements need authenticated provisioning, threat modeling and privacy review.
3. **Display:** select real readable display, controller and power source only after an electrical and industrial-design study. Measure daylight readability, battery life, enclosure depth, heat, ESD and impact.
4. **USB-C update:** requires defined data/power role, ingress/ESD protection, firmware signing and safe power limits; a decorative receptacle is not an update system.
5. **Alloy PUF research:** independent sensing test rig, repeated alloy enroll/read, false reject/accept curves, chip extraction and clone attempts, thermal/wear and attack tests. Do not claim unclonable security.

## Prototype and manufacturing RFQ

**RFQ A · passive pilot:** request quantity 1, 5 and 25 with 6061-T6 body/back, replaceable clear window, inert liner and tamper evidence. Supply measured D/T, design drawings, finish, test plan, delivery region and acceptance photos. Seek DFM feedback and real quoted lead times; no order or payment is authorized by this spec.

**RFQ B · electronics feasibility:** only after passive fit validation and separate circuit/RF/thermal plans. Quote tooling, assembly yield, battery certification and programming costs separately. Do not combine speculative electronics with a passive quote.

**Cost bookkeeping:** capture currency, quantity, date, material/setup/machining, surface finishing, window, liner, fasteners, test, assembly, shipping/tax, duty, scrap contingency. Generic published CNC prices vary widely by complexity; **cost is currently unknown** for this product. No manufacturing margin or sale price can yet be stated.

### Prototype sequence

1. Traceable specimen images and measurements, and rights/owner consent.
2. CAD v0.1 and DFM sign-off; fit-check plastic or soft-tool mockup (no authenticity claim).
3. One CNC passive housing, safe insertion/removal demonstration and tolerance readback.
4. Inspection: lens/window scratches, rim clearance, torque cycling, retention, drop/edge wear, finish consistency, seal/tamper behavior.
5. Independent review of assembly, false provenance claims, coin condition, photographs and instructions.
6. Approve a controlled pilot batch only after actual BOM, quoted cost, recorded tests and traceability.
7. Optional electronics and physical-PUF research handled as **separate versions**, not implied by passive success.

## Product Quick Card acceptance

The reviewed `infinity-coin-housing.html` is a standalone **concept-only preview**, not registered into public homepage discovery. Its original inline vector is a schematic, not a product photograph, CAD or manufactured item. The card must accept actual measured dimensions, use no guessed default specimen size, display provisional calculations, remain legible at Android 320/360/393px, and never expose a Buy button, checkout or wallet mutation.

Release stages must remain distinct: `concept → engineer-reviewed CAD → physical prototype/test → supplier-accepted pilot → inventory_verified`. Only a separately authenticated inventory service and payment authorization could enable checkout. A code merge, browser form calculation, diagram or 3D render is not stock.

**Exact next engineering action:** obtain at least one authorized physical specimen's measured D/T and proceed with CAD/DFM review. This source package does **not** require the owner to authorize any immediate purchase, payment or production order.
