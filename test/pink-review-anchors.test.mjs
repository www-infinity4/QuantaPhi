import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
test('Pink reviewer receives pinned controls and checks existing anchors',()=>{
 assert.match(src,/pinnedControls records values ALREADY found/);
 assert.match(src,/owner did not repeat those existing values/);
 assert.match(src,/invented new URLs or text/);
});
