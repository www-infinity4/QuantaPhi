import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const gateway=readFileSync(new URL('../workers/quantaphi-site/worker.js',import.meta.url),'utf8');
test('edge applies a restrictive worker CSP to every local mirror asset',()=>{
  for(const file of ['local-mirror.html','local-mirror-app.mjs','local-mirror-worker.mjs','local-mirror-core.mjs']){
    assert.ok(gateway.includes("'/" + file + "'"),file + ' must be included in protected route');
  }
  assert.match(gateway,/localMirrorAsset/);
  assert.match(gateway,/out\.set\('Content-Security-Policy', LOCAL_MIRROR_CSP\)/);
  assert.match(gateway,/connect-src 'none'/);
  assert.match(gateway,/frame-ancestors 'self'/);
  assert.match(gateway,/out\.set\('X-Frame-Options', 'SAMEORIGIN'\)/);
});
