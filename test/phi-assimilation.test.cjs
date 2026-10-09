const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','phi-assimilation.js'),'utf8');
function setup(){
 const store=new Map(),calls=[],w={};
 w.crypto={randomUUID:()=> 'abc123def456'};
 w.StarQuestCloudLedger={authenticatedFetch:async(url,opts)=>{calls.push({url,opts});return {ok:true,json:async()=>url.endsWith('/v1/quants/history')?{ok:true,searches:Array.from({length:420},(_,i)=>({search_id:'search'+i,query_text:'Historical subject '+i})).concat([{search_id:'venus',query_text:'Venus'}]),tokens:[]}:{ok:true,events:[]}}}};
 w.QuantaUnifiedTokenLedger={load:async()=>[]};
 const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 vm.runInNewContext(code,{window:w,localStorage,URL,URLSearchParams,Set,console,fetch:async()=>{throw Error('not expected')},Date,Math});
 return {engine:w.PhiAssimilation,w,store,calls};
}
test('assimilation evaluates all 421 saved search records and planetary chemistry bridges',async()=>{
 const {engine,calls}=setup();
 const data=await engine.corpus();
 assert.equal(data.remote,true);assert.equal(data.items.length,421,'do not truncate to recent 4');
 const ranked=engine.rank(data.items,'element 25 manganese',{yellow:[{value:'Manganese is a chemical element'}]});
 assert.equal(ranked.length,421);
 const venus=ranked.find(x=>x.query==='Venus');
 assert.equal(venus.cross,true);
 assert.ok(venus.score>0,'cross-domain link is a research candidate, not a verified fact');
 assert.ok(calls.some(x=>x.url.endsWith('/v1/quants/history')));
});
test('card action records are local and cloud-bound without minting',async()=>{
 const {engine,store,calls}=setup();
 engine.signal({kind:'story',action:'collect',key:'tesla-boat',title:'Tesla radio boat',query:'Tesla',terms:'invention radio'});
 const data=JSON.parse(store.get('quantaPhiCardInteractionsV1'));
 assert.equal(data.length,1);assert.equal(data[0].action,'collect');
 assert.ok(calls.some(x=>x.url.endsWith('/v1/quants/card-interactions')&&x.opts?.method==='POST'));
 assert.equal(calls.some(x=>/\/v1\/quants\/search|\/mint/.test(x.url)),false);
});
test('story link uses canonical same-origin Infinity Phi path',()=>{
 const story=fs.readFileSync(path.join(__dirname,'..','infinite-book.js'),'utf8');
 const page=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.match(story,/infinity:'\/infinity-phi\/'/);
 assert.match(page,/const specified=link\.dataset\.siteUrl/);
 assert.match(page,/phi-assimilation\.js/);
});
