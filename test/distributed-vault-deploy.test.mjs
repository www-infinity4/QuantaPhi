import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../distributed-vault/deploy/'+name,import.meta.url),'utf8');
test('repository host systemd service keeps localhost-only and secret env file',()=>{
 const s=read('quantaphi-mesh.service');
 assert.match(s,/ExecStart=\/usr\/bin\/node .*distributed-vault\/mesh-runner\.mjs/);
 assert.match(s,/EnvironmentFile=\/etc\/quantaphi\/mesh\.env/);
 assert.match(s,/MESH_HOST=127\.0\.0\.1/);
 assert.match(s,/MESH_DB=\/var\/lib\/quantaphi-mesh\/mesh\.sqlite/);
 assert.match(s,/User=quantamesh/);
 for(const setting of ['NoNewPrivileges=true','ProtectSystem=strict','ProtectHome=true','UMask=0077','StateDirectory=quantaphi-mesh','Restart=on-failure'])
  assert.ok(s.includes(setting),setting);
 assert.doesNotMatch(s,/MESH_OWNER_TOKEN\s*=/);
 assert.doesNotMatch(s,/0\.0\.0\.0|cloudflare|api[_-]?key/i);
});
test('example HTTPS reverse proxy forwards only to loopback and needs real host',()=>{
 const cfg=read('Caddyfile.example');
 assert.match(cfg,/mesh\.example\.org/);
 assert.match(cfg,/reverse_proxy 127\.0\.0\.1:8789/);
 assert.doesNotMatch(cfg,/http:\/\/mesh\.example\.org/);
 assert.doesNotMatch(cfg,/cloudflare|tls_insecure_skip_verify|\*/i);
});
test('deployment runbook never claims repos provide always-on compute or D1 data migration complete',()=>{
 const cfg=read('README.md');
 assert.match(cfg,/systemd/i);
 assert.match(cfg,/D1.*remains.*authoritative/i);
 assert.match(cfg,/https/i);
 assert.match(cfg,/not.*production.*cutover/i);
 assert.match(cfg,/separate.*permanent.*host/i);
});


import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
function queueSnapshot(t){
 const dir=mkdtempSync(join(tmpdir(),'qp-portable-queue-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const dbPath=join(dir,'private.sqlite'),db=new DatabaseSync(dbPath);
 db.exec('CREATE TABLE work_tickets(id TEXT PRIMARY KEY,owner_hash TEXT,context_json TEXT,request TEXT,created_at INTEGER,status TEXT)');
 const add=db.prepare('INSERT INTO work_tickets VALUES(?,?,?,?,?,?)');
 for(let i=0;i<105;i++)add.run('job-'+i,'owner-a',JSON.stringify({kind:'robot-directions',color_jobs:[]}), 'private fixture',i,'ready');
 add.run('foreign','owner-b','{"kind":"robot-directions"}','other private fixture',999,'ready');
 add.run('complete','owner-a','{"kind":"robot-directions"}','complete',998,'complete');
 add.run('other-kind','owner-a','{"kind":"other"}','other kind',997,'ready');
 db.close();
 return {dir,dbPath};
}
test('portable queue reuses owner-scoped Brain selection across SQLite pages without network or writes',async t=>{
 const {readPortableQueue}=await import('../distributed-vault/portable-brain-queue.mjs');
 const {dbPath}=queueSnapshot(t);
 const before=readFileSync(dbPath);
 const q=await readPortableQueue({dbPath,ownerHash:'owner-a'});
 assert.equal(q.results.length,105);
 assert.equal(q.pagesRead,2);
 assert.equal(q.scanLimited,false);
 assert.equal(q.results[0].id,'job-104');
 assert.equal(q.results.at(-1).id,'job-0');
 const foreign=await readPortableQueue({dbPath,ownerHash:'owner-a',requestedTicketId:'foreign',order:'oldest'});
 assert.equal(foreign.results.length,105);
 assert.equal(foreign.results[0].id,'job-0');
 assert.ok(!foreign.results.some(r=>['foreign','complete','other-kind'].includes(r.id)));
 assert.deepEqual(readFileSync(dbPath),before);
});
test('portable queue refuses absent snapshots and missing owner scope without creating files',async t=>{
 const {readPortableQueue}=await import('../distributed-vault/portable-brain-queue.mjs');
 const {dir,dbPath}=queueSnapshot(t),missing=join(dir,'absent.sqlite');
 await assert.rejects(readPortableQueue({dbPath:missing,ownerHash:'owner-a'}));
 assert.equal(existsSync(missing),false);
 await assert.rejects(readPortableQueue({dbPath,ownerHash:''}),/scope/i);
});
