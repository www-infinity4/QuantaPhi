import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {INTERVAL, LEASE, claimCycle} from '../workers/continuity-session-coordinator/worker.mjs';
import {runPacketPass} from '../continuity/packet-runner-adapter.mjs';

const SHA = 'a'.repeat(40), NEXT = 'b'.repeat(40), THIRD = 'c'.repeat(40);
const OWNER_SCOPE = 'd'.repeat(64), OWNER = 'verified-owner';
const REPO = 'www-infinity4/QuantaPhi';
const AT = Math.floor(Date.now() / INTERVAL) * INTERVAL;

function database() {
  const sqlite = new DatabaseSync(':memory:');
  const db = {prepare(query) {
    let values = [];
    const statement = {
      bind(...args) {values = args; return statement;},
      async run() {
        const result = sqlite.prepare(query).run(...values);
        return {success: true, meta: {changes: Number(result.changes)}};
      },
      async first() {return sqlite.prepare(query).get(...values) || null;},
    };
    return statement;
  }};
  return {db, sqlite, close: () => sqlite.close()};
}

const packet = (issue, overrides = {}) => ({
  repo: REPO, issue, headSha: SHA, nextAction: 'edit_code',
  nextSourcePath: `src/${issue}.mjs`, priority: 100 - issue, state: 'ready',
  ...overrides,
});
const receipt = (work, action, result, idempotencyKey, extra = {}) => ({
  repo: work.repo, issue: work.issue, headSha: work.headSha, action,
  result, idempotencyKey, ...extra,
});

async function claim(db, cycle, stamp, fence) {
  return claimCycle(db, cycle, stamp, fence);
}

test('changed inventory selects, rotates after one blocker, then resumes without rescanning', async () => {
  const d = database();
  try {
    const first = await claim(d.db, AT, AT, 'fence-one');
    let scans = 0, executions = [];
    const candidates = [packet(1), packet(2)];
    const firstRun = await runPacketPass({
      db: d.db, claim: first, ownerScope: OWNER_SCOPE, ownerId: OWNER,
      sourceVersion: SHA, now: AT + 1,
      loadCandidates: async () => {scans++; return candidates;},
      executePacket: async (work, {idempotencyKey}) => {
        executions.push(work.issue);
        return {receipt: work.issue === 1
          ? receipt(work, work.nextAction, 'blocked', idempotencyKey, {reason: 'needs owner scope'})
          : receipt(work, work.nextAction, 'changed', idempotencyKey, {
            providerConfirmed: true, artifactUrl: 'https://github.com/www-infinity4/QuantaPhi/commit/abc123',
          })};
      },
    });
    assert.equal(firstRun.status, 'processed');
    assert.equal(firstRun.scanned, true);
    assert.deepEqual(executions, [1, 2]);
    assert.equal(firstRun.attempted[0].result, 'blocked');
    assert.equal(firstRun.attempted[1].result, 'changed');

    const second = await claim(d.db, AT + INTERVAL, AT + INTERVAL, 'fence-two');
    const resumed = await runPacketPass({
      db: d.db, claim: second, ownerScope: OWNER_SCOPE, ownerId: OWNER,
      sourceVersion: SHA, now: AT + INTERVAL + 1,
      loadCandidates: async () => {scans++; throw Error('unchanged history must not be read');},
      executePacket: async () => {executions.push('duplicate'); throw Error('must not execute');},
    });
    assert.equal(resumed.status, 'unchanged');
    assert.equal(resumed.scanned, false);
    assert.equal(scans, 1);
    assert.deepEqual(executions, [1, 2]);

    const third = await claim(d.db, AT + 2 * INTERVAL, AT + 2 * INTERVAL, 'fence-three');
    const changed = await runPacketPass({
      db: d.db, claim: third, ownerScope: OWNER_SCOPE, ownerId: OWNER,
      sourceVersion: NEXT, now: AT + 2 * INTERVAL + 1,
      loadCandidates: async () => {
        scans++;
        return [
          packet(1, {state: 'blocked', blockReason: 'needs owner scope'}),
          packet(2),
          packet(3, {headSha: THIRD, nextSourcePath: 'src/3.mjs', priority: 10}),
        ];
      },
      executePacket: async (work, {idempotencyKey}) => {
        executions.push(work.issue);
        return {receipt: receipt(work, work.nextAction, 'changed', idempotencyKey, {
          providerConfirmed: true, artifactUrl: 'https://github.com/www-infinity4/QuantaPhi/commit/def456',
        })};
      },
    });
    assert.equal(changed.status, 'processed');
    assert.deepEqual(executions, [1, 2, 3]);
    assert.equal(scans, 2);
    assert.ok(changed.skipped.some(item => item.issue === 1 && item.reason === 'unchanged_blocker'));
    assert.ok(changed.skipped.some(item => item.issue === 2 && item.reason === 'already_receipted'));
  } finally {d.close();}
});

