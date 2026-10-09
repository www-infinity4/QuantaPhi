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


test('Infinite Book images can be viewed cleanly, attached, restored and shared with story text',()=>{
 const html=source('index.html');
 const code=source('phi-book-image-bridge.js');
 const book=source('infinite-book.js');
 const css=source('phi-book-illustrations.css');
 const files=['infinite-book.js','phi-image-builder.js','phi-image-actions.js','phi-book-image-bridge.js'];
 const positions=files.map(x=>html.indexOf('/'+x+'?'));
 assert.ok(positions.every(x=>x>=0),'all bridge prerequisites must load');
 assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
 assert.ok(html.includes('/phi-book-illustrations.css?'));
 assert.doesNotThrow(()=>new vm.Script(code),'bridge syntax should parse');
 assert.match(code,/indexedDB\.open\(databaseName,1\)/);
 assert.match(code,/storeName='stories'/);
 assert.match(code,/tx\.objectStore\(storeName\)\.put\(record\)/);
 assert.match(code,/URL\.revokeObjectURL\(currentObjectUrl\)/);
 assert.match(code,/showModal/);
 assert.match(css,/object-fit:contain/);
 assert.match(code,/dataset\.piBook='use-story'/);
 assert.match(code,/window\.PhiVisualRender\.asBlob/);
 assert.match(code,/navigator\.canShare\(\{files:\[file\]\}\)/);
 assert.match(code,/navigator\.share\(\{title:story\.title,text:body,url,files:\[file\]\}\)/);
 assert.match(book,/dataset\.storyId = story\.id/);
 assert.match(book,/phi:story:render/);
 assert.match(book,/PhiBookImageBridge\?\.shareStory/);
 assert.match(book,/if \(!combined\.success\)/);
 assert.doesNotMatch(code,/QuantaStarCredit/,'bridge must never mint coins or credit shares itself');
 assert.match(book,/QuantaStarCredit\?\.\('share'/,'existing successful-share credit remains in book');
});

test('image safety flags are terminal and return actionable feedback without a retry loop',()=>{
 const worker=source('workers/infinity-rogers/worker.js');
 const matcher=worker.match(/if\((\/\\b3030\\b\|output has been flagged\|.*?\/i)\.test\(message\)\)\{/);
 assert.ok(matcher,'a provider flag check must be present in the model catch');
 const blocked=new vm.Script('('+matcher[1]+')').runInNewContext();
 assert.equal(blocked.test('3030: Your output has been flagged. Please choose another prompt / input image combination.'),true);
 assert.equal(blocked.test('Cloudflare temporarily unavailable'),false);
 assert.match(worker,/code:"image_input_flagged"/);
 assert.match(worker,/code:"image_input_invalid"/);
 assert.match(worker,/Do not try alternate prompts or models to work around the rejection/);
});

test('image rejection keeps the original inputs editable and offers photo removal',()=>{
 const builder=source('phi-image-builder.js');
 const adapter=source('phi-visual-render.js');
 const css=source('phi-image-builder.css');
 assert.match(adapter,/error\.code=String\(data\.code\|\|''\)/);
 assert.match(builder,/error\?\.code==='image_input_flagged'/);
 assert.match(builder,/remove-source/);
 assert.match(builder,/remove-design/);
 assert.match(builder,/Edit description or photo/);
 assert.match(builder,/showFile\(null,kind\)/);
 assert.match(css,/\.pi-upload-slot/);
 assert.match(css,/\[hidden\]\{display:none!important\}/);
 const html=source('index.html');
 assert.match(html,/phi-image-builder\.js\?v=20261008-flag-recovery1/);
 assert.match(html,/phi-visual-render\.js\?v=20261008-flag-recovery1/);
});
