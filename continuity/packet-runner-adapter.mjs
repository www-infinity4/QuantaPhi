import {needsHistoryScan, recordPacketReceipt, selectActionPackets, validPacket} from './work-packets.mjs';

const SCHEMA = `CREATE TABLE IF NOT EXISTS continuity_packet_checkpoints (
  owner_scope TEXT PRIMARY KEY,
  source_version TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('running','settled')),
  cycle_id INTEGER NOT NULL,
  fence TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  result_json TEXT NOT NULL
)`;
const SHA = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;
const MAX_CANDIDATES = 100;
const packetKey = packet => [packet.repo, packet.issue, packet.headSha].join('#');
const actionKey = packet => packetKey(packet) + '#' + packet.nextAction;


async function activeClaim(db, claim, now) {
  const row = await db.prepare(`SELECT fence FROM continuity_cycle_receipts
    WHERE cycle_id=? AND fence=? AND state='running' AND lease_until>?`)
    .bind(claim.id, claim.fence, now).first();
  return Boolean(row);
}

function priorResult(row) {
  try {
    const result = JSON.parse(row?.result_json || '{}');
    return result && typeof result === 'object' && !Array.isArray(result) ? result : {};
  } catch {
    return {};
  }
}

function skippedCandidates(candidates, {selected, blocked, done, ownerId}) {
  const selectedKeys = new Set(selected.map(packetKey));
  const completed = new Set(done);
  const seen = new Set();
  return candidates.slice(0, MAX_CANDIDATES).flatMap(packet => {
    if (!validPacket(packet)) return [{issue: Number.isSafeInteger(packet?.issue) ? packet.issue : null,
      headSha: SHA.test(packet?.headSha || '') ? packet.headSha : null, reason: 'invalid_packet'}];
    const key = packetKey(packet);
    if (selectedKeys.has(key)) {seen.add(key); return [];}
    let reason = 'batch_limit';
    if (seen.has(key)) reason = 'duplicate_issue_head';
    else if (packet.state === 'complete' || packet.state === 'merged') reason = 'already_complete';
    else if (completed.has(key) || completed.has(actionKey(packet))) reason = 'already_receipted';
    else if (packet.lease?.verified === true && packet.lease?.active === true &&
      packet.lease?.holder && packet.lease.holder !== ownerId) reason = 'foreign_active_lease';
    else if (packet.state === 'blocked' && blocked.some(item => item.repo === packet.repo &&
      item.issue === packet.issue && item.headSha === packet.headSha && item.reason === packet.blockReason))
      reason = 'unchanged_blocker';
    else if (packet.nextAction === 'merge_pr' &&
      (!packet.requiredChecksPassed || !packet.requiredReviewsSatisfied || packet.securityHold === true))
      reason = 'merge_gate';
    else if (packet.securityHold === true && packet.nextAction !== 'write_test') reason = 'safety_hold';
    seen.add(key);
    return [{repo: packet.repo, issue: packet.issue, headSha: packet.headSha, reason}];
  });
}

function receiptSummary(receipt) {
  const summary = {
    id: receipt.id, repo: receipt.repo, issue: receipt.issue, headSha: receipt.headSha,
    action: receipt.action, result: receipt.result, idempotencyKey: receipt.idempotencyKey,
  };
  if (typeof receipt.reason === 'string') summary.reason = receipt.reason.slice(0, 240);
  if (typeof receipt.mergeSha === 'string') summary.mergeSha = receipt.mergeSha;
  if (typeof receipt.deploymentId === 'string') summary.deploymentId = receipt.deploymentId.slice(0, 160);
  if (typeof receipt.artifactUrl === 'string') {
    try {
      const url = new URL(receipt.artifactUrl);
      if (url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash)
        summary.artifactUrl = url.href.slice(0, 512);
    } catch {}
  }
  if (receipt.providerConfirmed === true) summary.providerConfirmed = true;
  return summary;
}

