import test from 'node:test';
import assert from 'node:assert/strict';
import {TESTS,auditReply} from '../test-ground-ai/engine.mjs';
import {chooseTool} from '../workers/bubbles-tools/worker.mjs';
import {recommendCapabilities,capabilityDirectoryReply} from '../workers/bubbles-tools/capability-directory.mjs';

const probe=id=>TESTS.find(x=>x.id===id);
const receipt=(tool='oracle.chat',status='complete')=>({tool,status,repositoryActionsVerified:false});
const developer='Explain which verified Code Phi or Robot Brain tool can commit the JSON and index into the sandbox branch, and distinguish a draft from a real GitHub commit.';
const wallet='Explain whether this chat can verify StarCoin, Quant and Infinity-token ledger receipts. Do not mint, credit, transfer or assume rewards.';
const channels='What real tool would verify that StarQuest, Omni TV, Chiller and ShopLC are playable now? Do not claim playback without browser evidence.';

test('JSON and HTML draft-only replies pass syntax/structure, not GitHub writes',()=>{
 const json = '```json\n{"name":"test-ground-ai","version":"1.0.0","repository":"www-infinity4/QuantaPhi","capabilities":["read"]}\n```';
 assert.equal(auditReply(probe('json'),{ok:true,output:json,receipt:receipt()}).state,'passed');
 assert.equal(auditReply(probe('index'),{ok:true,output:'<html><main><h1>Test Ground</h1><button>Go</button></main></html>',receipt:receipt()}).state,'passed');
 assert.equal(auditReply(probe('json'),{ok:true,output:'{bad-json}',receipt:receipt()}).state,'unverified');
 assert.equal(auditReply(probe('json'),{ok:true,output:'I deployed your JSON',receipt:receipt()}).state,'flagged');
});

test('questions about authorizing a commit are capability lookups, not commit reads',()=>{
 assert.equal(chooseTool(developer),'bubbles.capabilities');
 assert.equal(recommendCapabilities(developer)[0]?.id,'robot_brain.owner_work');
 assert.equal(chooseTool('Show latest GitHub commit in www-infinity4/QuantaPhi'),'github.read_commit');
});

test('wallet and TV verification boundaries name real Cloudflare adapters without pretending to read them',()=>{
 assert.equal(chooseTool(wallet),'bubbles.capabilities');
 assert.equal(chooseTool(channels),'bubbles.capabilities');
 const explanation=capabilityDirectoryReply({},wallet+' '+channels);
 assert.match(explanation,/Cloudflare D1/i);
 assert.match(explanation,/Cloudflare Browser/i);
 assert.match(explanation,/not a completed tool invocation/i);
});

test('semantic system description is conversation, not a nonexistent semantic.intent tool',()=>{
 const prompt={id:'semantic-starter',expectedTool:'oracle.chat'};
 assert.equal(auditReply(prompt,{ok:true,output:'I can explain the proposed pipeline, but have not read the actual source or executed a job.',receipt:receipt()}).state,'passed');
 assert.equal(auditReply(prompt,{ok:true,output:'Those repositories were supplied in the system message. This is a completed verification.',receipt:receipt()}).state,'flagged');
});

test('unknown weather location is a safe successful clarification rather than a tool error',()=>{
 const prompt={id:'weather-ambiguous',expectedTool:'weather.current'};
 assert.equal(auditReply(prompt,{ok:true,output:'I don\u2019t have enough information. Please share your city and state.',receipt:receipt()}).state,'passed');
 assert.notEqual(auditReply(prompt,{ok:true,output:'It is 50 degrees in Omaha.',receipt:receipt()}).state,'passed');
});
