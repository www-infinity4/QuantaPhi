const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function fixture(){const values=new Map([['quantaPhiTokens','79']]);const context={localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},window:{addEventListener(){},dispatchEvent(){}},CustomEvent:class{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../asset-balances.js'),'utf8'),context);return context.window.PhiAssetBalances}
test('a stale pre-mint balance cannot turn Quant 80 back into 79',()=>{const a=fixture(),read=a.beginRead('QUANT');a.mint('QUANT','oranges');assert.equal(a.value('QUANT'),80);assert.equal(a.accept('QUANT',79,read),false);a.confirm('QUANT','oranges');assert.equal(a.value('QUANT'),80);assert.equal(a.accept('QUANT',79,read),false)});
test('a new spend snapshot lowers only the asset spent',()=>{const a=fixture();a.seed('INFINITY',98);a.accept('QUANT',75,a.beginRead('QUANT'));assert.equal(a.value('QUANT'),75);assert.equal(a.value('INFINITY'),98)});
test('a pending mint is not counted twice when a cloud snapshot already includes it',()=>{const a=fixture();a.mint('QUANT','oranges');assert.equal(a.accept('QUANT',80,a.beginRead('QUANT')),false);assert.equal(a.value('QUANT'),80);a.confirm('QUANT','oranges',80);assert.equal(a.value('QUANT'),80)});
test('music count merges IndexedDB with both histories, deduplicates and excludes transfers',async()=>{const values=new Map([['musicPhi:quants:v1',JSON.stringify([{id:'piano1'},{id:'gone',transferredAt:'2026-10-03'}])],['musicPhi:listeningQuants:v1',JSON.stringify([{id:'listen1',kind:'listening'}])]]);const context={window:{MusicQuantStore:{list:async()=>[{id:'piano1'},{id:'piano2'}]},ControlPhi:{refreshWallet(){}},dispatchEvent(){}},document:{readyState:'complete',addEventListener(){}},localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},addEventListener(){},setInterval(){},console,CustomEvent:class{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../music-quant-cloud.js'),'utf8'),context);await new Promise(r=>setImmediate(r));assert.equal(context.window.MusicQuantCloud.localCount,3);assert.equal(context.window.MusicQuantCloud.pianoCount,2);assert.equal(context.window.MusicQuantCloud.listeningCount,1)});
test('Infinity source split includes Quanta websites but never Music Quants',()=>{const code=fs.readFileSync(path.join(__dirname,'../wallet-runtime.js'),'utf8'),start=code.indexOf('  function canonicalSearchCounts(){'),end=code.indexOf('  let cloudBalances={};',start);const values=new Map([['c13b0_infinity_token_ledger_v3',JSON.stringify([{id:'phi-1',source:'infinity-phi'},{id:'omni-1',source:'omni-phi'},{id:'quant-1',source:'quanta-phi',sourceEventId:'search-1'}])],['infinity_unified_wallet_v1',JSON.stringify({tokens:{music:{id:'mq_1',type:'MUSIC_QUANT',source:'Infinity Radio'},pair:{id:'paired-infinity',type:'INFINITY_SEARCH_TOKEN',source:'QUANTAPHI',sourceEventId:'search-1'}}})]]);const context={clean:(s)=>String(s||''),decodeInfinityEnvelope:JSON.parse,read:(key,f)=>{try{return JSON.parse(values.get(key)||'null')??f}catch{return f}},localStorage:{getItem:key=>values.get(key)},WALLET_SESSION_KEY:'session',WALLET_USERS_KEY:'users',WALLET_GUEST_KEY:'guest'};vm.runInNewContext(code.slice(start,end)+'result=canonicalSearchCounts()',context);assert.equal(context.result.total,3);assert.equal(context.result.infinity,1);assert.equal(context.result.omni,1);assert.equal(context.result.quants,1)});

test('Quanta search retry targets the authoritative paired D1 commit, not a second browser-side Infinity mint',()=>{
  const code=fs.readFileSync(path.join(__dirname,'../search-wallet-sync.js'),'utf8');
  assert.match(code,/quanta-phi-ledger[^']*\/v1\/quants\/search/);
  assert.doesNotMatch(code,/\/v1\/tokens\/mint/);
  assert.doesNotMatch(code,/unified-wallet\.marvaseater\.workers\.dev/);
});

test('initial search ledger commit is wired before the AI overview request',()=>{
  const code=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const ledger=code.indexOf("const mintPromise=bridge.authenticatedFetch('https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/search'");
  const overview=code.indexOf("const overviewCtl=new AbortController()",ledger);
  assert.ok(ledger>=0&&overview>=0&&ledger<overview);
  assert.match(code,/credit_query:q/);
  assert.match(code,/\/v1\/quants\/history-import/);
  assert.match(code,/\/v1\/quants\/infinity-legacy-balance/);
});

test('server search commit journals the search and pairs Quant with Infinity history',()=>{
  const code=fs.readFileSync(path.join(__dirname,'../workers/quanta-phi-ledger/worker.js'),'utf8');
  assert.match(code,/quanta_search_journal/);
  assert.match(code,/search_commit_pending/);
  assert.match(code,/token_type,source,data_json,provenance_hash/);
  assert.match(code,/asset_code,event_type,amount,balance_after/);
  assert.match(code,/history-import/);
  assert.match(code,/balance_only_migration/);
});
test('two offline searches add two Infinity credits without reseeding pending credits',async()=>{const s=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),start=s.indexOf(' async function create(q){'),end=s.indexOf('\n function payload',start),a=fixture();let registered=0,records=[];const context={window:{PhiAssetBalances:a,InfinityTokenCount:{value:()=>registered,register:()=>registered++}},website:(id,q)=>'https://example.test/'+id,load:async()=>records,save:async all=>{records=all},Date,Math};vm.runInNewContext(s.slice(start,end)+'globalThis.createToken=create',context);await context.createToken('oranges');await context.createToken('tech');assert.equal(a.value('INFINITY'),2);assert.equal(records.length,2)});


test('refresh restore reuses saved search history before any new mint path',()=>{
  const code=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const start=code.indexOf('async function search(options={})');
  const end=code.indexOf("$('#go').onclick=search",start);
  const search=code.slice(start,end);
  assert.match(search,/if\(options\.restore\)[\s\S]*quantaPhiBuildHistoryV1[\s\S]*token_id[\s\S]*refining=true/);
  assert.match(search,/if\(!refining&&!searchId\)[\s\S]*crypto\.randomUUID/);
  assert.match(search,/if\(searchId&&!refining\)[\s\S]*\/v1\/quants\/search/);
});
