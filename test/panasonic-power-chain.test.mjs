import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