test('foreign active leases and safety holds are reported without invoking the executor', async () => {
  const d = database();
  try {
    const lease = await claim(d.db, AT, AT, 'fence-safe');
    let executions = 0;
    const result = await runPacketPass({
      db: d.db, claim: lease, ownerScope: OWNER_SCOPE, ownerId: OWNER,
      sourceVersion: SHA, now: AT + 1,
      loadCandidates: async () => [
        packet(10, {lease: {verified: true, active: true, holder: 'another-owner'}}),
        packet(11, {securityHold: true}),
      ],
      executePacket: async () => {executions++; throw Error('safety gate must stop execution');},
    });
    assert.equal(result.status, 'exhausted');
    assert.equal(executions, 0);
    assert.deepEqual(result.skipped.map(item => item.reason), ['foreign_active_lease', 'safety_hold']);
  } finally {d.close();}
});

test('a stale or foreign coordinator fence cannot scan or execute packets', async () => {
  const d = database();
  try {
    const current = await claim(d.db, AT, AT, 'current-fence');
    const stale = {...current, fence: 'stale-fence'};
    let scans = 0;
    const result = await runPacketPass({
      db: d.db, claim: stale, ownerScope: OWNER_SCOPE, ownerId: OWNER,
      sourceVersion: SHA, now: AT + 1,
      loadCandidates: async () => {scans++; return [packet(1)];},
      executePacket: async () => {throw Error('must not execute');},
    });
    assert.equal(result.status, 'lease_lost');
    assert.equal(scans, 0);
  } finally {d.close();}
});

test('expired live coordinator lease stops the second packet rather than using a stale timestamp', async () => {
  const d = database();
  try {
    const lease = await claim(d.db, AT, AT, 'fence-clock');
    let currentTime = AT + 1;
    const invoked = [];
    const result = await runPacketPass({
      db: d.db, claim: lease, ownerScope: OWNER_SCOPE, ownerId: OWNER,
      sourceVersion: SHA, now: () => currentTime,
      loadCandidates: async () => [packet(21), packet(22)],
      executePacket: async (work, {idempotencyKey}) => {
        invoked.push(work.issue);
        if (work.issue === 21) currentTime = AT + LEASE + 1;
        return {receipt: receipt(work, work.nextAction, 'changed', idempotencyKey, {
          providerConfirmed: true,
          artifactUrl: 'https://github.com/www-infinity4/QuantaPhi/commit/' + SHA,
        })};
      },
    });
    assert.equal(result.status, 'lease_lost');
    assert.deepEqual(invoked, [21], 'fence expiry must prevent the second provider action');
    assert.deepEqual(result.attempted.map(x => x.issue), [21]);
  } finally {d.close();}
});


test('rejects a receipt for a different action without marking the packet complete',async()=>{
 const d=database();try{
  const lease=await claim(d.db,AT,AT,'fence-action');
  const result=await runPacketPass({db:d.db,claim:lease,ownerScope:OWNER_SCOPE,ownerId:OWNER,
   sourceVersion:SHA,now:AT+1,loadCandidates:async()=>[packet(61)],
   executePacket:async(work,{idempotencyKey})=>({receipt:receipt(work,'request_review','reviewed',idempotencyKey,{
    providerConfirmed:true,artifactUrl:'https://github.com/www-infinity4/QuantaPhi/pull/61'
   })})
  });
  assert.equal(result.status,'reconciliation_required');
  const saved=JSON.parse(d.sqlite.prepare('SELECT result_json FROM continuity_packet_checkpoints').get().result_json);
  assert.equal(saved.pending.issue,61);
  assert.equal(saved.pending.action,'edit_code');
  assert.equal(saved.done.includes(REPO+'#61#'+SHA+'#edit_code'),false);
 }finally{d.close();}
});

