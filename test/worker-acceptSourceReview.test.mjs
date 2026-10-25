import { test } from 'node:test';
import assert from 'node:assert';

function sourceReviewGuard({ engine, lease }) {
  if (!engine || !lease.engine) throw new Error('source_review_runner_identity_required');
  const kind = lease.job?.sourceReview?.kind;
  if (kind && kind !== 'source_review_only')
    throw new Error('source_review_runner_identity_required');
}

test('allows normal job without sourceReview', async (t) => {
  const lease = { engine: true, job: {} };
  // Should not throw
  sourceReviewGuard({ engine: true, lease });
});

test('rejects unsupported sourceReview kind', async (t) => {
  const lease = { engine: true, job: { sourceReview: { kind: 'unsupported' } } };
  assert.throws(
    () => sourceReviewGuard({ engine: true, lease }),
    /source_review_runner_identity_required/
  );
});