export async function runPacketPass({
  db, claim, ownerScope, ownerId, sourceVersion, loadCandidates, executePacket,
  limit = 3, now = Date.now,
} = {}) {
  const clock = typeof now === 'function' ? now : () => now;
  const startedAt = clock();
  if (!db?.prepare || claim?.claimed !== true || !Number.isSafeInteger(claim.id) ||
      typeof claim.fence !== 'string' || !claim.fence || !/^[a-f0-9]{64}$/i.test(ownerScope || '') ||
      typeof ownerId !== 'string' || !ownerId || !SHA.test(sourceVersion || '') ||
      typeof loadCandidates !== 'function' || typeof executePacket !== 'function' ||
      !Number.isInteger(limit) || limit < 2 || limit > 5 || !Number.isSafeInteger(startedAt))
    throw Error('packet_runner_arguments_invalid');
  if (!await activeClaim(db, claim, startedAt))
    return {status: 'lease_lost', scanned: false, attempted: []};

  await db.prepare(SCHEMA).run();
  const previous = await db.prepare('SELECT source_version,state,cycle_id,fence,result_json FROM continuity_packet_checkpoints WHERE owner_scope=?')
    .bind(ownerScope).first();
  const prior = priorResult(previous);
  // Never re-run an operation whose write may have succeeded without a settled
  // provider receipt. An operator must reconcile its immutable operation key.
  if (previous?.state === 'running' && prior.inFlight)
    return {status: 'reconciliation_required', scanned: false, attempted: [], inFlight: prior.inFlight};

  const sameVersion = previous?.source_version === sourceVersion;
  const state = {
    inventory: sameVersion && Array.isArray(prior.inventory) ? prior.inventory : null,
    attempted: Array.isArray(prior.attempted) ? prior.attempted.slice(-MAX_CANDIDATES) : [],
    skipped: Array.isArray(prior.skipped) ? prior.skipped.slice(-MAX_CANDIDATES) : [],
    blocked: Array.isArray(prior.blocked) ? prior.blocked.slice(-MAX_CANDIDATES) : [],
    done: Array.isArray(prior.done) ? prior.done.slice(-MAX_CANDIDATES) : [],
    receipts: Array.isArray(prior.receipts) ? prior.receipts.slice(-MAX_CANDIDATES) : [],
    inFlight: null,
  };
  const eligible = inventory => inventory.filter(packet =>
    !state.done.includes(actionKey(packet)) && !state.done.includes(packetKey(packet)) &&
    !(sameVersion && state.blocked.some(item => item.repo === packet.repo &&
      item.issue === packet.issue && item.headSha === packet.headSha &&
      (!item.action || item.action === packet.nextAction))));
  const choose = inventory => selectActionPackets(eligible(inventory),{
    blocked: state.blocked, done: [], ownerId, limit,
  });

  if (sameVersion && Array.isArray(state.inventory) && choose(state.inventory).length === 0)
    return {status: 'unchanged', scanned: false, attempted: state.attempted, skipped: state.skipped};

  // Both inserting and reclaiming the checkpoint require the *live* coordinator
  // lease inside the same SQLite statement. An expired former writer is allowed
  // to be replaced only when no unconfirmed in-flight operation is present.
  const reservation = [
    'INSERT INTO continuity_packet_checkpoints',
    '(owner_scope,source_version,state,cycle_id,fence,updated_at,result_json)',
    "SELECT ?,?,'running',?,?,?,? WHERE EXISTS",
    "(SELECT 1 FROM continuity_cycle_receipts WHERE cycle_id=? AND fence=? AND state='running' AND lease_until>?)",
    'AND 1=1 ON CONFLICT(owner_scope) DO UPDATE SET',
    "source_version=excluded.source_version,state='running',cycle_id=excluded.cycle_id,",
    'fence=excluded.fence,updated_at=excluded.updated_at,result_json=excluded.result_json',
    "WHERE (continuity_packet_checkpoints.state!='running' OR NOT EXISTS",
    "(SELECT 1 FROM continuity_cycle_receipts WHERE cycle_id=continuity_packet_checkpoints.cycle_id",
    "AND fence=continuity_packet_checkpoints.fence AND state='running' AND lease_until>?))",
    'AND EXISTS',
    "(SELECT 1 FROM continuity_cycle_receipts WHERE cycle_id=? AND fence=? AND state='running' AND lease_until>?)",
  ].join(' ');
  const reservedAt = clock();
  const reserved = await db.prepare(reservation)
    .bind(ownerScope, sourceVersion, claim.id, claim.fence, reservedAt, JSON.stringify(state),
      claim.id, claim.fence, reservedAt, reservedAt, claim.id, claim.fence, reservedAt).run();
  if (reserved?.meta?.changes !== 1)
    return {status: 'checkpoint_conflict', scanned: false, attempted: [], skipped: []};

  // Persist every state transition with a fenced comparison AND a live lease
  // predicate, atomically; the checkpoint's own fence alone is insufficient.
  async function save(checkpointState = 'running') {
    const stamp = clock();
    if (!Number.isSafeInteger(stamp)) throw Error('packet_clock_invalid');
    const sql = [
      'UPDATE continuity_packet_checkpoints SET state=?,updated_at=?,result_json=?',
      "WHERE owner_scope=? AND source_version=? AND state='running' AND cycle_id=? AND fence=?",
      'AND EXISTS',
      "(SELECT 1 FROM continuity_cycle_receipts WHERE cycle_id=? AND fence=? AND state='running' AND lease_until>?)",
    ].join(' ');
    const update = await db.prepare(sql)
      .bind(checkpointState, stamp, JSON.stringify(state), ownerScope, sourceVersion,
        claim.id, claim.fence, claim.id, claim.fence, stamp).run();
    return update?.meta?.changes === 1;
  }

  let scanned = false;
  if (!Array.isArray(state.inventory)) {
    let candidates;
    try {
      candidates = await loadCandidates({sourceVersion, limit: MAX_CANDIDATES});
      if (!Array.isArray(candidates) || candidates.length > MAX_CANDIDATES)
        throw Error('candidate_inventory_invalid');
    } catch {
      // A read failure happened before any provider action. Release the
      // checkpoint and retain prior dedupe/receipts for an ordinary retry.
      state.inventory = null;
      if (!await save('settled')) return {status: 'lease_lost', scanned: true, attempted: []};
      return {status: 'reconciliation_required', scanned: true, attempted: [], retryable: true};
    }
    scanned = true;
    // Persist only bounded canonical packet metadata, never arbitrary source
    // text, model instructions, customer data, or repository credentials.
    state.inventory = candidates.map(packet => ({
      repo: packet?.repo, issue: packet?.issue, headSha: packet?.headSha,
      nextAction: packet?.nextAction, nextSourcePath: packet?.nextSourcePath,
      priority: packet?.priority, state: packet?.state, blockReason: packet?.blockReason,
      lastActionAt: packet?.lastActionAt, securityHold: packet?.securityHold,
      requiredChecksPassed: packet?.requiredChecksPassed,
      requiredReviewsSatisfied: packet?.requiredReviewsSatisfied,
      lease: packet?.lease ? {
        verified: packet.lease.verified === true, active: packet.lease.active === true,
        holder: typeof packet.lease.holder === 'string' ? packet.lease.holder.slice(0,128) : null,
      } : undefined,
    }));
    if (!await save()) return {status: 'lease_lost', scanned, attempted: []};
  }

  const packets = choose(state.inventory);
  const skipped = skippedCandidates(state.inventory, {
    selected: packets, blocked: state.blocked, done: state.done, ownerId,
  });
  const attempted = [];
  for (const packet of packets) {
    const idempotencyKey = sourceVersion.slice(0, 16) + ':' + packet.issue + ':' +
      packet.headSha.slice(0, 12) + ':' + packet.nextAction;
    state.inFlight = {repo: packet.repo, issue: packet.issue, headSha: packet.headSha,
      action: packet.nextAction, idempotencyKey};
    if (!await save()) return {status: 'lease_lost', scanned, attempted, skipped};
    let receipt;
    try {
      const output = await executePacket(packet, {claim, idempotencyKey});
      receipt = output?.receipt;
      if (receipt?.idempotencyKey !== idempotencyKey) throw Error('packet_receipt_key_mismatch');
      if (receipt?.action !== packet.nextAction) throw Error('packet_receipt_action_mismatch');
      const accepted = recordPacketReceipt(state.receipts, packet, receipt);
      state.receipts = accepted.slice(-MAX_CANDIDATES).map(receiptSummary);
    } catch {
      // The external operation may have taken effect. Keep its *already
      // persisted* identity, and never blindly replay that provider call.
      return {status: 'reconciliation_required', scanned, attempted, skipped};
    }
    const entry = {repo: packet.repo, issue: packet.issue, headSha: packet.headSha,
      action: packet.nextAction, result: receipt.result};
    state.attempted.push(entry);
    state.attempted = state.attempted.slice(-MAX_CANDIDATES);
    attempted.push(entry);
    if (receipt.result === 'blocked')
      state.blocked.push({repo: packet.repo, issue: packet.issue, headSha: packet.headSha,
        action: packet.nextAction, reason: receipt.reason});
    if (['changed', 'reviewed', 'merged', 'deployed'].includes(receipt.result))
      state.done.push(actionKey(packet));
    state.blocked = state.blocked.slice(-MAX_CANDIDATES);
    state.done = [...new Set(state.done)].slice(-MAX_CANDIDATES);
    state.inFlight = null;
    if (!await save()) return {status: 'lease_lost', scanned, attempted, skipped};
  }
  state.skipped = skipped.slice(-MAX_CANDIDATES);
  if (!await save('settled'))
    return {status: 'lease_lost', scanned, attempted, skipped};
  return {status: attempted.length ? 'processed' : 'exhausted', scanned, attempted, skipped};
}
