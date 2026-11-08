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
    else if (completed.has(key)) reason = 'already_receipted';
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
    repo: receipt.repo, issue: receipt.issue, headSha: receipt.headSha,
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
  limit = 3, now = Date.now(),
} = {}) {
  if (!db?.prepare || claim?.claimed !== true || !Number.isSafeInteger(claim.id) ||
      typeof claim.fence !== 'string' || !claim.fence || !/^[a-f0-9]{64}$/i.test(ownerScope || '') ||
      typeof ownerId !== 'string' || !ownerId || !SHA.test(sourceVersion || '') ||
      typeof loadCandidates !== 'function' || typeof executePacket !== 'function' ||
      !Number.isInteger(limit) || limit < 2 || limit > 5 || !Number.isSafeInteger(now))
    throw Error('packet_runner_arguments_invalid');
  if (!await activeClaim(db, claim, now)) return {status: 'lease_lost', scanned: false, attempted: []};

  await db.prepare(SCHEMA).run();
  const previous = await db.prepare(`SELECT source_version,state,result_json
    FROM continuity_packet_checkpoints WHERE owner_scope=?`).bind(ownerScope).first();
  const oldResult = priorResult(previous);
  if (previous?.source_version === sourceVersion)
    return {status: previous.state === 'running' ? 'reconciliation_required' : 'unchanged',
      scanned: false, attempted: oldResult.attempted || [], skipped: oldResult.skipped || []};
  if (previous?.state === 'running')
    return {status: 'reconciliation_required', scanned: false, attempted: [], skipped: []};
  if (!needsHistoryScan({currentVersion: sourceVersion, lastScannedVersion: previous?.source_version || ''}))
    return {status: 'unchanged', scanned: false, attempted: [], skipped: []};

  const reserved = await db.prepare(`INSERT INTO continuity_packet_checkpoints
    (owner_scope,source_version,state,cycle_id,fence,updated_at,result_json)
    VALUES(?,?,'running',?,?,?,'{}')
    ON CONFLICT(owner_scope) DO UPDATE SET source_version=excluded.source_version,
      state='running',cycle_id=excluded.cycle_id,fence=excluded.fence,
      updated_at=excluded.updated_at,result_json='{}'
    WHERE continuity_packet_checkpoints.state!='running'`)
    .bind(ownerScope, sourceVersion, claim.id, claim.fence, now).run();
  if (reserved?.meta?.changes !== 1)
    return {status: 'checkpoint_conflict', scanned: false, attempted: [], skipped: []};

  let candidates;
  try {
    candidates = await loadCandidates({sourceVersion, limit: MAX_CANDIDATES});
    if (!Array.isArray(candidates) || candidates.length > MAX_CANDIDATES)
      throw Error('candidate_inventory_invalid');
  } catch {
    return {status: 'reconciliation_required', scanned: true, attempted: [], skipped: []};
  }

  const blocked = Array.isArray(oldResult.blocked) ? oldResult.blocked : [];
  const done = Array.isArray(oldResult.done) ? oldResult.done : [];
  const packets = selectActionPackets(candidates, {blocked, done, ownerId, limit});
  const skipped = skippedCandidates(candidates, {selected: packets, blocked, done, ownerId});
  let receipts = Array.isArray(oldResult.receipts) ? oldResult.receipts : [];
  const attempted = [];
  const nextBlocked = [...blocked];
  const nextDone = [...done];
  for (const packet of packets) {
    if (!await activeClaim(db, claim, now))
      return {status: 'lease_lost', scanned: true, attempted, skipped};
    const idempotencyKey = `${sourceVersion.slice(0, 16)}:${packet.issue}:${packet.headSha.slice(0, 12)}:${packet.nextAction}`;
    let receipt;
    try {
      const result = await executePacket(packet, {claim, idempotencyKey});
      receipt = result?.receipt;
      if (receipt?.idempotencyKey !== idempotencyKey) throw Error('packet_receipt_key_mismatch');
      receipts = recordPacketReceipt(receipts, packet, receipt);
    } catch {
      return {status: 'reconciliation_required', scanned: true, attempted, skipped};
    }
    attempted.push({repo: packet.repo, issue: packet.issue, headSha: packet.headSha,
      action: packet.nextAction, result: receipt.result});
    if (receipt.result === 'blocked') nextBlocked.push({
      repo: packet.repo, issue: packet.issue, headSha: packet.headSha, reason: receipt.reason,
    });
    if (['changed', 'reviewed', 'merged', 'deployed'].includes(receipt.result))
      nextDone.push(packetKey(packet));
  }

  const result = {
    attempted, skipped, blocked: nextBlocked.slice(-MAX_CANDIDATES),
    done: [...new Set(nextDone)].slice(-MAX_CANDIDATES),
    receipts: receipts.slice(-MAX_CANDIDATES).map(receiptSummary),
  };
  if (!await activeClaim(db, claim, now))
    return {status: 'lease_lost', scanned: true, attempted, skipped};
  const saved = await db.prepare(`UPDATE continuity_packet_checkpoints SET state=?,updated_at=?,result_json=?
    WHERE owner_scope=? AND source_version=? AND state='running' AND cycle_id=? AND fence=?`)
    .bind('settled', now, JSON.stringify(result), ownerScope, sourceVersion, claim.id, claim.fence).run();
  if (saved?.meta?.changes !== 1)
    return {status: 'checkpoint_conflict', scanned: true, attempted, skipped};
  return {status: attempted.length ? 'processed' : 'exhausted', scanned: true, attempted, skipped};
}
