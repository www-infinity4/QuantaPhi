import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {startGithubDevice,pollGithubDevice,githubDeviceStatus,disconnectGithubDevice} from '../workers/infinity-brain-clock/github-device-flow.mjs';
const makeStorage=()=>{const m=new Map();return {
 get:async key=>m.get(key),put:async(key,value)=>m.set(key,value),delete:async key=>m.delete(key)
};};
const env={GITHUB_OAUTH_CLIENT_ID:'Iv1.bubblesclient123',BOT_WORK_SECRET:'test-only-secret-key-for-encryption'};
const payload=(object,headers={})=>new Response(JSON.stringify(object),{status:200,headers});
test('GitHub login is a real device approval, never a token in browser UI',async()=>{
 const store=makeStorage(),requests=[];
 const fetchMock=async(url,options)=>{
  requests.push({url,body:options.body});
  if(url.endsWith('/device/code'))return payload({
   device_code:'device_code_value_abcdefghijklmnopqrstuvwxyz',
   user_code:'ABCD-1234',verification_uri:'https://github.com/login/device',
   expires_in:900,interval:5});
  if(url.endsWith('/access_token'))return payload({error:requests.filter(x=>x.url.endsWith('/access_token')).length===1?'authorization_pending':undefined,
   access_token:requests.filter(x=>x.url.endsWith('/access_token')).length===2?'ghu_abcdefghijklmnopqrstuvwxyz1234567890':undefined,expires_in:28800});
  if(url.endsWith('/user'))return payload({login:'www-infinity4'},{'x-oauth-scopes':'repo,workflow'});
  throw Error('unrecognized GitHub request');
 };
 const opened=await startGithubDevice(env,store,fetchMock);
 assert.equal(opened.status,'awaiting_github_approval');
 assert.equal(opened.userCode,'ABCD-1234');
 assert.equal(opened.verificationUrl,'https://github.com/login/device');
 assert.equal(JSON.stringify(opened).includes('device_code_value'),false);
 assert.equal(JSON.stringify(opened).includes('ghu_'),false);
 let flow=await store.get('bubbles-github-device-flow-v1');
 flow.nextPollAt=Date.now()-1;await store.put('bubbles-github-device-flow-v1',flow);
 assert.equal((await pollGithubDevice(env,store,fetchMock)).status,'pending');
 flow=await store.get('bubbles-github-device-flow-v1');
 flow.nextPollAt=Date.now()-1;await store.put('bubbles-github-device-flow-v1',flow);
 const connected=await pollGithubDevice(env,store,fetchMock);
 assert.equal(connected.status,'connected');
 assert.equal(connected.login,'www-infinity4');
 assert.equal(JSON.stringify(connected).includes('ghu_'),false);
 const record=await store.get('bubbles-github-credential-v1');
 assert.ok(record.ciphertext);
 assert.equal(JSON.stringify(record).includes('ghu_'),false);
 assert.equal((await githubDeviceStatus(env,store)).status,'connected');
 assert.equal((await disconnectGithubDevice(store)).status,'disconnected');
 assert.equal((await githubDeviceStatus(env,store)).status,'disconnected');
});
test('the Worker only exposes device approval after owner verification',()=>{
 const worker=readFileSync(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
 const section=worker.slice(worker.indexOf("if(path==='/owner/github/auth'"),worker.indexOf("if(['/work/tickets/create'"));
 assert.match(section,/ownerAuthorized\(env,token\)/);
 assert.match(section,/origin_not_allowed/);
 assert.match(section,/clock\.internal\/github\/auth/);
 assert.doesNotMatch(section,/github_access_token|client_secret|body\.token/);
});
test('Android foreground capture does not steal the voice recognizer or open external recorder',()=>{
 const dir=new URL('../android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/',import.meta.url);
 const source=name=>readFileSync(new URL(name,dir),'utf8');
 const native=source('BubblesService.java');
 const screen=source('ScreenCaptureService.java');
 const app=source('MainActivity.java');
 assert.match(native,/case "screen_video":[\s\S]*?offerCaptureApproval\(command\)/);
 assert.match(native,/oracleWindow\.sendSpoken\(addressed, ambientContext\)/);
 assert.doesNotMatch(native,/\n\s*attachXRecorderButton\(\);/);
 assert.match(app,/screenVideo\.setOnClickListener\(v -> beginScreen\(false\)\)/);
 assert.match(screen,/recorder\.start\(\); recordingStarted = true/);
 assert.doesNotMatch(screen,/sharedAudio = BubblesService\.beginScreenAudio\(\)/);
 assert.match(screen,/CapturePublisher\.publish\(this, completed, type\)/);
});
