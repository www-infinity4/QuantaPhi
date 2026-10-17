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
 assert.doesNotMatch(frontend,/speechSynthesis|TextToSpeech/);
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
 assert.doesNotMatch(frontend.split('\n').filter(line=>!line.trim().startsWith('//')).join('\n'),/localStorage|sessionStorage/);
 assert.match(frontend,/secret\.value=""/);
});
test('readiness is browser-readable only for trusted origin and rejects short owner secrets',async()=>{
 const app=await load();
 const health=origin=>new Request('https://bubbles-live.example/health',{headers:{Origin:origin}});
 const good=await app.fetch(health('https://quantaphi.org'),configured);
 assert.equal(good.headers.get('Access-Control-Allow-Origin'),'https://quantaphi.org');
 assert.equal((await good.json()).configured,true);
 const bad=await app.fetch(health('https://quantaphi.org'),{...configured,BUBBLES_LIVE_OWNER_TOKEN:'short'});
 assert.equal((await bad.json()).configured,false);
 const foreign=await app.fetch(health('https://evil.example'),configured);
 assert.equal(foreign.headers.get('Access-Control-Allow-Origin'),null);
});
test('unconfigured gateway never opens microphone and cancellation cannot revive startup',async()=>{
 const vm=require('node:vm');
 async function scenario(cancel){
  const nodes=new Map();
  function node(id){if(!nodes.has(id))nodes.set(id,{value:id==='liveOwner'?'A'.repeat(40):'',handlers:{},addEventListener(k,fn){this.handlers[k]=fn},setAttribute(){},after(){}});return nodes.get(id)}
  let captures=0,peers=0,resolveHealth;
  const health=new Promise(resolve=>{resolveHealth=resolve});
  const context={document:{getElementById:node,createElement:()=>node('mute')},window:{addEventListener(){}},
   URL,AbortController,AbortSignal,setTimeout,clearTimeout,
   fetch:()=>health,navigator:{mediaDevices:{getUserMedia(){captures++;throw Error('must not capture')}}},
   RTCPeerConnection:class{constructor(){peers++}}};
  vm.runInNewContext(frontend,context);
  const pending=node('liveStart').handlers.click();
  if(cancel)node('liveStop').handlers.click();
  resolveHealth(new Response(JSON.stringify({ok:true,configured:cancel}),{status:200}));
  await pending;
  assert.equal(captures,0);assert.equal(peers,0);
  assert.equal(node('liveStart').disabled,false);
  if(!cancel)assert.match(node('liveStatus').textContent,/not configured/);
 }
 await scenario(false);await scenario(true);
});
