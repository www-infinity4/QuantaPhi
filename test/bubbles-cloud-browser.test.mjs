import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browserTool,browserTarget} from '../workers/bubbles-tools/browser.mjs';
const ORIGIN='https://quantaphi.org';
const make=(action,extra={},auth='Bearer rb_'+ 'a'.repeat(64),origin=ORIGIN)=>
 new Request('https://bubbles-tools.example/v1/browser',{method:'POST',headers:{Origin:origin,Authorization:auth,'Content-Type':'application/json'},
 body:JSON.stringify({action,...extra})});
function fake(){
 let acquired=0,closed=0,tabs=[],views=0;
 return {env:{BRAIN:{fetch:async(url,init)=>new Response('OK',{status:init?.headers?.Authorization?.startsWith('Bearer rb_')?200:403})},
 BROWSER:{acquire:async()=>{acquired++;return {sessionId:'11111111-1111-4111-8111-111111111111'};},
 devtools:{newTarget:async(id,url)=>{tabs.push(url);return {id:'ABCDEF1234'};},
 listTargets:async()=>tabs.map((url,i)=>({url,title:'tab'+i,type:'page'}))},
 getLiveView:async()=>{views++;return {devtoolsFrontendUrl:'https://live.browser.run/ui/view?mode=full&wss=secret'};},
 closeSession:async()=>{closed++;return 'closed';}}},
 inspect:()=>({acquired,closed,tabs,views})};
}
test('reject unsafe/non-HTTPS/internal targets before browser interaction',()=>{
 for(const address of ['http://example.com','https://localhost/','https://192.168.0.2/','file:///etc/passwd','https://user:pass@example.com']){
  assert.throws(()=>browserTarget(address));
 }
 assert.equal(browserTarget('https://example.com/a'),'https://example.com/a');
});
test('deny other origins and unverified owner sessions',async()=>{
 const {env,inspect}=fake();
 let response=await browserTool(make('start',{},'Bearer rb_'+ 'a'.repeat(64),'https://evil.example'),env);
 assert.equal(response.status,403);
 response=await browserTool(make('start',{},'Bearer bad'),env);
 assert.equal(response.status,403);
 assert.equal(inspect().acquired,0);
});
test('verified owner can start, open tab, reconnect and close; foreign proofs rejected',async()=>{
 const {env,inspect}=fake();
 const started=await browserTool(make('start',{url:'https://quantaphi.org/'}),env);
 assert.equal(started.status,200);
 const s=await started.json();
 assert.equal(s.ok,true);assert.equal(s.url.startsWith('https://live.browser.run/'),true);
 assert.match(s.proof,/^[a-f0-9]{64}$/);
 const reject=await browserTool(make('view',{sessionId:s.sessionId,proof:'f'.repeat(64)}),env);
 assert.equal(reject.status,403);
 const tab=await browserTool(make('tab',{sessionId:s.sessionId,proof:s.proof,url:'https://www.google.com/'}),env);
 assert.equal(tab.status,200);
 const refreshed=await browserTool(make('view',{sessionId:s.sessionId,proof:s.proof}),env);
 assert.equal(refreshed.status,200);
 const stopped=await browserTool(make('stop',{sessionId:s.sessionId,proof:s.proof}),env);
 assert.equal(stopped.status,200);
 assert.deepEqual(inspect(),{acquired:1,closed:1,tabs:['https://quantaphi.org/','https://www.google.com/'],views:3});
});
test('Bubbles uses owner-gated gateway and the native Chrome Live View extension',()=>{
 const worker=fs.readFileSync('workers/bubbles-tools/worker.mjs','utf8');
 const wrangler=fs.readFileSync('workers/bubbles-tools/wrangler.toml','utf8');
 const bubble=fs.readFileSync('bubbles-ai.js','utf8');
 const page=fs.readFileSync('bubbles.html','utf8');
 const extension=fs.readFileSync('bubbles-cloud-browser.mjs','utf8');
 assert.match(worker,/import \{browserTool\}/);
 assert.match(worker,/pathname==='\/v1\/browser'/);
 assert.match(wrangler,/\[browser\]\s*binding = "BROWSER"/);
 assert.doesNotMatch(bubble,/create\('button','ba-tool-link','Cloud browser/);
 assert.match(bubble,/browserConversation\(spoken/);
 assert.equal((bubble.match(/import\('\/bubbles-cloud-browser\.mjs\?v=20261020-background-bridge1'\)/g)||[]).length,2,
  'Bubbles voice/chat must reuse the same browser session module');
 assert.doesNotMatch(bubble,/20261019-live-chrome1/);
 assert.match(page,/bubbles-ai\.js\?v=20261020-recordb3/);
 assert.match(extension,/live\.browser\.run/);
 assert.match(extension,/ChatGPT · sign in/);
 assert.match(extension,/Gemini · sign in/);
 assert.match(extension,/chatgpt:'https:\/\/chatgpt\.com\//);
 assert.match(extension,/chat\\s\?gpt/);
 assert.doesNotMatch(extension,/localStorage|persist.*token/i);
});
