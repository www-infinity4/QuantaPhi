import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../research-lab/'+name,import.meta.url),'utf8');
const source=read('index.html');

test('Science Lab links to the independent air, boron and quartz evidence notebook',()=>{
 assert.match(source,/href="\/research-lab\/material-memory-air\.html"/);
});
test('new notebook distinguishes air plasma voxels from safe consumer devices',()=>{
 const html=read('material-memory-air.html');
 assert.match(html,/<!doctype html>/i);
 assert.match(html,/<main\b/);
 assert.match(html,/name="viewport"/);
 assert.match(html,/plasma voxels/i);
 assert.match(html,/laser safety/i);
 assert.match(html,/not a consumer-ready screen/i);
 assert.match(html,/spectrum\.ieee\.org\/femtosecond-lasers-create-3d-midair-plasma-displays-you-can-touch/);
});
test('boron and quartz require physical measurements rather than extrapolated memories',()=>{
 const html=read('material-memory-air.html');
 for(const term of ['B₂O₃','700°C','quartz','optically stimulated luminescence','radiation exposure','not a personal memory']) assert.match(html,new RegExp(term,'i'));
 assert.match(html,/doi\.org\/10\.1111\/jace\.14041/);
 assert.match(html,/nature\.com\/articles\/s43586-021-00068-5/);
});
test('scientific evidence and job receipts remain separate without live sensors, tracking or automatic execution',()=>{
 const html=read('material-memory-air.html');
 for(const term of ['source observation','measurement','replication','runner receipt','CI','deployment'])assert.match(html,new RegExp(term,'i'));
 assert.match(html,/href="\/bubbles\.html"/);
 assert.doesNotMatch(html,/fetch\(|getUserMedia|<input[^>]+type="file"|geolocation|navigator\.clipboard|<script/i);
 assert.match(html,/min-height:\s*44px/);
 assert.match(html,/No live instrument/i);
});
