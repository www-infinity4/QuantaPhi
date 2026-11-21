import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {googleAdapter} from '../workers/bubbles-connections/providers.mjs';

const config={
 clientId:'test-google-oauth-client',
 clientSecret:'test-server-only-secret',
 redirectUri:'https://quantaphi.org/api/bubbles/connections/google/callback'
};

test('Google identity-only OAuth requests only openid and email, no Drive/Gmail access',()=>{
 const adapter=googleAdapter(config);
 const url=new URL(adapter.authorization({state:'test-state',challenge:'test-pkce-challenge',actions:[]}));
 assert.equal(url.hostname,'accounts.google.com');
 assert.equal(url.searchParams.get('client_id'),config.clientId);
 assert.equal(url.searchParams.get('redirect_uri'),config.redirectUri);
 assert.deepEqual(url.searchParams.get('scope').split(' '),['openid','email']);
 assert.equal(url.searchParams.get('state'),'test-state');
 assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 assert.ok(!/gmail|drive|spreadsheets|calendar/i.test(url.searchParams.get('scope')));
});

test('Google identity-only exchange verifies subject and grants zero service actions',async()=>{
 const adapter=googleAdapter(config,async(url,options)=>{
  if(url==='https://oauth2.googleapis.com/token'){
   assert.equal(options.method,'POST');
   assert.equal(options.body.get('client_secret'),config.clientSecret);
   return Response.json({access_token:'test-access',refresh_token:'test-refresh',token_type:'Bearer',expires_in:3600,scope:'openid email'});
  }
  assert.equal(url,'https://openidconnect.googleapis.com/v1/userinfo');
  assert.equal(options.headers.Authorization,'Bearer test-access');
  return Response.json({sub:'google-user-id',email:'visitor@example.test',email_verified:true});
 });
 const result=await adapter.exchange({code:'one-time-code',verifier:'pkce-verifier',actions:[]});
 assert.equal(result.subject,'google-user-id');
 assert.equal(result.label,'visitor@example.test');
 assert.deepEqual(result.grantedActions,[]);
});

test('Gemini quick card uses the existing wallet-bound Google OAuth connector, never a browser secret',()=>{
 const source=readFileSync(new URL('../source-quick-cards.mjs',import.meta.url),'utf8');
 assert.match(source,/client\.connect\('google',\[\]/);
 assert.match(source,/resolveConnectorWalletToken\(window\)/);
 assert.match(source,/client\.call\('\/accounts'\)/);
 assert.doesNotMatch(source,/GOOGLE_CLIENT_SECRET|GEMINI_API_KEY/);
});
