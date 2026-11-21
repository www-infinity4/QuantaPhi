import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {planPanasonicSearch,verifiedPanasonicResult,searchPanasonic,PANASONIC_SOURCE} from '../design-lab/panasonic-card.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('bounded official-domain research plan with no purchasing authority',()=>{
 const p=planPanasonicSearch('Lumix camera');
 assert.equal(PANASONIC_SOURCE.official,'https://www.panasonic.com/');
 assert.equal(p.limit,8);assert.equal(p.purchaseAuthority,false);
 const u=new URL(p.brokerUrl);assert.equal(u.origin,'https://orange-brook-a2ac.marvaseater.workers.dev');
 assert.equal(u.searchParams.get('q'),'site:panasonic.com Lumix camera');
 assert.equal(u.searchParams.get('safesearch'),'1');
 assert.throws(()=>planPanasonicSearch('a'),/at least three/);
});
test('rejects forged/lookalike/insecure URLs and strips fragments',()=>{
 const good=verifiedPanasonicResult({title:'Camera',url:'https://shop.panasonic.com/us/lumix#review'});
 assert.equal(good.url,'https://shop.panasonic.com/us/lumix');
 for(const url of ['https://panasonic.com.evil.test/','http://panasonic.com/','https://panasonic.com:8443/','https://user:pass@panasonic.com/','javascript:alert(1)','https://another-brand.com/'])assert.equal(verifiedPanasonicResult({title:'Fake',url}),null,url);
 assert.equal(verifiedPanasonicResult({title:'  ',url:'https://panasonic.com/'}),null);
});
test('one credential-free public-index request, dedupe, limit and honest empty results',async()=>{
 const calls=[];const rows=[{title:'Official',url:'https://www.panasonic.com/item',content:'From source'}, {title:'Duplicate',url:'https://www.panasonic.com/item'}, {title:'Lookalike',url:'https://panasonic.com.evil.test'}];
 for(let i=0;i<12;i++)rows.push({title:'Result '+i,url:'https://www.panasonic.com/item/'+i});
 const r=await searchPanasonic('Lumix camera',{fetcher:async(u,o)=>{calls.push({u,o});return {ok:true,json:async()=>({results:rows})};}});
 assert.equal(calls.length,1);assert.equal(calls[0].o.credentials,'omit');assert.equal(calls[0].o.cache,'no-store');assert.equal(r.found,8);assert.equal(r.purchaseAuthority,false);assert.equal(r.results.every(x=>new URL(x.url).hostname.endsWith('panasonic.com')),true);
 const empty=await searchPanasonic('Lumix camera',{fetcher:async()=>({ok:true,json:async()=>({results:[]})})});assert.equal(empty.found,0);
});
test('bad public response fails closed, no invented results',async()=>{
 await assert.rejects(searchPanasonic('Lumix camera',{fetcher:async()=>({ok:false,status:503})}),/HTTP 503/);
 await assert.rejects(searchPanasonic('Lumix camera',{fetcher:async()=>({ok:true,json:async()=>({error:'unavailable'})})}),/invalid response/);
});
test('responsive real page, working controls, shared card actions and disclosure',()=>{
 const html=read('design-lab/panasonic.html'),ui=read('design-lab/panasonic-ui.mjs');
 assert.match(html,/name="viewport"/);assert.match(html,/@media\(max-width:360px\)/);
 for(const id of ['panasonicQuery','panasonicGo','panasonicStop','panasonicStatus','panasonicResults','panasonicCardActions'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(ui,/searchPanasonic\(/);assert.match(ui,/\.abort\(\)/);assert.match(ui,/mountCardActions/);
 assert.match(html,/not a Panasonic partnership/);assert.doesNotMatch(html,/Buy now|instant checkout/i);
});

test('Stop releases controls immediately; late aborted result cannot overwrite a newer search',async()=>{
 const ids=['panasonicQuery','panasonicGo','panasonicStop','panasonicStatus','panasonicResults','panasonicCardActions'];
 const element=()=>({disabled:false,textContent:'',children:[],listeners:{},addEventListener(event,handler){this.listeners[event]=handler;},replaceChildren(){this.children=[];},append(...items){this.children.push(...items);}});
 const elements=Object.fromEntries(ids.map(id=>[id,element()]));elements.panasonicQuery.value='camera';
 const pending=[];
 const document={getElementById:id=>elements[id],createElement:()=>element()};
 const searchPanasonic=(query,{signal})=>new Promise((resolve,reject)=>pending.push({query,signal,resolve,reject}));
 const ui=read('design-lab/panasonic-ui.mjs').replace(/^import .*;\n/gm,'');
 runInNewContext(ui,{document,AbortController,searchPanasonic,mountCardActions(){}});
 elements.panasonicGo.listeners.click();
 assert.equal(pending.length,1);assert.equal(elements.panasonicGo.disabled,true);
 elements.panasonicStop.listeners.click();
 assert.equal(pending[0].signal.aborted,true);assert.equal(elements.panasonicGo.disabled,false);assert.equal(elements.panasonicQuery.disabled,false);assert.match(elements.panasonicStatus.textContent,/Stopped/);
 elements.panasonicQuery.value='battery';elements.panasonicGo.listeners.click();
 assert.equal(pending.length,2);assert.equal(elements.panasonicGo.disabled,true);
 pending[0].resolve({found:1,results:[{title:'STALE',url:'https://www.panasonic.com/stale'}]});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(elements.panasonicResults.children.length,0);assert.match(elements.panasonicStatus.textContent,/Searching/);assert.equal(elements.panasonicGo.disabled,true);
 pending[1].resolve({found:1,results:[{title:'Fresh',url:'https://www.panasonic.com/fresh'}]});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(elements.panasonicResults.children.length,1);assert.equal(elements.panasonicResults.children[0].children[0].textContent,'Fresh');assert.equal(elements.panasonicGo.disabled,false);
});
