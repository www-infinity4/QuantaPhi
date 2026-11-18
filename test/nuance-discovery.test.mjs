import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditWorkHistory} from '../workers/infinity-brain-clock/conversation-work-audit.mjs';
import {suggestNuances,reviewDraftRequest} from '../nuance-discovery-core.mjs';
import {findCard} from '../bubbles-card-catalog.mjs';

const source=(id,role,text)=>({id:'history_'+String(id).padStart(4,'0'),role,text,at:1764072000000+id});
const candidate=(extra={})=>({
 id:'infinity-nuances',title:'Infinity OS Cart 003/004',
 repositorySuggestion:'www-infinity4/QuantaPhi',
 repositoryVerified:false,status:'candidate_needs_repository_inspection',
 mentions:2,linkedTickets:[],evidence:[{messageId:'history_0001',excerpt:'Preserve the 41 main carts and calculator twins.'}],
 constraints:['Do not build a generic chatbot.'],...extra
});
test('old Cart 003/004 work becomes an owner-source candidate, not an execution authorization',()=>{
 const result=auditWorkHistory([
  source(1,'user','Build Cart 003 Computers and Cart 004 Nuances with layered research; preserve all 41 carts.'),
  source(2,'assistant','I already merged Cart 004 into production.'),
  source(3,'user','Improve Infinity OS nuanced preferences; never replace it with a generic chatbot.')
 ]);
 const cart=result.find(x=>x.id==='infinity-nuances');
 assert.ok(cart,'historical cart should be discoverable by the existing owner-only audit');
 assert.equal(cart.repositoryVerified,false);
 assert.equal(cart.status,'candidate_needs_repository_inspection');
 assert.equal(cart.evidence.length,2);
 assert.match(cart.constraints.join(' '),/never replace/);
});
test('source-backed suggestions preserve old restrictions and identify a bounded improvement',()=>{
 const results=suggestNuances({mode:'work-audit-reconcile',ticketInventoryTruncated:false,candidates:[candidate()]});
 assert.equal(results.length,1);
 assert.equal(results[0].id,'infinity-nuances');
 assert.match(results[0].improvement,/Cart 004|41/);
 assert.match(results[0].constraints[0],/generic chatbot/);
 assert.equal(results[0].evidenceCount,1);
 assert.equal(results[0].canDraft,false,'existing Cart 004 issue #1923 must not create a duplicate');
 assert.equal(results[0].existingIssueUrl,'https://github.com/www-infinity4/QuantaPhi/issues/1923');
 assert.equal(results[0].verified,false);
});
test('only verified-owner-archive candidate IDs may be placed in an inert review draft',()=>{
 const [suggestion]=suggestNuances({mode:'work-audit-reconcile',ticketInventoryTruncated:false,candidates:[candidate({id:'conversation-memory',title:'Conversation memory discovery'})]});
 assert.deepEqual(reviewDraftRequest(suggestion),{
  from_work_audit:true,start_immediately:false,
  auditCandidateId:'conversation-memory',
  sourceMessageIds:['history_0001'],
  repository:'www-infinity4/QuantaPhi'
 });
 assert.equal(reviewDraftRequest({...suggestion,repository:'https://evil.example/' }),null);
 assert.equal(reviewDraftRequest({...suggestion,evidenceIds:[]}),null);
});
test('missing owner evidence, linked work, fallback audits and incomplete inventory never allow a fresh draft',()=>{
 for(const payload of [
  {mode:'work-audit-sweep',ticketInventoryTruncated:false,candidates:[candidate()]},
  {mode:'work-audit-reconcile',ticketInventoryTruncated:true,candidates:[candidate()]},
  {mode:'work-audit-reconcile',ticketInventoryTruncated:false,candidates:[candidate({linkedTickets:[{id:'existing'}]})]},
  {mode:'work-audit-reconcile',ticketInventoryTruncated:false,candidates:[candidate({evidence:[]})]},
  {mode:'work-audit-reconcile',ticketInventoryTruncated:false,candidates:[candidate({status:'complete',repositoryVerified:true})]}
 ]){
  const items=suggestNuances(payload);
  assert.equal(items[0]?.canDraft,false);
  assert.equal(reviewDraftRequest(items[0]),null);
 }
});
test('registered native Quick Card reuses existing Oracle card actions and owner gate',()=>{
 const card=findCard('Nuance Discovery');
 assert.equal(card?.repository,'www-infinity4/QuantaPhi');
 assert.match(card?.url||'',/nuanceDiscoveryCard/);
 const index=readFileSync('index.html','utf8');
 assert.match(index,/id="nuanceDiscoveryCard"/);
 const ui=readFileSync('nuance-discovery-card.mjs','utf8');
 assert.match(ui,/QuantaBrainOwner/);
 assert.match(ui,/currentHeaders/);
 assert.match(ui,/work-audit-reconcile/);
 assert.match(ui,/mountCardActions/);
 assert.match(ui,/from_work_audit|reviewDraftRequest/);
 assert.doesNotMatch(ui,/localStorage\.setItem|wallet\.mint|start_immediately:true/);
});

test('Avatar AI public prompt and owner-scoped Nuance Discovery coexist in the Oracle homepage',()=>{
 const home=readFileSync('index.html','utf8');
 const publicSource=readFileSync('source-quick-cards.mjs','utf8');
 const publicCard=readFileSync('avatar-ai-card.mjs','utf8');
 const privateCard=readFileSync('nuance-discovery-card.mjs','utf8');
 const detail=readFileSync('source-quick-card.html','utf8');
 const catalog=readFileSync('bubbles-card-catalog.mjs','utf8');
 assert.match(home,/nuance-discovery-card\.mjs/);
 assert.match(home,/avatar-ai-card\.css/);
 assert.match(publicSource,/source\('avatar-ai'/);
 assert.match(publicSource,/mountAvatarAiCard/);
 assert.match(detail,/avatar-ai-card\.css/);
 assert.match(catalog,/app\('nuance-discovery'/);
 assert.match(privateCard,/QuantaBrainOwner.*|currentHeaders/);
 assert.doesNotMatch(publicCard,/QuantaBrainOwner|work-audit-reconcile|Authorization|sessionStorage|localStorage|fetch\(/);
});

test('both Avatar AI and Nuance Discovery have one canonical unfinished ticket',()=>{
 const index=readFileSync('work/unfinished/INDEX.md','utf8');
 const ticket=readFileSync('work/unfinished/TICKET-1923.md','utf8');
 const rows=index.split('\n').filter(line=>line.startsWith('| ')&&line.includes('[#1923]'));
 assert.equal(rows.length,1,'exactly one index entry should reference the shared issue');
 assert.match(rows[0],/Avatar AI/);
 assert.match(rows[0],/Nuance Discovery/);
 assert.match(ticket,/^---\nissue: 1923\n/);
 assert.match(ticket,/public.*Avatar AI|Avatar AI.*public/i);
 assert.match(ticket,/owner.*Nuance Discovery|Nuance Discovery.*owner/i);
 assert.match(ticket,/#1924/);
 assert.match(ticket,/#1925/);
});
