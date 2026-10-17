import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectRepositories} from '../workers/infinity-brain-clock/repository-router.mjs';
import {suggestRepositories} from '../workers/infinity-brain-clock/direct-github.mjs';

const catalog=[
 {repository:'www-infinity4/QuantaPhi',description:'Bubbles AI and phone overlay'},
 {repository:'www-infinity4/Alien-Radio',description:'Stream radio playback'},
 {repository:'www-infinity4/Moltnook',description:'Repository engine agent bot runner'},
 {repository:'www-infinity4/WidgetPhi',description:'Widget catalog'},
 {repository:'www-infinity4/Omni-Phi',description:'Omni Code Phi'},
 {repository:'www-infinity4/Wallet-Dev',description:'Ledger and wallet'},
 {repository:'other-owner/QuantaPhi',description:'Not owned'},
 {repository:'www-infinity4/Old-App',archived:true}
];
test('Bubbles voice/APK requests route to the actual QuantaPhi source, not a made-up Bubbles repository',()=>{
 const r=selectRepositories('Repair Bubbles APK microphone and voice overlay',catalog);
 assert.deepEqual(r.selection,['www-infinity4/QuantaPhi']);
 assert.equal(r.confidence,'high');
 assert.equal(r.catalogSize,6);
});
test('named repositories outrank incidental project names',()=>{
 const r=selectRepositories('Fix www-infinity4/WidgetPhi card inside QuantaPhi',catalog);
 assert.deepEqual(r.selection,['www-infinity4/WidgetPhi']);
 assert.equal(r.confidence,'explicit');
});
test('cross-repo problems receive candidates, without asserting any job is already running',()=>{
 const r=selectRepositories('Repair Infinity Radio stream and the Bubbles audio button',catalog);
 assert.ok(r.candidates.some(x=>x.repository==='www-infinity4/Alien-Radio'));
 assert.ok(r.candidates.some(x=>x.repository==='www-infinity4/QuantaPhi'));
 assert.equal(r.candidates.length>=2,true);
});
test('searching all repos never grants blanket change permission',()=>{
 const r=selectRepositories('Search all repositories to find the broken radio control',catalog);
 assert.equal(r.allTargets,false);
 assert.notEqual(r.selection.length,r.catalogSize);
 const broad=selectRepositories('Apply this repair to every repository',catalog);
 assert.equal(broad.allTargets,true);
 assert.equal(broad.requiresReview,true);
 assert.deepEqual(broad.selection,[]);
});
test('unrecognized or low-confidence project never silently targets an unrelated repository',()=>{
 const r=selectRepositories('Repair the pineapple mechanism',catalog);
 assert.equal(r.requiresReview,true);
 assert.deepEqual(r.selection,[]);
});
test('Cloudflare model can only select candidates returned from verified GitHub inventory',async()=>{
 const env={WRITER_AI:{async run(){return {response:JSON.stringify({repositories:['attacker/unknown','www-infinity4/Alien-Radio'],confidence:.95,reason:'Radio task'})}}}};
 const r=await suggestRepositories(env,'Repair the radio player widget',catalog);
 assert.equal(r.ok,true);
 assert.equal(r.source,'cloudflare-gpt-oss-120b');
 assert.ok(r.selection.every(n=>catalog.some(c=>c.repository===n)));
 assert.ok(!r.selection.includes('attacker/unknown'));
});
test('model failure never forges a selected repo or a job receipt',async()=>{
 const env={WRITER_AI:{async run(){throw Error('offline')}}};
 const r=await suggestRepositories(env,'Repair the radio player widget',catalog);
 assert.equal(r.ok,true);
 assert.equal(r.source,'repository-name-and-project-matching');
 assert.equal(r.status,'repository_suggestions');
 assert.equal(r.testsVerified,undefined);
});
test('Brain and floating Android shared Bubbles UI use authenticated catalog route',()=>{
 const brain=readFileSync('workers/infinity-brain-clock/worker.js','utf8');
 const ui=readFileSync('bubbles-ai.js','utf8');
 assert.match(brain,/suggestRepositories\(runtime,body.request,catalog.repositories\)/);
 assert.match(brain,/github-owner-catalog-v1/);
 assert.match(brain,/ownerAuthorized\(env,token\)/);
 assert.match(ui,/action:'suggest_repositories'/);
 assert.match(ui,/if\(!repositorySelectionExplicit&&!activeCardEvidence\)await suggestRepositoryTargets\(request,false\)/);
 assert.match(ui,/result\.requiresReview&&!repositorySelectionExplicit/);
 assert.match(ui,/repositoryFilter\.addEventListener\('input'/);
 assert.match(ui,/if\(!repositoryCatalogComplete&&!repositoryCatalogLoading\)void loadRepositoryCatalog\(\)/);
});
