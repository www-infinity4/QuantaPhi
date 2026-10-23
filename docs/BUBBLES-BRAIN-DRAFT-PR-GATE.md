# Brain autonomous writer — draft PR first

The existing `Infinity brain repository writer and cloud browser` GitHub Actions workflow runs every five minutes and can claim only narrowly scoped, authenticated interface work. It is **not** a general private-account or production-release agent.

## Updated publication contract

1. The existing signed GitHub OIDC runner verifies its narrow source scope, gets a real owner-authorized job, produces a bounded source patch and submits it for independent model review.
2. Local regressions must pass before a source commit. The writer pushes to a dedicated `robot/<ticket-job>/<run>` branch **only**. It never pushes directly to `main`, even when GitHub branch protection is off.
3. The writer opens a **draft pull request** with the precise source commit. It validates the returned PR's number, URL, branch, SHA, base and draft status before retaining a receipt.
4. The job remains `committed_unverified`: GitHub target CI, owner review, merge, deployed source byte comparison and live browser/phone checks are distinct gates. A previous job's `commitSha` or a no-diff response is not proof of deployment.
5. Existing supported ticket restrictions and owner-scope rules remain in force. This release does not make old conversational candidates automatically runnable; the live Cloudflare Brain still requires zero-traffic staging with authorization and binding parity.

## Acceptance

Run `node --test test/brain-publish-draft.test.mjs test/brain-writer.test.mjs test/brain-autopilot-writer.test.mjs`. The GitHub **Bubbles and Robot Brain full-system diagnostic** also runs the new tests for PR source changes.

A successful test here means **draft PR contract tested**, not proof that the production Robot Brain has claimed a job. The first live accepted writer job must produce a real GitHub draft PR number, branch and SHA and should be stopped at owner review until explicit authorization.
