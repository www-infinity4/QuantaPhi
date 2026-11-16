// Focused test for the runner‑auth flow.
// This test validates claim checking logic without requiring real OIDC keys.
import { checkClaims } from '../workers/infinity-brain-clock/runner-auth.mjs';
import { strict as assert } from 'node:assert';

describe('runner‑auth claim validation', () => {
  it('accepts a correctly scoped claim', () => {
    const now = Math.floor(Date.now() / 1000);
    const goodClaim = {
      iss: 'https://token.actions.githubusercontent.com',
      aud: 'infinity-brain-writer',
      repository: 'www-infinity4/QuantaPhi',
      repository_id: '1380883643',
      workflow_ref: 'www-infinity4/QuantaPhi/.github/workflows/brain-writer.yml@refs/heads/main',
      ref: 'refs/heads/main',
      event_name: 'push',
      run_id: '123456',
      exp: now + 600,
      nbf: now - 10,
    };
    const result = checkClaims(goodClaim, now);
    assert.deepEqual(result, goodClaim);
  });

  it('rejects a claim with wrong audience', () => {
    const now = Math.floor(Date.now() / 1000);
    const badClaim = {
      iss: 'https://token.actions.githubusercontent.com',
      aud: 'wrong-audience',
      repository: 'www-infinity4/QuantaPhi',
      repository_id: '1380883643',
      workflow_ref: 'www-infinity4/QuantaPhi/.github/workflows/brain-writer.yml@refs/heads/main',
      ref: 'refs/heads/main',
      event_name: 'push',
      run_id: '123456',
      exp: now + 600,
      nbf: now - 10,
    };
    assert.throws(() => checkClaims(badClaim, now), /runner_identity_rejected/);
  });
});
