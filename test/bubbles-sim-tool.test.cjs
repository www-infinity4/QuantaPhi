const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('bubbles-ai.js','utf8');
const block=source.slice(source.indexOf(' const simQuestion='),source.indexOf(' const screenQuestion='));
function route(spoken,nativeOverlay,nativeSimAvailable){
 const replies=[];
 const c={spoken,nativeOverlay,nativeSimAvailable,nativeScreenRequests:[],input:{value:spoken},status:{},nativeSpeechPending:true,display:v=>replies.push(v)};
 vm.runInNewContext('(()=>{'+block+'})()',c);
 return {...c,replies};
}
test('SIM request reaches Android only after its native capability handshake',()=>{
 const c=route('check my SIM',true,true);
 assert.deepEqual(c.nativeScreenRequests,['check my SIM']);
 assert.equal(c.input.value,'');assert.equal(c.nativeSpeechPending,false);
 const old=route('check my SIM',true,false);
 assert.equal(old.nativeScreenRequests.length,0);assert.match(old.status.textContent,/0.24/);
});
test('website cannot read SIM and unrelated or refused requests do not become device actions',()=>{
 const web=route('check my SIM',false,false);
 assert.equal(web.nativeScreenRequests.length,0);assert.match(web.replies[0],/website cannot read your SIM/);
 for(const text of ["don't check my SIM",'activate free internet','show all SIM secrets','check my SIM and transfer money']){
  const c=route(text,true,true);assert.equal(c.nativeScreenRequests.length,0);assert.equal(c.replies.length,0);
 }
});
