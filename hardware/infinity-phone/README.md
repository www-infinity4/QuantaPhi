# Infinity Platinum · Aluminomni Meld Phone + Robot Workshop

**Status:** engineering plan and test specifications, **not** a commercially manufactured phone or printer. This preserves the established aluminum/oxide/gas-chamber design direction without treating unproven physical claims as products.

## Product pair: “phone + its own robot workshop”

The **Infinity Platinum Phone** is the demonstrator shipped with the **Infinity Robot Workshop**, in the spirit of a console bundled with a distinctive companion robot. The workshop's long-lived product is a conversation-driven, preset-controlled 3D printer. The same phone browser displays a proposal, a dimensioned CAD preview, a material and cost report, and a simulated toolpath before any printer moves. The robot never executes raw conversational text as hardware motion.

Version 1 buildable set, with verified electrical modules and conventional feedstock:

| Part | What the workshop can print | What must be purchased and fitted |
|---|---|---|
| Phone | Aluminum-look polymer chassis; qualified metal-print outsourced shell | Approved battery, radio/modem, display, logic board, antennas, USB-C |
| Watch | Case, strap molds, button covers | Certified battery, small display, sensors, radio |
| Earbud | Earbud enclosure fit-checks, charging case shell | Driver, radio, charging/BMS board, cells |
| Wallet / proximity card | Housing and mechanical anti-tamper sleeve | Secure element, antenna, power, credential issuer, proximity sensor |

A payment card cannot become unusable to a thief simply because it has a 3D-printed case; a real design uses issuer tokenization, device-bound keys, authentication, and permitted payment protocols. Short-range presence alone does not guarantee security.

## Aluminomni Meld reference architecture

1. **Chassis:** machined or professionally metal-printed 6061/7075 aluminum with insulated antenna windows, rounded edges, modular repairable core, and qualified corrosion/scratch tests. A sealed all-metal shell blocks many radio signals, so antenna geometry must be designed and tested.
2. **Conventional proven computing core:** replaceable ARM-compatible system-on-chip with RAM, flash, Wi-Fi, modem/SIM or eSIM, GNSS, and certified battery charging. It runs Infinity Platinum and Bubbles. Data is not stored in unprotected gas chambers.
3. **Oxide electronics research:** separate material coupons for metal-oxide thin film transistors, memristors, or sensors. Characterize switching endurance, temperature, retention, and manufacturing yield *before* any substitution for silicon.
4. **Gas microchannels:** nitrogen or air-filled channels may be experimentally useful for cooling, compliant mechanical actuation, pressure sensing, and tunable dielectrics. They are **not** automatically a programmable CPU or high-density electron memory. Helium is scarce in air (about 5 ppm) and extracting it economically is not a home printer function.
5. **Shape-shifting “Meld” concept:** first use hinged or segmented structural modules, flexible interconnects, and mechanical stops. All battery/radio modules remain in rigid protected zones. Nitinol actuators or pneumatic prototypes require thermal and fail-safe validation, never heat the battery or user skin.
6. **Display:** purchase display module in v1. Aluminum oxide and transparent ceramics may be useful protective layers; transparency and screen brightness are not achieved by simply treating an aluminum shell.

## Infinity Robot Workshop V1 controller

**Chat / Bubbles → requirement parser → CAD constraints → visual preview → fabrication feasibility → safety checks → G-code sandbox → explicit machine operator start → sensors → inspected result.**

The controller maintains a **robot-local immutable job ID** and versioned presets with dimensions, permitted feedstock, tool envelope, bed temperatures, nozzle limits, thermal-runaway detection, enclosure switches, and emergency stop. The AI can generate files and arrange a job, but physical heating/moving operations require the operator's on-device confirmation and an emergency stop. It cannot bypass those safeguards.

Preset targets: phone case, smartwatch case, earbud enclosure, passive wallet shell. Use parametric OpenSCAD or CadQuery/Python on a properly provisioned build server, slicers like PrusaSlicer/OrcaSlicer, and a proven printer firmware stack. Printer retail placement, certifications and factory supply chains are separate work, not a GitHub deployment.

## ESP32 neuro-input plug-in (non-invasive experiment only)

An ESP32 can receive **already-amplified and digitized** EEG data over SPI/BLE from an appropriate externally designed EEG acquisition board, then relay voluntary, calibrated signals to Bubbles. It cannot read unspoken sentences or secretly read minds. First experiment: consent-based “relax/focus/blink” classification with a manual disable, an observable recording light, encrypted BLE and no background capture. No medical diagnosis or EEG interpretation without validation.

Never wire bare EEG electrodes directly to GPIO or a mains-powered homemade circuit. Use isolated, battery-powered, appropriately rated acquisition hardware. No implants or invasive neurotechnology in this plan.

## Atmospheric gases and material sourcing

- Nitrogen and oxygen separation from air is an established industrial process, **not a computational brain**. Use certified cylinders or qualified generators and pressure-safe components in test fixtures, rather than building a DIY high-pressure extractor into the retail printer.
- “Make helium from hydrogen” requires nuclear reactions, not a low-cost chemical conversion. There is no safe, economical consumer printer path.
- A home machine cannot create semiconductor chips, precision radios, battery chemistry, or bulk aluminum from ordinary ambient air. Aluminum metal feedstock has to be supplied and processed industrially.
- Experiment only with simulated gas logic / dielectric effects before attempting physical material claims.

## Factory/store milestone gates

1. A functioning web-address Infinity Phone and compliant carrier gateway.
2. Mechanical CAD of aluminum chassis with exact dimensions, RF window, thermal plan, parts BOM, and engineering peer review.
3. Bench prototypes with electrical isolation, RF/legal certification plan, documented tests and repairs.
4. Reproducible 3D printer presets with collision checks, printer firmware and emergency stop testing.
5. Sales packaging and manufacturer commitments only after physical prototypes pass independent safety reviews.

Reference to the digital phone: `https://quantaphi.org/phone/`.

**Proof standard:** render/CAD file ≠ printable object ≠ tested hardware ≠ certified or for sale.
