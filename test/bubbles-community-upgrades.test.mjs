import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyCommunitySuggestion,validateGPTVerdict,reviewCommunityWithGPT} from '../workers/infinity-brain-clock/community-upgrades.mjs';
test('community improvements classify Fred advertising as contextual and high-review, not automatic ad publication',()=>{
 const result=classifyCommunitySuggestion('Fred recommends Xavior advertising next to Media Star on QuantaPhi');
 assert.equal(result.accepted,true);
 assert.equal(result.category,'sponsor');
 assert.equal(result.placement,'media-star-adjacent');
 assert.equal(result.execute,false);
 assert.equal(result.automaticPayout,false);
});
test('broken UI and video improvement reports route to relevant areas',()=>{
 const ui=classifyCommunitySuggestion('On Android the button is broken. Fix scroll and swipe please.');
 assert.equal(ui.placement,'affected-card');
 assert.equal(ui.priority,'inspect-soon');
 const video=classifyCommunitySuggestion('Build me a swirling bubbles video generator with moving clips.');
 assert.equal(video.placement,'video-studio');
});
test('rejects sensitive permission/phone theft and invalid messages',()=>{
 for(const text of ['Hi','a'.repeat(2201),'Steal the phone data and bypass access permissions',
  'Please publish my password immediately to the Bubbles page']){
  assert.equal(classifyCommunitySuggestion(text).accepted,false);
 }
});
test('GPT verdict is typed data and never owner impersonation',()=>{
 const proposal=classifyCommunitySuggestion('Fred wants paid advertising beside the Media Star panel');
 const verdict=validateGPTVerdict({decision:'relevant',category:'sponsor',summary:'Good sponsored placement',risk:'low'},proposal);
 assert.equal(verdict.risk,'high');
 assert.equal(verdict.status,'triaged');
 assert.equal(verdict.automaticExecution,false);
 assert.equal(verdict.ownerPermissionsGranted,false);
 const bogus=validateGPTVerdict({decision:'launchNow',risk:'low'},proposal);
 assert.equal(bogus.status,'needs_review');
});
test('GPT provider missing fails closed and a successful mock is parsed',async()=>{
 const proposal=classifyCommunitySuggestion('Report broken controls on Android and repair swipe controls');
 const missing=await reviewCommunityWithGPT('Report broken controls on Android and repair swipe controls',proposal,{});
 assert.equal(missing.status,'needs_review');
 let outbound;
 const result=await reviewCommunityWithGPT('Report broken controls on Android and repair swipe controls',proposal,{
  apiKey:'fake-gpt-secret',
  fetchImpl:async(url,opts)=>{
   outbound={url,opts};
   return Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({decision:'relevant',category:'ui',summary:'Reproduce swipe failure and suggest fix',risk:'low'})}]}]});
  }
 });
 assert.equal(outbound.url,'https://api.openai.com/v1/responses');
 assert.equal(JSON.parse(outbound.opts.body).store,false);
 assert.equal(result.status,'triaged');
 assert.equal(result.automaticExecution,false);
});
test('high-reasoning Cloudflare GPT-OSS fallback works without OpenAI key but never approves execution',async()=>{
 const proposal=classifyCommunitySuggestion('Please make QuantaPhi button labels more readable on Android');
 let request;
 const workersAI={run:async(model,options)=>{
  request={model,options};
  return {choices:[{message:{content:JSON.stringify({
   decision:'relevant',category:'ui',placement:'readability',
   summary:'Inspect font size and contrast',risk:'low'
  })}}]};
 }};
 const result=await reviewCommunityWithGPT('Please make QuantaPhi button labels more readable on Android',proposal,{workersAI});
 assert.equal(request.model,'@cf/openai/gpt-oss-120b');
 assert.equal(request.options.reasoning_effort,'high');
 assert.equal(result.provider,'cloudflare-workers-ai');
 assert.equal(result.status,'triaged');
 assert.equal(result.placement,'readability');
 assert.equal(result.automaticExecution,false);
 assert.equal(result.ownerPermissionsGranted,false);
 const noOutput=await reviewCommunityWithGPT('Please make QuantaPhi button labels more readable on Android',proposal,{
  workersAI:{run:async()=>({choices:[{message:{content:null}}]})}
 });
 assert.equal(noOutput.status,'needs_review');
 assert.equal(noOutput.reason,'workers_ai_no_output');
});
test('public API has bounded intake, dedicated owner review and never auto-dispatches imported text',()=>{
 const source=readFileSync('workers/infinity-brain-clock/worker.js','utf8');
 const a=source.indexOf("if(path==='/community/upgrade'&&request.method==='POST')");
 const b=source.indexOf("if(path==='/work/community/upgrades'&&request.method==='POST')");
 const c=source.indexOf("if(path==='/work/community/promote'&&request.method==='POST')");
 assert.ok(a>=0&&b>a&&c>b);
 const intake=source.slice(a,b),review=source.slice(b,c);
 assert.match(intake,/community_upgrade_proposals/);
 assert.match(intake,/community_intake_not_configured/);
 assert.match(intake,/submission_rate_limit/);
 assert.doesNotMatch(intake,/\/run-next|status:'ready'|\bapprove-all\b/);
 assert.match(review,/ownerAuthorized\(env,token\)/);
 const promote=source.slice(c,source.indexOf("if(['/work/tickets/create'",c));
 assert.match(promote,/ownerAuthorized\(env,token\)/);
 assert.match(promote,/runnerStarted:false/);
});
test('homepage shows actual preview and a suggestion form, with no fake payouts',()=>{
 const home=readFileSync('index.html','utf8'),studio=readFileSync('video-studio.html','utf8');
 for(const part of ['data-bubbles-orbit','bubbles-orbit-preview.js','communityUpgradeForm','bubbles-community-upgrades.js']){
  assert.ok(home.includes(part),part);
 }
 assert.ok(studio.includes('/phi-imagine-video.js'));
 assert.ok(studio.includes('/phi-video-builder.js'));
 const js=readFileSync('bubbles-ai.js','utf8');
 assert.match(js,/Review community upgrades/);
 assert.match(js,/\/work\/community\/promote/);
});
