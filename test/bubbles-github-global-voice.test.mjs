import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {githubResearchIntent,githubResearchReply} from '../bubbles-github-research.mjs';
import {searchGithubCode} from '../workers/infinity-brain-clock/github-search.mjs';
const require=createRequire(import.meta.url);
const {classify}=require('../bubbles-brain-actions.js');

test('search ALL of GitHub does not silently narrow to owner repos or queue a Robot Brain job',()=>{
 for(const request of [
  'Bubbles search all of GitHub repos for better speech intelligence',
  'Search public GitHub code files for Android microphone',
  "Don't search my repos, search all GitHub repos for speech",
  'Research GitHub for APK speech recognition'
 ]){
  const intent=githubResearchIntent(request);
  assert.equal(intent?.scope,'public',request);
  assert.ok(intent.query.length>=2,request);
  assert.equal(classify(request),'chat',request);
 }
 assert.equal(githubResearchIntent('Search my GitHub repos for speech recognition')?.scope,'owner');
 assert.equal(githubResearchIntent('Find GitHub code for Android speech')?.scope,'public');
 assert.equal(githubResearchIntent('Create a GitHub repository named APK'),null);
 assert.equal(classify('Fix Bubbles microphone'), 'queue');
 assert.equal(githubResearchIntent('Research APK'),null);
});
test('public code search reads the global GitHub code index without repo restriction or writes',async()=>{
 let called;
 const result=await searchGithubCode({GITHUB_TOKEN:'fixture'}, {query:'android speech recognition',scope:'public'},async(url,opts)=>{
  called={url,opts};return Response.json({total_count:125,incomplete_results:false,items:[{
   repository:{full_name:'someone/voice-kit'},path:'speech/Vosk.java',sha:'a'.repeat(40),
   html_url:'https://github.com/someone/voice-kit/blob/main/speech/Vosk.java',
   text_matches:[{fragment:'Recognizer accepts buffered speech'}]}]});
 });
 assert.equal(result.status,'code_search_results');
 assert.equal(result.complete,false);
 assert.equal(result.results[0].repository,'someone/voice-kit');
 assert.ok(!called.url.includes('user:www-infinity4'));
 assert.equal(called.opts.redirect,'manual');
 assert.equal(called.opts.method,undefined);
 assert.ok(!JSON.stringify(result).includes('fixture'));
 assert.match(githubResearchReply(result,{scope:'public'}),/someone\/voice-kit\/blob/);
});
test('owner-only code search actually scopes the GitHub query',async()=>{
 let url;
 await searchGithubCode({GITHUB_TOKEN:'fixture'}, {query:'android voice',scope:'owner'},async(u)=>{
  url=u;return Response.json({items:[],total_count:0,incomplete_results:false});
 });
 assert.ok(decodeURIComponent(url).includes('user:www-infinity4'));
});
test('missing code credential falls back to public repo descriptions but never claims to have read files',async()=>{
 let url;
 const result=await searchGithubCode({}, {query:'vosk android',scope:'public'},async(u)=>{
  url=u;return Response.json({items:[{full_name:'sample/vosk',html_url:'https://github.com/sample/vosk',description:'Speech sample'}],total_count:1});
 });
 assert.match(url,/search\/repositories/);
 assert.equal(result.status,'repository_search_fallback');
 assert.match(result.coverage,/files were not searched/i);
 assert.equal(result.complete,false);
 assert.equal(result.results[0].path,'');
 const privateResult=await searchGithubCode({}, {query:'speech',scope:'owner'},()=>{throw Error('must not fetch private code')});
 assert.equal(privateResult.ok,false);
});
test('the website retains FIFO voice turns, wider speech segments, and the o O o app identity',()=>{
 const ai=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 const voice=readFileSync(new URL('../bubbles-stream-voice.js',import.meta.url),'utf8');
 const manifest=JSON.parse(readFileSync(new URL('../bubbles-manifest.json',import.meta.url),'utf8'));
 assert.match(ai,/voicePending\.push\(text\)/);
 assert.match(ai,/voicePending\.shift\(\)/);
 assert.doesNotMatch(ai,/voicePending=turn\.text/);
 assert.match(voice,/quiet>=1\.8/);
 assert.match(voice,/lead\.length>Math\.ceil\(\.45\/seconds\)/);
 assert.equal(manifest.icons[0].src,'/assets/bubbles-pwa-oOo.svg');
});
