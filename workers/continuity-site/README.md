# Continuity static shell

The existing `continuity-preview` Worker serves the `quantaphi.org/continuity/*` route from an embedded, immutable bundle. A GitHub Pages release does not replace that bundle. Keep the live public `PUBLIC_X` service binding to `bubbles-public-x` unchanged. This shell has no Brain, wallet, credential, D1 or private-record binding.

`node scripts/build-continuity-site.mjs /tmp/continuity-site-bundle` builds the two module files plus a SHA-256 manifest from a clean reviewed checkout. The bundle includes the notebook and separate owner page. The entrypoint's `X-Continuity-Source` header identifies the pinned source; compare published asset bytes with the manifest before claiming a release.

Before publication run the Continuity Node suite and mounted browser suite (including the shell's CSP). Use the existing Worker version API to upload a zero-traffic candidate with the current settings and identical binding identities. Verify candidate modules and bindings and confirm active traffic is unchanged. Promotion is a separate deployment operation with an exact version and recorded rollback version. Do not create routes, replace bindings or alter Brain authorization to publish this shell.

The owner page uses the normal first-party gate and direct existing Brain endpoint. Source-confirmed rendering is not signed owner readback or job execution. A missing `/work/continuity` backend can use the limited legacy list with an explicit coverage warning. The standalone router's authoritative state/event store is separate follow-on work.
