const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function router(upstream){const scope={URL,URLSearchParams,Request,Response,Headers,AbortController,setTimeout,clearTimeout,fetch:async req=>upstream(req)};vm.createContext(scope);vm.runInContext(fs.readFileSync('workers/quantaphi-site/worker.js','utf8').replace('export default','globalThis.worker='),scope);return scope.worker;}
test('served wallet client keeps the old-origin recovery frame and accepts its authenticated reply',async()=>{
 const worker=router(()=>new Response(fs.readFileSync('cloud-wallet-client.js','utf8'),{headers:{'content-type':'application/javascript'}}));
 const source=await (await worker.fetch(new Request('https://quantaphi.org/cloud-wallet-client.js'))).text();
 const token='sq_'+'a'.repeat(40),map=new Map([['quantaPhiTokens','80']]),events=new Map();
 const frame={contentWindow:{postMessage(){}},remove(){}};
 const window={addEventListener:(k,f)=>events.set(k,f),removeEventListener:k=>events.delete(k),dispatchEvent(){}};
 const localStorage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),key:i=>[...map.keys()][i],get length(){return map.size}};
 const location={origin:'https://quantaphi.org',href:'https://quantaphi.org/',hash:''};
 vm.runInNewContext(source,{window,localStorage,document:{body:{appendChild(){}},createElement:()=>frame,dispatchEvent(){}},location,crypto:{randomUUID:()=> 'nonce'},URL,URLSearchParams,Set,setTimeout:()=>1,clearTimeout(){},StorageEvent:function(){},CustomEvent:function(){}});
 assert.equal(new URL(frame.src).origin,'https://www-infinity4.github.io');
 const data={type:'quanta:link-response',nonce:'nonce',values:{starquest_session:'{"key":"kris","username":"kris"}','starquest_ledger_device_v1:kris':token,quantaPhiTokens:'79'}};
 events.get('message')({origin:'https://www-infinity4.github.io',source:frame.contentWindow,data});
 await window.QuantaCloudConnection.ready;
 assert.equal(window.QuantaCloudConnection.hasCredential(),true);
 assert.equal(map.get('quantaPhiTokens'),'80');
});
test('first-party org recovery route serves validated handoff instead of a missing repository file',async()=>{
 let calls=0;const worker=router(()=>{calls++;throw Error('unexpected upstream')});
 const response=await worker.fetch(new Request('https://quantaphi.org/__wallet-handoff?return=https%3A%2F%2Fquantaphi.org%2Fnews-phi%2F'));
 assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
 const html=await response.text();assert.match(html,/Wallet return address rejected/);assert.match(html,/https:\/\/www-infinity4.github.io\/QuantaPhi\/wallet-link.html/);assert.equal(calls,0);
});
