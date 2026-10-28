import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MODEL_CARDS,SECTORS,MAX_MEMBERS_PER_MODEL,verifyCapacity,createProposal,castDeviceVote,forkProposal,reviewIdeaSignals,hasPaidAccess,modelById} from '../coliseum/coliseum-core.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const time=Date.parse('2026-10-27T12:00:00Z');
test('Zeus first, Hermes free, Athena $23, Hephaestus $100 are independent Infinity experiences',()=>{
 assert.deepEqual(MODEL_CARDS.map(x=>[x.id,x.version,x.price]),[['zeus','6.2',0],['hermes','6.6',0],['athena','7.0',23],['hephaestus','7.3',100]]);
 assert.equal(MAX_MEMBERS_PER_MODEL,1000);
 assert.equal(verifyCapacity(999),true);assert.equal(verifyCapacity(1000),false);assert.equal(verifyCapacity(-1),false);
 assert.equal(new Set(MODEL_CARDS.map(x=>x.id)).size,4);
 assert.equal(modelById('none'),null);
 assert.ok(SECTORS.includes('Technology')&&SECTORS.includes('Gaming')&&SECTORS.includes('Shopping'));
});
test('idea creation requires legitimate sector, edition and useful text',()=>{
 const form={modelId:'zeus',sector:'Technology',title:'Phone recycling network',description:'We organize trusted local repair supply chains.'};
 const a=createProposal(form,time,'draft-proposal-0001');
 assert.equal(a.isDemoDraft,true);assert.equal(a.parentId,null);
 assert.equal(a.stage,'open');assert.equal(a.endorsements,0);
 assert.throws(()=>createProposal({...form,title:'hi'},time,'draft-proposal-0002'),/idea_needs/);
 assert.throws(()=>createProposal({...form,modelId:'gpt-7'},time,'draft-proposal-0002'),/invalid_sector/);
 assert.throws(()=>createProposal({...form,sector:'Illegal'},time,'draft-proposal-0002'),/invalid_sector/);
});
test('support is local, once per device, and is not real community traction',()=>{
 const idea=createProposal({modelId:'zeus',sector:'Gaming',title:'Repairable console',description:'Open schematics and modular repair documentation.'},time,'draft-proposal-0010');
 const first=castDeviceVote(idea,'support',{});
 assert.equal(first.idea.endorsements,1);
 const second=castDeviceVote(first.idea,'support',first.deviceVotes);
 assert.equal(second.alreadyVoted,true);assert.equal(second.idea.endorsements,1);
 assert.equal(reviewIdeaSignals(first.idea).decision,'not-evaluated');
 assert.match(reviewIdeaSignals(first.idea).note,/authenticated human votes/);
});
test('project branch preserves the original and can be guided to another room',()=>{
 const original=createProposal({modelId:'athena',sector:'Shopping',title:'Vintage coin community',description:'Develop a collector marketplace with trustworthy image evidence.'},time,'draft-proposal-0011');
 const next=forkProposal(original,'draft-proposal-0012',time+1000);
 assert.equal(next.parentId,original.id);
 assert.equal(next.sector,'Shopping');
 assert.equal(next.endorsements,0);
 assert.equal(original.parentId,null);
 assert.notEqual(next.id,original.id);
});
test('subscriptions do not grant access through client-side state alone',()=>{
 assert.equal(hasPaidAccess({tier:'free'}),true);
 assert.equal(hasPaidAccess({tier:'coliseum',subscriptionStatus:'ACTIVE'}),false);
 assert.equal(hasPaidAccess({tier:'forge',serverVerified:true,subscriptionStatus:'CANCELLED'}),false);
});
test('homepage has a real Zeus card in existing Oracle rotation, not a standalone link tile',()=>{
 const index=read('index.html'),deck=read('oracle-card-deck.js');
 assert.match(index,/id="coliseumZeusCard"/);
 assert.match(index,/id="coliseumZeusActions"/);
 assert.match(index,/coliseum\/zeus-quick-card\.mjs/);
 assert.match(deck,/coliseumZeusCard:\['coliseum-zeus'/);
 assert.match(deck,/\['coliseumZeusCard','ZEUS 6\.2/);
 const html=read('coliseum/index.html');
 assert.match(html,/Chat/);assert.match(html,/Build/);
 assert.match(html,/No paid subscriptions or third-party-model access/);
 assert.doesNotMatch(html,/name="paypal-email"/);
});
