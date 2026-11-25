# Issue #2110 — owner-hosted mesh deployment and private D1 parity rehearsal

**Status:** source/template stage only. No actual host provisioned, no DNS/TLS change,
no public mesh endpoint, no physical Android peer connection, and no live D1
export/import or production cutover. D1 remains authoritative until every
migration receipt passes. This is not a production cutover.

A GitHub repository holds code, **not an always-on server**. This system needs a
**separate permanent owner-controlled host** with network reachability and
persistent disk. A powered-off phone or an empty GitHub Actions runner does not
meet that requirement. The templates below are examples to apply only to a
verified Linux host where you have admin access; nothing is installed by merging
a PR. No paid Cloudflare Tunnel is required.

## 1. Safe host profile

- Linux machine under owner control, with /opt/quantaphi checkout, Node 22+
  binary at /usr/bin/node supporting built-in `node:sqlite`, Python 3,
  persistent/private disk and backups. Verify actual Node version/path first.
- The application process binds **127.0.0.1:8789 only**. Caddy listens on
  public HTTPS 443 and reverse-proxies internally. Do **not** open TCP 8789 on
  your public firewall. DNS must point to an actual owner-controlled server.
- A *real* domain/subdomain, not `mesh.example.org`, must resolve and pass
  certificate validation. Caddy is free software, but electricity/Internet/
  machine resources, traffic and storage are not automatically free.
- systemd runs the coordinator as an unprivileged `quantamesh` account with
  private data under /var/lib/quantaphi-mesh and loopback-only network binding.
  `MESH_OWNER_TOKEN` must be generated privately and kept in
  root-only /etc/quantaphi/mesh.env, **not** in the public repository.

### Owner-host installation checklist (manual; not executed here)

1. Confirm the machine, hostname, DNS ownership, backup volume, inbound 80/443,
   OS updates and Node 22+ (`/usr/bin/node --version`).
2. Create the dedicated `quantamesh` system user and group; copy the *reviewed*
   repo checkout to `/opt/quantaphi` (readable by the service but not writable
   by the app process). Install free Caddy separately using your OS packages.
3. Install `quantaphi-mesh.service` into
   `/etc/systemd/system/quantaphi-mesh.service`.
4. Create `/etc/quantaphi/mesh.env` with root ownership and mode `0600`;
   use `mesh.env.example` for the variable name only. Generate an unrelated
   owner token using `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`,
   then place it privately in the environment file. Do not expose the value
   in a GitHub issue, app page, Action log or screenshot.
5. Replace the example hostname in `Caddyfile.example` and install as a
   Caddy site. Test the real certificate and host. Ensure the incoming TCP
   connection terminates at HTTPS on Caddy, not plain HTTP to Node.
6. After confirming the repo path/permissions and token file, use
   `sudo systemctl daemon-reload`, `sudo systemctl enable --now quantaphi-mesh`,
   and check `systemctl status quantaphi-mesh`.
7. Verify local `curl -fsS http://127.0.0.1:8789/health` and then the
   correctly certificate-validated `https://YOUR-HOST/health` from a separate
   Android network. A health response alone does not verify credentials,
   persistent storage, fragment recovery or two real devices.
8. Only then enroll a bounded **test-only** app using the existing owner CLI;
   complete a synthetic encrypted-fragment upload, clear one app cache, and
   observe a replacement ACK on another. Retain a private encrypted backup.

**Never apply these commands to a stranger's device or silently install an
app.** Normal app-managed caching requires the app to be installed/opened and
its normal platform data-storage controls must still function.

## 2. D1 shadow migration, read-only by default

The `d1-stage.py` importer and `d1-verify.py` work on **private local
files** only. They do not call Cloudflare or modify live D1. Get an authorized
SQL export by the provider-supported method when D1 resource limits permit;
store it in a private directory outside public GitHub. Export completeness
must be supported by independent D1 row counts/checkpoints. Never assume a
successful local SQL import means the live source was fully exported.

