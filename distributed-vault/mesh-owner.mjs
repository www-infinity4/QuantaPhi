#!/usr/bin/env node
// Encrypted-mesh owner commands. Never paste MESH_OWNER_TOKEN into a repo,
// Actions artifact, or app page. Only encrypted fragments cross the API.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const base=new URL(process.env.MESH_API_URL||'http://127.0.0.1:8789');
const token=process.env.MESH_OWNER_TOKEN||'';
if(token.length<32)throw Error('MESH_OWNER_TOKEN must contain at least 32 characters');
if(base.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(base.hostname))
 throw Error('remote mesh service must use HTTPS');
async function request(method,path,data){
 const res=await fetch(new URL(path,base),{
  method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(30000),redirect:'error'
 });
 const body=await res.json();
 if(!res.ok)throw Error(method+' '+path+' rejected '+res.status+': '+String(body.error||'unknown'));
 return body;
}
async function readJson(file){return JSON.parse(await readFile(file,'utf8'))}
async function saveNew(file,data){await writeFile(file,data,{flag:'wx',mode:0o600})}
async function main([cmd,...args]){
 if(cmd==='status'&&args.length===0){console.log(JSON.stringify(await request('GET','/v1/owner/status'),null,2));return}
 if(cmd==='repair'&&args.length===0){console.log(JSON.stringify(await request('POST','/v1/owner/repair',{}),null,2));return}
 if(cmd==='enroll'&&args.length===1){
  const capacityBytes=Number(args[0]);
  const peer=await request('POST','/v1/owner/nodes',{capacityBytes});
  console.log('APP ENROLLMENT CREDENTIAL (show privately to the intended app; NEVER place in public GitHub):');
  console.log(JSON.stringify(peer,null,2));return;
 }
 if(cmd==='publish'&&args.length===1){
  const dir=resolve(args[0]),manifest=await readJson(join(dir,'manifest.json'));
  await request('POST','/v1/owner/manifests',manifest);
  let count=0;
  for(let index=0;index<manifest.requiredShards;index++){
   const part=await readJson(join(dir,'part-'+String(index).padStart(6,'0')+'.json'));
   await request('PUT','/v1/owner/shards/'+manifest.fileId+'/'+index,part);
   count++;
  }
  console.log(JSON.stringify({status:'encrypted_file_uploaded',fileId:manifest.fileId,encryptedFragments:count,
   note:'Owner-hosted SQLite retains encrypted copies for repair. No private decryption key uploaded.'}));
  return;
 }
 if(cmd==='retrieve'&&args.length===2){
  const [fileId,out]=args;
  if(!/^[0-9a-f-]{36}$/i.test(fileId))throw Error('invalid fileId');
  const data=await request('GET','/v1/owner/files/'+fileId);
  const dest=resolve(out);
  await mkdir(dest,{mode:0o700});
  await saveNew(join(dest,'manifest.json'),JSON.stringify(data.manifest,null,2)+'\n');
  for(const part of data.fragments)
   await saveNew(join(dest,'part-'+String(part.index).padStart(6,'0')+'.json'),JSON.stringify(part,null,2)+'\n');
  console.log(JSON.stringify({status:'encrypted_parts_retrieved',count:data.fragments.length,out:dest,
   note:'Use your separately held local private key and vault-cli restore to decrypt.'}));
  return;
 }
 throw Error('Usage: node distributed-vault/mesh-owner.mjs status|repair|enroll <capacity-bytes>|publish <existing-shards-folder>|retrieve <file-id> <new-encrypted-output-folder>');
}
main(process.argv.slice(2)).catch(e=>{console.error('Mesh owner:',e.message);process.exitCode=1});
