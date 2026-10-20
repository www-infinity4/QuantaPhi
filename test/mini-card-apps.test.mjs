import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {cards} from '../bubbles-card-catalog.mjs';
const context={window:{}};vm.runInNewContext(fs.readFileSync('apps/config.js','utf8'),context);
const apps=Array.from(context.window.INFINITY_APPS);
test('each registered Chrome app has one valid install manifest and unique identity',()=>{
 assert.equal(new Set(apps.map(a=>a.slug)).size,apps.length);
 assert.ok(apps.length>=16);
 for(const app of apps){
  const file='apps/manifests/'+app.slug+'.json';
  assert.ok(fs.existsSync(file),file+' missing');
  const m=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(m.start_url,'/apps/launch.html?app='+app.slug);
  assert.equal(m.scope,'/apps/');
  assert.equal(m.display,'standalone');
  for(const icon of m.icons)assert.ok(fs.existsSync(icon.src.replace(/^\//,'')),icon.src+' missing');
 }
});
test('first minimalist apps open actual card host rather than entire QuantaPhi homepage',()=>{
 const expected={
  'reads-realms':'reads-realms','media-star':'media-star','story-writer':'story-writer',
  'image-generator':'image-builder','physics-cards':'concepts','tv-channels':'channels'
 };
 for(const [slug,id] of Object.entries(expected)){
  const app=apps.find(a=>a.slug===slug);assert.equal(app?.card,id,slug);
  assert.ok(cards.some(c=>c.id===id&&c.mount),'registered mount missing: '+id);
 }
 const reader=apps.find(a=>a.slug==='reads-realms');assert.equal(reader.name,'Readers Realm');
 assert.match(apps.find(a=>a.slug==='bitcoin-crusher').miniUrl,/embed=quanta/);
 const launcher=fs.readFileSync('apps/launch.js','utf8');
 assert.match(launcher,/bubbles-card-host\.html\?card=/);
 assert.match(launcher,/BubblesCardDiagnostics/);
 assert.match(launcher,/data\.outcome|result\?\.outcome/);
 assert.doesNotMatch(launcher,/QuantaStarCredit|mintWallet|STARCOIN_PAY/);
});
test('TV mini player loads program sources before real channel rendering',()=>{
 const tv=cards.find(c=>c.id==='channels');
 assert.equal(tv.scripts[0],'phi-tv-programs.js');
 assert.equal(tv.scripts[1],'phi-channel-cards.js');
 const source=fs.readFileSync('phi-channel-cards.js','utf8');
 for(const label of ['StarQuest','Omni TV','Chiller','ShopLC'])assert.match(source,new RegExp(label));
 assert.match(source,/recordProductionAfterPlayback/);
 assert.match(source,/contributor credits require evidence and funding/);
});
test('Test Ground AI is installable but cannot grant itself a GitHub or Cloudflare owner session',()=>{
 const app=apps.find(a=>a.slug==='test-ground-ai');
 assert.equal(app.url,'/test-ground-ai/');
 const src=fs.readFileSync('test-ground-ai/ui.mjs','utf8');
 assert.doesNotMatch(src,/Authorization:\s*['"`]|CLOUDFLARE_API_TOKEN|GITHUB_TOKEN/);
});
