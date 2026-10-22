import test from 'node:test';
import assert from 'node:assert/strict';
import {signedBrowserCheck,browserCheckPage} from '../workers/bubbles-cloud-browser/browser-check.mjs';
function fixture(){
 const rows=new Map(),calls=[];let enabled=true,clicked=false,unchanged=false;
 const db={prepare(sql){return {bind(...a){return {
  async first(){return rows.get(a[0])||null;},
  async run(){
   if(sql.startsWith('INSERT')){if(rows.has(a[0]))return {meta:{changes:0}};rows.set(a[0],{status:'server_pending',expires_ms:a[3]});return {meta:{changes:1}};}
   if(sql.includes("SET status='working'")){const r=rows.get(a[0]);if(r?.status!=='server_pending')return {meta:{changes:0}};r.status='working';return {meta:{changes:1}};}
   const row=rows.get(a[3]);if(row){row.status=a[0];row.result=a[1];}return {meta:{changes:1}};
  }
 };}}}};
 const env={BROWSER:{acquire:async()=>{calls.push('acquire');return {sessionId:'11111111-1111-4111-8111-111111111111'};},devtools:{newTarget:async(id,url)=>{calls.push('navigate');assert.equal(url,'https://bubbles-cloud-browser.marvaseater.workers.dev/browser-check');return {id:'target'};}},closeSession:async()=>{calls.push('close');}}};
 const args={claims:{run_id:'123'},body:{operation:'browser_check'},db,env,now:1000,pause:async()=>{},store:{chatgptStatus:async()=>({enabled}),status:async()=>({enabled})},
  act:async(env,step)=>{calls.push(step.action);if(step.action==='click'){assert.equal(step.label,'Run browser check');clicked=true;return {ok:true};}return {ok:true,url:'https://bubbles-cloud-browser.marvaseater.workers.dev/browser-check',text:clicked&&!unchanged?'Bubbles clicked this control.':'Waiting for browser check.'};}};
 return {args,rows,calls,revoke(){enabled=false;},noChange(){unchanged=true;}};
}
test('signed browser check requires before, click, changed page and cleanup receipts',async()=>{
 const f=fixture();const r=await signedBrowserCheck(f.args);
 assert.equal(r.state,'complete');assert.equal(r.result.receipt.clickObserved,true);assert.equal(r.result.receipt.afterObserved,true);assert.equal(r.result.receipt.sessionClosed,true);
 assert.deepEqual(f.calls,['acquire','navigate','read','click','read','close']);
 assert.doesNotMatch(JSON.stringify(r),/sessionId|proof|devtoolsFrontendUrl|Bearer|jwt=/);
});
test('replay reads the same receipt rather than repeating a browser interaction',async()=>{
 const f=fixture();const a=await signedBrowserCheck(f.args);const b=await signedBrowserCheck({...f.args,now:2000});
 assert.deepEqual(a,b);assert.equal(f.calls.filter(x=>x==='click').length,1);assert.equal(f.rows.get(a.jobId).expires_ms,241000);
});
test('revoked grants block browser allocation and old result reads',async()=>{
 const f=fixture();await signedBrowserCheck(f.args);f.revoke();const count=f.calls.length;
 assert.equal((await signedBrowserCheck(f.args)).status,403);assert.equal(f.calls.length,count);
});
test('callers cannot select an owner session, URL, label, credential or arbitrary code',async()=>{
 for(const extra of [{url:'https://private.example'},{sessionId:'existing'},{label:'Approve'},{code:'anything'},{ownerToken:'secret'}]){
  const f=fixture();assert.equal((await signedBrowserCheck({...f.args,body:{operation:'browser_check',...extra}})).status,400);assert.equal(f.calls.length,0);
 }
});
test('accepted click without a page change is a failure and still closes Chrome',async()=>{
 const f=fixture();f.noChange();const r=await signedBrowserCheck(f.args);
 assert.equal(r.state,'blocked');assert.equal(r.result.error,'page_state_not_observed');assert.equal(r.result.phase,'read_after');assert.equal(r.result.receipt.clickObserved,false);assert.equal(r.result.receipt.sessionClosed,true);
});
test('revocation between observation and click prevents the click',async()=>{
 const f=fixture(),act=f.args.act;f.args.act=async(...a)=>{const r=await act(...a);if(a[1].action==='read')f.revoke();return r;};
 const r=await signedBrowserCheck(f.args);assert.equal(r.result.error,'consent_revoked');assert.equal(f.calls.includes('click'),false);assert.equal(f.calls.at(-1),'close');
});
test('another run has a separate check; expired receipts never allocate again',async()=>{
 const f=fixture(),a=await signedBrowserCheck(f.args);
 assert.equal((await signedBrowserCheck({...f.args,now:242000})).status,410);
 const b=await signedBrowserCheck({...f.args,claims:{run_id:'456'}});assert.notEqual(a.jobId,b.jobId);
});
test('test page has an explicit harmless non-submit button and visible state change',async()=>{
 const response=browserCheckPage(),html=await response.text();assert.match(html,/button type="button"/);assert.match(html,/Waiting for browser check/);assert.match(html,/textContent='Bubbles clicked this control.'/);
 assert.match(response.headers.get('Content-Security-Policy'),/form-action 'none'/);
});