test('atomically declines reservation when the previously checked coordinator lease expires',async()=>{
 const d=database();try{
  const lease=await claim(d.db,AT,AT,'fence-reserve-race');
  let scans=0,modified=false;
  const db={prepare(sql){
   const stmt=d.db.prepare(sql);
   if(!sql.includes('INSERT INTO continuity_packet_checkpoints'))return stmt;
   return {bind(...args){const bound=stmt.bind(...args);return {run:async()=>{
    if(!modified){modified=true;d.sqlite.prepare('UPDATE continuity_cycle_receipts SET lease_until=? WHERE cycle_id=?').run(AT,lease.id);}
    return bound.run();
   }}}};
  }};
  const result=await runPacketPass({db,claim:lease,ownerScope:OWNER_SCOPE,ownerId:OWNER,
   sourceVersion:SHA,now:AT+1,loadCandidates:async()=>{scans++;return [packet(62)]},
   executePacket:async()=>{throw Error('reservation must fail before any action')}
  });
  assert.equal(result.status,'checkpoint_conflict');
  assert.equal(scans,0);
  assert.equal(d.sqlite.prepare('SELECT count(*) n FROM continuity_packet_checkpoints').get().n,0);
 }finally{d.close();}
});

test('persists one provider-confirmed outcome and the next in-flight identity before a crash',async()=>{
 const d=database();try{
  const lease=await claim(d.db,AT,AT,'fence-crash');
  const result=await runPacketPass({db:d.db,claim:lease,ownerScope:OWNER_SCOPE,ownerId:OWNER,
   sourceVersion:SHA,now:AT+1,loadCandidates:async()=>[packet(71),packet(72)],
   executePacket:async(work,{idempotencyKey})=>{
    if(work.issue===72)throw Error('provider connection lost after request');
    return {receipt:receipt(work,work.nextAction,'changed',idempotencyKey,{
     providerConfirmed:true,artifactUrl:'https://github.com/www-infinity4/QuantaPhi/commit/'+SHA})};
   }
  });
  assert.equal(result.status,'reconciliation_required');
  const saved=JSON.parse(d.sqlite.prepare('SELECT result_json FROM continuity_packet_checkpoints').get().result_json);
  assert.deepEqual(saved.attempted.map(x=>x.issue),[71]);
  assert.equal(saved.receipts.length,1);
  assert.equal(saved.pending.issue,72);
  assert.equal(saved.done.includes(REPO+'#71#'+SHA+'#edit_code'),true);
  const next=await claim(d.db,AT+INTERVAL,AT+INTERVAL,'fence-crash-next');
  let rereads=0,replays=0;
  const resumed=await runPacketPass({db:d.db,claim:next,ownerScope:OWNER_SCOPE,ownerId:OWNER,
   sourceVersion:SHA,now:AT+INTERVAL+1,loadCandidates:async()=>{rereads++;return []},
   executePacket:async()=>{replays++;throw Error('duplicate mutation')}
  });
  assert.equal(resumed.status,'reconciliation_required');
  assert.equal(rereads,0);assert.equal(replays,0);
 }finally{d.close();}
});

