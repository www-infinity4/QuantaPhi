import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../robot-directions.js',import.meta.url),'utf8');
const segment=source.slice(source.indexOf('const earningsButton='),source.indexOf('const input=root.querySelector'));
async function run(token){
 const calls=[],elements=[],timers=[];
 const wallet={token:()=>token,refresh:async()=>{}};
 const context={root:{append(){}},brainHeaders:{Authorization:'Bearer OWNER_TEST'},document:{visibilityState:'visible',createElement(){const el={setAttribute(){},addEventListener(){}};elements.push(el);return el}},window:{QuantaCloudConnection:{ready:Promise.resolve()},InfinityCloudWallet:class{constructor(){return wallet}},dispatchEvent(){}},CustomEvent:class{},AbortSignal,setInterval:f=>{timers.push(f);return 1},clearInterval(){},fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({ok:true,username:'verified-device',payouts:[{status:'paid',asset:'QUANT'}]})}}};
 vm.runInNewContext(segment,context);
 for(let n=0;n<8;n++)await Promise.resolve();
 return {calls,elements,timers};
}
test('authenticated owner automatically connects the actual wallet token without a click',async()=>{
 const token='sq_'+ 'a'.repeat(32),r=await run(token);
 assert.equal(r.calls.length,1);
 assert.equal(JSON.parse(r.calls[0].options.body).walletToken,token);
 assert.equal(r.calls[0].options.headers.Authorization,'Bearer OWNER_TEST');
 assert.match(r.elements[1].textContent,/1 Quant/);
 r.timers[0]();await Promise.resolve();assert.equal(r.calls.length,1);
});
test('missing wallet identity cannot choose a destination or issue a credit request',async()=>{
 const r=await run('');
 assert.equal(r.calls.length,0);
 assert.match(r.elements[1].textContent,/remain saved/);
});
