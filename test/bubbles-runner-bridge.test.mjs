import test from 'node:test';
import assert from 'node:assert/strict';
import {authenticateBridge,checkBridgeClaims,runnerMessage} from '../workers/bubbles-cloud-browser/runner-bridge.mjs';
const claims={iss:'https://token.actions.githubusercontent.com',aud:'bubbles-owner-message-bridge',repository:'www-infinity4/Moltnook',repository_id:'1188306316',workflow_ref:'www-infinity4/Moltnook/.github/workflows/bubbles-owner-message.yml@refs/heads/main',ref:'refs/heads/main',event_name:'push',run_id:'12345',iat:1000,nbf:1000,exp:1300};
test('only exact owner repository main workflow and short lived audience are accepted',()=>{
 assert.equal(checkBridgeClaims(claims,1100),claims);
 for(const patch of [{repository_id:'1'},{aud:'other'},{ref:'refs/heads/other'},{workflow_ref:'other'},{exp:1099},{iat:1},{event_name:'pull_request'}])assert.throws(()=>checkBridgeClaims({...claims,...patch},1100));
});
test('real RS256 verification rejects forged signature',async()=>{
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const key={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'fixture'};
 const enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
 const input=enc({alg:'RS256',kid:'fixture'})+'.'+enc(claims);
 const signature=Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(input))).toString('base64url');
 const request=token=>new Request('https://bridge/',{headers:{Authorization:'Bearer '+token}});
 const options={now:1100,fetcher:async()=>Response.json({keys:[key]})};
 assert.equal((await authenticateBridge(request(input+'.'+signature),options)).run_id,'12345');
 await assert.rejects(()=>authenticateBridge(request(input+'.'+Buffer.alloc(256).toString('base64url')),options),/signature_rejected/);
});
function fixture(){let row=null,writes=0;return {get row(){return row},get writes(){return writes},db:{prepare(sql){return {bind(...args){return {run:async()=>{writes++;row??={payload:args[1],status:'queued',expires_ms:args[4]};},first:async()=>row}}}}}}}
const consent=enabled=>({chatgptStatus:async()=>({enabled}),status:async()=>({enabled})});
test('revoked approval blocks both insert and status, independent of runner identity',async()=>{
 const f=fixture();for(const operation of ['submit','status'])assert.equal((await runnerMessage({claims,body:{operation,text:'hello'},db:f.db,store:consent(false)})).status,403);
 assert.equal(f.writes,0);
});
test('same run retries once, cannot replace a message or extend expiry; reads return no private text',async()=>{
 const f=fixture(),args={claims,db:f.db,store:consent(true)};
 const one=await runnerMessage({...args,body:{operation:'submit',text:'hello'},now:1000});
 const two=await runnerMessage({...args,body:{operation:'submit',text:'hello'},now:2000});
 assert.equal(one.expiresAt,two.expiresAt);assert.equal(one.jobId,two.jobId);
 assert.equal((await runnerMessage({...args,body:{operation:'submit',text:'different'}})).status,409);
 const status=await runnerMessage({...args,body:{operation:'status'}});
 assert.equal(status.state,'queued');assert.ok(!JSON.stringify(status).includes('hello'));
 assert.equal((await runnerMessage({...args,body:{operation:'submit',text:'hello',accountId:'other'}})).status,400);
});

test('own-run blocked receipts disclose only fixed failure categories, never private reply text',async()=>{
 for(const error of ['bubbles_chat_not_ready','private-secret-error']){
  const f=fixture();await runnerMessage({claims,body:{operation:'submit',text:'hello'},db:f.db,store:consent(true)});
  f.row.status='blocked';f.row.result=JSON.stringify({error,reply:'private reply',token:'private token'});
  const status=await runnerMessage({claims,body:{operation:'status'},db:f.db,store:consent(true)});
  assert.equal(status.failureCode,error==='bubbles_chat_not_ready'?error:'unclassified_bridge_failure');
  assert.ok(!JSON.stringify(status).includes('private'));
 }
});
