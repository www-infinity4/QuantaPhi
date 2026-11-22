# Infinity App Shards — static GitHub + application-managed storage pilot

This is a **tested, local-only prototype** under existing [QuantaPhi #2110](https://github.com/www-infinity4/QuantaPhi/issues/2110). It is not a replacement for a live server, not a production backup, and not an active network of devices. No Cloudflare, StarQuest, Quants, wallets, credentials, DNS, or user-account records are moved by this code.

## Purpose

The repository distributes software and a **synthetic** encrypted test fragment. Installed app instances may hold encrypted file fragments inside their own sandboxed cache, like any normal app's cache. The application never needs access to people's personal photos, contacts, documents, or other applications. Cache bytes are app data, but the device owner can still inspect or erase them through ordinary app/storage controls. There is no covert background phone access or per-fragment permission dialog.

- Owner **encrypts the entire file locally** with AES-256-GCM and a randomly generated 256-bit key and IV; the key stays private.
- The ciphertext is divided into **N distinct nonempty fragments**, each indexed and SHA-256-checked. Up to 4,096 fragments are supported; default CLI example uses **1,000**.
- A coordinator can create a cryptographically shuffled **placement proposal** for online app instances that report `appCacheReady:true` and sufficient `maxShardBytes`. Each app gets no more than one fragment of that file. Replication requires more app instances.
- App-side `AppShardCache` stores only fragment records in origin-scoped IndexedDB, with an 8 MiB default cache bound, 7-day expiry, opt-out/pause, and clear. No private encryption keys, filenames, personal account records or plaintext are stored by that module.
- Recovery requires the private key and **one verified copy of every distinct fragment**. A duplicate/altered/missing shard fails closed.

**Important limitation:** this is an **N-of-N** fragment split, *not* a threshold Reed–Solomon scheme or secret sharing. If one index has no available replica, the file cannot be recovered. Thousands of unreliable phones alone do not provide reliable storage. App uninstall, OS eviction, offline peers, and users clearing app data are expected conditions. A future phase needs repair/re-replication, durable encrypted owner backups, healthy peer discovery, authenticated transfer, replay limits, and a tested error-correcting or threshold code before any live migration. The only protection against someone reading recovered plaintext is AES-GCM with the owner-held key—not the mere scattering of fragments.

## Termux / Python-independent Node 22 CLI (no npm required)

Run from the repository checkout. Example with a file you own:

```bash
node distributed-vault/vault-cli.mjs pack ~/my-video.mp4 ~/my-shards ~/my-private-vault.key.json 1000
node distributed-vault/vault-cli.mjs plan ~/my-shards/manifest.json ~/app-nodes.json 2 ~/placement.json
node distributed-vault/vault-cli.mjs restore ~/my-shards/manifest.json ~/my-shards ~/my-private-vault.key.json ~/restored-video.mp4
```

The `app-nodes.json` file is a locally supplied list of real, app-registered available nodes, for example:

```json
[
  {"id":"app-01","appCacheReady":true,"maxShardBytes":65536},
  {"id":"app-02","appCacheReady":true,"maxShardBytes":65536}
]
```

For 1,000 fragments and 2 replicas you need **at least 2,000 different eligible app instances**, not 2,000 random IDs in a file. **The planner cannot prove those nodes are real or online yet.** It makes a proposal and **does not transfer fragments**. Never publish the private key file or upload it to public GitHub, including Actions logs/artifacts. Keep the key in a private backed-up Termux directory rather than shared storage. The CLI only supports files up to 64 MiB and reads the full file into memory, so this is not suitable for large production archives yet.

The `pack` command refuses an existing fragment directory. The `restore` command refuses to overwrite an existing output. The key is written with owner-only file permissions where the OS supports them.

## App-owned browser cache pilot

The preview page `distributed-vault/index.html` runs as a static app and uses `app-cache.mjs`. On an eligible browser it fetches only the repository's bundled **synthetic test shard** into its origin's IndexedDB when opened. A visible page reports cached fragments and bytes, and provides **Pause app caching** and **Clear vault storage** controls. Pausing the setting persists in that browser where localStorage is available. Clearing vault cache leaves unrelated app cookies and other data untouched.

There is **no general phone data permission**, no access to other apps, no person-identifying data in the sample shard, no hidden uploads, no server connection, and no automatic exchange with other phones. Browser cache behavior must be verified on actual Android before declaring device acceptance.

## Source verification

```bash
node --test test/distributed-vault.test.mjs test/distributed-vault-app-cache.test.mjs test/distributed-vault-app-page.test.mjs test/distributed-vault-cli.test.mjs
```

The existing `.github/workflows/distributed-vault-tests.yml` must pass on the exact PR head. Document test-run receipts separately from merged, live web, and physical Android proof.

## Next engineering gates (not implemented)

1. Define a stable cryptographically authenticated peer identity and ownership of each app instance. Never infer a real phone from a row in the placement JSON.
2. Choose a transport and rendezvous service with explicit cost, uptime, bandwidth, battery and privacy limits; GitHub Pages serves static files, not a permanently active coordinator or TCP/WebRTC signaling server. GitHub Actions is bounded/scheduled compute.
3. Store only ciphertext on nodes; send one fragment per participating app via authenticated transport with receipts and bounded retention.
4. Support loss: encrypted backups, availability checks, error correction, dynamic replica repair, rollback and key rotation. Avoid touching financial/identity systems.
5. Verify multi-device recovery under missing/offline/evicted nodes, account separation, actual Android cache controls, origin permissions, and independent security review.
6. Only then consider moving a safe non-identity workload from Cloudflare under issue #2110's staged cutover gates.

No production migration or bill cancellation is authorized by this prototype.
