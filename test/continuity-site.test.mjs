import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createContinuitySite} from '../workers/continuity-site/worker.mjs';
import {buildContinuitySite,ASSETS} from '../scripts/build-continuity-site.mjs';
const sha='a'.repeat(40),request=(p,method='GET')=>new Request('https://quantaphi.org'+p,{method});
test('static gateway serves separate owner entrypoints without changing workspace',async()=>{
 const assets={'index.html':'Original notebook','owner/index.html':'<style>body{color:red}</style><script>window.test=true</script>','owner/app.mjs':'export {};'};
 const gateway=createContinuitySite(assets,sha);
 assert.equal(await (await gateway.fetch(request('/continuity/'),{})).text(),'Original notebook');
 const owner=await gateway.fetch(request('/continuity/owner/'),{});
 assert.equal(owner.status,200);assert.equal(owner.headers.get('x-continuity-source'),sha);
 assert.match(owner.headers.get('content-security-policy'),/sha256-/);
 assert.doesNotMatch(owner.headers.get('content-security-policy'),/unsafe-inline/);
 assert.match(owner.headers.get('content-security-policy'),/https:\/\/infinity-brain-clock/);
 assert.match((await gateway.fetch(request('/continuity/owner/app.mjs'),{})).headers.get('content-type'),/javascript/);
 assert.equal((await gateway.fetch(request('/continuity/missing'),{})).status,404);
 assert.equal((await gateway.fetch(request('/continuity/owner/','POST'),{})).status,405);
 assert.equal(await (await gateway.fetch(request('/continuity/owner/','HEAD'),{})).text(),'');
});
test('public X binding proxy has fixed read paths and strips all caller credentials',async()=>{
 const seen=[],gateway=createContinuitySite({},sha),env={PUBLIC_X:{async fetch(req){seen.push(req);return Response.json({ok:true});}}};
 const req=new Request('https://preview.example/api/bubbles/public-x/inbox',{headers:{Authorization:'Bearer synthetic',Cookie:'test=1'}});
 assert.equal((await gateway.fetch(req,env)).status,200);
 assert.equal(seen[0].url,'https://public-x.internal/inbox');assert.equal(seen[0].headers.has('authorization'),false);assert.equal(seen[0].headers.has('cookie'),false);
 assert.equal((await gateway.fetch(request('/continuity/api/bubbles/public-x/unknown'),env)).status,404);assert.equal(seen.length,1);
});
test('build pins and includes every reviewed workspace and owner asset',async()=>{
 const root=fileURLToPath(new URL('../',import.meta.url)),out=await mkdtemp(path.join(tmpdir(),'continuity-bundle-'));
 try{
  const manifest=await buildContinuitySite(root,out,sha);assert.equal(Object.keys(manifest.files).length,ASSETS.length+1);
  const {default:gateway}=await import(pathToFileURL(path.join(out,'index.mjs')).href);
  for(const name of ASSETS){const r=await gateway.fetch(request('/continuity/'+name),{});assert.equal(r.status,200);assert.equal(await r.text(),await readFile(path.join(root,'continuity',name),'utf8'));}
 }finally{await rm(out,{recursive:true,force:true});}
});
