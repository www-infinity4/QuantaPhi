#!/usr/bin/env node
// Local owner-host readiness check only; never read production configuration.
// Uses a fresh temporary SQLite file, synthetic bytes and loopback HTTP.
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createMeshServer} from './mesh-server.mjs';
import {packFile,restoreFile} from './vault-core.mjs';

async function main(){
 const dir=mkdtempSync(join(tmpdir(),'quantaphi-host-check-'));
 const dbPath=join(dir,'fixture.sqlite'),ownerToken=randomBytes(32).toString('hex');
 let mesh,url;
 const start=async()=>{
  mesh=createMeshServer({dbPath,ownerToken,host:'127.0.0.1',replicas:1});
  url=await mesh.listen(0);
 };
 const call=async(method,path,expected,body,authenticated=true)=>{
  const response=await fetch(url+path,{method,headers:{'Content-Type':'application/json',
   ...(authenticated?{Authorization:'Bearer '+ownerToken}:{})},
   body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(3000)});
  if(response.status!==expected)throw Error('mesh_http_check_failed');
  return response.json();
 };
 try{
  await start();
  const health=await call('GET','/health',200,undefined,false);
  if(health.ok!==true||health.service!=='infinity-mesh-local-v1')throw Error('mesh_health_check_failed');
  await call('GET','/v1/owner/status',401,undefined,false);
  const plain=Buffer.from('QuantaPhi synthetic owner-host restart check');
  const {manifest,fragments,key}=packFile(plain,{shards:2});
  await call('POST','/v1/owner/manifests',201,manifest);
  for(const part of fragments)await call('PUT','/v1/owner/shards/'+manifest.fileId+'/'+part.index,201,part);
  await mesh.close();mesh=null;
  await start();
  const archive=await call('GET','/v1/owner/files/'+manifest.fileId,200);
  if(!restoreFile(archive.manifest,archive.fragments,key).equals(plain))throw Error('mesh_restore_check_failed');
  await call('GET','/v1/owner/status',401,undefined,false);
  await mesh.close();mesh=null;
  console.log(JSON.stringify({ok:true,scope:'local-synthetic-host-check',service:health.service,
   anonymousDenied:true,encryptedRoundtrip:true,restartVerified:true,productionVerified:false}));
 }finally{try{if(mesh)await mesh.close();}finally{rmSync(dir,{recursive:true,force:true});}}
}
main().catch(()=>{console.error('Mesh host check failed; no production operation attempted.');process.exitCode=1;});
