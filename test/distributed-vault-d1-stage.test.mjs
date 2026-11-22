import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('../distributed-vault/d1-stage.py',import.meta.url));
const run=(...args)=>spawnSync('python3',[script,...args],{encoding:'utf8'});
const digest=path=>createHash('sha256').update(readFileSync(path)).digest('hex');

test('D1 SQL export can be imported into new private SQLite and integrity-checked without touching source',t=>{
 const dir=mkdtempSync(join(tmpdir(),'d1-stage-')); t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const sql=join(dir,'cloudflare-export.sql'),db=join(dir,'staged.sqlite');
 writeFileSync(sql, 'CREATE TABLE members(id INTEGER PRIMARY KEY, name TEXT);\nINSERT INTO members(name) VALUES (\'alpha\');\nINSERT INTO members(name) VALUES (\'beta\');\n');
 const result=run('import-sql',sql,db);
 assert.equal(result.status,0,result.stderr);
 assert.ok(existsSync(db));
 const inspect=spawnSync('python3',['-c','import sqlite3,sys; d=sqlite3.connect(sys.argv[1]); print(d.execute("SELECT count(*) FROM members").fetchone()[0])',db],{encoding:'utf8'});
 assert.equal(inspect.stdout.trim(),'2');
 assert.ok(readFileSync(sql,'utf8').includes('INSERT'));
 assert.notEqual(run('import-sql',sql,db).status,0,'refuse overwriting migrated data');
});
test('private D1 snapshot chunks restore byte-identical SQLite and catch corrupted cache archive',t=>{
 const dir=mkdtempSync(join(tmpdir(),'d1-stage-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const db=join(dir,'one.sqlite');
 const seed=spawnSync('python3',['-c','import sqlite3,sys; d=sqlite3.connect(sys.argv[1]);d.execute("CREATE TABLE data(v BLOB)");d.execute("INSERT INTO data VALUES (?)",(bytes(range(256))*5000,));d.commit();d.close()',db],{encoding:'utf8'});
 assert.equal(seed.status,0,seed.stderr);
 const archive=join(dir,'chunks'),restored=join(dir,'restored.sqlite');
 const split=run('chunk',db,archive,'524288');
 assert.equal(split.status,0,split.stderr);
 const manifest=JSON.parse(readFileSync(join(archive,'manifest.json'),'utf8'));
 assert.ok(manifest.chunks.length>=2);
 assert.equal(manifest.sha256,digest(db));
 assert.equal(run('restore',archive,restored).status,0);
 assert.equal(digest(restored),digest(db));
 assert.notEqual(run('restore',archive,restored).status,0);
 const first=join(archive,manifest.chunks[0].name);
 const bytes=readFileSync(first);bytes[0]^=1;writeFileSync(first,bytes);
 assert.notEqual(run('restore',archive,join(dir,'corrupted.sqlite')).status,0);
});
test('malformed SQL fails closed and cannot leave a false accepted database',t=>{
 const dir=mkdtempSync(join(tmpdir(),'d1-stage-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const sql=join(dir,'bad.sql'),out=join(dir,'out.sqlite');
 writeFileSync(sql,'CREATE TABLE t(x);\nINSERT INTO nonexistent VALUES(1);\n');
 const status=run('import-sql',sql,out);
 assert.notEqual(status.status,0);
 assert.equal(existsSync(out),false);
});

test('safe SQLite snapshot copies a source database without mutating its rows',t=>{
 const dir=mkdtempSync(join(tmpdir(),'d1-snapshot-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const db=join(dir,'live.sqlite'),copy=join(dir,'snapshot.sqlite');
 const seeded=spawnSync('python3',['-c','import sqlite3,sys; d=sqlite3.connect(sys.argv[1]);d.execute("PRAGMA journal_mode=WAL");d.execute("CREATE TABLE notes(v TEXT)");d.execute("INSERT INTO notes VALUES (?)",("owner-value",));d.commit();d.close()',db],{encoding:'utf8'});
 assert.equal(seeded.status,0,seeded.stderr);
 const snap=run('snapshot',db,copy);
 assert.equal(snap.status,0,snap.stderr);
 const details=spawnSync('python3',['-c','import sqlite3,sys; a=sqlite3.connect(sys.argv[1]);b=sqlite3.connect(sys.argv[2]);print(a.execute("SELECT * FROM notes").fetchall()==b.execute("SELECT * FROM notes").fetchall())',db,copy],{encoding:'utf8'});
 assert.equal(details.stdout.trim(),'True');
 assert.notEqual(run('snapshot',db,copy).status,0);
});
