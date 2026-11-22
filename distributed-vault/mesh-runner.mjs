#!/usr/bin/env node
// Run the owner-controlled encrypted fragment coordinator on a real host.
// Requires Node >=22 (built-in sqlite), persistent private disk, stable network.
// No npm or Cloudflare required. HTTPS is mandatory off loopback.
import {readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {createMeshServer} from './mesh-server.mjs';

const token=process.env.MESH_OWNER_TOKEN||'';
const host=process.env.MESH_HOST||'127.0.0.1';
const port=Number(process.env.MESH_PORT||'8789');
const dbPath=process.env.MESH_DB||join(homedir(),'.quantaphi-mesh','mesh.sqlite');
const replicas=Number(process.env.MESH_REPLICAS||'3');
const cert=process.env.MESH_TLS_CERT,privateKey=process.env.MESH_TLS_KEY;
if(!Number.isInteger(port)||port<=0||port>65535)throw Error('invalid MESH_PORT');
if(Boolean(cert)!==Boolean(privateKey))throw Error('TLS certificate and key must be provided together');
const tls=cert&&privateKey?{cert:readFileSync(cert),key:readFileSync(privateKey)}:null;
const mesh=createMeshServer({dbPath,ownerToken:token,host,replicas,tls});
const url=await mesh.listen(port);
console.log('Infinity mesh coordinator serving '+url);
console.log('Database is private local SQLite; remote access needs valid HTTPS and per-device credentials.');
let ending=false;
const shutdown=async()=>{
 if(ending)return;ending=true;
 await mesh.close();process.exitCode=0;
};
process.on('SIGINT',()=>void shutdown());
process.on('SIGTERM',()=>void shutdown());
