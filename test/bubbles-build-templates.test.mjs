import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILD_TEMPLATES,findBuildTemplate,makeBuildPacket} from '../bubbles-build-templates.mjs';

const examples=[
 ['Build a database of all the restaurants in USA','restaurants-us'],
 ['Create a searchable directory of all businesses in 50 states','business-directory'],
 ['Build a database of all the baseball teams','baseball-teams'],
 ['Make a new reusable Quick Card element for the carousel','quick-card'],
 ['Add button logic for radio play and pause','radio-controls'],
 ['Reuse the site traffic counter on another page','site-traffic'],
 ['Build reusable generic button logic with click handler','button-logic']
];
test('owner wording maps to the appropriate concrete source pattern',()=>{
 for(const [request,id] of examples)assert.equal(findBuildTemplate(request)?.id,id,request);
});
test('questions, refusals, generic requests and unsupported systems do not become builds',()=>{
 for(const request of [
  'What is the baseball teams database?',
  'How does the restaurant directory work?',
  'Do not build a restaurant directory',
  'Never add radio buttons',
  'Please stop building the traffic card',
  'Show me the site traffic counter',
  'Build something cool',
  'Build a worldwide payment gateway'
 ])assert.equal(makeBuildPacket(request),null,request);
});
test('all registered patterns are unique, scoped and have acceptance gates',()=>{
 assert.equal(BUILD_TEMPLATES.length,7);
 assert.equal(new Set(BUILD_TEMPLATES.map(x=>x.id)).size,BUILD_TEMPLATES.length);
 for(const t of BUILD_TEMPLATES){
  assert.equal(t.repository,'www-infinity4/QuantaPhi');
  assert.ok(Array.isArray(t.sourcePaths)&&t.sourcePaths.length>=2,t.id);
  assert.ok(t.sourcePaths.every(p=>/^[\w./-]+$/.test(p)&&!p.includes('..')&&!p.startsWith('/')),t.id);
  assert.ok(t.data?.kind&&t.data?.status);
  assert.ok(Array.isArray(t.acceptance)&&t.acceptance.length>=3);
  assert.ok(Array.isArray(t.safeguards)&&t.safeguards.length>=2);
 }
});
test('build packet reports no source read, write authorization, deployment or completed dataset',()=>{
 const p=makeBuildPacket('Build a database of all the restaurants in USA');
 assert.equal(p.schemaVersion,1);
 assert.equal(p.templateId,'restaurants-us');
 assert.equal(p.state,'plan_only');
 assert.equal(p.sourceReadVerified,false);
 assert.equal(p.writeAuthorized,false);
 assert.equal(p.deployed,false);
 assert.equal(p.datasetComplete,false);
 assert.ok(p.requiredSourceReads.some(x=>x.path==='workers/restaurant-directory.js'));
 assert.match(p.nextAction,/read.+source/i);
 assert.equal(p.data.status,'source-backed ingestion, nationwide coverage not verified');
});
test('MLB scoreboard does not imply complete national team dataset',()=>{
 const p=makeBuildPacket('Create a database of MLB baseball teams');
 assert.equal(p.templateId,'baseball-teams');
 assert.equal(p.datasetComplete,false);
 assert.ok(p.requiredSourceReads.some(x=>x.path==='sports-card-data.mjs'));
 assert.match(p.acceptance.join(' '),/provider|verified/i);
});
test('request data never injects URLs, instructions or credentials into read plans',()=>{
 const p=makeBuildPacket('Build a restaurant directory https://evil.example/?token=top-secret');
 assert.ok(p);
 assert.ok(!JSON.stringify(p).includes('top-secret'));
 assert.ok(p.requiredSourceReads.every(x=>x.repository==='www-infinity4/QuantaPhi'&&x.pinToVerifiedHead===true));
});
test('radio and traffic patterns protect real playback and analytics boundaries',()=>{
 const radio=makeBuildPacket('Reuse radio play and pause controls');
 const traffic=makeBuildPacket('Add the site traffic refresh button to another page');
 assert.match(radio.safeguards.join(' '),/user gesture|autoplay/i);
 assert.match(radio.acceptance.join(' '),/navigation|song|pause/i);
 assert.match(traffic.safeguards.join(' '),/secret|credentials/i);
 assert.match(traffic.acceptance.join(' '),/refreshStatus|not_configured/);
});
test('Termux-friendly CLI prints non-executing JSON without model API',async()=>{
 const {spawnSync}=await import('node:child_process');
 const result=spawnSync(process.execPath,['scripts/bubbles-build-template-plan.mjs','Build a database of baseball teams'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const packet=JSON.parse(result.stdout);
 assert.equal(packet.templateId,'baseball-teams');
 assert.equal(packet.state,'plan_only');
 const miss=spawnSync(process.execPath,['scripts/bubbles-build-template-plan.mjs','Do not build a new card'],{encoding:'utf8'});
 assert.equal(miss.status,1);
 assert.equal(miss.stdout,'');
});

test('template source references exist and owner chat only receives plan guidance',async()=>{
 const {existsSync,readFileSync}=await import('node:fs');
 for(const template of BUILD_TEMPLATES)for(const path of template.sourcePaths)
  assert.ok(existsSync(new URL('../'+path,import.meta.url)),template.id+' -> '+path);
 const ui=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 const discover=readFileSync(new URL('../bubbles-project-discovery.mjs',import.meta.url),'utf8');
 assert.match(discover,/export \{findBuildTemplate,makeBuildPacket\} from '\.\/bubbles-build-templates\.mjs'/);
 assert.match(ui,/reusableBuildPlan=!embedded&&ownerReady/);
 assert.match(ui,/Reusable source template \(planning hint only; no source read\/write authority or execution receipt\)/);
});
