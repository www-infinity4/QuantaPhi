#!/usr/bin/env node
// Consent Shards command line — no server, no background phone access, no npm.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {packFile,restoreFile,planPlacement} from './vault-core.mjs';
function usage(){
 throw Error('Usage:\n'+
  '  node distributed-vault/vault-cli.mjs pack <input-file> <new-shards-folder> <private-key-file> <shard-count>\n'+
  '  node distributed-vault/vault-cli.mjs plan <manifest.json> <consented-devices.json> <replicas> <output-plan.json>\n'+
  '  node distributed-vault/vault-cli.mjs restore <manifest.json> <shards-folder> <private-key-file> <output-file>');
}
const json=x=>JSON.stringify(x,null,2)+'\n';
async function writeNew(file,bytes,{privateFile=false}={}){
 await writeFile(file,bytes,{flag:'wx',mode:privateFile?0o600:0o644});
}
const inside=(file,dir)=>{const r=relative(dir,file);return r===''||(!r.startsWith('..')&&!isAbsolute(r));};
async function run(args){
 const [action,...p]=args;
 if(action==='pack'){
  if(p.length!==4)usage();
  const [input,out,keyPath,count]=p;
  const directory=resolve(out),keyFile=resolve(keyPath);
  if(inside(keyFile,directory))throw Error('private key must be OUTSIDE shards folder');
  if(inside(resolve(input),directory))throw Error('input file must be OUTSIDE shards folder');
  const shards=Number(count);
  const {manifest,fragments,key}=packFile(await readFile(input),{shards});
  await mkdir(directory); // refuse an existing folder: no silent overwrite
  await writeNew(keyFile,json({fileId:manifest.fileId,algorithm:manifest.algorithm,key:key.toString('base64')}),{privateFile:true});
  await writeNew(join(directory,'manifest.json'),json(manifest));
  for(const part of fragments)
   await writeNew(join(directory,'part-'+String(part.index).padStart(6,'0')+'.json'),json(part));
  console.log(json({status:'packed_locally',parts:manifest.requiredShards,manifest:join(directory,'manifest.json'),keyFile,
   notice:'No remote node received any data; distribute individual parts only to explicitly consenting volunteers.'}));
  return;
 }
 if(action==='plan'){
  if(p.length!==4)usage();
  const [manifestPath,consentsPath,replicasArg,output]=p;
  const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  const volunteers=JSON.parse(await readFile(consentsPath,'utf8'));
  const plan=planPlacement(manifest,volunteers,{replicas:Number(replicasArg)});
  await writeNew(output,json(plan));
  console.log(json({status:'placement_plan_only',assigned:plan.assignments.length*plan.replicas,
   uniqueDevices:new Set(plan.assignments.flatMap(a=>a.deviceIds)).size,
   notice:'Plan is not a network upload; volunteers must independently agree to receive their single fragment.'}));
  return;
 }
 if(action==='restore'){
  if(p.length!==4)usage();
  const [manifestPath,dir,keyPath,output]=p;
  const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  const privateKey=JSON.parse(await readFile(keyPath,'utf8'));
  if(privateKey.fileId!==manifest.fileId)throw Error('wrong private key file id');
  const fragments=[];
  for(let index=0;index<manifest.requiredShards;index++)
   fragments.push(JSON.parse(await readFile(join(dir,'part-'+String(index).padStart(6,'0')+'.json'),'utf8')));
  const original=restoreFile(manifest,fragments,Buffer.from(privateKey.key,'base64'));
  await writeNew(output,original,{privateFile:true});
  console.log(json({status:'restored_locally',bytes:original.length,output:resolve(output)}));
  return;
 }
 usage();
}
run(process.argv.slice(2)).catch(error=>{console.error('Consent Shards:',error.message);process.exitCode=1;});