test('an unchanged source resumes later eligible batches without rereading history',async()=>{
 const d=database();try{
  let scans=0,executed=[];
  const candidates=[packet(81),packet(82),packet(83),packet(84)];
  const run=async(cycle,source,reader)=>{
   const lease=await claim(d.db,cycle,cycle,'fence-'+cycle);
   return runPacketPass({db:d.db,claim:lease,ownerScope:OWNER_SCOPE,ownerId:OWNER,
    sourceVersion:source,limit:2,now:cycle+1,loadCandidates:reader,
    executePacket:async(work,{idempotencyKey})=>{
     executed.push(work.issue);
     return {receipt:receipt(work,work.nextAction,work.issue<83?'blocked':'changed',idempotencyKey,
      work.issue<83?{reason:'needs evidence for this revision'}:{
       providerConfirmed:true,artifactUrl:'https://github.com/www-infinity4/QuantaPhi/commit/'+SHA})};
    }
   });
  };
  const first=await run(AT,SHA,async()=>{scans++;return candidates});
  assert.equal(first.status,'processed');
  assert.deepEqual(executed,[81,82]);
  const second=await run(AT+INTERVAL,SHA,async()=>{scans++;throw Error('unchanged inventory must stay cached')});
  assert.equal(second.status,'processed');
  assert.equal(second.scanned,false);
  assert.deepEqual(executed,[81,82,83,84]);
  assert.equal(scans,1);
  const third=await run(AT+2*INTERVAL,SHA,async()=>{scans++;throw Error('no fresh scan')});
  assert.equal(third.status,'unchanged');
  assert.deepEqual(executed,[81,82,83,84]);assert.equal(scans,1);
 }finally{d.close();}
});

test('a temporary candidate read failure is settled retryably rather than poisoning the owner checkpoint',async()=>{
 const d=database();try{
  const lease=await claim(d.db,AT,AT,'fence-load-1');
  const failed=await runPacketPass({db:d.db,claim:lease,ownerScope:OWNER_SCOPE,ownerId:OWNER,
   sourceVersion:SHA,now:AT+1,loadCandidates:async()=>{throw Error('temporary GitHub source outage')},
   executePacket:async()=>{throw Error('should never execute')}});
  assert.equal(failed.status,'load_failed');
  const row=d.sqlite.prepare('SELECT state,result_json FROM continuity_packet_checkpoints').get();
  assert.equal(row.state,'settled');
  assert.equal(JSON.parse(row.result_json).inventoryLoaded,false);
  const newLease=await claim(d.db,AT+INTERVAL,AT+INTERVAL,'fence-load-2');
  const resumed=await runPacketPass({db:d.db,claim:newLease,ownerScope:OWNER_SCOPE,ownerId:OWNER,
   sourceVersion:SHA,now:AT+INTERVAL+1,loadCandidates:async()=>[packet(91)],
   executePacket:async(work,{idempotencyKey})=>({receipt:receipt(work,work.nextAction,'changed',idempotencyKey,{
    providerConfirmed:true,artifactUrl:'https://github.com/www-infinity4/QuantaPhi/commit/'+SHA})})});
  assert.equal(resumed.status,'processed');
  assert.deepEqual(resumed.attempted.map(x=>x.issue),[91]);
 }finally{d.close();}
});

test('a completed review does not prevent a later merge action for the same issue and head',async()=>{
 const d=database();try{
  const job=packet(92,{nextAction:'request_review'});
  const first=await claim(d.db,AT,AT,'fence-review');
  const reviewed=await runPacketPass({db:d.db,claim:first,ownerScope:OWNER_SCOPE,ownerId:OWNER,
   sourceVersion:SHA,now:AT+1,loadCandidates:async()=>[job],
   executePacket:async(work,{idempotencyKey})=>({receipt:receipt(work,work.nextAction,'reviewed',idempotencyKey,{
    providerConfirmed:true,artifactUrl:'https://github.com/www-infinity4/QuantaPhi/pull/92'})})});
  assert.equal(reviewed.status,'processed');
  const next=await claim(d.db,AT+INTERVAL,AT+INTERVAL,'fence-merge');
  const merged=await runPacketPass({db:d.db,claim:next,ownerScope:OWNER_SCOPE,ownerId:OWNER,
   sourceVersion:NEXT,now:AT+INTERVAL+1,
   loadCandidates:async()=>[packet(92,{nextAction:'merge_pr',requiredChecksPassed:true,requiredReviewsSatisfied:true})],
   executePacket:async(work,{idempotencyKey})=>({receipt:receipt(work,work.nextAction,'merged',idempotencyKey,{
    providerConfirmed:true,mergeSha:THIRD})})});
  assert.equal(merged.status,'processed');
  assert.equal(merged.attempted[0].action,'merge_pr');
 }finally{d.close();}
});

