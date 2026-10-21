# Bubbles component and tap acceptance

Run `node --test test/bubbles-action-driver.test.mjs test/bubbles-card-workspace.test.mjs`
and, with the site served locally on port 8765, `node scripts/bubbles-components-browser.mjs`.
The existing Media Star Chromium workflow also runs these checks and retains JSON
and screenshot evidence. No private owner credentials or paid generation is used.

The JSON inventory lists all 27 registered components. Every locally mounted card
is opened and its actual safe controls inspected. Separate repository-backed app
routes, generation, payments, private history and Android are marked unexercised
until separately verified. Missing or failed components remain visible in results.

Verified tap path: ordinary user request → Bubbles action driver → unique visible
enabled control → actual click → observed Story Writer expanded state. The same
adapter inspects accessible labels inside bounded same-origin embedded viewers.
Diagnostics enumerate the same controls that tapping uses, including anchors.
Duplicate names, hidden/disabled controls, inaccessible frames and sensitive
actions must not receive a click. A click receipt alone never proves playback,
generation, a payment or another asynchronous operation succeeded.

October 21 live signed probe: Moltnook run 39632524405 returned actual replies.
Bubbles correctly reported that the signed server conversation has no active
website DOM connection; this route cannot operate a browser merely because it
can return a text answer. Browser-mounted adapter tests and signed conversation
tests are distinct. Existing five-day consent and owner identity are preserved.
