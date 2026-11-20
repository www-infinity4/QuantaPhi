# Registered Cloudflare scope synchronization

The scope count comes from the existing, pinned Cloudflare OAuth client, read
with the owner-authorized temporary OAuth-client reader. A historical count of
386 is not an authorization requirement: a verified 403-entry registration must
also synchronize. Counts reported by a user or a public catalog are not proof
of provider registration, effective permissions, or user consent.

All existing owner/session checks, one-use expiring approval, pinned client ID,
callback check and temporary credential revocation remain in place. Empty,
duplicated, malformed, oversized or more than 1,000 registered entries block
before a configuration write. Protocol scopes are excluded from the API count.

Three server-only secrets carry versioned JSON envelopes with the same revision,
part number and total. The Connections Worker must understand this format before
Brain writes it. Missing, mixed, reordered or invalid chunks retain the legacy
allowlist. Previously deployed raw 386-entry chunks remain readable. New formats
do not grant access until ordinary Cloudflare OAuth consent is completed.

The success receipt verifies that the pinned live client reports both an
allowlist count and a sign-in request count matching the provider registration,
the same canonical SHA-256 scope-set digest, and the exact installed revision.
An already-synchronized result requires the matching set digest as well as
both counts. Equal counts with different permissions still require an update.
Brain refuses to write unless Connections advertises the versioned decoder.
It does not verify effective API write access. Any ambiguous write failure
requires readback before retry; its consumed approval cannot be reused.

Release order: independent review and exact-head CI; stage both Workers with
existing bindings; deploy Connections format support first; verify legacy
configuration still works; deploy Brain; then perform one owner-authorized sync
and a real OAuth callback/permission test. Do not install secrets, change traffic,
renew consent, or claim a live provider login from source tests. Rollback Brain
before Connections; retain the legacy allowlist and existing consent records.

Tests: `node --test test/bubbles-cloudflare-scope-sync.test.mjs
test/cloudflare-scope-config.test.mjs test/bubbles-connections-ui.test.mjs
test/bubbles-connections-router.test.mjs test/bubbles-connections.test.mjs`.
