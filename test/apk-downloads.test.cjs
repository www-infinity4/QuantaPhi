const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('workers/quantaphi-site/worker.js','utf8').replace(/^import \{videoAPI\} from '.\/video-api\.mjs';\s*/,'').replace('export default','globalThis.worker=');
function setup(fetch){const ctx={URL,Request,Response,Headers,AbortSignal,AbortController,setTimeout,clearTimeout,fetch};vm.runInNewContext(source,ctx);return ctx.worker;}
const asset={name:'Bubbles-Preview5-Android12.apk',state:'uploaded',size:123,updated_at:'2026-10-16T06:00:00Z',label:'Bubbles v0.25.0-preview',browser_download_url:'https://github.com/www-infinity4/QuantaPhi/releases/download/bubbles-preview-current/Bubbles-Preview5-Android12.apk'};
test('latest APK metadata comes from uploaded release assets, never source build version',async()=>{
 const worker=setup(async url=>new Response(JSON.stringify({assets:String(url).includes('bubbles-preview')?[asset]:[]})));
 const r=await worker.fetch(new Request('https://quantaphi.org/api/apk-releases'),{});const data=await r.json();
 assert.equal(data.bubbles.version,'0.25.0-preview');assert.equal(data.site.available,false);assert.equal(r.headers.get('Cache-Control'),'no-store');
});
test('same-origin APK streams bytes with Android MIME and download filename',async()=>{
 const worker=setup(async(url,init)=>String(url).includes('api.github.com')?new Response(JSON.stringify({assets:[asset]})):new Response(new Uint8Array([80,75,3,4])));
 const r=await worker.fetch(new Request('https://quantaphi.org/downloads/bubbles.apk'),{});
 assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),'application/vnd.android.package-archive');assert.match(r.headers.get('Content-Disposition'),/Bubbles-Preview5-Android12.apk/);assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],[80,75,3,4]);
});
test('drafts and foreign download destinations are not advertised',async()=>{
 for(const release of [{draft:true,assets:[asset]},{assets:[{...asset,browser_download_url:'https://evil.example/app.apk'}]}]){
 const worker=setup(async()=>new Response(JSON.stringify(release)));const r=await worker.fetch(new Request('https://quantaphi.org/api/apk-releases'),{});assert.equal((await r.json()).bubbles.available,false);
 }
});
