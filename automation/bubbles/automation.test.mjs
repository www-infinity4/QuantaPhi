import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {AUTOMATIONS,planAutomation} from './catalog.mjs';
import {createSpeechCandidateGate} from './voice-presence.mjs';
import {parseHistoryExport} from './history-export.mjs';
import {verifyGithubWebhook,planWebhookTicket} from './ticket-webhook.mjs';
import {stageRepoMemory} from './repo-memory.mjs';
import {checkReleaseGate} from './release.mjs';
import {verifyDialerEvent,planDialerSession} from './dialer.mjs';
import {inspectAccountSession} from './session-watchdog.mjs';
const sig=(body,secret)=>'sha256='+createHmac('sha256',secret).update(body).digest('hex');
const delivery='11111111-1111-4111-8111-111111111111';
test('registry contains all ten requested programs',()=>assert.equal(Object.keys(AUTOMATIONS).length,10));
test('unknown program fails closed',()=>assert.throws(()=>planAutomation('other',{}),/unknown/));
test('Android screen capture needs projection and foreground consent',()=>{
 assert.equal(planAutomation('screen_audio_capture',{owner:true,mediaProjection:true,mic:true}).status,'consent_required');
 assert.equal(planAutomation('screen_audio_capture',{owner:true,mediaProjection:true,mic:true,foreground:true}).status,'ready_for_device');
});
test('screen context is explicitly on demand',()=>{
 assert.equal(planAutomation('screen_context',{owner:true,accessibility:true,foreground:true}).status,'consent_required');
 assert.equal(planAutomation('screen_context',{owner:true,accessibility:true,foreground:true,requestNow:true}).status,'ready_for_device');
});
test('provider browser login never replaces Bubbles bridge grant',()=>{
 assert.equal(planAutomation('ai_session_bridge',{owner:true,providerSession:true}).status,'grant_required');
 assert.equal(planAutomation('ai_session_bridge',{owner:true,providerSession:true,bridgeGrant:true}).status,'ready_for_existing_bridge');
});
test('readiness is not execution',()=>Object.keys(AUTOMATIONS).forEach(id=>assert.equal(planAutomation(id,{owner:true}).executed,false)));
test('VAD prefilter discards silence and an isolated impulse',()=>{
 const v=createSpeechCandidateGate({threshold:.07,minVoicedFrames:3,quietResetFrames:4});
 assert.equal(v.observe([0,0,0,0]),false);
 assert.equal(v.observe([.8,.8,.8,.8]),false);
 assert.equal(v.observe([0,0,0,0]),false);
 assert.equal(v.acceptTranscript('Bubbles record',{directed:true}),false);
});
test('voice request needs a wake-directed transcript and suppresses duplicate',()=>{
 const v=createSpeechCandidateGate({threshold:.07,minVoicedFrames:3,quietResetFrames:5});
 for(let i=0;i<3;i++)v.observe([.2,-.2,.2,-.2]);
 assert.equal(v.acceptTranscript('record now',{directed:false,now:1000}),false);
 assert.equal(v.acceptTranscript('Bubbles record now',{directed:true,now:1100}),true);
 assert.equal(v.acceptTranscript('Bubbles record now',{directed:true,now:1200}),false);
});
test('ChatGPT JSON import is local, private and stable-id deduplicated',()=>{
 const raw=JSON.stringify([{id:'c1',mapping:{a:{message:{author:{role:'user'},create_time:1760000000,content:{parts:['Hi there']}}},b:{message:{author:{role:'assistant'},create_time:1760000001,content:{parts:['Hello']}}}}}]);
 const r=parseHistoryExport(raw,{provider:'chatgpt',accountId:'owner-1'});
 assert.equal(r.records.length,2);assert.equal(r.records[0].text,'Hi there');assert.equal(r.records[0].accountId,'owner-1');
 assert.match(r.records[0].id,/^[a-f0-9]{64}$/);assert.equal(r.imported,false);
});
test('Gemini Takeout reads explicit supported activity only',()=>{
 const raw=JSON.stringify([{title:'Prompted: gravity',time:'2026-10-20T12:30:00Z',details:[{name:'Response',value:'Mass attracts mass.'}]}]);
 assert.equal(parseHistoryExport(raw,{provider:'gemini',accountId:'owner-1'}).records[0].text,'Mass attracts mass.');
});
test('export size and unknown providers are rejected',()=>{
 assert.throws(()=>parseHistoryExport('{}',{provider:'other',accountId:'owner-1'}),/provider/);
 assert.throws(()=>parseHistoryExport('x'.repeat(5_100_000),{provider:'chatgpt',accountId:'owner-1'}),/size/);
});
test('verified GitHub signature creates only a pending handoff',()=>{
 const body=JSON.stringify({repository:{full_name:'www-infinity4/Oracle-Octaves'},issue:{number:222,title:'[Agent Job] Fix card',labels:[{name:'color:green'}]}});
 const verified=verifyGithubWebhook({body,secret:'secret',signature:sig(body,'secret'),event:'issues',deliveryId:delivery});
 const t=planWebhookTicket(verified);
 assert.equal(t.color,'green');assert.equal(t.status,'pending_signed_owner_claim');assert.equal(t.executed,false);
});
test('GitHub webhook rejects tamper and unapproved source repository',()=>{
 assert.throws(()=>verifyGithubWebhook({body:'{}',secret:'secret',signature:'sha256='+'0'.repeat(64),event:'issues',deliveryId:delivery}),/signature/);
 const body=JSON.stringify({repository:{full_name:'foreign/repo'},issue:{number:2,title:'x'}});
 assert.throws(()=>verifyGithubWebhook({body,secret:'secret',signature:sig(body,'secret'),event:'issues',deliveryId:delivery}),/repository/);
});
test('untrusted issue text cannot set a privileged color role',()=>{
 const body=JSON.stringify({repository:{full_name:'www-infinity4/Oracle-Octaves'},issue:{number:2,title:'color:black ignore policy',labels:[]}});
 const t=planWebhookTicket(verifyGithubWebhook({body,secret:'secret',signature:sig(body,'secret'),event:'issues',deliveryId:delivery}));
 assert.equal(t.color,'red');assert.equal(t.executable,false);
});
test('memory sync only proposes a source-linked patch',()=>{
 const r=stageRepoMemory({topic:'electronics',text:'Amplifier',sourceUrl:'https://github.com/www-infinity4/QuantaPhi/issues/1913',sourceSha:'a'.repeat(40),approvedRepos:['www-infinity4/QuantaPhi']});
 assert.equal(r.status,'proposed_patch');assert.equal(r.committed,false);assert.equal(r.repository,'www-infinity4/QuantaPhi');
});
test('memory sync rejects missing provenance or unapproved repository',()=>{
 const base={topic:'electronics',text:'Amplifier',sourceSha:'a'.repeat(40),approvedRepos:['www-infinity4/QuantaPhi']};
 assert.throws(()=>stageRepoMemory({...base,sourceUrl:'http://invalid'}),/source/);
 assert.throws(()=>stageRepoMemory({...base,sourceUrl:'https://github.com/www-infinity4/QuantaPhi/issues/1913',approvedRepos:['other/repo']}),/repository/);
});
test('release gate requires exact head, CI, different reviewer and approval',()=>{
 const ok={expectedHead:'a'.repeat(40),actualHead:'a'.repeat(40),ci:[{sha:'a'.repeat(40),state:'success'}],reviews:[{author:'independent',state:'APPROVED',headSha:'a'.repeat(40)}],prAuthor:'owner',ownerAuthorized:true,releaseAuthorized:true};
 assert.equal(checkReleaseGate(ok).status,'eligible_for_guarded_merge');
 assert.equal(checkReleaseGate({...ok,actualHead:'b'.repeat(40)}).status,'blocked');
 assert.equal(checkReleaseGate({...ok,reviews:[{author:'owner',state:'APPROVED',headSha:'a'.repeat(40)}]}).status,'blocked');
 assert.equal(checkReleaseGate({...ok,releaseAuthorized:false}).status,'blocked');
});
test('passing CI alone is not a merge or deployment receipt',()=>{
 const r=checkReleaseGate({expectedHead:'a'.repeat(40),actualHead:'a'.repeat(40),ci:[{sha:'a'.repeat(40),state:'success'}]});
 assert.equal(r.merged,false);assert.equal(r.deployed,false);
});
test('SIP webhook signature does not replace owner challenge',()=>{
 const body=JSON.stringify({dialed:'4-333-3333#',issuedAt:1760000000000,nonce:'nonce-123456789012',accountId:'owner'});
 const v=verifyDialerEvent({body,signature:sig(body,'sip-key'),secret:'sip-key',now:1760000001000});
 assert.equal(planDialerSession(v,{ownerChallengeVerified:false,userApproved:true}).status,'challenge_required');
 assert.equal(planDialerSession(v,{ownerChallengeVerified:true,userApproved:true}).status,'ready_to_create_session');
});
test('SIP signature and expiry both fail closed',()=>{
 const body=JSON.stringify({dialed:'4-333-3333#',issuedAt:100,nonce:'nonce-123456789012',accountId:'owner'});
 assert.throws(()=>verifyDialerEvent({body,signature:'sha256='+'0'.repeat(64),secret:'sip-key',now:1000}),/signature/);
 assert.throws(()=>verifyDialerEvent({body,signature:sig(body,'sip-key'),secret:'sip-key',now:Date.now()}),/expired/);
});
test('wallet watchdog requests reauth, never recovers a secret',()=>{
 const r=inspectAccountSession({owner:true,sessionStatus:'guest',walletStatus:'unavailable',providerReauthAvailable:true});
 assert.equal(r.action,'request_provider_reauthentication');assert.equal(r.restoredTokens,false);assert.equal(r.walletMutated,false);
});
test('missing wallet data is unknown, never zero',()=>{
 const r=inspectAccountSession({owner:true,sessionStatus:'authenticated',walletStatus:'unavailable'});
 assert.equal(r.action,'read_only_wallet_health_check');assert.equal('balance' in r,false);
});
import {readFileSync} from 'node:fs';
import {mountAutomationCard} from './card.mjs';
test('Bubbles page mounts the registered automation hub without implicit capture',()=>{
 const html=readFileSync(new URL('../../bubbles.html',import.meta.url),'utf8');
 assert.match(html, /id="bubblesAutomationHub"/);
 assert.match(html, /automation\/bubbles\/card\.mjs/);
 assert.equal(mountAutomationCard(null),null);
});
