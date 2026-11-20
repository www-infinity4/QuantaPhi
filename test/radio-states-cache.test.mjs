import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('post-state-directory radio shell loads newly versioned 50-state catalogue',()=>{
 const js=readFileSync(new URL('../quick-infinity-radio.js',import.meta.url),'utf8');
 assert.match(js,/iowa-live-radio-cards\.js\?v=20261105-states-db1/);
 assert.doesNotMatch(js,/20261104-who1/);
});