test('a lease reclaimed between receipt validation and final settlement cannot commit stale state',async()=>{
 const d=database();try{
  const lease=await claim(d.db,AT,AT,'fence-final');
  let expired=false;
  const db={prepare(sql){
   const stmt=d.db.prepare(sql);
   if(!sql.includes('UPDATE continuity_packet_checkpoints SET state='))return stmt;
   return {bind(...args){const bound=stmt.bind(...args);return {run:async()=>{
    if(args[0]==='settled'&&!expired){expired=true;d.sqlite.prepare('UPDATE continuity_cycle_receipts SET lease_until=? WHERE cycle_id=?').run(AT,lease.id);}
    return bound.run();
   }}}};
  }};
  const result=await runPacketPass({db,claim:lease,ownerScope:OWNER_SCOPE,ownerId:OWNER,
   sourceVersion:SHA,now:AT+1,loadCandidates:async()=>[packet(93)],
   executePacket:async(work,{idempotencyKey})=>({receipt:receipt(work,work.nextAction,'changed',idempotencyKey,{
    providerConfirmed:true,artifactUrl:'https://github.com/www-infinity4/QuantaPhi/commit/'+SHA})})});
  assert.notEqual(result.status,'processed');
  const row=d.sqlite.prepare('SELECT state,result_json FROM continuity_packet_checkpoints').get();
  assert.equal(row.state,'running');
  assert.equal(JSON.parse(row.result_json).receipts.length,1,'confirmed receipt must survive stale final settlement');
 }finally{d.close();}
});


test('concurrent snapshot change rejects stale checkpoint reservation rather than overwriting receipts',async()=>{
 const d=database();try{
  const first=await claim(d.db,AT,AT,'snap-a');
  await runPacketPass({db:d.db,claim:first,ownerScope:OWNER_SCOPE,ownerId:OWNER,
   sourceVersion:SHA,now:AT+1,loadCandidates:async()=>[],executePacket:async()=>{throw Error('not called')}});
  const next=await claim(d.db,AT+INTERVAL,AT+INTERVAL,'snap-b');
  let changed=false,scans=0;
  const db={prepare(sql){
   const stmt=d.db.prepare(sql);
   if(!sql.includes('INSERT INTO continuity_packet_checkpoints'))return stmt;
   return {bind(...args){const bound=stmt.bind(...args);return {run:async()=>{
    if(!changed){
     changed=true;
     const old=d.sqlite.prepare('SELECT result_json FROM continuity_packet_checkpoints').get();
     const ledger=JSON.parse(old.result_json);
     ledger.receipts=[{repo:REPO,issue:45,headSha:SHA,action:'edit_code',result:'changed',
       idempotencyKey:'external-45',providerConfirmed:true}];
     d.sqlite.prepare('UPDATE continuity_packet_checkpoints SET result_json=?,updated_at=updated_at+1')
       .run(JSON.stringify(ledger));
    }
    return bound.run();
   }}}};
  }};
  const result=await runPacketPass({db,claim:next,ownerScope:OWNER_SCOPE,ownerId:OWNER,
    sourceVersion:NEXT,now:AT+INTERVAL+1,
    loadCandidates:async()=>{scans++;return [packet(46)]},
    executePacket:async()=>{throw Error('must not execute')}});
  assert.equal(result.status,'checkpoint_conflict');assert.equal(scans,0);
  const saved=JSON.parse(d.sqlite.prepare('SELECT result_json FROM continuity_packet_checkpoints').get().result_json);
  assert.equal(saved.receipts[0].issue,45);
 }finally{d.close();}
});

test('legacy running checkpoint without an explicit pending field always requires reconciliation',async()=>{
 const d=database();try{
  const original=await claim(d.db,AT,AT,'legacy-start');
  await runPacketPass({db:d.db,claim:original,ownerScope:OWNER_SCOPE,ownerId:OWNER,
    sourceVersion:SHA,now:AT+1,loadCandidates:async()=>[packet(45)],
    executePacket:async()=>{throw Error('uncertain provider write')}});
  d.sqlite.prepare("UPDATE continuity_packet_checkpoints SET state='running',result_json='{}'").run();
  const next=await claim(d.db,AT+INTERVAL,AT+INTERVAL,'legacy-after-expiry');
  let scans=0,executes=0;
  const result=await runPacketPass({db:d.db,claim:next,ownerScope:OWNER_SCOPE,ownerId:OWNER,
    sourceVersion:SHA,now:AT+INTERVAL+1,loadCandidates:async()=>{scans++;return [packet(45)]},
    executePacket:async()=>{executes++;throw Error('duplicate')}});
  assert.equal(result.status,'reconciliation_required');
  assert.equal(scans,0);assert.equal(executes,0);
 }finally{d.close();}
});

