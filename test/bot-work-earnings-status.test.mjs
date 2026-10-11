import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
const from=code.indexOf(' async settleWork(){'),to=code.indexOf(' async earningsStatus(){');
assert.ok(from>0&&to>from);
const isolated='class FakeBrain { constructor(storage){this.ctx={storage};this.calls=[]}'+code.slice(from,to)+' async payWork(q){this.calls.push(q.id);if(q.id===\"job-quant:bad1\")throw Error(\"temporary remote failure\");return {status:\"paid\",asset:\"QUANT\"}} }; globalThis.FakeBrain=FakeBrain';
function rig(){
 const data=new Map(),stored=[];
 const sha='a'.repeat(40),index=['bad1','ok2','ok3','ok4'].map(id=>({id:'job-quant:'+id}));
 data.set('job-quant-index',index);
 for(const item of index)data.set(item.id,{id:item.id,attempts:[{status:'committed_unverified',testsPassed:true,commitSha:sha}]});
 const storage={get:async key=>data.get(key),put:async(key,val)=>{data.set(key,val);stored.push(key)},delete:async key=>data.delete(key)};
 const scope={Date,Error};vm.createContext(scope);vm.runInContext(isolated,scope);
 return {brain:new scope.FakeBrain(storage),data,stored};
}
test('failed payout cannot consume all three batch slots forever',async()=>{
 const {brain,data}=rig();const result=await brain.settleWork();
 assert.equal(result.length,3);
 assert.deepEqual(brain.calls,['job-quant:bad1','job-quant:ok2','job-quant:ok3']);
 assert.equal(result[0].status,'pending');
 assert.equal(result[1].status,'paid');
 assert.equal(data.get('earnings-retry:job-quant:bad1').error,'temporary remote failure');
 const second=await brain.settleWork();
 assert.ok(!brain.calls.slice(3).includes('job-quant:bad1'));
 assert.ok(second.some(p=>p.quantId==='job-quant:ok4'));
});
test('earnings status route stays owner-gated and job status is not public',()=>{
 assert.match(code,/path==='\/work\/earnings\/status'/);
 const auth=code.indexOf("const token=request.headers.get('Authorization')",code.indexOf("if(request.method!=='GET' ||!"));
 const forwards=code.indexOf("path==='/work/earnings/status'?'earnings-status'");
 assert.ok(auth>0&&forwards>auth,'check owner authentication before forwarding status to durable object');
 assert.match(code,/async earningsStatus\(\)/);
});