```bash
# In a private directory containing an authorized export:
python3 distributed-vault/d1-stage.py import-sql "$HOME/private-d1/export.sql" "$HOME/private-d1/staged.sqlite"
python3 distributed-vault/d1-stage.py snapshot "$HOME/private-d1/staged.sqlite" "$HOME/private-d1/shadow.sqlite"
python3 distributed-vault/d1-verify.py report "$HOME/private-d1/staged.sqlite"
python3 distributed-vault/d1-verify.py compare "$HOME/private-d1/staged.sqlite" "$HOME/private-d1/shadow.sqlite"
```

`report` prints **only table names, counts, schema hashes and row-content
hashes**, never actual row data. `compare` returns exit code **0** when staged
snapshots match and **2** when there is a mismatch. Read errors fail nonzero.
It checks SQLite integrity and compares canonical encoded rows sorted by every
visible table column, so changed insertion order does not make an identical
logical dataset look different.

For real D1, separately reconcile authoritative source **table counts, indexed
unique keys, schema/indexes/triggers, wallet and ledger invariants, the export
cutoff, post-export writes and pending jobs**. The hashes don't authenticate
the original export or establish a consistent cutover boundary. The verifier
is not a substitute for a dual-read canary, write replay or source transaction
fencing. Keep identity, cash balances, Star Coins, permission grants and job
leases exclusively on the original D1 until reversible migration is proven.
**Do not publish** the SQL, private SQLite file, unencrypted SQLite chunks,
wallet data, secret token or encryption key.

## 3. Real-phone cache failure drill

Use a verified owner HTTPS hostname and two or more enrolled Android devices
for the **small synthetic test**, not personal D1 data. For a 1000-shard
N-of-N file with 2 replicas, at least 2000 distinct enrolled *app instances*
are required under the current one-fragment-per-file-per-app policy. Two
phones suffice for a tiny fragment test only.

After both phones store and ACK test fragments, clear the mesh cache of one
phone using the app's Clear control. The next heartbeat should invalidate only
its previously ACKed copies. The coordinator may assign a replacement to a
new available app, while keeping the original owner-hosted encrypted copies.
Record actual ACK receipts, timestamps, node counts, hashes and offline
recovery; a test that only changes synthetic node rows does **not** prove
physical Android viability. Do not count a phone heartbeat as cryptographic
hardware attestation.

### Recoverability condition

Replicas are not an unconditional guarantee. The N-of-N scheme needs **one
verified copy of every unique fragment**, plus the correct private key. Two
replicas per fragment reduce risk; an independent, complete, decryptable
cold backup remains necessary. If the owner host and all replicas of one
fragment fail, hashing cannot reconstruct the missing bytes. Automated
assignment is not the same as full error-correcting storage.

## Release safeguards

Issue #2110 remains open until the host, Android peers, privacy/authorization,
backup restore, D1 read/write parity, dual-running, billing, production DNS
and rollback are actually verified. Merging a deployment template does not
install a server, export data, repair D1 limits, reduce a bill, or recover a
wallet. No new Cloudflare subscription or Google paid resource is required
for this source-only work.

## 4. Independent model readiness (synthetic only)

On the verified owner host, configure an already installed local Ollama runtime to listen on loopback only, with cloud features disabled. Install a suitable local model separately under the owner's hardware, storage and licensing constraints. The probe does not install packages, pull models, expose a port, or choose a paid provider.

```bash
node distributed-vault/local-inference-probe.mjs YOUR_INSTALLED_MODEL_TAG
```

Use the exact installed model tag; this check sends only a fixed arithmetic question to 127.0.0.1:11434/api/chat and requires a completed matching model response and generated-token count. No real conversation, private source, wallet token or credential is sent. A successful receipt verifies only that this loopback API responded to a synthetic check; it does not establish offline-only runtime configuration, owner authentication, signed repository execution, or production routing. Verify network isolation and model provenance separately before routing real owner prompts. The existing Cloudflare path remains unchanged.

API contract: https://docs.ollama.com/api/chat
