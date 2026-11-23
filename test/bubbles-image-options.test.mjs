import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker,{analyzePhoto} from '../workers/bubbles-tools/worker.mjs';

const source=path=>fs.readFileSync(path,'utf8');
const ui=source('bubbles-ai.js');
const panel=source('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/FloatingOracleWindow.java');
const service=source('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/BubblesService.java');
const activity=source('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/MainActivity.java');
const req=()=>new Request('https://bubbles-tools.marvaseater.workers.dev/v1/assist',{headers:{Origin:'https://quantaphi.org'}});

test('media composer permits sixteen images, twenty videos and uncapped text entry',()=>{
 assert.match(ui,/photoInput\.accept='image\/jpeg,image\/png,image\/webp,video\/mp4,video\/webm,video\/quicktime'/);
 const composer=ui.slice(ui.indexOf("const input=create('textarea','ba-field')"),ui.indexOf("const actions=create('div','ba-actions')"));
 assert.doesNotMatch(composer,/maxLength|maxlength/);
 assert.doesNotMatch(ui,/files\.length\+pendingImages\.length>4/);
});

test('vision keeps the complete long user question and rejects oversize requests without inference',async()=>{
 const image='data:image/jpeg;base64,'+'A'.repeat(200);
 const question='Describe these details. '+'x'.repeat(9000)+' END-OF-QUESTION';
 let calls=0;
 const env={AI:{run:async(_model,args)=>{calls++;assert.equal(args.messages[1].content[0].text,question);return {response:'Visible test details'};}}};
 assert.equal((await analyzePhoto(req(),env,{request:question,image})).status,200);
 assert.equal((await analyzePhoto(req(),env,{request:'x'.repeat(32001),image})).status,413);
 assert.equal(calls,1);
});

test('long escaped text reaches the model exactly once without JSON-body duplication or truncation',async()=>{
 const question='Summarize the supplied passage.\n'+'line\\n\n'.repeat(4300)+'END-OF-PASSAGE';
 let calls=0;
 const env={AI:{run:async(_model,args)=>{
  calls++;
  assert.equal(args.messages.at(-1).content,question);
  return {response:'The passage contains repeated lines.'};
 }}};
 const request=text=>new Request('https://bubbles-tools.marvaseater.workers.dev/v1/assist',{
  method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},
  body:JSON.stringify({request:text,mcp:false})
 });
 const response=await worker.fetch(request(question),env);
 assert.equal(response.status,200);
 assert.equal(calls,1);
 assert.equal((await worker.fetch(request('x'.repeat(32001)),env)).status,413);
 assert.equal(calls,1);
});

test('same website composer accepts an opt-in image, no second Android transcript, and makes options tappable',()=>{
 assert.match(ui,/photoInput\.type='file'/);
 assert.match(ui,/photoInput\.accept='image\/jpeg,image\/png,image\/webp,video\/mp4/);
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
  assert.equal(model,'@cf/google/gemma-4-26b-a4b-it');
  assert.equal(args.image,undefined);
  assert.equal(args.messages[1].content[1].image_url.url,image);
  assert.equal(args.chat_template_kwargs.enable_thinking,false);
  assert.ok(args.max_completion_tokens>=800);
  assert.match(args.messages[0].content,/untrusted data/);
  return {choices:[{message:{content:'A yellow flower appears in this image.'}}]};
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
