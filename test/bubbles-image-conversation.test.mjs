import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import brainTools from '../bubbles-brain-actions.js';
const ui=fs.readFileSync('bubbles-ai.js','utf8');
const branch=ui.slice(ui.indexOf(' // Image findings are evidence only;'),ui.indexOf('\n if(!spoken)return;',ui.indexOf(' // Image findings are evidence only;')));
async function exercise({spoken='',embedded=false,failAt=0,switchThread=false,count=2,longVision=false}={}){
 const calls=[],messages=[],displayed=[];
 const names=['first','second','third','fourth'],data=['image-one','image-two','image-three','image-four'];
 const images=names.slice(0,count).map((name,i)=>({name:name+'.png',data:data[i]}));
 const ctx={spoken,embedded,brainTools,pendingImage:images[0],pendingImages:images,fromVoice:false,activeThread:'owner-thread',busy:false,send:{},status:{},photoInput:{},photoPreview:{},nativeSpeechPending:false,keepChat:true,messages,AI:'https://tools.example/v1/assist',
 display:(...x)=>displayed.push(x),extract:r=>r.output,persistChat:()=>{},clearSentComposer:()=>{},
 bubblesFetch:async(_url,args)=>{const body=JSON.parse(args.body);calls.push(body);if(switchThread)ctx.activeThread='other-thread';return {ok:calls.length!==failAt,json:async()=>({ok:calls.length!==failAt,output:'Observed '+body.image+(longVision?' details'.repeat(1500):''),error:'synthetic_failure'})};}};
 vm.createContext(ctx);
 const result=await vm.runInContext('(async()=>{'+branch+';return {continued:true,evidence:imageWorkEvidence,request:spoken};})()',ctx);
 return {ctx,calls,messages,displayed,result};
}
test('two images each reach vision and share a single indexed conversation record',async()=>{
 const r=await exercise({spoken:'What are these?'});
 assert.deepEqual(r.calls.map(x=>x.image),['image-one','image-two']);
 assert.equal(r.messages.length,2);
 assert.match(r.messages[0].text,/first.png \| second.png/);
 assert.match(r.messages[1].text,/Image 1.*Observed image-one/);
 assert.match(r.messages[1].text,/Image 2.*Observed image-two/);
 assert.equal(r.ctx.pendingImage,null);
 assert.equal(r.result,undefined);
 assert.doesNotMatch(JSON.stringify(r.messages),/data:image/);
});
test('fix plus images continues to existing owner dispatcher with observations separated from command',async()=>{
 const r=await exercise({spoken:'Fix it'});
 assert.equal(r.result.continued,true);
 assert.equal(brainTools.classify(r.result.request),'queue');
 assert.match(r.result.evidence,/Observed image-one/);
 assert.doesNotMatch(r.result.request,/Observed image-one/);
 assert.equal(r.ctx.busy,false);
});
test('read-only embeds never continue to owner writes',async()=>{
 const r=await exercise({spoken:'Fix it',embedded:true});
 assert.equal(r.result,undefined);
});
test('partial vision failure retains entire batch and does not dispatch a repair',async()=>{
 const r=await exercise({spoken:'Fix it',failAt:2});
 assert.equal(r.result,undefined);
 assert.equal(r.messages.length,0);
 assert.equal(r.ctx.pendingImages.length,2);
 assert.match(r.ctx.status.textContent,/synthetic_failure/);
});
test('thread switch never stores image observations in another conversation',async()=>{
 const r=await exercise({spoken:'Fix it',switchThread:true});
 assert.equal(r.result,undefined);
 assert.equal(r.messages.length,0);
 assert.match(r.ctx.status.textContent,/Conversation changed/);
});

test('long vision findings retain every attached image within the saved and delegated evidence limit',async()=>{
 const r=await exercise({spoken:'Fix it',count:4,longVision:true});
 assert.equal(r.calls.length,4);assert.equal(r.result.continued,true);
 assert.ok(r.result.evidence.length<=5000);
 for(const [i,name] of ['first','second','third','fourth'].entries()){
  assert.ok(r.messages[1].text.includes('Image '+(i+1)+' ('+name+'.png)'));
 }
 assert.match(r.result.evidence,/Observed image-four/);
 assert.match(r.messages[1].text,/observation shortened/);
 assert.equal(r.messages[1].text,r.result.evidence);
});