test('cached inventory terminal markers prevent replay after 100-entry done/blocker history evicts keys',async()=>{
 const d=database();try{
  const initial=await claim(d.db,AT,AT,'cache-init');
  await runPacketPass({db:d.db,claim:initial,ownerScope:OWNER_SCOPE,ownerId:OWNER,
    sourceVersion:SHA,now:AT+1,loadCandidates:async()=>[],executePacket:async()=>{throw Error('empty')}});
  const previous=JSON.parse(d.sqlite.prepare('SELECT result_json FROM continuity_packet_checkpoints').get().result_json);
  const oldDone=packet(1),oldBlocked=packet(2);
  const actionKey=p=>[p.repo,p.issue,p.headSha,p.nextAction].join('#');
  const history=Array.from({length:99},(_,i)=>REPO+'#'+(1000+i)+'#'+SHA+'#edit_code');
  previous.done=[actionKey(oldDone),...history];
  previous.blocked=[{repo:REPO,issue:2,headSha:SHA,action:'edit_code',sourceVersion:SHA,reason:'blocked previously'},
   ...Array.from({length:99},(_,i)=>({repo:REPO,issue:2000+i,headSha:SHA,
     action:'edit_code',sourceVersion:SHA,reason:'old block'}))];
  previous.inventoryLoaded=true;previous.exhausted=false;
  previous.candidates=[{...oldDone,terminal:'done'},{...oldBlocked,terminal:'blocked'},packet(3),packet(4)];
  d.sqlite.prepare('UPDATE continuity_packet_checkpoints SET result_json=?').run(JSON.stringify(previous));
  const fresh=await claim(d.db,AT+INTERVAL,AT+INTERVAL,'cache-next');
  const invoked=[];
  const processed=await runPacketPass({db:d.db,claim:fresh,ownerScope:OWNER_SCOPE,ownerId:OWNER,
    sourceVersion:SHA,now:AT+INTERVAL+1,limit:2,
    loadCandidates:async()=>{throw Error('cached inventory only')},
    executePacket:async(work,{idempotencyKey})=>{
      invoked.push(work.issue);
      return {receipt:work.issue===4?receipt(work,work.nextAction,'blocked',idempotencyKey,{reason:'new block'})
       :receipt(work,work.nextAction,'changed',idempotencyKey,{providerConfirmed:true,
        artifactUrl:'https://github.com/www-infinity4/QuantaPhi/commit/'+SHA})};
    }});
  assert.equal(processed.status,'processed');
  assert.deepEqual(invoked,[3,4]);
  const another=await claim(d.db,AT+2*INTERVAL,AT+2*INTERVAL,'cache-final');
  const resumed=await runPacketPass({db:d.db,claim:another,ownerScope:OWNER_SCOPE,ownerId:OWNER,
   sourceVersion:SHA,now:AT+2*INTERVAL+1,
   loadCandidates:async()=>{throw Error('no repeat scan')},
   executePacket:async()=>{throw Error('must not replay old terminal candidates')}});
  assert.equal(resumed.status,'unchanged');
  assert.deepEqual(invoked,[3,4]);
 }finally{d.close();}
});

