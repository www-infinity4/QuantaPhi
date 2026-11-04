import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMediaEvent, summarizeEarnings, summarizeMedia, eventOriginAllowed} from '../workers/executor-insights/worker.mjs';

const uuid='123e4567-e89b-42d3-a456-426614174000';
test('only well-formed, enumerated Media Star interactions can be recorded',()=>{
 const valid={eventId:uuid,sessionId:uuid,cardId:'media-star',kind:'card_click'};
 assert.equal(validateMediaEvent(valid).cardId,'media-star');
 for(const bad of [
  {...valid,kind:'purchase'}, {...valid,cardId:'other-card'},
  {...valid,eventId:'forged'}, {...valid,sessionId:'forged'},
  {...valid,cardId:'../../db'}, {...valid,kind:'credited'}
 ])assert.throws(()=>validateMediaEvent(bad));
});
test('tracking accepts only first-party production or specified local origins',()=>{
 assert.equal(eventOriginAllowed('https://quantaphi.org'),true);
 assert.equal(eventOriginAllowed('https://www-infinity4.github.io'),true);
 assert.equal(eventOriginAllowed('https://example.com'),false);
 assert.equal(eventOriginAllowed(''),false);
});
test('pending executor receipts never become settled wallet balances',()=>{
 const r=summarizeEarnings([
  {asset:'GIT',status:'pending',units:4,receipts:1},
  {asset:'GIT',status:'settled',units:2,receipts:1},
  {asset:'BUBBLE_BIT',status:'pending',units:3,receipts:3}
 ]);
 assert.equal(r.GIT.pending,4);
 assert.equal(r.GIT.settled,2);
 assert.equal(r.BUBBLE_BIT.settled,0);
 assert.equal(r.QUANT.settled,0);
 assert.throws(()=>summarizeEarnings([{asset:'GIT',status:'settled',units:-10,receipts:1}]));
});
test('click-through rate derives from unique observed sessions, not plays or wallet money',()=>{
 const summary=summarizeMedia([
  {card_id:'media-star',kind:'impression',events:14,sessions:10},
  {card_id:'media-star',kind:'card_click',events:4,sessions:2},
  {card_id:'media-star',kind:'play_intent',events:1,sessions:1}
 ]);
 assert.equal(summary['media-star'].impressions,10);
 assert.equal(summary['media-star'].uniqueClicks,2);
 assert.equal(summary['media-star'].clickEvents,4);
 assert.equal(summary['media-star'].playIntents,1);
 assert.equal(summary['media-star'].ctrPercent,20);
 assert.equal(summary['media-star'].salesVerified,null);
 assert.equal(summarizeMedia([])['media-star'].ctrPercent,null);
});
test('public click endpoint cannot mint Quant, GIT or Bubble Bit assets',async()=>{
 const {default:worker}=await import('../workers/executor-insights/worker.mjs');
 const r=await worker.fetch(new Request('https://example.workers.dev/v1/executor/credit',{method:'POST',headers:{Origin:'https://quantaphi.org'}}),{});
 assert.equal(r.status,404);
});
