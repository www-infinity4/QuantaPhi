import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker,{chooseTool,contextualReadPlan} from '../workers/bubbles-tools/worker.mjs';
import {isCapabilityDiscoveryQuestion,recommendCapabilities} from '../workers/bubbles-tools/capability-directory.mjs';

test('reading a named file and searching online tools never become inventory lookup',()=>{
 const file='Show bubbles-live-tools.js in www-infinity4/QuantaPhi repository';
 const web='Find online JavaScript debugging tools';
 assert.equal(isCapabilityDiscoveryQuestion(file),false);
 assert.equal(chooseTool(file),'github.read_file');
 assert.equal(isCapabilityDiscoveryQuestion(web),false);
 assert.notEqual(chooseTool(web),'bubbles.capabilities');
 for(const question of [file,web])assert.notEqual(contextualReadPlan(question,'https://quantaphi.org')?.tool,'bubbles.capabilities');
 assert.equal(isCapabilityDiscoveryQuestion('Which tools can read GitHub?'),true);
 assert.equal(isCapabilityDiscoveryQuestion('Find your existing tools for searching the web'),true);
});

test('public GitHub commit reader is preferred to privileged writers for read questions',()=>{
 const list=recommendCapabilities('Which tool can read a GitHub commit?',{BRAIN:{}});
 assert.equal(list[0]?.id,'github.read_commit');
 assert.equal(list[0]?.scope,'public-read');
 assert.ok(!list.slice(0,2).some(x=>x.id==='robot_brain.owner_work'));
 assert.equal(recommendCapabilities('Which tools can commit changes?')[0]?.id,'robot_brain.owner_work');
});

test('public digital memory benchmark is recommended without owner context access',()=>{
 const list=recommendCapabilities('Which tools can run an Organic Computation memory benchmark?',{BRAIN:{}});
 assert.equal(list[0]?.id,'organic.memory_benchmark');
 assert.equal(list[0]?.scope,'public-read');
 assert.ok(!list.slice(0,2).some(x=>x.id==='bubbles.memory.owner'));
 const privateList=recommendCapabilities('Which tools can access my saved owner memory?');
 assert.equal(privateList[0]?.id,'bubbles.memory.owner');
});

test('first-party Bubbles routes explicit inventory questions directly to its existing gateway before intent and legacy answer',()=>{
 const ui=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 const fast=ui.indexOf('const nativeCapabilityDiscovery=');
 const intent=ui.indexOf('// General semantic route: GPT-OSS chooses');
 const legacy=ui.indexOf('Available Bubbles tools: in-chat Card Catalog');
 assert.ok(fast>0&&fast<intent&&fast<legacy,'the gateway catalog must precede model intent and local canned inventory');
 const route=ui.slice(fast,intent);
 assert.match(route,/bubblesFetch\(AI,/);
 assert.match(route,/json\.receipt\?\.tool!=='bubbles.capabilities'/);
 assert.match(route,/display\(reply,'ai'\)/);
 assert.doesNotMatch(route,/directGithubOperation|verifiedOwnerHeaders|\/v1\/intent/);
});

test('owner requests to repair Bubbles speech and GitHub/Cloudflare coding use authenticated Brain work, not a model claim',async()=>{
 const {createRequire}=await import('node:module');
 const require=createRequire(import.meta.url);
 const brain=require('../bubbles-brain-actions.js');
 const request='Fix Bubbles to speak and do code and GitHub and Cloudflare as planned';
 assert.equal(brain.firstPartyRepairTarget(request),'www-infinity4/QuantaPhi');
 assert.equal(brain.classify(request),'queue');
 const ui=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 assert.match(ui,/if\(knownQuantaRepair\)directCoding=false/);
 assert.match(ui,/const ticket=await submitWork\(request,'explicit-user-command',imageWorkEvidence\)/);
 assert.match(ui,/if\(nativeOverlay&&nativeSpeechPending\)nativeSpeechReply=workEvidence/);
 assert.match(ui,/else if\(config.voice&&!nativeOverlay\)speakText\(workEvidence\)/);
});

test('spoken Cloudflare Worker repair and deployment instructions route to signed Brain work rather than chat',async()=>{
 const {createRequire}=await import('node:module');
 const require=createRequire(import.meta.url);
 const brain=require('../bubbles-brain-actions.js');
 for(const command of ['Fix the Cloudflare Worker for Bubbles','Deploy the Cloudflare Worker for Bubbles','Please repair the Cloudflare deployment']){
  assert.equal(brain.classify(command),'queue',command);
 }
 assert.equal(brain.firstPartyRepairTarget('Deploy the Cloudflare Worker for Bubbles'),'www-infinity4/QuantaPhi');
 for(const question of ['What is Cloudflare?','How does a Cloudflare Worker deploy?','Do not deploy the Cloudflare Worker']){
  assert.equal(brain.classify(question),'chat',question);
 }
});

test('one capability-intent predicate handles browser and Cloudflare gateway consistently',async()=>{
 const shared=await import('../bubbles-capability-intent.mjs');
 for(const request of [
  'Please list your tools','Bubbles, what tools and skills do you have?',
  'What can you do for me?','Which tools can read GitHub?',
  'Find your existing tools for searching the web'
 ])assert.equal(shared.isCapabilityDiscoveryQuestion(request),true,request);
 for(const request of [
  'Show existing tools.js in www-infinity4/QuantaPhi repository',
  'Show bubbles-live-tools.js in www-infinity4/QuantaPhi repository',
  'What tools are described at https://example.com/tools? Read and summarize that page.',
  'Find online JavaScript debugging tools','Fix the Bubbles tool directory'
 ])assert.equal(shared.isCapabilityDiscoveryQuestion(request),false,request);
 const ui=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 const gateway=readFileSync(new URL('../workers/bubbles-tools/capability-directory.mjs',import.meta.url),'utf8');
 assert.match(ui,/import\('\/bubbles-capability-intent\.mjs\?v=/);
 assert.match(gateway,/from '\.\.\/\.\.\/bubbles-capability-intent\.mjs'/);
 assert.doesNotMatch(ui,/const nativeCapabilityDiscovery=!pendingImage&&\/\^/);
 assert.equal(isCapabilityDiscoveryQuestion,shared.isCapabilityDiscoveryQuestion);
});

test('source-read and owner-write discovery must return the correct actual adapter',()=>{
 for(const question of [
  'Show your existing tools to commit changes',
  'Which tools can commit to GitHub?',
  'Which tools can commit a file to GitHub?'
 ])assert.equal(recommendCapabilities(question,{BRAIN:{}})[0]?.id,'robot_brain.owner_work',question);
 assert.equal(recommendCapabilities('Which tool can read a GitHub commit?')[0]?.id,'github.read_commit');
 for(const question of [
  'Which tools can test recall of my saved owner memory?',
  'What tools can access my private conversation memory?'
 ])assert.equal(recommendCapabilities(question,{BRAIN:{}})[0]?.id,'bubbles.memory.owner',question);
 assert.equal(recommendCapabilities('Which tools can run an Organic Computation memory benchmark?')[0]?.id,'organic.memory_benchmark');
});

test('explicit repository files and source URLs still choose readers, not the directory',()=>{
 for(const [request,expected] of [
  ['Show existing tools.js in www-infinity4/QuantaPhi repository','github.read_file'],
  ['Show bubbles-live-tools.js in www-infinity4/QuantaPhi repository','github.read_file'],
  ['What tools are described at https://example.com/tools? Read and summarize that page.','web.read_page']
 ])assert.equal(chooseTool(request),expected,request);
});
