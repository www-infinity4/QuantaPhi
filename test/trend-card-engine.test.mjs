import test from 'node:test';
import assert from 'node:assert/strict';
import {BOT_ROLES,validateSourceItem,rankRelatedCards,canPublishCard,nextBotHandoff} from '../trend-card-core.mjs';

const now=Date.parse('2026-11-07T06:00:00Z');
const release={
 id:'pink-floyd-animals-50', title:'Animals 50 — Sheep (Original Radio Edit)',
 artist:'Pink Floyd', category:'music', tags:['pink floyd','sheep','animals','roger waters'],
 source_url:'https://www.pinkfloyd.com/pink-floyd-announce-animals-50/',
 destination_url:'https://shop.us.pinkfloyd.com/products/animals-50-cd',
 source_authority:'artist', checked_at:'2026-11-07T05:50:00Z',
 kind:'organic', rights:'source-linked', state:'source_verified'
};

test('exactly eight role definitions and delegated workflow',()=>{
 assert.deepEqual(BOT_ROLES.map(x=>x.id),['gpt','yellow','orange','blue','green','red','purple','silver']);
 assert.equal(nextBotHandoff('gpt'),'yellow');
 assert.equal(nextBotHandoff('yellow'),'orange');
 assert.equal(nextBotHandoff('orange'),'blue');
 assert.equal(nextBotHandoff('blue'),'green');
 assert.equal(nextBotHandoff('green'),'red');
 assert.equal(nextBotHandoff('red'),'silver');
 assert.equal(nextBotHandoff('silver'),null);
});
test('only independently verifiable source-linked items enter ranking',()=>{
 assert.equal(validateSourceItem(release,now),true);
 const broken=[
  {...release,source_url:'http://www.pinkfloyd.com/evil'},
  {...release,source_url:'https://pinkfloyd.com.evil.invalid/news'},
  {...release,checked_at:'2026-09-01T00:00:00Z'},
  {...release,rights:'unknown'},
  {...release,kind:'sponsored'},
  {...release,destination_url:'javascript:alert(1)'},
  {...release,category:'adult'},
 ];
 for(const row of broken)assert.equal(validateSourceItem(row,now),false,JSON.stringify(row));
});
test('Pink Floyd items outrank unrelated cards, no repeats, no fake paid sponsorship',()=>{
 const unrelated={...release,id:'other-artist',artist:'Other Band',title:'Other Band album',tags:['other band','album']};
 const ranked=rankRelatedCards([unrelated,release,release],{title:'Pink Floyd Radio',tags:['pink floyd','classic rock'],category:'music'},[],now);
 assert.deepEqual(ranked.map(r=>r.item.id),['pink-floyd-animals-50','other-artist']);
 assert.ok(ranked[0].score>ranked[1].score);
 assert.match(ranked[0].why,/Pink Floyd/i);
 assert.deepEqual(rankRelatedCards([release],{title:'Pink Floyd'},['pink-floyd-animals-50'],now),[]);
});
test('Orange approval requires auditable proof and checks; Quant ranking alone cannot publish',()=>{
 const candidate={...release,media_rights_verified:true,card_tests_passed:true};
 assert.equal(canPublishCard(candidate,{role:'orange',status:'proposed',source_id:release.id,quant_ai_receipt:'ai1',approved_at:'2026-11-07T06:00:00Z'},now),false);
 assert.equal(canPublishCard(candidate,{role:'orange',status:'approved',source_id:'another',quant_ai_receipt:'ai1',approved_at:'2026-11-07T06:00:00Z'},now),false);
 assert.equal(canPublishCard(candidate,{role:'orange',status:'approved',source_id:release.id,quant_ai_receipt:'',approved_at:'2026-11-07T06:00:00Z'},now),false);
 assert.equal(canPublishCard(candidate,{role:'orange',status:'approved',source_id:release.id,quant_ai_receipt:'ai1',approved_at:'2026-11-07T06:00:00Z'},now),true);
 assert.equal(canPublishCard({...candidate,card_tests_passed:false},{role:'orange',status:'approved',source_id:release.id,quant_ai_receipt:'ai1',approved_at:'2026-11-07T06:00:00Z'},now),false);
});
