import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker,{chooseTool,parseHeadlines,reasoningFor,replyBudgetFor,isGenericBuildReply,hasUnverifiedActionClaim} from '../workers/bubbles-tools/worker.mjs';
test('spoken commands select actual tools, ordinary conversation remains chat',()=>{
 assert.equal(chooseTool('Check Google News and tell me the headlines'),'news.headlines');
 assert.equal(chooseTool('Create a GitHub repo called Rain'),'github.create_repository');
 assert.equal(chooseTool('Explain this design'),'oracle.chat');
});
test('reasoning level comes from the actual spoken request, not injected persona text',()=>{
 assert.equal(reasoningFor('Hello, what is your name?'),'medium');
 assert.equal(reasoningFor('How are you today?'),'medium');
 assert.equal(reasoningFor('Please debug my website microphone and update its voice interface'),'high');
 assert.equal(reasoningFor('Analyze the repository build architecture'),'high');
});
test('short voice turns conserve tokens but explicit detail is available',()=>{
 assert.equal(replyBudgetFor('hello'),650);
 assert.equal(replyBudgetFor('fix the microphone in my website'),1600);
 assert.equal(replyBudgetFor('explain this architecture in detail'),2500);
 assert.equal(replyBudgetFor('please give me a long answer about this plan'),2500);
});
test('headlines require dated current Google News links, deduplicate and reject invented destinations',()=>{
 const now=Date.parse('2026-10-12T02:00:00Z');
 const item=(title,date,url='https://news.google.com/rss/articles/abc')=>`<item><title>${title}</title><link>${url}</link><pubDate>${date}</pubDate><source>Source</source></item>`;
 const xml=item('Real &amp; current','Mon, 12 Oct 2026 01:00:00 GMT')+item('Real &amp; current','Mon, 12 Oct 2026 01:00:00 GMT')+item('Future','Mon, 12 Oct 2026 03:00:00 GMT')+item('Undated','')+item('Old','Mon, 01 Oct 2026 01:00:00 GMT')+item('Other','Mon, 12 Oct 2026 01:00:00 GMT','https://evil.example');
 assert.deepEqual(parseHeadlines(xml,now).map(s=>s.title),['Real & current']);
});
test('unconnected GitHub action is blocked and makes no network or queued-work claim',async()=>{
 const request=new Request('https://tools/v1/assist',{method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},body:JSON.stringify({request:'Create a repo named Rain'})});
 const result=await (await worker.fetch(request,{AI:{run:async()=>({response:'No repository was created or queued.'})}})).json();
 assert.equal(result.receipt.status,'blocked');assert.equal(result.receipt.minted,false);
 assert.match(result.output,/No repository was created or queued/);
});
test('foreign website origins cannot invoke assistant tools',async()=>{
 const r=await worker.fetch(new Request('https://tools/v1/assist',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'}),{});
 assert.equal(r.status,403);
});
test('ordinary conversation uses GPT OSS and reports the actual model',async()=>{
 let used=false;
 const r=await worker.fetch(new Request('https://tools/v1/assist',{method:'POST',headers:{Origin:'https://quantaphi.org'},body:JSON.stringify({request:'hello'})}),{AI:{run:async(model,options)=>{used=true;assert.equal(model,'@cf/openai/gpt-oss-120b');assert.equal(options.reasoning_effort,'medium');assert.equal(options.max_tokens,650);assert.match(options.messages[0].content,/Installed tool inventory/);assert.match(options.messages[0].content,/receipts automatically/);assert.match(options.messages[1].content,/hello/);return {response:'Hello'};}}});
 const body=await r.json();assert.equal(used,true);assert.equal(body.output,'Hello');assert.equal(body.model,'@cf/openai/gpt-oss-120b');
});
test('website repair requests get high reasoning and a larger output budget',async()=>{
 const req=new Request('https://tools/v1/assist',{method:'POST',headers:{Origin:'https://quantaphi.org'},body:JSON.stringify({
   request:'Please debug my website microphone and fix the voice interface',
   input:'Persona instructions contain no actual user request; this is a difficult technical issue.'
 })});
 const result=await worker.fetch(req,{AI:{run:async(model,options)=>{
   assert.equal(model,'@cf/openai/gpt-oss-120b');
   assert.equal(options.reasoning_effort,'high');
   assert.equal(options.max_tokens,1600);
   assert.match(options.messages[0].content,/only verified tool receipts/);
   assert.ok(options.messages[0].content.includes('test/bubbles-brain-actions.test.cjs'));
   assert.ok(options.messages[0].content.includes('workers/infinity-brain-clock/worker.js'));
   return {response:'The request needs a verified repository repair.'};
 }}});
 assert.equal(result.status,200);assert.match((await result.json()).output,/verified repository repair/);
});
test('health reports actual GPT availability, not an unrelated Oracle binding',async()=>{
 const one=await worker.fetch(new Request('https://tools/health'),{ORACLE:{}});
 assert.equal((await one.json()).tools.chat,false);
 const two=await worker.fetch(new Request('https://tools/health'),{AI:{run(){}}});
 assert.equal((await two.json()).tools.chat,true);
});
test('missing GPT binding fails without falling back to canned conversation',async()=>{
 const r=await worker.fetch(new Request('https://tools/v1/assist',{method:'POST',headers:{Origin:'https://quantaphi.org'},body:JSON.stringify({request:'hello'})}),{});
 assert.equal(r.status,503);
});
test('Google failure uses explicitly labelled current source fallback, excluding undated news',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>String(url).includes('news.google.com')?new Response('',{status:503}):Response.json({articles:[
  {title:'Current verified headline',url:'https://publisher.example/story',publishedAt:new Date().toISOString(),domain:'publisher.example'},
  {title:'Missing date',url:'https://publisher.example/old'},
  {title:'Future',url:'https://publisher.example/future',publishedAt:new Date(Date.now()+3600000).toISOString()}
 ]});
 try {
  const r=await worker.fetch(new Request('https://tools/v1/assist',{method:'POST',headers:{Origin:'https://quantaphi.org'},body:JSON.stringify({request:'Check Google News headlines'})}),{AI:{run:async(model,options)=>{assert.doesNotMatch(options.messages[1].content,/Missing date/);return {response:'Google News is unavailable. News Phi has current headlines.'};}}});
  const body=await r.json();assert.equal(body.receipt.status,'complete');assert.equal(body.sources.length,1);
  assert.match(body.output,/Google News is unavailable/);assert.match(body.output,/News Phi/);
  assert.equal(body.receipt.provider,'News Phi');
 } finally {globalThis.fetch=original;}
});

test('real project requests identify generic non-actionable replies and limit correction to one pass',async()=>{
 const original="I can certainly help you expand the project's code structure. Growth happens step-by-step. Where should we focus our attention next? We could draft more tests. Let me know which areas.";
 assert.equal(isGenericBuildReply('Continue building out the QuantaPhi robot brain',original),true);
 assert.equal(isGenericBuildReply('How is the weather today?',original),false);
 assert.equal(isGenericBuildReply('Repair Bubbles on QuantaPhi','I created no ticket. The minimum change is to update the Bubbles router and verify the owner session.'),false);
 let calls=0;
 const req=new Request('https://tools/v1/assist',{method:'POST',headers:{Origin:'https://quantaphi.org'},body:JSON.stringify({
   request:'Continue building out QuantaPhi',input:'Prior approved work was the Bubbles owner action adapter.'
 })});
 const resp=await worker.fetch(req,{AI:{run:async()=>{
   calls++;
   return {response:calls===1?original:'No repository edit was made by this chat. The next concrete action is to test the owner Bubbles Brain adapter before submitting a verified ticket.'};
 }}});
 const value=await resp.json();
 assert.equal(resp.status,200);
 assert.equal(calls,2);
 assert.match(value.output,/test the owner Bubbles Brain adapter/);
 assert.doesNotMatch(value.output,/Where should we focus/);
 assert.equal(value.receipt.minted,false);
});


test('live-model invented source edits are not evidence of a completed build',async()=>{
 const invented='**Completed ✅**\\n- The **owner-only verified ticket adapter** has been added to the codebase (e.g., src/ticket_adapter.py with OwnerVerifiedTicketAdapter). It is merged into the main branch.';
 assert.equal(hasUnverifiedActionClaim('Continue building QuantaPhi robot brain.',invented),true);
 assert.equal(hasUnverifiedActionClaim('Continue building QuantaPhi robot brain.','No code edit was performed by this chat. The next step is to inspect Bubbles owner routing tests.'),false);
 let calls=0;
 const req=new Request('https://tools/v1/assist',{method:'POST',headers:{Origin:'https://quantaphi.org'},
  body:JSON.stringify({request:'Continue building QuantaPhi robot brain.',input:'Inspect owner job routing next.'})});
 const result=await worker.fetch(req,{AI:{run:async()=>({response:++calls===1?invented:'No source change was verified. The next step is to inspect and test the owner job adapter before any merge.'})}});
 const body=await result.json();
 assert.equal(result.status,200);assert.equal(calls,2);
 assert.doesNotMatch(body.output,/OwnerVerifiedTicketAdapter|Completed ✅/);
 assert.match(body.output,/No source change was verified/);
 assert.equal(body.receipt.repositoryActionsVerified,false);
 assert.equal(body.receipt.minted,false);
});

test('even repeated invented accomplishments become a deterministic no-write answer',async()=>{
 let calls=0;
 const request=new Request('https://tools/v1/assist',{method:'POST',headers:{Origin:'https://quantaphi.org'},
  body:JSON.stringify({request:'Fix the video generator in QuantaPhi'})});
 const r=await worker.fetch(request,{AI:{run:async()=>{calls++;return{response:'We have deployed the fixed video generator to production.'}}}});
 const body=await r.json();
 assert.equal(calls,2);
 assert.equal(r.status,200);
 assert.match(body.output,/has not verified a code edit/);
 assert.match(body.output,/video generator/);
 assert.doesNotMatch(body.output,/We have deployed/);
 assert.equal(body.receipt.repositoryActionsVerified,false);
});
