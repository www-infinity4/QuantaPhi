import test from 'node:test';
import assert from 'node:assert/strict';
import {phoneTool,validatePhoneCommand} from '../workers/infinity-brain-clock/phone-tool.mjs';
import {parseRequest} from '../bubbles-phone-tool.mjs';
const generation='11111111-1111-4111-8111-111111111111';
const id='22222222-2222-4222-8222-222222222222';
const storage=()=>{const map=new Map();return {get:async k=>structuredClone(map.get(k)),put:async(k,v)=>{map.set(k,structuredClone(v));},delete:async k=>map.delete(k)};};
async function start(){const db=storage();const opened=await phoneTool(db,'open',{generation},'',1000);return {db,...opened.body};}
test('phone commands require fresh typed targets and bounded nonempty text',()=>{
 assert.throws(()=>validatePhoneCommand({id,action:'type',target:1,text:'hello'}),/fresh/);
 assert.throws(()=>validatePhoneCommand({id,action:'type',target:1,observation:generation,text:'x'.repeat(6001)}),/text/);
 assert.throws(()=>validatePhoneCommand({id,action:'shell',text:'id'}),/invalid/);
 assert.deepEqual(validatePhoneCommand({id,action:'read'}),{id,action:'read'});
});
test('only the device capability can receive a command',async()=>{
 const s=await start();
 const queued=await phoneTool(s.db,'command',{sessionId:s.sessionId,id,action:'read'},'',1100);
 assert.equal(queued.body.status,'queued');
 assert.equal((await phoneTool(s.db,'next',{generation},'wrong',1200)).status,401);
 const next=await phoneTool(s.db,'next',{generation},s.deviceToken,1200);
 assert.equal(next.body.command.id,id);
 assert.equal((await phoneTool(s.db,'next',{generation},s.deviceToken,1300)).body.command,null);
});
test('retries do not duplicate sends and uncertain deliveries block new actions',async()=>{
 const s=await start(),command={sessionId:s.sessionId,id,action:'read'};
 await phoneTool(s.db,'command',command,'',1100);
 await phoneTool(s.db,'next',{generation},s.deviceToken,1200);
 assert.equal((await phoneTool(s.db,'command',command,'',1300)).body.duplicate,true);
 const stale=await phoneTool(s.db,'next',{generation},s.deviceToken,33000);
 assert.equal(stale.body.command,null);
 const state=await phoneTool(s.db,'status',{},'',33001);
 assert.equal(state.body.receipt.status,'outcome_unknown');
 const newCommand={...command,id:generation};
 assert.equal((await phoneTool(s.db,'command',newCommand,'',33002)).body.error,'phone_action_in_progress');
});
test('receipt must match the delivered command, then is readable by owner',async()=>{
 const s=await start();
 await phoneTool(s.db,'command',{sessionId:s.sessionId,id,action:'read'},'',1100);
 await phoneTool(s.db,'next',{generation},s.deviceToken,1200);
 assert.equal((await phoneTool(s.db,'result',{generation,receipt:{id:generation,ok:true}},s.deviceToken,1300)).status,409);
 const receipt={id,ok:true,result:{observation:generation,nodes:[{target:0,label:'Reply'}],untrusted:true}};
 assert.equal((await phoneTool(s.db,'result',{generation,receipt},s.deviceToken,1400)).body.received,true);
 assert.equal((await phoneTool(s.db,'result',{generation,receipt},s.deviceToken,1450)).body.duplicate,true);
 const state=(await phoneTool(s.db,'status',{},'',1500)).body;
 assert.equal(state.status,'ready');assert.equal(state.receipt.result.untrusted,true);
 assert.equal(state.deviceToken,undefined);assert.equal(state.tokenHash,undefined);
});
test('expiry removes observations and prevents replay or silent session renewal',async()=>{
 const s=await start();
 assert.equal((await phoneTool(s.db,'open',{generation},'',2000)).status,409);
 assert.equal((await phoneTool(s.db,'status',{},'',601001)).body.error,'phone_session_off');
 assert.equal((await phoneTool(s.db,'next',{generation},s.deviceToken,601002)).body.error,'phone_session_off');
});
test('new generation cannot receive an old session command',async()=>{
 const s=await start();
 assert.equal((await phoneTool(s.db,'next',{generation:id},s.deviceToken,2000)).body.error,'phone_generation_changed');
});
test('phone text is preserved exactly, and quoted provider text is not parsed as a tool',()=>{
 assert.deepEqual(parseRequest('phone type 4: hello\nworld'),{action:'type',target:4,text:'hello\nworld'});
 assert.equal(parseRequest('The page says phone tap 4'),null);
 assert.equal(parseRequest('phone tap 2; delete account'),null);
});
