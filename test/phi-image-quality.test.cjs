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
 assert.match(source('phi-image-builder.js'),/Fix image/);
 assert.match(source('phi-image-builder.js'),/Save image/);
 assert.doesNotMatch(source('phi-image-builder.js').split('const actions=make')[1].split('done.append(actions)')[0],/Share \+|Collect|Starred|Build more like this/);
});

test('finished image reviewer is a real vision endpoint, not dimension checking',()=>{
 const worker=source('workers/infinity-rogers/worker.js');
 assert.match(worker,/async function runImageReview/);
 assert.match(worker,/url\.pathname === "\/v1\/image-review"/);
 assert.match(worker,/type:"image_url",image_url:\{url:imageUri\}/);
 assert.match(worker,/Paint only the scene, objects, photography and visual design/);
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
 assert.match(code,/attachGenerated/);
 assert.match(code,/hasStored/);
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
 assert.match(adapter,/error\.code=String\(data\.code\|\|data\.error\|\|''\)/);
 assert.match(builder,/error\?\.code==='image_input_flagged'/);
 assert.match(builder,/remove-source/);
 assert.match(builder,/remove-design/);
 assert.match(builder,/Edit description or photo/);
 assert.match(builder,/showFile\(null,kind\)/);
 assert.match(css,/\.pi-upload-slot/);
 assert.match(css,/\[hidden\]\{display:none!important\}/);
 const html=source('index.html');
 assert.match(html,/phi-image-builder\.js\?v=20261008-minimal-image2/);
 assert.match(html,/phi-visual-render\.js\?v=20261008-textclean3/);
});

