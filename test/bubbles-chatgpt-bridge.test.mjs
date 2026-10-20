import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {processChatGPTJob,completeChatGPTMessage} from '../workers/bubbles-cloud-browser/chatgpt-bridge.mjs';

function fakeJob(action='read',payload={}) {
 const id='chatgpt_test_job_12345',now=Date.now(),row={id,action,payload:JSON.stringify(payload),status:'queued',
  created_ms:now,updated_ms:now,expires_ms:now+120000,result:null};
 return {row,db:{prepare(sql){
  return {first:async()=>sql.includes("WHERE status='queued'")&&row.status==='queued'?row:null,
   bind(...params){return {run:async()=>{
    if(sql.includes("status='working'")&&sql.startsWith('UPDATE')&&row.status==='queued'){
     row.status='working';return {meta:{changes:1}}}
    if(sql.includes("status='working'")&&row.status==='working'){
     row.status=params[0];row.result=params[1];return {meta:{changes:1}}}
    return {meta:{changes:0}};}}}
  };
 }}};
}
const owner=new Request('https://quantaphi.org/v1/browser/chatgpt/process',{method:'POST',
 headers:{Origin:'https://quantaphi.org',Authorization:'Bearer rb_'+'a'.repeat(64)}});
test('ChatGPT command requires independent owner-issued five-day grant',async()=>{
 const {row,db}=fakeJob(),store={chatgptStatus:async()=>({enabled:false})};
 const result=await processChatGPTJob({db,store,request:owner,env:{},body:{},browserTool:()=>assert.fail()});
 assert.equal(result.ok,false);assert.equal(row.status,'queued');
});
test('ChatGPT can read the actual authorized Cloud Chrome session without storing its proof',async()=>{
 const {row,db}=fakeJob('read');
 const store={chatgptStatus:async()=>({enabled:true})};
 let forwarded;
 const browserTool=async req=>{forwarded=await req.json();
  assert.match(req.headers.get('Authorization'),/^Bearer rb_/);
  return Response.json({ok:true,status:'verified',result:{ok:true,title:'Owner Chrome',url:'https://dash.cloudflare.com/',text:'Actual page output'}})};
 const result=await processChatGPTJob({db,store,request:owner,env:{},body:{sessionId:'11111111-1111-4111-8111-111111111111',proof:'b'.repeat(64)},browserTool});
 assert.equal(result.status,'complete');assert.equal(row.status,'complete');
 assert.equal(forwarded.proof,'b'.repeat(64));
 assert.match(row.result,/Actual page output/);assert.doesNotMatch(row.result,/bbbbbbbbbbbbbbbb/);
});
test('ChatGPT navigate creates a separate owner-bound live view but never stores session URL or proof',async()=>{
 const {row,db}=fakeJob('navigate',{url:'https://dash.cloudflare.com/'});
 const store={chatgptStatus:async()=>({enabled:true})};
 const browserTool=async req=>{
  assert.equal((await req.json()).action,'start');
  return Response.json({ok:true,sessionId:'11111111-1111-4111-8111-111111111111',proof:'f'.repeat(64),url:'https://live.browser.run/private',status:'live'});
 };
 const result=await processChatGPTJob({db,store,request:owner,env:{},body:{},browserTool});
 assert.equal(result.status,'complete');assert.match(result.view.url,/live.browser.run/);
 assert.equal(JSON.parse(row.result).action,'navigate');
 assert.doesNotMatch(row.result,/live.browser.run|ffffffffff|11111111-1111/);
});
test('ChatGPT message is delivered only to Bubbles and response requires owner completion',async()=>{
 const {db,row}=fakeJob('message',{text:'Hello Bubbles, what can you do?'});
 const store={chatgptStatus:async()=>({enabled:true})};
 const job=await processChatGPTJob({db,store,request:owner,env:{},body:{},browserTool:()=>assert.fail()});
 assert.equal(job.status,'needs_bubbles_reply');assert.equal(job.message,'Hello Bubbles, what can you do?');
 assert.equal(row.status,'working');assert.equal(row.result,null);
 const result=await completeChatGPTMessage({db,store,id:row.id,reply:{ok:true,reply:'Bubbles response'}});
 assert.equal(result.status,'complete');assert.match(row.result,/Bubbles response/);
 assert.equal((await completeChatGPTMessage({db,store,id:row.id,reply:{ok:true}})).ok,false);
});
test('UI has a distinct five-day ChatGPT control; browser worker enforces owner and retains browser restrictions',()=>{
 const browser=fs.readFileSync('workers/bubbles-cloud-browser/worker.mjs','utf8');
 const ui=fs.readFileSync('bubbles-cloud-browser.mjs','utf8');
 const consent=fs.readFileSync('workers/bubbles-cloud-browser/consent.mjs','utf8');
 const ai=fs.readFileSync('bubbles-ai.js','utf8');
 assert.match(browser,/if\(!\(await owner\(request,env\)\)\)/);
 assert.match(browser,/chatgpt_bridge_bindings_missing/);
 assert.match(browser,/browser_consent_required/);
 assert.match(consent,/owner-chatgpt-bridge-consent/);
 assert.match(ui,/Allow ChatGPT to use Bubbles · 5 days/);
 assert.match(ui,/Revoke ChatGPT access/);
 assert.ok(ui.includes("bridgeCall('process'"));
 assert.match(ai,/bubbles:chatgpt-bridge/);
 assert.ok(ai.includes('if(embedded||busy||!text)'), 'Android owner overlay must accept the ChatGPT bridge');
 assert.doesNotMatch(ui,/localStorage\.setItem\(.*Authorization/);
});
