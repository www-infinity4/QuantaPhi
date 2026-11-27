#!/usr/bin/env node
// Existing encrypted fragment coordinator, with an explicit optional Brain.
// One listener, original credentials and separate private SQLite databases.
// Requires Node >=22. No npm, installer, provider selection or remote cutover.
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {homedir} from 'node:os';
import {join,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createMeshServer} from './mesh-server.mjs';
import {requirePrivateDatabase} from './sqlite-brain-db.mjs';
import {createConfiguredBrain} from './sqlite-brain-runtime.mjs';

function requireExistingSeparateDatabases(env,meshPath){
 const paths=[meshPath,env.BRAIN_WORK_DB,env.BRAIN_STATE_DB];
 const seen=[];
 for(const path of paths){
  if(typeof path!=='string'||!isAbsolute(path))throw Error('existing_private_host_paths_required');
  requirePrivateDatabase(path);
  const info=lstatSync(path),real=realpathSync(path);
  if(info.uid!==process.getuid())throw Error('private_database_owner_required');
  if(seen.some(other=>other.real===real||other.dev===info.dev&&other.ino===info.ino))throw Error('separate_mesh_brain_databases_required');
  seen.push({real,dev:info.dev,ino:info.ino});
 }
 // Never reinterpret work/state/an empty file as mesh storage. This check is
 // read-only; the existing coordinator retains its own additive schema upgrades.
 const db=new DatabaseSync(meshPath,{readOnly:true});
 try{
  const tables={mesh_files:['file_id','manifest','created_at'],mesh_shards:['file_id','shard_index','hash','data','bytes'],
   mesh_nodes:['node_id','token_hash','capacity','online','last_seen'],mesh_placements:['file_id','shard_index','node_id','acked'],mesh_avoid:['file_id','node_id','until_ms']};
  for(const [table,required] of Object.entries(tables)){
   const object=db.prepare('SELECT type FROM sqlite_master WHERE name=?').get(table);
   const columns=new Set(db.prepare('PRAGMA table_info('+table+')').all().map(row=>row.name));
   if(object?.type!=='table'||required.some(column=>!columns.has(column)))throw Error('existing_mesh_schema_required');
  }
  if(db.prepare('PRAGMA quick_check').get().quick_check!=='ok')throw Error('mesh_database_integrity_failed');
 }finally{db.close();}
}

export async function createConfiguredMeshHost(env=process.env){
 const mode=env.BRAIN_HOST_MODE??'standalone';
 if(!['standalone','mesh'].includes(mode))throw Error('brain_host_mode_invalid');
 const host=env.MESH_HOST||'127.0.0.1',port=Number(env.MESH_PORT||'8789');
 const dbPath=env.MESH_DB||join(homedir(),'.quantaphi-mesh','mesh.sqlite');
 const cert=env.MESH_TLS_CERT,privateKey=env.MESH_TLS_KEY;
 if(!Number.isInteger(port)||port<=0||port>65535)throw Error('invalid_MESH_PORT');
 if(Boolean(cert)!==Boolean(privateKey))throw Error('mesh_TLS_pair_required');
 const tls=cert&&privateKey?{cert:readFileSync(cert),key:readFileSync(privateKey)}:null;
 let brain,mesh;
 try{
  if(mode==='mesh'){
   requireExistingSeparateDatabases(env,dbPath);
   // Do not call brain.listen(): the existing MESH_PORT is the only listener.
   brain=await createConfiguredBrain(env);
  }
  mesh=createMeshServer({dbPath,ownerToken:env.MESH_OWNER_TOKEN||'',host,replicas:Number(env.MESH_REPLICAS||'3'),tls,brain:brain||null});
 }catch(error){await brain?.close();throw error;}
 let closing;
 const close=()=>closing??= (async()=>{try{await mesh.close();}finally{await brain?.close();}})();
 return Object.freeze({server:mesh.server,
  async listen(selectedPort=port){try{return await mesh.listen(selectedPort);}catch(error){await close();throw error;}},close});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const mesh=await createConfiguredMeshHost();
  const url=await mesh.listen();
  console.log('Infinity mesh coordinator serving '+url+'; Brain production acceptance remains unverified.');
  console.log('Database is private local SQLite; remote access needs valid HTTPS and per-device credentials.');
  const shutdown=()=>void mesh.close().catch(()=>{process.exitCode=1;});
  process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
 }catch(error){
  // Paths, module source, tokens and database errors stay off public logs.
  console.error('Mesh host startup blocked: '+(error.code==='EADDRINUSE'?'port_in_use_existing_server_preserved':'configuration_invalid'));
  process.exitCode=78;
 }
}
