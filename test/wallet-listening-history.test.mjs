import test from 'node:test';
import assert from 'node:assert/strict';
import {readListeningHistory} from '../wallet-listening-history.mjs';

const receipt=(id,kind='listening')=>({
 id,kind,hash:'a'.repeat(64),song:'Fred Space episode',sourceUrl:'https://example.org/episode',
 startedAt:'2026-11-08T10:00:00.000Z',endedAt:'2026-11-08T10:12:00.000Z',
 durationSec:720,context:{events:[{action:'play',channel:'Infinity Radio'}]}
});

test('signed Music Quant pages yield distinct Listening Quant receipts with attached provenance',async()=>{
 const calls=[];
 const result=await readListeningHistory(async offset=>{
  calls.push(offset);
  return offset===0
   ?{ok:true,wallet_id:'qw_owner',balance:3,quants:[receipt('mq_a'),receipt('mq_b','playable')],has_more:true}
   :{ok:true,wallet_id:'qw_owner',balance:3,quants:[receipt('mq_c')],has_more:false};
 });
 assert.deepEqual(calls,[0,2]);
 assert.equal(result.available,true);
 assert.equal(result.total,3);
 assert.equal(result.listening.length,2);
 assert.equal(result.listening[0].song,'Fred Space episode');
 assert.equal(result.listening[0].hash,'a'.repeat(64));
 assert.equal(result.listening[0].sourceUrl,'https://example.org/episode');
 assert.equal(result.listening[0].durationSec,720);
 assert.equal(result.listening[0].context.events[0].action,'play');
});

test('incomplete, conflicting, unverified or duplicated pages never claim a listening balance',async()=>{
 for(const response of [
  {ok:false},
  {ok:true,wallet_id:'qw_1',balance:2,quants:[receipt('mq_a')],has_more:false},
  {ok:true,wallet_id:'qw_1',balance:1,quants:[receipt('mq_a'),receipt('mq_a')],has_more:false}
 ]){
  const result=await readListeningHistory(async()=>response);
  assert.equal(result.available,false);
  assert.equal(result.listening,null);
 }
 const changed=await readListeningHistory(async offset=>offset===0
  ?{ok:true,wallet_id:'qw_1',balance:2,quants:[receipt('mq_a')],has_more:true}
  :{ok:true,wallet_id:'qw_other',balance:2,quants:[receipt('mq_b')],has_more:false});
 assert.equal(changed.available,false);
});

test('receipt details are sanitized and partial history is not reported as complete',async()=>{
 const item=receipt('mq_a');item.song='X'.repeat(1000);item.sourceUrl='javascript:alert(1)';
 const result=await readListeningHistory(async()=>({ok:true,wallet_id:'qw_1',balance:1,quants:[item],has_more:false}));
 assert.equal(result.available,true);
 assert.equal(result.listening[0].song.length,180);
 assert.equal(result.listening[0].sourceUrl,'');
 const partial=await readListeningHistory(async()=>({ok:true,wallet_id:'qw_1',balance:2,quants:[receipt('mq_a')],has_more:true}),1);
 assert.equal(partial.available,false);
});

test('Bubbles wallet reads listening receipts only from the signed Cloudflare ledger, not untrusted local counters',async()=>{
 const fs=await import('node:fs');
 const src=fs.readFileSync(new URL('../bubbles-cloud-wallet.js',import.meta.url),'utf8');
 assert.match(src,/wallet-listening-history\.mjs/);
 assert.match(src,/https:\/\/quanta-phi-ledger\.marvaseater\.workers\.dev\/v1\/music-quants\/state/);
 assert.match(src,/Listening Quants/);
 assert.match(src,/provenance/);
 assert.doesNotMatch(src,/localStorage\.setItem/);
});
