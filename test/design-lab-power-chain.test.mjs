import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LANES,ALL_TARGETS,planChain,inferCircuit,chainBrokerUrl,safeChainResult,runPowerChain} from '../design-lab/power-chain-core.mjs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('four evidence lanes create 40 unique allowlisted public domains',()=>{
 assert.deepEqual(LANES.map(x=>x.id),['collect','research','shop','signal']);
 assert.equal(ALL_TARGETS.length,40);
 assert.equal(new Set(ALL_TARGETS).size,40);
 assert.equal(ALL_TARGETS.every(x=>/^[a-z0-9.-]+$/.test(x)),true);
});
test('intent is explainable and overridable rather than an invented AI permission',()=>{
 assert.deepEqual(inferCircuit('Buy 1881 Morgan dollar coin today').lanes,['collect','shop','signal']);
 assert.deepEqual(inferCircuit('physics research in archives').lanes,['research']);
 assert.deepEqual(inferCircuit('howdy').lanes,['research']); // how -> research
 assert.deepEqual(inferCircuit('zzzzz').lanes,['collect','research']);
 assert.match(inferCircuit('silver dollar').reason,/Collector/);
});
test('plan bounds work; unsupported lanes, empty intent and forged targets are rejected',()=>{
 const p=planChain({query:'1861 Morgan dollars',lanes:['collect','research','shop','signal'],limit:1000});
 assert.equal(p.targets.length,40);assert.equal(p.directWebsiteHits,0);assert.equal(p.execution,'public-web-index');
 assert.equal(planChain({query:'antique coin',lanes:['collect'],limit:10}).targets.length,10);
 assert.throws(()=>planChain({query:'a',lanes:['collect']}),/at least three/);
 assert.throws(()=>planChain({query:'collect coin',lanes:['not-real']}),/at least one/);
 assert.equal(planChain({query:'coin',lanes:['collect','collect'],limit:1}).targets.length,1);
});
test('one public-index request per source and no cookies or 40 external tabs',()=>{
 const p=planChain({query:'test vintage radio',lanes:['collect'],limit:2});
 const a=new URL(chainBrokerUrl(p.targets[0],p.query));
 assert.equal(a.origin,'https://orange-brook-a2ac.marvaseater.workers.dev');
 assert.equal(a.searchParams.get('q'),'site:ebay.com test vintage radio');
 assert.equal(a.searchParams.get('safesearch'),'1');
 assert.throws(()=>chainBrokerUrl('malicious.example','test'),/not in approved/);
});
test('source URL validation rejects lookalikes and unsafe schemes',()=>{
 const good=safeChainResult('ebay.com',{title:'Vintage radio auction',url:'https://www.ebay.com/itm/1412',content:'From web index'});
 assert.equal(good.target,'ebay.com');
 for(const url of ['https://www.ebay.com.evil.test/itm/12','http://ebay.com/itm/12','https://u:p@ebay.com/itm/12','https://ebay.com:333/itm/12','javascript:alert(1)','https://en.wikipedia.org/wiki/Radio']){
  assert.equal(safeChainResult('ebay.com',{title:'fake',url}),null,url);
 }
 assert.equal(safeChainResult('evil.test',{title:'not allowed',url:'https://evil.test'}),null);
});
test('concurrent chain returns only matching real-source URLs with precise receipts',async()=>{
 const plan=planChain({query:'vintage radio',lanes:['collect'],limit:3});
 const steps=[],calls=[];
 let active=0,maxActive=0;
 const data=await runPowerChain(plan,{fetcher:async(u,opt)=>{
  active++;maxActive=Math.max(maxActive,active);calls.push({u,opt});
  await Promise.resolve();
  const host=new URL(u).searchParams.get('q').split(' ')[0].slice(5);
  active--;
  return {ok:true,json:async()=>({results:[
   {title:'Real indexed source result',url:'https://www.'+host+'/page/ok',content:'Traceable source content'},
   {title:'Not permitted',url:'https://example.invalid/page/ok'}
  ]})};
 },onStep:(step,counts)=>steps.push([step,counts]),concurrency:2});
 assert.equal(maxActive<=2,true);
 assert.equal(calls.length,3);assert.equal(steps.length,3);
 assert.equal(data.checked,3);assert.equal(data.found,3);assert.equal(data.matchedSources,3);assert.equal(data.failed,0);
 assert.equal(data.stopped,false);assert.equal(data.results.every(x=>x.url.startsWith('https://')),true);
 assert.equal(calls.every(x=>x.opt.credentials==='omit'&&x.opt.cache==='no-store'),true);
 assert.equal(calls.every(x=>new URL(x.u).host==='orange-brook-a2ac.marvaseater.workers.dev'),true);
});
test('abort halts queued work and does not claim all 40 were checked',async()=>{
 const plan=planChain({query:'archived physics',lanes:['research'],limit:10});
 const abort=new AbortController();let calls=0;
 const receipt=await runPowerChain(plan,{signal:abort.signal,concurrency:1,fetcher:async()=>{calls++;abort.abort();throw Error('cancelled');}});
 assert.equal(calls,1);assert.equal(receipt.checked,1);assert.equal(receipt.stopped,true);assert.equal(receipt.targets,10);
});
test('website and Oracle card both wire up true Power buttons and preserve existing home',()=>{
 const html=file('design-lab/index.html'),app=file('design-lab/app.mjs'),mini=file('design-lab/quick-card.mjs'),home=file('index.html');
 assert.match(html,/id="heroPower"/);assert.match(html,/id="runPower"/);assert.match(html,/id="stopPower"/);
 assert.match(app,/runPowerChain\(plan/);assert.match(app,/navigator\.clipboard\.writeText/);assert.match(app,/\.abort\(\)/);
 assert.match(mini,/runPowerChain\(plan/);assert.match(mini,/mountCardActions/);assert.match(mini,/data-source-id/); // via dataset sourceId
 assert.match(home,/design-lab\/quick-card\.mjs/);assert.match(home,/design-lab\/index\.html/);
 assert.match(file('design-lab/lab.css'),/perspective:1050px/);
 assert.doesNotMatch(html,/fake live|pretend success/i);
});
