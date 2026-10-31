const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const home=fs.readFileSync('index.html','utf8');
const viewer=fs.readFileSync('infinity-search-results.html','utf8');
const script=viewer.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const nodes=new Map(),requests=[],pending={};
 const element=()=>({children:[],value:'',textContent:'',className:'',href:'',addEventListener(){},append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children}});
 const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)};
 const context={
  URL,URLSearchParams,AbortSignal,setTimeout,
  location:{search:'?engine=google&q=radio',replace(){}},
  document:{getElementById:get,createElement:element},
  fetch:url=>new Promise((resolve,reject)=>{
   const kind=new URL(String(url)).searchParams.has('engines')?'provider':'general';
   requests.push(kind);
   pending[kind]={resolve:items=>resolve({ok:true,json:async()=>({results:items})}),reject};
  })
 };
 vm.runInNewContext(script,context);
 return {get,requests,pending};
}
test('home shows attributed source links before AI synthesis finishes',()=>{
 const evidenceAt=home.indexOf('evidence=weighted.slice(0,8)');
 const previewAt=home.indexOf('Source preview · AI overview building',evidenceAt);
 const aiAt=home.indexOf('},45000)',evidenceAt);
 assert.ok(evidenceAt>0&&previewAt>evidenceAt&&aiAt>previewAt);
 assert.match(home.slice(evidenceAt,aiAt),/isCurrent\(\)/);
 assert.match(home.slice(evidenceAt,aiAt),/https\?/);
});
test('general results appear before slow provider, then upgrade to verified sources',async()=>{
 const f=fixture();await new Promise(resolve=>setTimeout(resolve,280));
 assert.ok(f.pending.general);
 f.pending.general.resolve([{title:'General source',url:'https://example.org/general',content:'General result'}]);
 await tick();await tick();
 assert.match(f.get('sourceLabel').textContent,/General web search/);
 f.pending.provider.resolve([{title:'Google source',url:'https://example.org/google',engines:['google']}]);
 await tick();await tick();
 assert.match(f.get('sourceLabel').textContent,/Google engine results/);
 assert.equal(f.get('results').children.length,1);
});
test('verified provider results skip the redundant general request',async()=>{
 const f=fixture();
 f.pending.provider.resolve([{title:'Google source',url:'https://example.org/google',engines:['google']}]);
 await tick();
 await new Promise(resolve=>setTimeout(resolve,280));await tick();
 assert.deepEqual(f.requests,['provider']);
 assert.match(f.get('sourceLabel').textContent,/Google engine results/);
});
test('general results are never attributed to Google without verification',async()=>{
 const f=fixture();f.pending.provider.resolve([]);
 await new Promise(resolve=>setTimeout(resolve,280));
 f.pending.general.resolve([{title:'General source',url:'https://example.org/general',engines:['other']}]);
 await tick();await tick();
 assert.match(f.get('sourceLabel').textContent,/not verified Google results/);
 assert.equal(f.get('results').children.length,2);
});
