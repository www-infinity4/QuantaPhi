const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
async function request(path,type='text/html'){
 const scope={URL,Request,Response,Headers,AbortController,AbortSignal,setTimeout,clearTimeout,fetch:async()=>new Response('<!doctype html><html><body>ShopLC</body></html>',{headers:{'Content-Type':type,'X-Frame-Options':'DENY','Content-Security-Policy':"frame-ancestors 'none'"}})};
 vm.createContext(scope);vm.runInContext(fs.readFileSync('workers/quantaphi-site/worker.js','utf8').replace(/^import \{videoAPI\} from '\.\/video-api\.mjs';\s*/m,"const videoAPI=()=>{throw Error('Video route requires its dedicated API fixture')};\n").replace('export default','globalThis.worker='),scope);
 return scope.worker.fetch(new Request('https://quantaphi.org'+path));
}
test('Phi-owned ShopLC HTML can embed only on the same origin',async()=>{
 const r=await request('/shoplc/');assert.equal(r.status,200);assert.equal(r.headers.get('X-Frame-Options'),'SAMEORIGIN');assert.equal(r.headers.get('Content-Security-Policy'),null);assert.equal(r.headers.get('x-quantaphi-app'),'ShopLC');
});
test('existing Crusher same-origin embedding is preserved',async()=>{assert.equal((await request('/bitcoin-crusher/')).headers.get('X-Frame-Options'),'SAMEORIGIN');});
test('unrelated HTML and ShopLC scripts keep their upstream frame restriction',async()=>{assert.equal((await request('/learn/')).headers.get('X-Frame-Options'),'DENY');assert.equal((await request('/shoplc/player.js','application/javascript')).headers.get('X-Frame-Options'),'DENY');});

test('every registered public chat card can embed on this origin',async()=>{
 const {cards}=await import('../bubbles-card-catalog.mjs');
 for(const card of cards){
  const r=await request(card.url);
  assert.equal(r.headers.get('X-Frame-Options'),'SAMEORIGIN',card.title+' '+card.url);
 }
});
test('owner, connection and unrelated pages retain upstream frame protection',async()=>{
 for(const path of ['/bubbles-accounts.html','/bubbles-connections.mjs','/learn/','/index.html'])
  assert.equal((await request(path,path.endsWith('.mjs')?'application/javascript':'text/html')).headers.get('X-Frame-Options'),'DENY',path);
});
