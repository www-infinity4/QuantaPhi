import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,statSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const script=fileURLToPath(new URL('../distributed-vault/vault-cli.mjs',import.meta.url));
function command(...args){return spawnSync(process.execPath,[script,...args],{encoding:'utf8'});}
test('Termux-compatible no-npm CLI packs, plans and restores original binary data',t=>{
 const root=mkdtempSync(join(tmpdir(),'infinity-vault-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 const input=join(root,'original.bin');
 const original=Buffer.alloc(32768,201);original.fill(0,7,400);
 writeFileSync(input,original);
 const dir=join(root,'fragments'),key=join(root,'owner-private-key.json');
 const packed=command('pack',input,dir,key,'17');
 assert.equal(packed.status,0,packed.stderr);
 const manifest=JSON.parse(readFileSync(join(dir,'manifest.json'),'utf8'));
 assert.equal(manifest.requiredShards,17);
 assert.equal((statSync(key).mode&0o777),0o600);
 assert.equal(existsSync(join(dir,'part-000016.json')),true);
 const peers=Array.from({length:17},(_,i)=>({id:'app-'+i,appCacheReady:true,maxShardBytes:8192}));
 const peerFile=join(root,'app-nodes.json'),planFile=join(root,'placement.json');
 writeFileSync(peerFile,JSON.stringify(peers));
 const planned=command('plan',join(dir,'manifest.json'),peerFile,'1',planFile);
 assert.equal(planned.status,0,planned.stderr);
 const plan=JSON.parse(readFileSync(planFile,'utf8'));
 assert.equal(plan.assignments.length,17);
 assert.equal(new Set(plan.assignments.flatMap(p=>p.deviceIds)).size,17);
 const output=join(root,'restored.bin');
 const restored=command('restore',join(dir,'manifest.json'),dir,key,output);
 assert.equal(restored.status,0,restored.stderr);
 assert.deepEqual(readFileSync(output),original);
});
test('CLI does not overwrite a prior encrypted shard folder or restore output',t=>{
 const root=mkdtempSync(join(tmpdir(),'infinity-vault-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 const input=join(root,'original.bin'),dir=join(root,'parts'),key=join(root,'owner.key');
 writeFileSync(input,Buffer.from('sample'));
 assert.equal(command('pack',input,dir,key,'2').status,0);
 const repeated=command('pack',input,dir,join(root,'second.key'),'2');
 assert.notEqual(repeated.status,0);
 const out=join(root,'restored.bin');
 assert.equal(command('restore',join(dir,'manifest.json'),dir,key,out).status,0);
 assert.notEqual(command('restore',join(dir,'manifest.json'),dir,key,out).status,0);
});
