import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const script=fileURLToPath(new URL('../distributed-vault/d1-verify.py',import.meta.url));
const run=(...args)=>spawnSync('python3',[script,...args],{encoding:'utf8'});
const mk=(t)=>{
 const path=mkdtempSync(join(tmpdir(),'qp-d1-parity-'));t.after(()=>rmSync(path,{recursive:true,force:true}));return path;
};
const seed=(path,rows,{reverse=false,tamper=false}={})=>{
 const code=`import sqlite3,sys
db=sqlite3.connect(sys.argv[1])
db.execute("CREATE TABLE accounts (id INTEGER PRIMARY KEY, label TEXT, balance INTEGER, payload BLOB)")
db.execute("CREATE TABLE empty (x TEXT)")
records=[(1,"alpha",100,bytes([0,255,3])),(2,"beta",200,b"second"),(3,"beta",200,b"second")]
if sys.argv[2]=="yes": records=list(reversed(records))
if sys.argv[3]=="yes":records[0]=(records[0][0],records[0][1],records[0][2]+1,records[0][3])
db.executemany("INSERT INTO accounts VALUES (?,?,?,?)",records)
db.commit();db.close()`;
 const r=spawnSync('python3',['-c',code,path,reverse?'yes':'no',tamper?'yes':'no'],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
};
const sha=f=>createHash('sha256').update(readFileSync(f)).digest('hex');

test('read-only D1 staging parity confirms matching tables despite changed insert order and BLOB rows',t=>{
 const folder=mk(t),a=join(folder,'a.sqlite'),b=join(folder,'b.sqlite');
 seed(a,[1,2,3]);seed(b,[1,2,3],{reverse:true});
 const original=sha(a);
 const report=run('report',a);
 assert.equal(report.status,0,report.stderr);
 const data=JSON.parse(report.stdout);
 assert.equal(data.format,'d1-parity/v1');
 assert.deepEqual(data.tables.map(x=>[x.name,x.rowCount]),[['accounts',3],['empty',0]]);
 assert.equal(data.tables.every(x=>/^[0-9a-f]{64}$/.test(x.dataSha256)),true);
 assert.equal(report.stdout.includes('alpha'),false,'never emit row values');
 assert.equal(sha(a),original,'source remains byte-identical after report');
 const compare=run('compare',a,b);
 assert.equal(compare.status,0,compare.stderr);
 assert.equal(JSON.parse(compare.stdout).matches,true);
 assert.equal(sha(a),original,'source remains unchanged after compare');
});
test('private D1 parity fails closed on a modified ledger-like value without revealing its contents',t=>{
 const folder=mk(t),a=join(folder,'a.sqlite'),b=join(folder,'b.sqlite');
 seed(a);seed(b,[1,2,3],{tamper:true});
 const check=run('compare',a,b);
 assert.equal(check.status,2,check.stderr);
 const value=JSON.parse(check.stdout);
 assert.equal(value.matches,false);
 assert.ok(value.differences.some(x=>x.table==='accounts'&&x.reason==='rows_changed'));
 assert.equal(check.stdout.includes('alpha'),false);
});
test('D1 parity flags table deletion and missing input rather than claiming verified recovery',t=>{
 const folder=mk(t),a=join(folder,'a.sqlite'),b=join(folder,'b.sqlite');
 seed(a);
 const r=spawnSync('python3',['-c','import sqlite3,sys; d=sqlite3.connect(sys.argv[1]); d.execute("CREATE TABLE accounts(id INT)"); d.commit();d.close()',b],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 const check=run('compare',a,b);
 assert.equal(check.status,2);
 const d=JSON.parse(check.stdout);
 assert.ok(d.differences.some(x=>x.table==='empty'&&x.reason==='missing_table'));
 assert.ok(d.differences.some(x=>x.table==='accounts'&&x.reason==='schema_changed'));
 const missing=run('compare',join(folder,'no.sqlite'),b);
 assert.notEqual(missing.status,0);
});
test('D1 verifier never permits a write command or creates an output database',t=>{
 const folder=mk(t),a=join(folder,'a.sqlite');seed(a);
 const original=sha(a);
 const r=run('import-sql',a,join(folder,'new.sqlite'));
 assert.notEqual(r.status,0);
 assert.equal(sha(a),original);
});
