import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Android-facing vault demo shows app-cache usage, clear, and pause controls',()=>{
 const html=readFileSync(new URL('../distributed-vault/index.html',import.meta.url),'utf8');
 for(const id of ['vaultStatus','vaultBytes','vaultEntries','vaultTestCache','vaultClear','vaultPause'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/application-managed encrypted cache/i);
 assert.match(html,/clear.*storage/i);
 assert.match(html,/name="viewport".*width=device-width/);
 assert.match(html,/app-page\.mjs/);
});

test('app demo reads only a bundled test shard and uses own IndexedDB storage',()=>{
 const src=readFileSync(new URL('../distributed-vault/app-page.mjs',import.meta.url),'utf8');
 assert.match(src,/openBrowserShardStore/);
 assert.match(src,/cache\.put\(/);
 assert.match(src,/cache\.clear\(/);
 assert.match(src,/demo-shard\.json/);
 assert.doesNotMatch(src,/navigator\.contacts|navigator\.mediaDevices|FileSystemDirectoryHandle|localStorage\.clear\(/);
});
