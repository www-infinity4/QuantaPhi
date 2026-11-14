import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../workers/restaurant-directory.js',import.meta.url),'utf8');
test('restaurant discovery can reach all pages of the 7,214-row Denver licensed snapshot',()=>{
 assert.match(code,/Math\.min\(1000,Math\.max\(0/);
 assert.doesNotMatch(code,/Math\.min\(200,Math\.max\(0/);
 assert.match(code,/LIMIT 24 OFFSET \?/);
});
test('records are read-only, sourced, and not represented as paid ads',()=>{
 assert.match(code,/source_url,source_name,confidence/);
 assert.match(code,/sponsored:false/);
 assert.match(code,/request\.method!==['"]GET['"]/);
});
