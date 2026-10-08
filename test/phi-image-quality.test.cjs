'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=f=>fs.readFileSync(path.join(root,f),'utf8');

test('image builder and actions load with quality reviewer and learning in the correct order',()=>{
 const html=source('index.html');
 const order=['phi-visual-render.js','phi-image-learning.js','phi-image-builder.js','phi-image-actions.js'].map(f=>html.indexOf('/'+f+'?'));
 assert.ok(order.every(x=>x>=0));
 assert.deepEqual([...order].sort((a,b)=>a-b),order);
 assert.match(source('phi-image-builder.js'),/renderer\.review\(/);
 assert.match(source('phi-image-builder.js'),/data-pi-action/);
 assert.match(source('phi-image-builder.js'),/Fix issues/);
 assert.match(source('phi-image-builder.js'),/Looks good/);
});

test('finished image reviewer is a real vision endpoint, not dimension checking',()=>{
 const worker=source('workers/infinity-rogers/worker.js');
 assert.match(worker,/async function runImageReview/);
 assert.match(worker,/url\.pathname === "\/v1\/image-review"/);
 assert.match(worker,/type:"image_url",image_url:\{url:imageUri\}/);
 assert.match(worker,/No fake writing, glyphs, pseudo-words/);
 assert.match(source('phi-visual-render.js'),/composeExactText/);
 assert.match(source('phi-visual-render.js'),/\/v1\/image-review/);
});

test('only explicit endorsement becomes preference; download request is not verified save',()=>{
 const data=new Map();
 const storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 const window={};
 vm.runInNewContext(source('phi-image-learning.js'),{window,localStorage:storage});
 const learning=window.PhiImageLearning;
 const artifact={id:'one',mode:'Image',prompt:'19th-century side-wheel steamboat'};
 assert.equal(learning.record(artifact,'save_requested'),true);
 assert.equal(learning.preferences('Image'),'');
 learning.record(artifact,'review',{issues:[{problem:'paddle assembly disconnected'}]});
 learning.record(artifact,'needs_fix');
 assert.match(learning.preferences('Image'),/paddle assembly disconnected/);
 learning.record(artifact,'star');
 assert.match(learning.preferences('Image'),/explicitly appreciated/);
 learning.record(artifact,'star_off');
 assert.doesNotMatch(learning.preferences('Image'),/explicitly appreciated/);
 learning.record(artifact,'looks_good');
 assert.match(learning.preferences('Image'),/explicitly appreciated/);
 assert.equal(learning.summary().length,1);
});
