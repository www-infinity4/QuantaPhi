import test from 'node:test';
import assert from 'node:assert/strict';
import {signedBrowserCheck,browserCheckPage} from '../workers/bubbles-cloud-browser/browser-check.mjs';
function fixture(){
 const rows=new Map(),calls=[];let enabled=true,clicked=false,unchanged=false,publicUnavailable=false,publicOpened=false,publicNoChange=false;
 const db={prepare(sql){return {bind(...a){return {
  async first(){return rows.get(a[0])||null;},
  async run(){
   if(sql.startsWith('INSERT')){if(rows.has(a[0]))return {meta:{changes:0}};rows.set(a[0],{status:'server_pending',expires_ms:a[3]});return {meta:{changes:1}};}
   if(sql.includes("SET status='working'")){const r=rows.get(a[0]);if(r?.status!=='server_pending')return {meta:{changes:0}};r.status='working';return {meta:{changes:1}};}
   const row=rows.get(a[3]);if(row){row.status=a[0];row.result=a[1];}return {meta:{changes:1}};
  }
 };}}}};
 const env={BROWSER:{acquire:async()=>{calls.push('acquire');return {sessionId:'11111111-1111-4111-8111-111111111111'};},devtools:{newTarget:async(id,url)=>{if(url==='https://quantaphi.org/bubbles.html'){calls.push('navigate_public');return {id:'public-target'};}calls.push('navigate');assert.equal(url,'https://bubbles-cloud-browser.marvaseater.workers.dev/browser-check');return {id:'target'};}},closeSession:async()=>{calls.push('close');}}};
 const args={claims:{run_id:'123'},body:{operation:'browser_check'},db,env,now:1000,pause:async()=>{},store:{chatgptStatus:async()=>({enabled}),status:async()=>({enabled})},
  act:async(env,step)=>{
   if(step.targetId==='public-target'){
    if(step.action==='click'){
     calls.push('click_public');assert.equal(step.label,'Open Bubbles chat');publicOpened=true;
     return {ok:true,clickDispatched:true,effectVerified:false};
    }
    calls.push('read_public');
    return publicUnavailable?{ok:false,url:'about:blank'}:{ok:true,
     url:publicOpened&&!publicNoChange?'https://quantaphi.org/bubbles.html#chat':'https://quantaphi.org/bubbles.html',
     text:publicOpened&&!publicNoChange?'Bubbles chat opened':'Bubbles public home',
     title:'Bubbles AI — QuantaPhi',controls:[{label:'Open Bubbles chat',context:'Bubbles',disabled:false},
       {label:'Connect GitHub and other accounts',disabled:false}]};
   }
   calls.push(step.action);
   if(step.action==='click'){assert.equal(step.label,'Run browser check');clicked=true;return {ok:true};}
   return {ok:true,url:'https://bubbles-cloud-browser.marvaseater.workers.dev/browser-check',
    controls:[{label:'Run browser check',disabled:false}],
    text:clicked&&!unchanged?'Bubbles clicked this control.':'Waiting for browser check.'};
  }};
 return {args,rows,calls,revoke(){enabled=false;},noChange(){unchanged=true;},noPublicPage(){publicUnavailable=true;},noPublicChange(){publicNoChange=true;}};
}
test('signed browser check requires before, click, changed page and cleanup receipts',async()=>{
 const f=fixture();const r=await signedBrowserCheck(f.args);
 assert.equal(r.state,'complete');assert.equal(r.result.receipt.clickObserved,true);assert.equal(r.result.receipt.afterObserved,true);assert.equal(r.result.receipt.sessionClosed,true);
 assert.deepEqual(f.calls,['acquire','navigate','read','click','read','navigate_public','read_public','click_public','read_public','close']);
 assert.equal(r.result.receipt.publicPageReadVerified,true);
 assert.equal(r.result.receipt.publicChatClickDispatched,true);
 assert.equal(r.result.receipt.publicChatPageChangeObserved,true);
 assert.equal(r.result.publicPage.controls[0].label,'Open Bubbles chat');
 assert.equal(r.result.receipt.ownerPageVerified,false);
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

test('public-page browser read is limited to fixed Bubbles URL and does not expose private session metadata',async()=>{
 const f=fixture(),r=await signedBrowserCheck(f.args);
 assert.equal(r.result.publicPage.readVerified,true);
 assert.equal(r.result.publicPage.title,'Bubbles AI — QuantaPhi');
 assert.equal(r.result.publicPage.controls[0].label,'Open Bubbles chat');
 assert.doesNotMatch(JSON.stringify(r.result),/sessionId|proof|devtoolsFrontendUrl|Bearer|jwt=/);
 assert.equal(f.calls.includes('navigate_public'),true);
 assert.equal(f.calls.filter(x=>x==='click').length,1);
});
test('unavailable public website control read is reported independently of actual fixture click',async()=>{
 const f=fixture();f.noPublicPage();
 const r=await signedBrowserCheck(f.args);
 assert.equal(r.state,'complete');
 assert.equal(r.result.receipt.clickObserved,true);
 assert.equal(r.result.receipt.publicPageReadVerified,false);
 assert.equal(r.result.publicPage.reason,'public_page_unavailable');
 assert.equal(r.result.receipt.sessionClosed,true);
});
test('known browser fixture control is mandatory before claiming any click',async()=>{
 const f=fixture(),orig=f.args.act;
 f.args.act=async(...args)=>{
  const r=await orig(...args);
  if(args[1].action==='read'&&args[1].targetId==='target')r.controls=[];
  return r;
 };
 const result=await signedBrowserCheck(f.args);
 assert.equal(result.state,'blocked');assert.equal(result.result.error,'control_inventory_not_observed');
 assert.equal(f.calls.includes('click'),false);
 assert.equal(result.result.receipt.sessionClosed,true);
});


test('public chat entry click receipt distinguishes dispatch from actual observed page change',async()=>{
 const f=fixture();f.noPublicChange();
 const r=await signedBrowserCheck(f.args);
 assert.equal(r.state,'complete');
 assert.equal(r.result.receipt.publicPageReadVerified,true);
 assert.equal(r.result.receipt.publicChatClickDispatched,true);
 assert.equal(r.result.receipt.publicChatPageChangeObserved,false);
 assert.equal(r.result.publicPage.entryClick.status,'click_dispatched');
 assert.equal(r.result.receipt.ownerPageVerified,false);
 assert.equal(r.result.receipt.sessionClosed,true);
});
