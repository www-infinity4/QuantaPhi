import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {ESSENTIALS_SEED} from '../essentials-card-batch.mjs';
const cli=new URL('../scripts/build-essentials-batch.mjs',import.meta.url).pathname;
const today=new Date().toISOString().slice(0,10);
test('CLI imports reviewed product records to a static ready catalog',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'qec-ok-'));const source=join(dir,'input.json'),output=join(dir,'ready.json');
 await writeFile(source,JSON.stringify([{...ESSENTIALS_SEED[0],checkedAt:today}]));
 const run=spawnSync(process.execPath,[cli,source,output],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 const rows=JSON.parse(await readFile(output,'utf8'));
 assert.equal(rows.length,1);assert.equal(rows[0].id,'blue-star-ointment');
});
test('CLI fails closed if a batch includes an unreviewed or invalid record',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'qec-bad-'));const source=join(dir,'input.json'),output=join(dir,'ready.json');
 await writeFile(source,JSON.stringify([{...ESSENTIALS_SEED[0],checkedAt:today},{...ESSENTIALS_SEED[0],id:'bad',imageUrl:'http://unsafe.example/no.jpg'}]));
 const run=spawnSync(process.execPath,[cli,source,output],{encoding:'utf8'});
 assert.notEqual(run.status,0);assert.match(run.stderr,/held for review/i);
 await assert.rejects(access(output));
});
test('CLI supports a batch larger than 100 real reviewed records without extra filler',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'qec-large-'));const source=join(dir,'input.json'),output=join(dir,'ready.json');
 const rows=Array.from({length:115},(_,i)=>({...ESSENTIALS_SEED[0],id:'item-'+i,name:'Approved distinct item '+i,checkedAt:today}));
 await writeFile(source,JSON.stringify(rows));
 const run=spawnSync(process.execPath,[cli,source,output],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 assert.equal(JSON.parse(await readFile(output,'utf8')).length,115);
});