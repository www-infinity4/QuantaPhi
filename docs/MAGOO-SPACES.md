# Magoo PhD X Spaces catalog
- Owner: Magoo PhD on X, @HodlMagoo (independent of Fred Krueger).
- Cloudflare D1 database: `magoo-phd-spaces`; Worker: `magoo-phd-spaces`.
- Public read-only endpoint: `https://magoo-phd-spaces.marvaseater.workers.dev/v1/episodes`.
- QuantaPhi frontend: `#magooSpacesRadio`, `magoo-spaces-radio.js`, `magoo-spaces-radio.css`.
- Entries **must** have a verified X Space replay URL, not a tweet or account profile.
- Schema restricts `space_id` and `source_url` to unique values; index `episode_id = magoo-<space-id>`.
- The initial corpus is empty because no original recorded Magoo Spaces could be verified. Do not fill it with fabricated titles or unrelated host recordings.
- Read-only Worker: add entries through the owner's Cloudflare D1 dashboard or a separate authenticated curator pipeline. Mark an episode `availability='verified'` after confirming the recording.
- Device-local no-repeat playlist only; X provides the recording. This is not an audio rebroadcast, a wallet charge, or a clone of Fred's paid unlock service.
