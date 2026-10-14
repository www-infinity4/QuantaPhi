const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const { webcrypto }=require('node:crypto');
const source=fs.readFileSync('workers/bubbles-gpt-live/index.js','utf8');
const frontend=fs.readFileSync('bubbles-gpt-live.js','utf8');
const html=fs.readFileSync('bubbles-gpt-live.html','utf8');
async function load() {
  globalThis.crypto??=webcrypto;
  return (await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
}
function request(origin='https://quantaphi.org',token='A'.repeat(40),sdp='v=0\n'){
 return new Request('https://bubbles-live.example/v1/live/session',{
  method:'POST',
  headers:{Origin:origin,Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({sdp})
 });
}
const configured={OPENAI_API_KEY:'NOT_A_REAL_KEY',BUBBLES_LIVE_OWNER_TOKEN:'A'.repeat(40)};
test('Live model is real OpenAI API, not substitute Android speech synthesis',()=>{
 assert.match(source,/https:\/\/api\.openai\.com\/v1\/live\/sessions/);
 assert.match(source,/model:"gpt-live-1"/);
 assert.match(source,/voice:"marin"/);
 assert.match(frontend,/new RTCPeerConnection\(\)/);
 assert.match(frontend,/getUserMedia\(/);
 assert.match(frontend,/session\.close/);
 assert.doesNotMatch(frontend.split('\n').filter(line=>!line.trim().startsWith('//')).join('\n'),/localStorage|sessionStorage/);
});
test('live broker fails closed on unconfigured server and wrong origin',async()=>{
 const app=await load();
 assert.equal((await app.fetch(request(),{})).status,503);
 assert.equal((await app.fetch(request('https://evil.example'),configured)).status,403);
});
test('live broker rejects invalid owner credentials and SDP before contacting API',async()=>{
 const app=await load();
 assert.equal((await app.fetch(request(undefined,'invalid'),configured)).status,401);
 assert.equal((await app.fetch(request(undefined,'A'.repeat(40),'bad SDP'),configured)).status,400);
});
test('valid authorized session forwards SDP to GPT Live, never returns API key',async()=>{
 const app=await load();
 const before=globalThis.fetch;
 let called=false;
 globalThis.fetch=async(url,init)=>{
   called=true;
   assert.equal(url,'https://api.openai.com/v1/live/sessions');
   assert.equal(init.headers.Authorization,'Bearer NOT_A_REAL_KEY');
   const payload=JSON.parse(init.body);
   assert.equal(payload.session.model,'gpt-live-1');
   assert.equal(payload.session.delegation.type,'client');
   assert.equal(payload.session.store,false);
   assert.equal(payload.transport.sdp,'v=0\n');
   return new Response(JSON.stringify({session:{id:'live_test'},transport:{type:'webrtc',sdp:'v=0\nANSWER'}}),{status:201});
 };
 try {
   const response=await app.fetch(request(),configured);
   const payload=await response.json();
   assert.equal(response.status,201);
   assert.equal(payload.session.id,'live_test');
   assert.equal(payload.transport.sdp,'v=0\nANSWER');
   assert.ok(!JSON.stringify(payload).includes('NOT_A_REAL_KEY'));
   assert.equal(called,true);
 }finally{globalThis.fetch=before;}
});
test('UI never stores owner token or promises free ChatGPT Live audio',()=>{
 assert.match(html,/Owner-only developer connection/);
 assert.match(html,/separately billed OpenAI project API key/);
 assert.doesNotMatch(frontend,/\b(?:localStorage|sessionStorage)\s*\./);
 assert.match(frontend,/secret\.value=""/);
});
