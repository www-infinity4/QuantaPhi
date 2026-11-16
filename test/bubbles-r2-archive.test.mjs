import test from 'node:test';
import assert from 'node:assert/strict';
import {handle} from '../workers/bubbles-memory/worker.mjs';
import {archivePrefix} from '../workers/bubbles-memory/archive.mjs';

const ROOT='https://bubbles-memory.marvaseater.workers.dev';
function harness(){
 const objects=new Map(),calls=[];
 const bucket={
  async put(key,bytes,options){
   calls.push({operation:'put',key,options});
   if(options?.onlyIf?.etagDoesNotMatch!=='*')throw Error('create-only condition required');
   if(objects.has(key))return null;
   objects.set(key,{value:new Uint8Array(bytes),size:bytes.length,uploaded:new Date(),
    httpMetadata:options.httpMetadata});
   return {key};
  },
  async get(key){
   calls.push({operation:'get',key});
   const v=objects.get(key);return v?{...v,body:new Response(v.value).body}:null;
  },
  async head(key){calls.push({operation:'head',key});return objects.get(key)||null},
  async delete(key){calls.push({operation:'delete',key});objects.delete(key)},
  async list({prefix,limit,cursor}){calls.push({operation:'list',prefix,limit,cursor});
   const entries=[...objects.entries()].filter(([k])=>k.startsWith(prefix))
    .map(([key,v])=>({key,size:v.size,uploaded:v.uploaded,httpMetadata:v.httpMetadata}));
   return {objects:entries.slice(0,limit),truncated:false};
  }
 };
 const wallet={async fetch(_url,{headers}){
  if(!/^Bearer (alice|bob)-archive-token-12345$/.test(headers.Authorization))return Response.json({}, {status:401});
  return Response.json({ok:true,user:{id:headers.Authorization.includes('alice')?'alice':'bob'}});
 }};
 return {env:{MEMORY_DB:{},BOT_WALLET:wallet,ARCHIVE_BUCKET:bucket},objects,calls};
}
const id='capture_123456789012';
function req(path,method='GET',who='alice',data=null,{origin='https://quantaphi.org',type='video/mp4'}={}){
 return new Request(ROOT+path,{method,headers:{Origin:origin,Authorization:'Bearer '+who+'-archive-token-12345',
  ...(method==='PUT'?{'Content-Type':type}:{})},...(data!==null?{body:data}:{})});
}
test('wallet-gated R2 write/read/list/delete is isolated and create-only',async()=>{
 const {env,objects,calls}=harness();
 const video=new TextEncoder().encode('mock-recording-not-real-media');
 let r=await handle(req('/v1/archive/'+id,'PUT','alice',video),env);
 assert.equal(r.status,201);assert.equal((await r.json()).bytes,video.length);
 const expected=(await archivePrefix('alice'))+id;
 assert.ok(objects.has(expected));
 r=await handle(req('/v1/archive/'+id,'PUT','alice',video),env);
 assert.equal(r.status,409);
 assert.deepEqual(objects.get(expected).value,video);
 r=await handle(req('/v1/archive/'+id,'GET','bob'),env);
 assert.equal(r.status,404);
 r=await handle(req('/v1/archive','GET','bob'),env);
 assert.deepEqual((await r.json()).items,[]);
 r=await handle(req('/v1/archive','GET','alice'),env);
 const j=await r.json();
 assert.deepEqual(j.items.map(x=>x.id),[id]);assert.equal(j.items[0].bytes,video.length);
 assert.ok(!JSON.stringify(j).includes('wallets/'));
 r=await handle(req('/v1/archive/'+id,'GET','alice'),env);
 assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'video/mp4');
 assert.match(r.headers.get('content-disposition'),/^attachment;/);
 assert.equal(r.headers.get('cache-control'),'private, no-store');
 assert.equal(await r.text(),'mock-recording-not-real-media');
 r=await handle(req('/v1/archive/'+id,'DELETE','bob'),env);
 assert.equal((await r.json()).deleted,0);
 assert.ok(objects.has(expected));
 r=await handle(req('/v1/archive/'+id,'DELETE','alice'),env);
 assert.equal((await r.json()).deleted,1);
 assert.ok(!objects.has(expected));
 assert.ok(calls.every(x=>x.operation!=='get'||x.key.startsWith('wallets/')));
});
test('unauthorized origin or wallet never reaches R2',async()=>{
 const {env,calls}=harness();
 assert.equal((await handle(req('/v1/archive','GET','alice',null,{origin:'https://evil.test'}),env)).status,403);
 assert.equal((await handle(req('/v1/archive','GET','intruder'),env)).status,401);
 assert.deepEqual(calls,[]);
});
test('invalid object IDs, content types, oversized payload, unknown cursor and empty upload are refused',async()=>{
 const {env,objects}=harness();
 assert.equal((await handle(req('/v1/archive/../../admin','PUT','alice','abc'),env)).status,404);
 assert.equal((await handle(req('/v1/archive/short','PUT','alice','abc'),env)).status,404);
 assert.equal((await handle(req('/v1/archive/'+id,'PUT','alice','script',{type:'text/html'}),env)).status,415);
 assert.equal((await handle(req('/v1/archive/'+id,'PUT','alice',''),env)).status,400);
 assert.equal((await handle(req('/v1/archive?cursor=%3Cwrong%3E','GET','alice'),env)).status,400);
 const tooLong=new Uint8Array(16*1024*1024+1);
 assert.equal((await handle(req('/v1/archive/'+id,'PUT','alice',tooLong),env)).status,413);
 assert.equal(objects.size,0);
});
test('archival feature is not advertised ready or exposed without an R2 binding',async()=>{
 const {env}=harness();
 delete env.ARCHIVE_BUCKET;
 let r=await handle(req('/health'),env);assert.equal((await r.json()).archiveBindingReady,false);
 r=await handle(req('/v1/archive'),env);assert.equal(r.status,503);
 const pre=await handle(req('/v1/archive','OPTIONS'),env);
 assert.equal(pre.status,204);assert.match(pre.headers.get('access-control-allow-methods'),/PUT/);
});
