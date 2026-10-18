import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bubbleTag,parsePersonalPost,fetchOwnedXPosts,resolveXAccount,verificationTokenFromPost} from '../workers/infinity-brain-clock/personal-social-tags.mjs';
import {classifyCommunitySuggestion,validateGPTVerdict,reviewCommunityWithGPT} from '../workers/infinity-brain-clock/community-upgrades.mjs';
const xOwner='111222333444555',profile={provider:'x',verified:1,command_tag:'#albert',social_account_id:xOwner};
function post(text,author_id=xOwner,id='999888777666555'){return {id,author_id,text,created_at:new Date().toISOString()};}

test('per-user names become local hashtags, never account identities',()=>{
 assert.equal(bubbleTag('Albert'),'#albert');
 assert.equal(bubbleTag('Bubbles AI'),'#bubblesai');
 assert.equal(bubbleTag('Al!bèrT'),'#albert');
 assert.equal(bubbleTag('💜'),null);
});
test('only verified matching author posts enter their own personal queue',()=>{
 assert.equal(parsePersonalPost(post('#Albert make the words readable on my site'),profile)?.tag,'#albert');
 assert.equal(parsePersonalPost(post('#Albert make the words readable on my site'),{...profile,verified:0}),null);
 assert.equal(parsePersonalPost(post('#albert fix my screen', '345345345'),profile),null);
 assert.equal(parsePersonalPost(post('#alberta fix my screen'),profile),null);
 assert.equal(parsePersonalPost(post('Browse https://foo.org/#albert fix my screen'),profile),null);
 assert.equal(parsePersonalPost({...post('#albert fix my screen'),referenced_tweets:[{type:'retweeted'}]},profile),null);
 assert.equal(parsePersonalPost(post('#albert verify '+ 'a'.repeat(32)),profile),null);
});
test('X identity proof is tied to the author and a fresh 32-character challenge',()=>{
 const now=Date.now(),proof=post('#albert verify '+ 'b'.repeat(32));
 assert.equal(verificationTokenFromPost(proof,'#albert',xOwner,now-120000),'b'.repeat(32));
 assert.equal(verificationTokenFromPost(proof,'#albert','9999',now-120000),null);
 assert.equal(verificationTokenFromPost({...proof,created_at:new Date(now-86400000).toISOString()},'#albert',xOwner,now-120000),null);
});
test('X username resolver never accepts third party endpoints or untrusted id',async()=>{
 let url,head;
 const data=await resolveXAccount('@fred',{token:'test-secret-token',fetchImpl:async(u,opts)=>{
  url=u;head=opts.headers;return Response.json({data:{id:xOwner,username:'fred'}});
 }});
 assert.equal(data.accountId,xOwner);
 assert.equal(url,'https://api.x.com/2/users/by/username/fred');
 assert.equal(head.Authorization,'Bearer test-secret-token');
 assert.equal((await resolveXAccount('https://evil.test',{token:'test-secret-token'})).ok,false);
});
test('timeline reader pins official origin, account ID and ignores other authors',async()=>{
 const out=await fetchOwnedXPosts({accountId:xOwner,token:'test-secret-token',fetchImpl:async(url,options)=>{
  assert.ok(url.startsWith('https://api.x.com/2/users/'+xOwner+'/tweets?'));
  assert.equal(options.redirect,'error');
  return Response.json({data:[post('#albert make text readable'),post('#albert hack it','111')],meta:{}});
 }});
 assert.equal(out.ok,true);assert.equal(out.posts.length,1);
 const noAccess=await fetchOwnedXPosts({accountId:xOwner,token:''});
 assert.equal(noAccess.ok,false);
});
test('community policy preserves the exact example placements with no auto-execution',()=>{
 const cases=[
  ['#bubbles draw dicks on QuantaPhi',false,null],
  ['#bubbles make the words more readable on QuantaPhi green',true,'readability'],
  ['#bubbles add xavior ai to its best fitting place on QuantaPhi',true,'ai-sources'],
  ['#bubbles do research on iodine tag made by #krIswatson',true,'research-learn'],
  ["#bubbles add my AI to Fred's media Star card",true,'ai-sources'],
  ["#bubbles add Bitcoin advertising near Fred's Media Star card",true,'media-star-adjacent']
 ];
 for(const [text,accepted,placement] of cases){
  const result=classifyCommunitySuggestion(text);
  assert.equal(result.accepted,accepted,text);
  if(accepted){assert.equal(result.placement,placement,text);assert.equal(result.execute,false);}
 }
 assert.equal(classifyCommunitySuggestion("#bubbles add my AI to Fred's media Star card").route,'reroute');
});
test('GPT cannot override a forced cross-owner reroute or publish ads',()=>{
 const forced=classifyCommunitySuggestion("#bubbles add my AI to Fred's media Star card");
 const verdict=validateGPTVerdict({decision:'relevant',category:'feature',placement:'media-star-adjacent',risk:'low',summary:'Place in Fred media card'},forced);
 assert.equal(verdict.placement,'ai-sources');
 assert.equal(verdict.status,'rerouted');
 assert.equal(verdict.automaticExecution,false);
 const ad=classifyCommunitySuggestion('Advertise Bitcoin under Fred Media Star');
 const adVerdict=validateGPTVerdict({decision:'relevant',category:'sponsor',risk:'low',summary:'Bitcoin sponsor'},ad);
 assert.equal(adVerdict.risk,'high');assert.equal(adVerdict.ownerPermissionsGranted,false);
});
test('reasoning GPT is explicitly configured only if provider key exists',async()=>{
 const target=classifyCommunitySuggestion('Please make words more readable on the QuantaPhi page');
 const missing=await reviewCommunityWithGPT('Please make words more readable on the QuantaPhi page',target,{});
 assert.equal(missing.status,'needs_review');
 let sent;const reply=await reviewCommunityWithGPT('Please make words more readable on the QuantaPhi page',target,{
  apiKey:'mock-test-key',fetchImpl:async(url,options)=>{
   sent=JSON.parse(options.body);
   return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({decision:'relevant',category:'ui',placement:'readability',risk:'low',summary:'Increase legibility'})}]}]});
  }
 });
 assert.equal(sent.model,'gpt-5.1');
 assert.deepEqual(sent.reasoning,{effort:'high'});
 assert.equal(sent.store,false);assert.equal(reply.placement,'readability');
 assert.equal(reply.automaticExecution,false);
});
test('private personal social routes verify wallet identities, never write to third-party sites',()=>{
 const server=readFileSync('workers/infinity-brain-clock/worker.js','utf8');
 const a=server.indexOf("if(path==='/bubble/personal-social'&&request.method==='POST')");
 const b=server.indexOf("if(path==='/community/upgrade'&&request.method==='POST')");
 assert.ok(a>0&&b>a);
 const scope=server.slice(a,b);
 assert.match(scope,/BOT_WALLET/);assert.match(scope,/wallet\/state/);
 assert.match(scope,/source_id/);assert.match(scope,/challenge_hash/);
 assert.match(scope,/social_identity_not_verified/);
 assert.doesNotMatch(scope,/run-next|deploy|makeJobs\(/);
});
test('web control is honest about real account verification and optional Facebook',()=>{
 const html=readFileSync('index.html','utf8'),ui=readFileSync('bubbles-personal-social.js','utf8');
 const bubble=readFileSync('bubbles-ai.js','utf8');
 assert.match(html,/bubblePersonalSocial/);
 assert.match(html,/#albert/);
 assert.match(ui,/bubble\/personal-social/);
 assert.match(ui,/starquest_ledger_device_v1/);
 assert.match(bubble,/bubbles:personal-name-request/);
 assert.match(bubble,/bubbles:name-updated/);
});