test('legacy blocked merge receipt does not make a later eligible merge completed',async()=>{
 const d=database();try{
  const start=await claim(d.db,AT,AT,'legacy-done-setup');
  await runPacketPass({db:d.db,claim:start,ownerScope:OWNER_SCOPE,ownerId:OWNER,
    sourceVersion:SHA,now:AT+1,loadCandidates:async()=>[],executePacket:async()=>{throw Error('empty')}});
  const legacy=JSON.parse(d.sqlite.prepare('SELECT result_json FROM continuity_packet_checkpoints').get().result_json);
  legacy.done=[REPO+'#51#'+SHA];
  legacy.receipts=[
    {repo:REPO,issue:51,headSha:SHA,action:'merge_pr',result:'blocked',idempotencyKey:'blocked',reason:'not ready'},
    {repo:REPO,issue:51,headSha:SHA,action:'request_review',result:'reviewed',
      idempotencyKey:'reviewed',providerConfirmed:true}
  ];
  d.sqlite.prepare('UPDATE continuity_packet_checkpoints SET result_json=?').run(JSON.stringify(legacy));
  const next=await claim(d.db,AT+INTERVAL,AT+INTERVAL,'legacy-done-next');
  const merged=await runPacketPass({db:d.db,claim:next,ownerScope:OWNER_SCOPE,ownerId:OWNER,
    sourceVersion:NEXT,now:AT+INTERVAL+1,
    loadCandidates:async()=>[packet(51,{nextAction:'merge_pr',requiredChecksPassed:true,requiredReviewsSatisfied:true})],
    executePacket:async(work,{idempotencyKey})=>({receipt:receipt(work,work.nextAction,'merged',idempotencyKey,
      {providerConfirmed:true,mergeSha:THIRD})})});
  assert.equal(merged.status,'processed');
  assert.equal(merged.attempted[0].result,'merged');
 }finally{d.close();}
});

test('D1 packet pass persists verified dependency requirements and reports source overlap without dispatch', async () => {
 const d=database();
 try{
  const lease=await claim(d.db,AT,AT,'graph-fence');
  const observed=[];
  const result=await runPacketPass({
   db:d.db,claim:lease,ownerScope:OWNER_SCOPE,ownerId:OWNER,sourceVersion:SHA,now:AT+1,
   loadCandidates:async()=>[
    packet(90,{priority:100,dependencies:[REPO+'#89'],estimatedMinutes:30}),
    packet(91,{priority:99,scopePaths:['src/shared/'],nextSourcePath:'src/shared/module.mjs'}),
    packet(92,{priority:98,scopePaths:['src/shared/file.mjs'],nextSourcePath:'src/shared/file.mjs'}),
    packet(93,{priority:97,nextSourcePath:'src/other.mjs'})
   ],
   executePacket:async (work,{idempotencyKey})=>{
    observed.push(work.issue);
    return {receipt:receipt(work,work.nextAction,'changed',idempotencyKey,{
      providerConfirmed:true,artifactUrl:'https://github.com/www-infinity4/QuantaPhi/commit/abc123'
    })};
   }
  });
  assert.deepEqual(observed,[91,93]);
  assert.ok(result.skipped.some(s=>s.issue===90&&s.reason==='dependency_pending'));
  assert.ok(result.skipped.some(s=>s.issue===92&&s.reason==='source_overlap'));
 }finally{d.close()}
});

test('dependency completion resumes same-version inventory without history reread or replay', async () => {
 const d=database();
 try{
  const first=await claim(d.db,AT,AT,'dependency-first');
  let scans=0,executions=0;
  const before=await runPacketPass({
   db:d.db,claim:first,ownerScope:OWNER_SCOPE,ownerId:OWNER,sourceVersion:SHA,now:AT+1,
   loadCandidates:async()=>{scans++;return [packet(80,{dependencies:[REPO+'#79']})];},
   executePacket:async()=>{executions++;throw Error('missing dependency must not execute')}
  });
  assert.equal(before.status,'dependency_pending');
  assert.equal(executions,0);
  const second=await claim(d.db,AT+INTERVAL,AT+INTERVAL,'dependency-second');
  const after=await runPacketPass({
   db:d.db,claim:second,ownerScope:OWNER_SCOPE,ownerId:OWNER,sourceVersion:SHA,now:AT+INTERVAL+1,
   completedDependencies:[REPO+'#79'],
   loadCandidates:async()=>{scans++;throw Error('same source version must not rescan');},
   executePacket:async(work,{idempotencyKey})=>{executions++;return {
    receipt:receipt(work,work.nextAction,'changed',idempotencyKey,{
     providerConfirmed:true,artifactUrl:'https://github.com/www-infinity4/QuantaPhi/commit/abc123'
    })
   }}
  });
  assert.equal(after.status,'processed');
  assert.equal(scans,1);
  assert.equal(executions,1);
 }finally{d.close()}
});
