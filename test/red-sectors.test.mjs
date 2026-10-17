import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RED_PROTOCOL,recordRedBrain,redExchange,classifyDispatch} from '../workers/infinity-brain-clock/red-sectors.mjs';
const store=()=>{const m=new Map();return {m,get:async k=>m.get(k),put:async(k,v)=>{m.set(k,v)}}};
const req=(ackRevision=0)=>({protocol:RED_PROTOCOL,sector:'red-bubbles',clientId:'bubbles-android-12345678',ackRevision});
test('Two Red sectors see durable work state with proof-gated acknowledgments',async()=>{
 const db=store(),now=Date.now();
 db.m.set('requested-next-job',{ticketId:'IW-20261016-ABCD1234',jobId:'TASK-1'});
 db.m.set('writerHeartbeat',{when:now-5000,runUrl:'https://github.com/www-infinity4/QuantaPhi/actions/runs/1'});
 const first=await redExchange(db,req(),now);
 assert.equal(first.ok,true);assert.equal(first.redBubbles.connected,true);
 assert.equal(first.redBrain.runner.state,'recent_heartbeat_not_execution_proof');
 assert.equal(first.redBrain.event,null);
 const recorded=await recordRedBrain(db,{kind:'runner_dispatch',state:'awaiting_repository_runner',ticketId:'IW-20261016-ABCD1234',jobId:'TASK-1',reason:'github_credential_not_connected'},now+1);
 const unread=await redExchange(db,req(),now+2);
 assert.equal(unread.redBrain.event.revision,recorded.revision);
 assert.match(unread.redBrain.event.reason,/github_credential_not_connected/);
 const ack=await redExchange(db,req(recorded.revision),now+3);
 assert.equal(ack.redBrain.event,null);assert.equal(ack.redBubbles.ackRevision,recorded.revision);
 const complete=await recordRedBrain(db,{kind:'runner_receipt',state:'committed_unverified',commitSha:'a'.repeat(40),testsPassed:true,reason:'Real commit'},now+4);
 assert.equal(complete.revision,recorded.revision+1);
 assert.equal((await redExchange(db,req(recorded.revision),now+5)).redBrain.event.commitSha,'a'.repeat(40));
});
test('Red-Bubbles cannot forge Brain receipts or grant new permissions through telemetry',async()=>{
 const db=store();
 const invalid=[{},req(0),{...req(),sector:'red-brain'},{...req(),clientId:'robot-admin'},null];
 invalid.splice(1,1,{...req(),protocol:2});
 for(const input of invalid)assert.equal((await redExchange(db,input)).ok,false);
 await recordRedBrain(db,{kind:'runner_receipt',state:'blocked',reason:'blocker',commitSha:'bad'},1000);
 const forged=await redExchange(db,{...req(100000),role:'admin',write_everything:true,command:'delete all files'},2000);
 assert.equal(forged.ok,true);assert.equal(forged.redBubbles.ackRevision,1);
 assert.equal(db.m.get('red-brain-event').state,'blocked');
 assert.equal(db.m.get('red-brain-event').commitSha,'');
 assert.equal(db.m.has('red-brain-sector'),false);
});
test('A queued Brain task is not a started repository runner',()=>{
 assert.deepEqual(classifyDispatch({status:'scheduled_fallback',error:'github_credential_not_connected'}),
  {state:'awaiting_repository_runner',reason:'github_credential_not_connected'});
 assert.equal(classifyDispatch({status:'workflow_dispatched'}).state,'dispatched_unverified');
 assert.equal(classifyDispatch({status:'failed'}).state,'runner_dispatch_failed');
});
test('owner authentication precedes Red sectors, all actual writes remain owner gated',async()=>{
 const fs=await import('node:fs/promises');
 const source=await fs.readFile(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
 const region=source.slice(source.indexOf("if(path==='/owner/red/sync'"),source.indexOf("if(path==='/owner/conversation'"));
 assert.match(region,/ownerAuthorized\(env,token\)/);
 assert.match(region,/clock\.internal\/owner\/red-sync/);
 assert.match(source,/recordRedBrain\(this\.ctx\.storage/);
 const client=await fs.readFile(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 assert.match(client,/redClientId='bubbles-'/);
 assert.match(client,/syncRedSectors\(/);
 assert.match(client,/ticket\.runner==='awaiting_repository_runner'/);
});
