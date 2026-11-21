import test from 'node:test';
import assert from 'node:assert/strict';
import reader,{parsePublicProfile,scanPublicX,normalizeStarCraftObservation} from '../workers/bubbles-public-x/worker.mjs';

const article=(account,id,body)=>'<div role="link" data-href="/'+account+'/status/'+id+'"><article><a href="/'+account+'">'+account+'</a><div class="whitespace-pre-wrap" dir="auto">'+body+'</div></article></div>';

test('StarCraftCo is registered as a strict public reference source, never the owner source',()=>{
 const id='2123456789012345678';
 const html=article('StarCraftCo',id,'White reads Red and Blue data');
 assert.deepEqual(parsePublicProfile(html),[]);
 const posts=parsePublicProfile(html,'StarCraftCo');
 assert.equal(posts.length,1);
 assert.equal(posts[0].url,'https://x.com/StarCraftCo/status/'+id);
 assert.deepEqual(parsePublicProfile(article('OtherAccount',id,'Spoofed'),'StarCraftCo'),[]);
 assert.deepEqual(parsePublicProfile(html.replace('href="/StarCraftCo"','href="/OtherAccount"'),'StarCraftCo'),[]);
});

test('StarCraftCo context selection cannot promote posts into owner work inbox',async()=>{
 const queries=[];
 const env={DB:{prepare(sql){queries.push(sql);return {bind(){return this},async all(){return {results:[]}},async first(){return null}}}}};
 const context=await (await reader.fetch(new Request('https://quantaphi.org/api/bubbles/public-x/context?account=StarCraftCo'),env)).json();
 assert.equal(context.author,'StarCraftCo');
 assert.equal(context.authority,'reference_only');
 assert.match(queries.at(-1),/https:\/\/x\.com\/StarCraftCo\/status/);
 const inbox=await (await reader.fetch(new Request('https://quantaphi.org/api/bubbles/public-x/inbox'),env)).json();
 assert.equal(inbox.author,'YahooPingcwlz');
 assert.match(queries.at(-1),/https:\/\/x\.com\/YahooPingcwlz\/status/);
 const invalid=await reader.fetch(new Request('https://quantaphi.org/api/bubbles/public-x/context?account=SomebodyElse'),env);
 assert.equal(invalid.status,400);
});

test('StarCraftCo public scan records an independent source key and no owner candidate permissions',async()=>{
 const id='2123456789012345678',writes=[],visits=[];
 const env={
  BROWSER:{async quickAction(_op,options){visits.push(options.url);return new Response(article('StarCraftCo',id,'#bubbles build Bubbles color White'));}},
  DB:{prepare(sql){return {bind(...args){writes.push({sql,args});return {async run(){return {meta:{changes:1}}}}}}}}
 };
 const receipt=await scanPublicX(env,'StarCraftCo');
 assert.equal(receipt.authority,'reference_only');
 assert.equal(receipt.newPossibleRequests,0);
 assert.deepEqual(visits,['https://x.com/StarCraftCo']);
 assert.equal(writes.find(x=>x.sql.includes('owner_x_scans')).args[0],'StarCraftCo');
});

test('StarCraftCo scheduled context runs twice daily, isolated from owner and Integra',async()=>{
 const accountByHour=[];
 const env={
  BROWSER:{async quickAction(_op,opts){const account=opts.url.split('/').at(-1);accountByHour.push(account);return new Response(article(account,'2123456789012345678','Source read'));}},
  DB:{prepare(){return {bind(){return {async run(){return {meta:{changes:1}}}}}}}}
 };
 for(const hour of [0,2,6,12,14,18]){
  let pending;
  await reader.scheduled({scheduledTime:Date.parse('2026-11-19T'+String(hour).padStart(2,'0')+':17:00Z')},env,{waitUntil(p){pending=p}});
  await pending;
 }
 assert.equal(accountByHour.filter(x=>x==='YahooPingcwlz').length,6);
 assert.equal(accountByHour.filter(x=>x==='IntegraAI').length,4);
 assert.equal(accountByHour.filter(x=>x==='StarCraftCo').length,2);
});

test('health lists StarCraftCo as a read-only account with separately tracked status',async()=>{
 const env={DB:{prepare(sql){return {bind(){return this},async first(){return {status:'not_run'}}}}}};
 const health=await (await reader.fetch(new Request('https://quantaphi.org/api/bubbles/public-x/health'),env)).json();
 const source=health.sources.find(item=>item.account==='StarCraftCo');
 assert.equal(source.authority,'reference_only');
 assert.equal(source.readStatus.status,'not_run');
});

test('Bubbles X Quick Card displays StarCraftCo source status without an owner badge',async()=>{
 const {readFile}=await import('node:fs/promises');
 const page=await readFile(new URL('../bubbles-x-connect.html',import.meta.url),'utf8');
 const script=await readFile(new URL('../bubbles-public-x-status.js',import.meta.url),'utf8');
 assert.match(page,/id="bubblesPublicXStarCraftStatus"/);
 assert.match(page,/context\?account=StarCraftCo/);
 assert.match(page,/read-only context/);
 assert.match(script,/item\.account==='StarCraftCo'/);
 assert.match(script,/scan not yet verified/);
 assert.doesNotMatch(script,/innerHTML/);
});


