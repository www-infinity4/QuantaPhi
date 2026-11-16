const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('bubbles-ai.js','utf8');
function setup(fetcher){
 const scope={embedded:false,ownerReady:true,ownerHeaders:{Authorization:'Bearer fixture'},activeThread:'thread-a',BRAIN:'https://brain.test',bubblesFetch:fetcher};
 vm.createContext(scope);
 vm.runInContext(source.slice(source.indexOf('async function currentOwnerContext('),source.indexOf('async function sharedVoice(')),scope);
 return scope;
}
test('current query gets its own bounded request while background synchronization is busy',async()=>{
 const scope=setup(async(url,options,timeout)=>{
  assert.equal(timeout,1300);assert.equal(options.headers.Authorization,'Bearer fixture');
  const body=JSON.parse(options.body);assert.equal(body.query,'recording');assert.equal(body.sessionId,'thread-a');assert.deepEqual(body.messages,[]);
  return Response.json({ok:true,related:[{text:'recording memory'}],userInstructions:[],capabilities:[]});
 });
 scope.memoryBusy=true;scope.memoryContext=[{text:'unrelated weather'}];
 const result=await scope.currentOwnerContext('recording');
 assert.equal(result.state,'retrieved');assert.equal(result.related[0].text,'recording memory');
 assert.equal(scope.memoryContext[0].text,'unrelated weather');
});
test('unavailable retrieval never falls back to a previous question',async()=>{
 const scope=setup(async()=>{throw Error('timeout')});scope.memoryContext=[{text:'stale'}];
 const result=await scope.currentOwnerContext('new query');assert.equal(result.state,'unavailable');assert.equal(result.related.length,0);
});
test('out-of-order queries each return their own context without shared-state writes',async()=>{
 let release;
 const scope=setup(async(url,options)=>{
  const q=JSON.parse(options.body).query;if(q==='old')await new Promise(r=>release=r);
  return Response.json({ok:true,related:[{text:q}]});
 });
 const old=scope.currentOwnerContext('old');const fresh=await scope.currentOwnerContext('new');release();
 assert.equal(fresh.related[0].text,'new');assert.equal((await old).related[0].text,'old');
});
test('owner or thread changes discard an in-flight private response',async()=>{
 let release;const scope=setup(async()=>{await new Promise(r=>release=r);return Response.json({ok:true,related:[{text:'private'}]});});
 const pending=scope.currentOwnerContext('query');scope.activeThread='thread-b';release();
 assert.equal((await pending).related.length,0);
});
test('missing owner verification cannot make a private request',async()=>{
 const scope=setup(async()=>{throw Error('must not call')});scope.ownerReady=false;
 assert.equal((await scope.currentOwnerContext('query')).state,'unavailable');
});
