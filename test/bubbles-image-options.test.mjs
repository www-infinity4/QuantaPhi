import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {analyzePhoto} from '../workers/bubbles-tools/worker.mjs';

const source=path=>fs.readFileSync(path,'utf8');
const ui=source('bubbles-ai.js');
const panel=source('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/FloatingOracleWindow.java');
const service=source('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/BubblesService.java');
const activity=source('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/MainActivity.java');
const req=()=>new Request('https://bubbles-tools.marvaseater.workers.dev/v1/assist',{headers:{Origin:'https://quantaphi.org'}});

test('same website composer accepts an opt-in image, no second Android transcript, and makes options tappable',()=>{
 assert.match(ui,/photoInput\.type='file'/);
 assert.match(ui,/photoInput\.accept='image\/jpeg,image\/png,image\/webp'/);
 assert.match(ui,/actions\.append\(photoRow,mic,speak,send\)/);
 assert.match(ui,/composer\.append\(input,photoPreview,actions\)/);
 assert.match(ui,/chatScroll\.insertBefore\(tools,conversation\)/);
 assert.match(ui,/if\(nativeOverlay\)row\.append\(say\)/);
 assert.match(ui,/Create one-time owner code/);
 assert.match(ui,/void sharedMemory\(\)/);
 assert.match(panel,/onShowFileChooser/);
 assert.match(panel,/service\.openFilePicker\(callback, historyJson\)/);
 assert.match(service,/pendingWebsiteSpeech/);
 assert.match(service,/drainWebsiteSpeech\(\)/);
 assert.match(activity,/Intent\.ACTION_OPEN_DOCUMENT/);
 assert.match(activity,/BubblesService\.completeImagePicker/);
 assert.doesNotMatch(panel,/new EditText\(/);
});

test('Cloudflare vision receives bounded photo as evidence and produces an actual model response',async()=>{
 let calls=0;
 const image='data:image/jpeg;base64,'+'A'.repeat(200);
 const res=await analyzePhoto(req(),{AI:{run:async(model,args)=>{
  calls++;
  assert.equal(model,'@cf/meta/llama-3.2-11b-vision-instruct');
  assert.equal(args.image,image);
  assert.match(args.messages[0].content,/untrusted data/);
  return {response:'A yellow flower appears in this image.'};
 }}},{request:'Describe this flower',image});
 const output=await res.json();
 assert.equal(res.status,200);
 assert.equal(calls,1);
 assert.equal(output.receipt.stored,false);
 assert.equal(output.output,'A yellow flower appears in this image.');
});
test('Images are rejected before any provider call when malformed or oversized',async()=>{
 let count=0;const env={AI:{run:async()=>{count++;return {response:'unsupported'}}}};
 for(const bad of ['file:///etc/passwd','data:image/png;base64,AA','data:image/jpeg;base64,'+'A'.repeat(440001)]){
  const r=await analyzePhoto(req(),env,{request:'What?',image:bad});
  assert.equal(r.status,400);
 }
 assert.equal(count,0);
});