test('X Quick Card presents screenshot-provenance archive even when live X context is empty',async()=>{
 const {readFile}=await import('node:fs/promises');
 const page=await readFile(new URL('../bubbles-x-connect.html',import.meta.url),'utf8');
 assert.match(page,/id="starCraftScreenshotArchive"/);
 assert.match(page,/Owner-supplied screenshot evidence/);
 assert.match(page,/White coordination/);
 assert.match(page,/Pink assimilation/);
 assert.match(page,/Red source fanout/);
 assert.match(page,/eBay and analytics example/);
 assert.match(page,/HypeStat composer draft/);
 assert.match(page,/STARCRAFTCO-X-20261119\.md/);
 assert.match(page,/not a live X import/i);
 assert.doesNotMatch(page,/x\.com\/StarCraftCo\/status\/\d+/,'no invented canonical post IDs');
});


test('TinyFish observation normalization rejects forged author, mismatched ID and non-public URLs',()=>{
 const good={account:'StarCraftCo',post_id:'2123567922820035034',url:'https://x.com/StarCraftCo/status/2123567922820035034',
  summary:'QuantaPhi research link about MMT, deficits and bitcoin',audience:'general',source_method:'tinyfish_public_browser',
  source_run_url:'https://agent.tinyfish.ai/runs/3728a4bc-fc2e-41f6-a524-c5e05eb0189c',observed_at:'2026-11-20T00:00:00Z'};
 const normalized=normalizeStarCraftObservation(good);
 assert.equal(normalized.post_id,good.post_id);
 assert.equal(normalized.authority,'reference_only');
 assert.equal(normalized.fullTextVerified,false);
 assert.equal(normalized.url,good.url);
 assert.equal(normalizeStarCraftObservation({...good,account:'YahooPingcwlz'}),null);
 assert.equal(normalizeStarCraftObservation({...good,url:'https://x.com/YahooPingcwlz/status/'+good.post_id}),null);
 assert.equal(normalizeStarCraftObservation({...good,url:'https://evil.test/redirect?to='+good.url}),null);
 assert.equal(normalizeStarCraftObservation({...good,post_id:'2123567922820035033'}),null);
 assert.equal(normalizeStarCraftObservation({...good,source_run_url:'javascript:alert(1)'}),null);
 assert.equal(normalizeStarCraftObservation({...good,summary:'a'.repeat(400)}),null);
});
test('StarCraftCo context keeps external review distinct, deduped and excludes adult-labeled rows',async()=>{
 const good={account:'StarCraftCo',post_id:'2123567922820035034',url:'https://x.com/StarCraftCo/status/2123567922820035034',
  summary:'QuantaPhi research reference',audience:'general',source_method:'tinyfish_public_browser',
  source_run_url:'https://agent.tinyfish.ai/runs/3728a4bc-fc2e-41f6-a524-c5e05eb0189c',observed_at:'2026-11-20T00:00:00Z'};
 const adult={...good,post_id:'2123527176394043785',url:'https://x.com/StarCraftCo/status/2123527176394043785',summary:'Adult-labeled video',audience:'restricted'};
 const spoof={...good,account:'YahooPingcwlz'};
 const queries=[];
 const env={DB:{prepare(sql){queries.push(sql);return{bind(){return this},async first(){return null},async all(){return {results:sql.includes('starcraft_public_observations')?[good,good,adult,spoof]:[]}}}}}};
 const response=await reader.fetch(new Request('https://quantaphi.org/api/bubbles/public-x/context?account=StarCraftCo'),env);
 const data=await response.json();
 assert.equal(data.authority,'reference_only');
 assert.equal(data.items.length,0,'Cloudflare browser posts remain a separate verified field');
 assert.equal(data.observations.length,1,'one exact public reference, no duplicate or adult media');
 assert.equal(data.observations[0].post_id,good.post_id);
 assert.match(data.observationState,/external_public_browser_review/);
 assert.ok(queries.some(sql=>sql.includes('starcraft_public_observations')));
 const owner=await (await reader.fetch(new Request('https://quantaphi.org/api/bubbles/public-x/inbox'),env)).json();
 assert.equal(owner.author,'YahooPingcwlz');
 assert.equal(owner.items.length,0);
 assert.equal(owner.observations,undefined);
});
test('StarCraftCo public Quick Card renders reviewed references without inserting media',async()=>{
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(new URL('../bubbles-x-connect.html',import.meta.url),'utf8');
 const ui=await readFile(new URL('../bubbles-public-x-status.js',import.meta.url),'utf8');
 assert.match(html,/id="starCraftPublicObservations"/);
 assert.match(html,/StarCraftCo.*public references/);
 assert.match(ui,/context\?account=StarCraftCo/);
 assert.match(ui,/textContent/);
 assert.match(ui,/createElement\('a'\)/);
 assert.doesNotMatch(ui,/innerHTML/);
 assert.doesNotMatch(html,/<iframe[^>]*x\.com/i);
});
