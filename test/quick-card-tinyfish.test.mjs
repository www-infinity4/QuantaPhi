import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCardBrowse,extractAgentResult,handleTinyfishCard} from '../workers/quick-card-tinyfish/gateway.mjs';
import {tinyfishCardSupported,tinyfishIsAi,requestTinyfishCard,TINYFISH_CARD_ENDPOINT} from '../quanta-tinyfish-card.mjs';
test('site allowlist ignores supplied URLs and blocks private AI session impersonation',()=>{
 assert.equal(validateCardBrowse({cardId:'chatgpt',query:'hello'}),null);
 assert.equal(validateCardBrowse({cardId:'starmaker',query:'find songs',url:'http://127.0.0.1/'}).sourceUrl,'https://www.starmakerstudios.com/en/songs');
 assert.equal(validateCardBrowse({cardId:'github',query:'read a token'}),null);
 assert.equal(validateCardBrowse({cardId:'starmaker',query:' a '}),null);
 assert.equal(tinyfishIsAi('chatgpt'),true);
 assert.equal(tinyfishCardSupported('starmaker'),true);
 assert.equal(tinyfishCardSupported('chatgpt'),false);
});
test('accepts only completed TinyFish SSE results',()=>{
 assert.equal(extractAgentResult('data: {"type":"STARTED"}\ndata: {"type":"COMPLETE","status":"FAILED","result":{"a":1}}'),null);
 assert.equal(extractAgentResult('data: {"type":"COMPLETE","status":"COMPLETED","resultJson":{"answer":"yes"}}'),'{"answer":"yes"}');
});
test('client uses same-origin gateway and matches provider receipt',async()=>{
 const data=await requestTinyfishCard('starmaker','song title',async (url,req)=>{
  assert.equal(url,TINYFISH_CARD_ENDPOINT);assert.equal(req.credentials,'omit');
  assert.deepEqual(JSON.parse(req.body),{cardId:'starmaker',query:'song title'});
  return {ok:true,json:async()=>({ok:true,cardId:'starmaker',sourceUrl:'https://www.starmakerstudios.com/en/songs',result:'Song found',checkedAt:'2026-10-27T12:00:00Z'})};
 });assert.equal(data.result,'Song found');
});
test('gateway rejects unapproved cross-origin and malformed queries without calling upstream',async()=>{
 const request=new Request('https://example.test/v1/quick-cards/tinyfish',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify({cardId:'starmaker',query:'hello'})});
 const response=await handleTinyfishCard(request,{},()=>{throw Error('should not call TinyFish')});
 assert.equal(response.status,403);
});
test('gateway requires configured secrets before spending on agent',async()=>{
 const request=new Request('https://example.test/v1/quick-cards/tinyfish',{method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},body:JSON.stringify({cardId:'youtube',query:'videos'})});
 const response=await handleTinyfishCard(request,{},()=>{throw Error('should not call TinyFish')});
 assert.equal(response.status,503);
});
