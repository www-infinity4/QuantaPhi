import test from 'node:test';
import assert from 'node:assert/strict';
import {googleReadURL,executeGoogleRead} from '../workers/bubbles-connections/google-read.mjs';
import {googleAdapter} from '../workers/bubbles-connections/providers.mjs';
import {authorizeConnection} from '../workers/bubbles-connections/authorization.mjs';
import {readFileSync} from 'node:fs';

test('Google connection requests Gmail scope only on explicit user selection',()=>{
 const google=googleAdapter({clientId:'test-client',clientSecret:'only-server-secret',redirectUri:'https://quantaphi.org/api/bubbles/connections/google/callback'});
 const url=new URL(google.authorization({state:'x'.repeat(43),challenge:'z'.repeat(43),actions:['gmail.read']}));
 const scope=url.searchParams.get('scope');
 assert.match(scope,/openid email/);
 assert.match(scope,/https:\/\/www.googleapis.com\/auth\/gmail.readonly/);
 assert.doesNotMatch(scope,/gmail.send|gmail.modify|gmail.compose|mail.google.com/);
 assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 assert.equal(url.origin,'https://accounts.google.com');
});
test('Gmail operations use fixed Google API paths, bounded message IDs and metadata preview only',()=>{
 const q=new URL(googleReadURL('gmail.search',{query:'from:example@example.com'},{}));
 assert.equal(q.origin,'https://gmail.googleapis.com');assert.equal(q.searchParams.get('maxResults'),'20');
 assert.equal(q.searchParams.get('q'),'from:example@example.com');
 assert.throws(()=>googleReadURL('gmail.search',{query:'x'.repeat(161)},{}),/gmail_query_invalid/);
 const m=new URL(googleReadURL('gmail.message',{messageId:'abcDEF_123'},{}));
 assert.equal(m.searchParams.get('format'),'metadata');
 assert.deepEqual(m.searchParams.getAll('metadataHeaders'),['From','Subject','Date']);
 assert.doesNotMatch(m.href,/format=full|format=raw/);
 assert.throws(()=>googleReadURL('gmail.message',{messageId:'../../evil'},{}),/gmail_message_invalid/);
});
test('Bubbles only reads Gmail using verified per-wallet account plus matching grant',async()=>{
 let calls=0;
 const service={withCredential:async ({userId,provider,action},callback)=>{
  assert.equal(userId,'wallet-verified-user');assert.equal(provider,'google');assert.equal(action,'gmail.read');
  return callback('test-access-token',{resourceGrants:{},revision:'revision'});
 }};
 const mock=async(url,options)=>{
  calls++;assert.equal(new URL(url).hostname,'gmail.googleapis.com');
  assert.equal(options.headers.Authorization,'Bearer test-access-token');
  return Response.json({messages:[{id:'abcDEF_123'}]});
 };
 const data=await executeGoogleRead(service,{userId:'wallet-verified-user',id:'connection-id',operation:'gmail.search',args:{query:''}},mock);
 assert.equal(data.receipt.status,'provider_confirmed');
 assert.equal(data.data.messages[0].id,'abcDEF_123');
 assert.equal(calls,1);
 assert.equal(authorizeConnection({userId:'wallet-verified-user',provider:'google',action:'gmail.read',
  connection:{userId:'wallet-verified-user',provider:'google',status:'connected',providerSubject:'google-1',credentialRef:'sealed',expiresAt:Date.now()+90000,grantedActions:['calendar.read']}}).ok,false);
});
test('Gmail UI is opt-in and does not imply general Google account control or email delivery',()=>{
 const ui=readFileSync(new URL('../bubbles-connections.mjs',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../workers/bubbles-connections/google-read.mjs',import.meta.url),'utf8');
 assert.match(ui,/Read Gmail messages/);
 assert.match(ui,/gmailGranted/);
 assert.match(ui,/Gmail · read-only in Bubbles/);
 assert.match(worker,/gmail.message/);
 assert.doesNotMatch(worker,/users\/me\/messages\/send/);
});