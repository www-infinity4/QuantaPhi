# Public learning pages and Quant trails

Baseline: QuantaPhi commit 39e7f238b750b5075b645e39bc15bc0b4e84d198.

The first public collection contains ruthenium, atomic number and search-to-Quants lessons. Static HTML supplies the answer, diagrams, comparisons, examples, sources and honest AI author/source-check information. No independent human expert review is claimed. The catalog holds selected public terms; private research is never automatically published.

New searches link to their parent and root. Contained IDs are references, not extra balances or ownership transfers. Extracted links retain their parent in normal and new-tab navigation when the parent exists in the browser's ledger. Refinements and saved-record restoration use the existing token. Assimilation may include a prior record without allowing reference cycles. Local ledger mutations are serialized; Web Locks serialize across same-origin tabs when available.

Research revisions persist trail and extraction data through the existing authenticated endpoint. Cloud restoration merges newer revisions and fills missing metadata without discarding newer local work. Source indexes and discovery query information are retained. Discovery labels distinguish suggestions from verified scientific facts. This change does not alter wallet mint amounts, spend logic, database schemas, ownership checks or search-event idempotency.

The wallet CSS matches QuantaPhi's light purple theme. The existing account bridge and ledger origin allowlists now recognize .org. The separate Unified-Wallet repository needs its two .org origins added as well. Its prior commit is b6ac2908bddf53701d64777574032e01bdf03b38; keep both D1 bindings on Worker uploads.

Verification: run `node tests/research-trail.test.cjs`. Check `/learn/`, all three lessons, their SVGs, `/sitemap.xml` and `/robots.txt` without login or search. Verify mobile overflow, wallet colors and authenticated API preflight from .org. Tests use mocked accounts and do not change a user's balances.

Repair: revert this feature commit in GitHub, then deploy the reverted `workers/quantaphi-site/worker.js` and `workers/quanta-phi-ledger/worker.js` while preserving existing bindings and cron triggers. Revert the Unified-Wallet origin-only commit and redeploy its Worker if necessary. Existing research JSON is additive and remains readable by the earlier client. Reverting .org origin support will block cloud wallet access from the live .org domain; prefer fixing forward for origin issues.
