const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

async function request(path) {
 const urls=[];
 const scope={
  URL,Request,Response,Headers,AbortController,AbortSignal,setTimeout,clearTimeout,
  fetch:async input=>{
   urls.push(String(input));
   return new Response('<!doctype html><html><body>StarQuest</body></html>',{
    status:200,headers:{'Content-Type':'text/html'}
   });
  }
 };
 vm.createContext(scope);
 vm.runInContext(fs.readFileSync('workers/quantaphi-site/worker.js','utf8')
  .replace(/^import \{videoAPI\} from '\.\/video-api\.mjs';\s*/m,"const videoAPI=()=>{throw Error('video fixture absent')};\n")
  .replace('export default','globalThis.worker='),scope);
 const response=await scope.worker.fetch(new Request('https://quantaphi.org'+path));
 return {response,urls};
}
test('StarQuest uses one canonical .org route backed by its actual mlb-watch files',async()=>{
 for(const path of ['/starquest/','/StarQuest/','/StarQuest/mlb-watch/']){
  const {response,urls}=await request(path);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('x-quantaphi-app'),'StarQuest');
  assert.ok(urls.some(url=>url.includes('/StarQuest/main/mlb-watch/index.html')),path+' '+JSON.stringify(urls));
 }
});
test('StarQuest relative assets do not accidentally resolve to QuantaPhi or GitHub Pages',async()=>{
 for(const asset of ['styles.css','app.js','data/research-profiles.json']){
  const {response,urls}=await request('/starquest/'+asset);
  assert.equal(response.status,200);
  assert.ok(urls.some(url=>url.includes('/StarQuest/main/mlb-watch/'+asset)),asset+' '+JSON.stringify(urls));
  assert.equal(urls.some(url=>url.includes('github.io')),false);
 }
});
