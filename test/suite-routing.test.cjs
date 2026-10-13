const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const worker=import(require('node:url').pathToFileURL(require('node:path').resolve('workers/quantaphi-site/worker.js')).href);
test('legacy Omni pages redirect inside the app so relative scripts resolve to Omni',async()=>{
 const app=(await worker).default;
 for(const route of ['overview','images','video','audio','code','create','cards','build']){
  const response=await app.fetch(new Request('https://quantaphi.org/'+route+'/?q=Iran&token=existing'));
  assert.equal(response.status,308);const url=new URL(response.headers.get('Location'));assert.equal(url.pathname,'/omni-phi/'+route+'/');assert.equal(url.search,'?q=Iran&token=existing');
  assert.equal(new URL('../assets/app.js',url).pathname,'/omni-phi/assets/app.js');
 }
});
