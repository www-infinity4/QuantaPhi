# QuantaPhi org search recovery — October 4, 2026

The live QuantaPhi root search could retrieve source/media results but could not call its AI overview service. OPTIONS to `infinity-rogers.marvaseater.workers.dev/v1/chat` with Origin `https://quantaphi.org` returned HTTP 403 `origin_not_allowed`. The deployed AI worker allowed the old .net domain and GitHub Pages, but had not been updated for the existing app's .org domain.

The fix adds the two QuantaPhi .org hostnames to that worker's exact origin set. Existing allowed origins and rejection of unrelated origins remain. The source in `workers/infinity-rogers/worker.js` is a snapshot of the deployed worker with only these two domain entries changed. Model configuration, AI/D1 bindings, secrets, quota rules, wallet identities, balances, history and paired credit behavior are unchanged.

Live deployment: `f31e9500a5ff474c895be59d8adbcc6a`. After deployment, the org preflight returns HTTP 204 with the matching Access-Control-Allow-Origin header. Browser test on the QuantaPhi root: `ruthenium properties` completes with an AI Overview and extracted data/media instead of an AI-origin error.

Validation: `node --test test/ai-origin.test.cjs test/overview-response.test.cjs test/cloud-connection.test.cjs test/wallet-recovery-routing.test.cjs test/search-commit.test.cjs` — 12 tests pass. Tests cover org/legacy preflights, unrelated-origin rejection, an org POST reaching the bound AI, and the existing wallet recovery and paired credit/history contracts.

The first live search also observed a source request timing out after 6.5 seconds. The later search completed after the domain fix; no retrieval algorithm was changed in this repair. The test browser has no signed-in cloud ledger credential, so its local search counters are test data and do not verify the user's phone balance. The user has independently confirmed balances/history display on the phone.

Rollback: remove the two .org entries from this worker and redeploy while retaining the existing bindings and secrets. That rollback restores the observed org search failure; it does not undo the earlier wallet recovery repair.
