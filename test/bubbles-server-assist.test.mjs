import test from 'node:test';
import assert from 'node:assert/strict';
import {serverAssist} from '../workers/bubbles-cloud-browser/server-assist.mjs';
function setup(){
 const rows=new Map(),tasks=[],calls=[];let enabled=true;
 const db={prepare(sql){return {bind(...a){return {
  async run(){
   if(sql.startsWith('INSERT')){if(rows.has(a[0]))return {meta:{changes:0}};rows.set(a[0],{payload:a[1],status:'working',expires_ms:a[4]});return {meta:{changes:1}};}
   const row=rows.get(a[3]);if(row){row.status=a[0];row.result=a[1];}return {meta:{changes:1}};
  },async first(){return rows.get(a[0])||null;}
 };}}}};
 const store={chatgptStatus:async()=>({enabled}),status:async()=>({enabled})};
 const args={claims:{run_id:'123'},db,store,schedule:p=>tasks.push(p),now:1000,fetcher:async(url,options)=>{
  calls.push({url,options});return Response.json({ok:true,output:'Verified weather answer',receipt:{tool:'weather.current',status:'complete'}});
 }};
 return {args,rows,tasks,calls,revoke(){enabled=false}};
}
test('server completes without an open browser and returns its own answer and receipt',async()=>{
 const f=setup();const first=await serverAssist({...f.args,body:{operation:'assist',text:'Weather in Albia Iowa'}});
 assert.equal(first.execution,'server');assert.equal(first.state,'working');await Promise.all(f.tasks);
 const result=await serverAssist({...f.args,body:{operation:'result'}});
 assert.equal(result.state,'complete');assert.equal(result.result.output,'Verified weather answer');
 assert.equal(result.result.receipt.tool,'weather.current');assert.equal(result.result.ownerToolsVerified,false);
 assert.equal(f.calls[0].url,'https://bubbles-tools.marvaseater.workers.dev/v1/assist');
 assert.equal(f.calls[0].options.headers.Authorization,undefined);
});
test('retries do not execute twice, replace a question or extend expiry',async()=>{
 const f=setup(),body={operation:'assist',text:'hello'};
 const one=await serverAssist({...f.args,body});const two=await serverAssist({...f.args,body,now:2000});
 await Promise.all(f.tasks);assert.equal(f.calls.length,1);assert.equal(one.expiresAt,two.expiresAt);
 assert.equal((await serverAssist({...f.args,body:{...body,text:'replacement'}})).status,409);
});
test('another signed run cannot read a reply and arbitrary selectors are rejected',async()=>{
 const f=setup();await serverAssist({...f.args,body:{operation:'assist',text:'hello'}});await Promise.all(f.tasks);
 assert.equal((await serverAssist({...f.args,claims:{run_id:'456'},body:{operation:'result'}})).state,'missing');
 for(const body of [{operation:'result',jobId:'chatgpt_assist_123_0'},{operation:'assist',text:'hi',ownerToken:'x'},{operation:'assist',text:'hi',turn:10}])
  assert.equal((await serverAssist({...f.args,body})).status,400);
});
test('revoked approval blocks submit, results and completion',async()=>{
 const f=setup();let release;
 f.args.fetcher=async()=>{await new Promise(r=>release=r);return Response.json({ok:true,output:'answer',receipt:{tool:'conversation'}});};
 await serverAssist({...f.args,body:{operation:'assist',text:'hello'}});
 // Let the execution reach its remote request before revocation.
 while(!release)await new Promise(r=>setImmediate(r));
 f.revoke();release();await Promise.all(f.tasks);
 assert.equal(f.rows.get('chatgpt_assist_123_0').status,'blocked');
 assert.equal(JSON.parse(f.rows.get('chatgpt_assist_123_0').result).error,'consent_revoked');
 for(const operation of ['assist','result'])assert.equal((await serverAssist({...f.args,body:{operation,text:'hello'}})).status,403);
});
test('failed or empty gateway responses cannot claim success; expiry is enforced',async()=>{
 const f=setup();f.args.fetcher=async()=>Response.json({ok:true,output:'',receipt:{status:'complete'}});
 await serverAssist({...f.args,body:{operation:'assist',text:'hello'}});await Promise.all(f.tasks);
 const result=await serverAssist({...f.args,body:{operation:'result'}});assert.equal(result.state,'blocked');
 assert.equal((await serverAssist({...f.args,body:{operation:'result'},now:300000})).status,410);
});
