import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseOBJ,normalizeMesh,projectVertices,CUBE_OBJ,meshSummary} from '../spatial-ai-model.mjs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('sample cube contains bounded 3D vertices and twelve faces',()=>{
 const mesh=parseOBJ(CUBE_OBJ);
 assert.equal(mesh.vertices.length,8);assert.equal(mesh.faces.length,12);
 assert.match(meshSummary(mesh),/8 vertices.*12 faces/);
 assert.ok(normalizeMesh(mesh).vertices.every(v=>v.every(n=>Math.abs(n)<=1)));
});
test('OBJ supports slash notation but rejects invalid or negative indices',()=>{
 assert.deepEqual(parseOBJ('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1/4/4 2/5/5 3/6/6').faces,[[0,1,2]]);
 for(const raw of [
  'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 4',
  'v NaN 1 2\nf 1 1 1',
  'v 0 0 0\nv 1 0 0\nv 0 1 0\nf -1 -2 -3',
  'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 1 2'
 ])assert.throws(()=>parseOBJ(raw));
});
test('rejects oversized files, vertex budget and degenerate models',()=>{
 assert.throws(()=>parseOBJ('x'.repeat(1_000_001)),/size|limit/i);
 assert.throws(()=>parseOBJ(CUBE_OBJ,{maxVertices:4}),/vertices|limit/i);
 assert.throws(()=>parseOBJ('v 1 2 3\nv 1 2 3\nv 1 2 3\nf 1 2 3'),/degenerate|size/i);
});
test('projected orbit is finite and changes with viewpoint',()=>{
 const mesh=normalizeMesh(parseOBJ(CUBE_OBJ));
 const a=projectVertices(mesh.vertices,{yaw:0,pitch:0,scale:80});
 const b=projectVertices(mesh.vertices,{yaw:1.1,pitch:.5,scale:80});
 assert.equal(a.length,8);assert.ok(b.flat().every(Number.isFinite));assert.notDeepEqual(a,b);
});
test('registered Bubbles card is local-only and uses explicit camera controls',()=>{
 const catalog=source('bubbles-card-catalog.mjs'),html=source('spatial-ai.html');
 const js=source('spatial-ai.js'),css=source('spatial-ai.css');
 assert.match(catalog,/app\('spatial-ai','Spatial AI/);
 assert.match(html,/spatial-ai\.js/);assert.match(html,/Camera image is 2D/);
 for(const id of ['saScene','saStartCamera','saStopCamera','saCapture'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/bubbles-embed\.js/);
 assert.match(js,/getUserMedia\(/);assert.match(js,/visibilitychange/);
 assert.match(js,/\.getTracks\(\)\.forEach\(/);
 assert.doesNotMatch(js,/fetch\(|localStorage|sessionStorage|sendBeacon|\.upload\(/);
 assert.match(css,/min-height:\s*48px/);
});
