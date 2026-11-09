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
