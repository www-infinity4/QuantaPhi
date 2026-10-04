const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture({query='',urlQuery='',focused=false,credential=false,entries=[],hash=''}={}){
 const listeners={},handlers={},navigation=[],map=new Map(entries),session=new Map(),requests=[];
 if(credential)map.set('starquest_ledger_device_v1:kris','sq_'+'a'.repeat(40));
 const store=m=>({getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),key:i=>[...m.keys()][i],get length(){return m.size}});
 const frame={contentWindow:{postMessage(){}},remove(){}};
 const window={addEventListener:(name,fn)=>listeners[name]=fn,removeEventListener(){},dispatchEvent(){}};
 let timeout;
 vm.runInNewContext(fs.readFileSync(process.env.WALLET_CLIENT_SOURCE||'cloud-wallet-client.js','utf8'),{window,localStorage:store(map),sessionStorage:store(session),URL,URLSearchParams,Set,crypto:{randomUUID:()=> 'nonce'},console,atob,TextDecoder,Uint8Array,history:{replaceState(){}},Date,
 location:{origin:'https://quantaphi.org',href:'https://quantaphi.org/'+urlQuery+hash,hash,replace:url=>navigation.push(url)},
 document:{body:{appendChild(){}},createElement:()=>frame,getElementById:()=>({value:query}),activeElement:{matches:()=>focused},dispatchEvent(){},addEventListener:(name,fn)=>handlers[name]=fn},
 setTimeout:fn=>{timeout=fn;return 1},clearTimeout(){},StorageEvent:function(){},CustomEvent:function(){},fetch:async(url,opts)=>{requests.push({url,opts});return{ok:true,json:async()=>({balances:{INFINITY:98,QUANT:79},tokens:[{id:'saved-token'}]})}}});
 return{window,handlers,navigation,map,session,requests,finish:async()=>{timeout();await window.QuantaCloudConnection.ready;await Promise.resolve()}};
}
test('wallet automatically recovers on search links and retains the query for restore',async()=>{for(const options of [{query:'alpha'},{urlQuery:'?q=alpha'},{focused:true}]){const f=fixture(options);await f.finish();assert.equal(f.navigation.length,1);const redirect=new URL(f.navigation[0]);assert.equal(redirect.pathname,'/__wallet-handoff');assert.equal(new URL(redirect.searchParams.get('return')).search,options.urlQuery||'');f.handlers.click({target:{closest:()=>true}});assert.equal(f.navigation.length,1)}});
test('a previous failed handoff does not permanently suppress repaired wallet recovery',async()=>{const f=fixture({urlQuery:'?q=alpha'});f.session.set('quantaPhi:firstPartyWalletHandoff:v2','previous-attempt');await f.finish();assert.equal(f.navigation.length,1);assert.equal(f.session.get('quantaPhi:firstPartyWalletHandoff:v2'),'previous-attempt')});
test('idle page still recovers once and an existing credential never triggers handoff',async()=>{const idle=fixture();await idle.finish();assert.equal(idle.navigation.length,1);idle.window.QuantaCloudConnection.recoverWallet();assert.equal(idle.navigation.length,1);const linked=fixture({credential:true});await linked.finish();assert.equal(linked.navigation.length,0)});
test('an existing credential can authenticate while the hidden recovery frame is pending',async()=>{const f=fixture({credential:true});await f.window.QuantaCloudConnection.authenticatedFetch('https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/state');assert.equal(f.navigation.length,0)});
test('top-level handoff restores authenticated cloud balances and history while preserving stored records',async()=>{
 const token='sq_'+'a'.repeat(40),values={starquest_session:'{"username":"kris","key":"kris"}','starquest_ledger_device_v1:kris':token};
 const payload=Buffer.from(JSON.stringify({version:1,source:'https://www-infinity4.github.io',issuedAt:Date.now(),values})).toString('base64url');
 const entries=[['phi:assetBalances:v1','saved-balances'],['c13b0_infinity_token_ledger_v3','saved-history'],['quantaPhi:pendingSearchCommits:v2','queued-search']];
 const f=fixture({urlQuery:'?q=alpha',hash:'#quantaWalletLink='+payload,entries});
 assert.equal(f.window.QuantaCloudConnection.hasCredential(),true);
 const state=await f.window.QuantaCloudConnection.authenticatedFetch('https://unified-wallet.marvaseater.workers.dev/v1/wallet/state');
 assert.deepEqual((await state.json()).balances,{INFINITY:98,QUANT:79});
 await f.window.QuantaCloudConnection.authenticatedFetch('https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/history');
 for(const request of f.requests)assert.equal(request.opts.headers.authorization,'Bearer '+token);
 for(const [key,value]of entries)assert.equal(f.map.get(key),value);
 await f.finish();assert.equal(f.navigation.length,0);
});
