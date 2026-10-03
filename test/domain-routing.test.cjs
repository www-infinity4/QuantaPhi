const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('paid domain serves the balance and retry assets from QuantaPhi and keeps shared app paths',async()=>{let urls=[];const scope={URL,Request,Response,Headers,fetch:async r=>{urls.push(r.url);return new Response('asset')}};vm.createContext(scope);vm.runInContext(fs.readFileSync('workers/quantaphi-site/worker.js','utf8').replace('export default','globalThis.worker='),scope);for(const path of ['/','/asset-balances.js','/search-wallet-sync.js','/TV-Database/js/auth.js'])await scope.worker.fetch(new Request('https://quantaphi.net'+path));assert.deepEqual(urls.map(s=>new URL(s).pathname),['/QuantaPhi/index.html','/QuantaPhi/asset-balances.js','/QuantaPhi/search-wallet-sync.js','/TV-Database/js/auth.js'])});
test('production HTML declares the domain and loads its connection and health assets',async()=>{
 const html=fs.readFileSync('index.html','utf8'),urls=[];
 const scope={URL,Request,Response,Headers,fetch:async r=>{urls.push(r.url);return new Response(html)}};
 vm.createContext(scope);vm.runInContext(fs.readFileSync('workers/quantaphi-site/worker.js','utf8').replace('export default','globalThis.worker='),scope);
 const response=await scope.worker.fetch(new Request('https://quantaphi.net/')),body=await response.text();
 assert.match(body,/<link rel="canonical" href="https:\/\/quantaphi.net\/">/);
 assert.match(body,/<meta property="og:url" content="https:\/\/quantaphi.net\/">/);
 for(const asset of ['cloud-wallet-client.js','domain-health.js']){assert.match(body,new RegExp('src="'+asset.replace('.', '\\.')+'\\?'));await scope.worker.fetch(new Request('https://quantaphi.net/'+asset));assert.equal(new URL(urls.at(-1)).pathname,'/QuantaPhi/'+asset)}
 assert.equal(response.headers.get('x-quantaphi-edge'),'quantaphi-net-v4-health');
});
test('health identifies the router without proxying or authenticating, and www redirects to the paired origin',async()=>{
 const scope={URL,Request,Response,Headers,fetch:()=>{throw Error('unexpected upstream')}};
 vm.createContext(scope);vm.runInContext(fs.readFileSync('workers/quantaphi-site/worker.js','utf8').replace('export default','globalThis.worker='),scope);
 const health=await scope.worker.fetch(new Request('https://quantaphi.net/health'));
 assert.deepEqual(await health.json(),{ok:true,service:'quantaphi-site',canonicalOrigin:'https://quantaphi.net',appPath:'/QuantaPhi/index.html'});
 const redirect=await scope.worker.fetch(new Request('https://www.quantaphi.net/?q=iron'));
 assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'https://quantaphi.net/?q=iron');
});