test('search-generated sourced story is displayed after the overview assimilation',()=>{
 const book=source('infinite-book.js');
 const html=source('index.html');
 assert.match(book,/function placeSearchStory\(/);
 assert.match(book,/result\.insertAdjacentElement\('afterend',root\)/);
 assert.match(book,/window\.addEventListener\('quantaphi:search-start'/);
 assert.match(html,/infinite-book\.js\?v=20261008-asteroid-story3/);
 // Layout must be deterministic before scripts run: no flash of the story above the overview.
 assert.ok(html.indexOf('id="result"') < html.indexOf('id="infiniteBook"'),'Overview must precede story card in the HTML');
 assert.ok(html.indexOf('id="infiniteBook"') < html.indexOf('id="phiImageBuilder"'),'Story and illustration come before the image builder');
 assert.match(book,/lastSearchQuery=query/,'search events must refresh the story even while the catalog initializes');
 assert.match(book,/if \(ready && \(!query \|\| current\?\.id !== ready\.id\)\) return/,'verified search-specific story may replace the prepared discovery');
});

test('completed story images automatically attach and update is not a redundant save',()=>{
 const bridge=source('phi-book-image-bridge.js');
 assert.match(bridge,/phi:image:build:done/);
 assert.match(bridge,/if\(finishedStory\?\.id\)void attach\(true\)/);
 assert.match(bridge,/attachGenerated/);
 assert.match(bridge,/visibleIllustration\?\.artifactId===data\?\.artifact\?\.id/);
 assert.match(bridge,/\[data-pi-action="fix"\]/);
 assert.match(bridge,/storeName='stories'/);
 assert.match(source('index.html'),/phi-book-image-bridge\.js\?v=20261008-asteroid-art2/);
 assert.match(bridge,/\['remove','Clear image'\]/,'reader can clear a stored story illustration');
 assert.match(source('phi-image-builder.js'),/\['clear','Clear image'\]/,'builder can clear finished pixels independently');
 assert.match(source('phi-image-builder.js'),/if\(action==='clear'\)/,'clear has a real click handler');
 assert.match(source('phi-image-builder.css'),/Electric purple reader/,'review card uses electric-purple palette');
});

test('one bounded automatic repair is scored against the original image',()=>{
 const builder=source('phi-image-builder.js');
 const worker=source('workers/infinity-rogers/worker.js');
 assert.match(builder,/let review=null,autoRefined=false/);
 assert.match(builder,/review\.status==='needs_work'/);
 assert.match(builder,/score<75/);
 assert.match(builder,/nextScore>firstScore/);
 assert.match(builder,/const prior=await renderer\.asBlob\(rawResult\)/);
 assert.match(builder,/No fake|pseudo-writing|fabricated letters|fake headlines/);
 assert.match(worker,/LETTERING CHECK/);
 assert.match(worker,/text-like textures are a high-severity issue/);
 assert.match(worker,/variants:\[renderDirection\]/);
 assert.doesNotMatch(worker,/variations of the prompt|const variants=\[/);
 assert.doesNotMatch(worker.slice(worker.indexOf(' const executionOnly='),worker.indexOf(' let lastError=null;')),/alien-language|pseudo-words|symbol rows/i);
 assert.match(worker,/Paint only the scene, objects, photography and visual design/);
 assert.match(source('index.html'),/phi-image-builder\.js\?v=20261008-minimal-image1/);
});

test('FLUX adapter sends true text-only requests and scales reference pixels, not just byte size',()=>{
 const adapter=source('phi-visual-render.js');
 const builder=source('phi-image-builder.js');
 assert.match(adapter,/async function fluxReference\(blob\)/);
 assert.match(adapter,/500\/Math\.max\(image\.width,image\.height\)/);
 assert.match(adapter,/const blob=source\?await fluxReference\(source\):null/);
 assert.match(adapter,/Typography is handled afterward in the browser/);
 assert.doesNotMatch(adapter,/Forbid fake writing, alien-language glyphs/);
 assert.match(adapter,/if\(blob\)body\.append\('image',blob,'subject-reference\.jpg'\)/);
 assert.match(adapter,/reference_mode',source\?'uploaded':design\?'style-only':'text-only'/);
 assert.doesNotMatch(adapter.slice(adapter.indexOf('async function render('),adapter.indexOf('async function validate(')),/neutralImage\(/);
 assert.match(builder,/window\.PhiImageAutoRefine===true&&review/);
 assert.match(builder,/error\?\.code==='image_daily_cap'/);
});

test('Workers image route permits text-only generation with no synthetic image and style-only indices',async()=>{
 const worker=await import('data:text/javascript;base64,'+Buffer.from(source('workers/infinity-rogers/worker.js')).toString('base64'));
 const calls=[];
 const env={
  AI:{run:async(model,args)=>{
   const form=await new Response(args.multipart.body,{headers:{'content-type':args.multipart.contentType}}).formData();
   calls.push({model,keys:[...form.keys()]});
   return {image:'ZmFrZS1pbWFnZQ=='};
  }},
  METER_DB:{prepare:()=>({bind:()=>({first:async()=>null,run:async()=>({})})})}
 };
 async function request(style=false){
  const form=new FormData();form.set('prompt','A clean drawing of a cherry tree at sunrise');form.set('mode','Image');
  form.set('reference_mode',style?'style-only':'text-only');
  if(style)form.set('design_reference',new File([new Uint8Array([255,216,255,217])],'style.jpg',{type:'image/jpeg'}));
  const response=await worker.default.fetch(new Request('https://infinity-rogers.marvaseater.workers.dev/v1/image',{
   method:'POST',headers:{origin:'https://quantaphi.org','X-Infinity-User':style?'test-style':'test-text'},body:form
  }),env,{});
  assert.equal(response.status,200);
  return response.json();
 }
 const textResult=await request(false);
 assert.equal(textResult.referenceMode,'text-only');
 assert.equal(calls[0].model,'@cf/black-forest-labs/flux-2-klein-9b');
 assert.deepEqual(calls[0].keys.includes('input_image_0'),false);
 assert.deepEqual(calls[0].keys.includes('input_image_1'),false);
 const styleResult=await request(true);
 assert.equal(styleResult.referenceMode,'style-only');
 assert.equal(calls[1].keys.includes('input_image_0'),true);
 assert.equal(calls[1].keys.includes('input_image_1'),false);
});

test('Asteroid presents GPT evidence narratives with a real reviewed image behind readable words',()=>{
 const book=source('infinite-book.js'),writer=source('infinite-book-discovery.js'),bridge=source('phi-book-image-bridge.js'),style=source('phi-electric-theme.css');
 assert.match(book,/strictGPT:true/);
 assert.match(book,/ASTEROID · ORIGINAL SOURCED STORY/);
 assert.match(book,/scheduleAutoIllustration\(story\)/);
 assert.match(book,/renderer\.render\(\{description:intention/);
 assert.match(book,/renderer\.review\(\{src:generated\.src/);
 assert.match(book,/review\?\.status==='good'/);
 assert.match(book,/bridge\.attachGenerated\(story,blob/);
 assert.match(bridge,/if\(metadata\?\.review\?\.status!=='good'/);
 assert.match(style,/ib-asteroid-rock/);
 assert.match(style,/ib-asteroid-shade/);
 assert.match(style,/ib-illustration-image/);
 assert.match(writer,/strictGPT===true/);
 assert.match(writer,/eligibleNarrative/);
 assert.doesNotMatch(book,/for \(const story of \[\.\.\.\(catalog\.stories/);
 assert.ok(book.indexOf('id="result"')===-1);
});

test('image render completion never references a removed result Star button',()=>{
 const builder=source('phi-image-builder.js');
 assert.doesNotMatch(builder,/\$\('\[data-pi-action="star"\]'\)\.textContent/);
 assert.match(builder,/\$\('\.pi-result'\)\.src=result/);
 assert.match(builder,/state\('finished'\)/);
 assert.match(builder,/emit\('build:done',artifact\)/);
 const worker=source('workers/infinity-rogers/worker.js');
 assert.match(worker,/const mime=header\.startsWith/);
 assert.match(worker,/data:"\+mime\+";base64,/);
});
test('Asteroid card remains visible while evidence and GPT writing run',()=>{
 const book=source('infinite-book.js'),css=source('phi-electric-theme.css');
 assert.match(book,/card\.dataset\.ready='false'/);
 assert.match(book,/card\.dataset\.ready='true'/);
 assert.match(book,/window\.dispatchEvent\(new CustomEvent\('phi:story:reset'\)\)/);
 assert.match(css,/\.ib-story\[data-ready="false"\]/);
 const writer=source('infinite-book-discovery.js');
 assert.match(writer,/legitimateNarrative\(story\)/);
});
