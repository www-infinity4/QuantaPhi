const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture({query='',urlQuery='',focused=false,credential=false}={}){
 const listeners={},handlers={},navigation=[],map=new Map(),session=new Map();
 if(credential)map.set('starquest_ledger_device_v1:kris','sq_'+'a'.repeat(40));
 const store=m=>({getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),key:i=>[...m.keys()][i],get length(){return m.size}});
 const frame={contentWindow:{postMessage(){}},remove(){}};
 const window={addEventListener:(name,fn)=>listeners[name]=fn,removeEventListener(){},dispatchEvent(){}};
 let timeout;
 vm.runInNewContext(fs.readFileSync('cloud-wallet-client.js','utf8'),{window,localStorage:store(map),sessionStorage:store(session),URL,URLSearchParams,Set,crypto:{randomUUID:()=> 'nonce'},console,
 location:{origin:'https://quantaphi.org',href:'https://quantaphi.org/'+urlQuery,hash:'',replace:url=>navigation.push(url)},
 document:{body:{appendChild(){}},createElement:()=>frame,getElementById:()=>({value:query}),activeElement:{matches:()=>focused},dispatchEvent(){},addEventListener:(name,fn)=>handlers[name]=fn},
 setTimeout:fn=>{timeout=fn;return 1},clearTimeout(){},StorageEvent:function(){},CustomEvent:function(){},fetch:async()=>({ok:true})});
 return{window,handlers,navigation,finish:async()=>{timeout();await window.QuantaCloudConnection.ready;await Promise.resolve()}};
}
test('wallet recovery cannot navigate away from a typed, linked, or focused search',async()=>{for(const options of [{query:'alpha'},{urlQuery:'?q=alpha'},{focused:true}]){const f=fixture(options);await f.finish();assert.equal(f.navigation.length,0);f.handlers.click({target:{closest:()=>true}});assert.equal(f.navigation.length,1);assert.equal(new URL(f.navigation[0]).pathname,'/__wallet-handoff')}});
test('idle page still recovers once and an existing credential never triggers handoff',async()=>{const idle=fixture();await idle.finish();assert.equal(idle.navigation.length,1);idle.window.QuantaCloudConnection.recoverWallet();assert.equal(idle.navigation.length,1);const linked=fixture({credential:true});await linked.finish();assert.equal(linked.navigation.length,0)});
test('an existing credential can authenticate while the hidden recovery frame is pending',async()=>{const f=fixture({credential:true});await f.window.QuantaCloudConnection.authenticatedFetch('https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/state');assert.equal(f.navigation.length,0)});
