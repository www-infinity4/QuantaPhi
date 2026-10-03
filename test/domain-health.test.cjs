const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
async function run({origin='https://quantaphi.net',site=true,bridge='linked',credential=true,wallet=true}={}){
 const boxes=new Map(),calls=[];
 const document={readyState:'complete',getElementById:id=>boxes.get(id),createElement:()=>({setAttribute(){},style:{}}),querySelector:()=>({prepend:box=>boxes.set(box.id,box)})};
 const window={QuantaCloudConnection:{ready:Promise.resolve(),status:{bridge},hasCredential:()=>credential,authenticatedFetch:async url=>{calls.push(url);return {ok:wallet,json:async()=>({balances:{}})}}}};
 vm.runInNewContext(fs.readFileSync('domain-health.js','utf8'),{window,document,location:{origin},AbortSignal,fetch:async url=>{calls.push(url);return {ok:true,headers:{get:()=>site?'quantaphi-net-v4-health':null},json:async()=>({service:site?'quantaphi-site':'other',canonicalOrigin:'https://quantaphi.net',appPath:'/QuantaPhi/index.html'})}}});
 await new Promise(resolve=>setImmediate(resolve));
 return {status:window.QuantaDomainHealth,message:boxes.get('domainHealth')?.textContent,calls};
}
test('successful startup checks routing and reads wallet state once without a banner',async()=>{const r=await run();assert.equal(r.status.ledger,'ok');assert.equal(r.message,undefined);assert.deepEqual(r.calls,['/health','https://unified-wallet.marvaseater.workers.dev/v1/wallet/state'])});
test('failed routing, missing credentials and wallet failure produce specific messages',async()=>{
 let r=await run({site:false});assert.match(r.message,/Domain routing/);assert.equal(r.calls.length,1);
 r=await run({credential:false,bridge:'timeout'});assert.match(r.message,/bridge could not connect/);assert.equal(r.calls.length,1);
 r=await run({wallet:false});assert.match(r.message,/balances could not be verified/);assert.equal(r.status.ledger,'unavailable');
});
test('alternate addresses explain the production origin without ledger requests',async()=>{const r=await run({origin:'https://www-infinity4.github.io'});assert.match(r.message,/https:\/\/quantaphi.net\//);assert.equal(r.calls.length,0)});
