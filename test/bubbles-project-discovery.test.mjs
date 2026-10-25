import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverProject,discoveryTerms,sourceQueryFor,cardWorkTargetFor,recordProjectView,relevantProjectViews,hasActionDraft} from '../bubbles-project-discovery.mjs';
import {hasModelToolLeak} from '../workers/bubbles-tools/worker.mjs';
const catalog=['www-infinity4/QuantaPhi','www-infinity4/ShopLC'];
const hit={repository:catalog[0],path:'walmart-card.mjs',excerpt:'Walmart products'};
const search={ok:true,status:'code_search_results',results:[hit]};
const repo={ok:true,headSha:'b'.repeat(40)};
const file={ok:true,sha:'a'.repeat(40),content:'Walmart product catalog'};
test('Walmart request searches owner source then reads the observed file before selecting',async()=>{
 const calls=[];const found=await discoverProject({request:'Fix the Walmart card',catalog,invoke:async cmd=>{calls.push(cmd);return cmd.action==='search_github_code'?search:cmd.action==='read_repository'?repo:file}});
 assert.deepEqual(calls.map(x=>x.action),['search_github_code','read_repository','read_file']);
 assert.equal(calls[0].query,'walmart');assert.equal(calls[0].scope,'owner');
 assert.equal(found.repository,catalog[0]);assert.equal(found.path,hit.path);assert.equal(found.writeAuthorized,false);
});
test('Gary Cardone Church of I AM resolves the real card source across repository matches',async()=>{
 const owned=['www-infinity4/QuantaPhi','www-infinity4/WidgetPhi'];
 const seen=[];
 const hits=[
  {repository:owned[1],path:'browser/widgetphi-cardone.js',excerpt:'Cardone Capital quick card'},
  {repository:owned[0],path:'church-iam-card.js',excerpt:'Church of I AM Gary Cardone original Sunday promotion'}
 ];
 const source=await discoverProject({request:'Fix the Gary Cardone Church of I AM card',catalog:owned,
  invoke:async operation=>{
   seen.push(operation);
   if(operation.action==='search_github_code')return {ok:true,status:'code_search_results',results:hits};
   if(operation.action==='read_repository')return {ok:true,headSha:'b'.repeat(40)};
   if(operation.action==='read_file')return {ok:true,sha:'a'.repeat(40),content:'Church of I AM Gary Cardone official Sunday promotion'};
   throw Error('unexpected action');
  }});
 assert.equal(seen[0].scope,'owner');
 assert.equal(source.repository,owned[0]);
 assert.equal(source.path,'church-iam-card.js');
 assert.equal(source.card,'church-of-i-am');
 assert.equal(source.writeAuthorized,false);
});
test('a natural follow-up reuses the card named in recent owner conversation',()=>{
 const history=[{role:'user',text:'The Gary Cardone Church of I AM card needs attention.'},
 {role:'assistant',text:'I will inspect the source.'}];
 assert.match(sourceQueryFor('Fix that card',history),/Church of I AM/);
 assert.equal(sourceQueryFor('Fix the Walmart card',history),'Fix the Walmart card');
});
test('ordinary repair instructions find the right card, not a repository picker',()=>{
 const gary=cardWorkTargetFor('Fix the Gary Cardone Sunday promotion');
 assert.equal(gary?.id,'church-of-i-am');
 assert.equal(gary?.repository,'www-infinity4/QuantaPhi');
 assert.equal(cardWorkTargetFor('Please repair Gary Cardone'),gary);
 assert.equal(cardWorkTargetFor('Repair Cardone Capital')?.id,'cardone-capital');
 const history=[{role:'user',text:'We need to fix the Gary Cardone Church of I AM card'}];
 assert.equal(cardWorkTargetFor('Fix that card',history)?.id,'church-of-i-am');
 for(const q of ['What is Church of I AM?','Do not fix Gary Cardone','Explain Cardone Capital']){
  assert.equal(cardWorkTargetFor(q),null,q);
 }
});
test('chat dispatcher treats recognized card work as a direct owner engineering task',()=>{
 const {readFileSync}=require('node:fs');
 const ui=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 assert.match(ui,/const namedCardWork=projectContextModule\?\.cardWorkTargetFor/);
 assert.match(ui,/const codeTask=Boolean\(namedCardWork\)/);
});
test('missing source and genuinely ambiguous matches never silently select a repository',async()=>{
 for(const result of [{...search,results:[hit,{...hit,repository:catalog[1]}]}, {...search,results:[{...hit,repository:'attacker/project'}]}]){
  assert.equal(await discoverProject({request:'Fix Walmart card',catalog,invoke:async()=>result}),null);
 }
 assert.equal(await discoverProject({request:'Fix Walmart card',catalog,invoke:async c=>c.action==='search_github_code'?search:c.action==='read_repository'?repo:{ok:false}}),null);
});
test('a stale search excerpt cannot substitute for a real source read',async()=>{
 assert.equal(await discoverProject({request:'Fix Walmart card',catalog,invoke:async c=>c.action==='search_github_code'?search:c.action==='read_repository'?repo:{...file,content:'Unrelated radio controls'}}),null);
});
test('recent first-party card evidence is bounded, strips query secrets and expires',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 recordProjectView({title:'Walmart',cardId:'walmart-shopping',url:'https://quantaphi.org/?token=private#card'},storage,1000);
 recordProjectView({title:'Other',cardId:'external',url:'https://attacker.test/'},storage,1001);
 const rows=relevantProjectViews('Fix Walmart card',storage,1200);
 assert.equal(rows.length,1);assert.equal(rows[0].url,'https://quantaphi.org/');assert.ok(!JSON.stringify(rows).includes('private'));
 assert.equal(relevantProjectViews('Fix Walmart',storage,1900000).length,0);
 assert.equal(relevantProjectViews('Fix radio player',storage,1200).length,0);
});
test('pasted read_repo/search action envelopes are rejected as replies without being executed',()=>{
 const leaked='{"action":"read_repo","parameters":{"owner":"www-infinity4","repo":"QuantaPhi","path":"cards","depth":2}}\nStatus pending';
 assert.equal(hasActionDraft(leaked),true);assert.equal(hasModelToolLeak(leaked),true);
 assert.equal(hasModelToolLeak('{"action":"search","parameters":{"query":"Walmart","top_n":10}}'),true);
 assert.equal(hasActionDraft('I found the Walmart card and read its source.'),false);
});
