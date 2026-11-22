import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createMeshServer} from '../distributed-vault/mesh-server.mjs';

test('owner HTTPS/loopback host serves the app-owned cache peer interface under the same origin',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'mesh-app-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const mesh=createMeshServer({dbPath:join(dir,'db.sqlite'),ownerToken:'test-owner-'.padEnd(40,'A')});
 const url=await mesh.listen();t.after(async()=>mesh.close());
 const page=await fetch(url+'/app');
 assert.equal(page.status,200);
 assert.match(page.headers.get('content-security-policy')||'',/script-src 'self'/);
 const html=await page.text();
 assert.match(html,/Application-managed encrypted cache/i);
 for(const control of ['peerToken','peerSave','peerStatus','peerClear','peerPause','peerSync'])
  assert.match(html,new RegExp('id="'+control+'"'));
 const script=await fetch(url+'/app/mesh-peer.mjs');
 assert.equal(script.status,200);
 assert.match(await script.text(),/openBrowserShardStore/);
 const cache=await fetch(url+'/app/app-cache.mjs');
 assert.equal(cache.status,200);
 assert.match(await cache.text(),/AppShardCache/);
});
test('app-only browser peer does not inspect personal device files or publish encryption secrets',()=>{
 const code=readFileSync(new URL('../distributed-vault/mesh-peer.mjs',import.meta.url),'utf8');
 assert.match(code,/\/v1\/node\/heartbeat/);
 assert.match(code,/\/v1\/node\/next/);
 assert.match(code,/\/v1\/node\/ack/);
 assert.match(code,/cache\.put\(/);
 assert.match(code,/cache\.clear\(/);
 assert.doesNotMatch(code,/navigator\.contacts|navigator\.mediaDevices|FileSystemHandle|showOpenFilePicker|MESH_OWNER_TOKEN|vault-private-key/);
});
