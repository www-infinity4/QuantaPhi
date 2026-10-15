const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('bubbles-ai.js','utf8');
const start=source.indexOf("linkBubbles.addEventListener('click',async()=>{");
const end=source.indexOf("cloudToggle.addEventListener",start);
async function click({nativeOverlay=false,busy=false,hidden=false,reject=false}={}){
 let handler;const calls=[];
 const ctx={nativeOverlay,busy,linkBubbles:{disabled:false,addEventListener:(_,fn)=>handler=fn},linkStatus:{},pairingCard:{hidden},sendMessage:async(...args)=>{calls.push(args);if(reject)throw Error('offline')}};
 vm.runInNewContext(source.slice(start,end),ctx);await handler();return {ctx,calls};
}
test('website and APK connect button use actual pairing commands independent of optional wallet checkbox',async()=>{
 for(const nativeOverlay of [false,true]){const {ctx,calls}=await click({nativeOverlay});assert.equal(calls[0][0],nativeOverlay?'sync my website':'link my APK');assert.equal(calls[0][1],false);assert.equal(ctx.linkBubbles.disabled,false);assert.match(ctx.linkStatus.textContent,/code ready/);}
});
test('failed or busy pairing never reports a connected session and button remains retryable',async()=>{
 for(const options of [{hidden:true},{reject:true},{busy:true}]){const {ctx,calls}=await click(options);assert.equal(ctx.linkBubbles.disabled,false);assert.doesNotMatch(ctx.linkStatus.textContent,/code ready/);if(options.busy)assert.equal(calls.length,0);}
});
