import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeGate} from '../bubbles-signin-gate.mjs';
import {summarizeProviderVerification} from '../bubbles-provider-verification.mjs';
import {publicConnection} from '../workers/bubbles-connections/consent.mjs';

const now=Date.now();
const catalog={providers:[
 {id:'google',configured:true,actions:['identity.read','drive.read']},
 {id:'github',configured:true,actions:['repository.read','repository.write']},
 {id:'cloudflare',configured:true,actions:['account.read','projects.build','ledger.read']}
]};
const connected=(provider,grantedActions=[])=>({id:'id-'+provider,provider,status:'connected',
  label:provider+' account',expiresAt:now+3600000,updatedAt:now-60000,grantedActions});

test('verified Cloudflare account overrides stale gate configuration but never invents approvals',()=>{
 const summary=summarizeGate({ok:true,walletVerified:true,accountsVerified:true,ready:false,
  providers:{github:{configured:true,connected:false,permissionsApproved:false},
   cloudflare:{configured:false,connected:false,permissionsApproved:false}},
  accountRecords:[connected('cloudflare',['account.read'])]});
 assert.equal(summary.providers.cloudflare.connected,true);
 assert.equal(summary.providers.cloudflare.configured,true);
 assert.equal(summary.providers.cloudflare.approved,false);
 assert.equal(summary.ready,false);
});

test('gate cannot report a connected provider without a verified wallet session',()=>{
 const result=summarizeGate({ok:false,walletVerified:false,accountsVerified:false,ready:true,
  providers:{github:{configured:true,connected:true,permissionsApproved:true},
   cloudflare:{configured:true,connected:true,permissionsApproved:true}}});
 assert.equal(result.providers.github.connected,false);
 assert.equal(result.providers.cloudflare.connected,false);
 assert.equal(result.ready,false);
});

test('verification center distinguishes provider sign-in from actual permissions',()=>{
 const rows=summarizeProviderVerification(catalog,{accounts:[
  connected('google',['identity.read']),connected('github',[]),connected('cloudflare',['account.read'])
 ]},{now,verifiedSession:true});
 assert.deepEqual(rows.map(r=>r.status),['connected','connected','connected']);
 assert.deepEqual(rows[2].grantedActions,['account.read']);
 assert.deepEqual(rows[2].missingActions,['projects.build','ledger.read']);
 assert.equal(rows[1].grantedActions.length,0,'GitHub sign-in never proves repository writer access');
 assert.equal(rows[0].verifiedAt,null,'storage update is not a verified provider timestamp');
 assert.equal(rows[0].updatedAt,now-60000);
});

test('expired/revoked/unconfigured records never render as connected',()=>{
 const rows=summarizeProviderVerification(
  {providers:[{id:'google',configured:true,actions:[]},{id:'github',configured:true,actions:[]},{id:'cloudflare',configured:false,actions:[]}]},
  {accounts:[{...connected('google'),expiresAt:now-1},{...connected('github'),status:'revoked'}]},
  {now,verifiedSession:true});
 assert.deepEqual(rows.map(r=>r.status),['expired','blocked','unavailable']);
 assert.equal(rows.every(r=>r.connected===false),true);
});

test('unverified wallet or failed account read cannot render green checks',()=>{
 const rows=summarizeProviderVerification(catalog,{accounts:[connected('google')]},{now,verifiedSession:false});
 assert.equal(rows.every(r=>r.status==='unavailable'&&r.connected===false),true);
});

test('verification center is integrated into the existing account page, not a second login system',async()=>{
 const fs=await import('node:fs/promises');
 const page=await fs.readFile(new URL('../bubbles-accounts.html',import.meta.url),'utf8');
 const client=await fs.readFile(new URL('../bubbles-connections.mjs',import.meta.url),'utf8');
 assert.match(page,/bubbles-connections\.mjs/);
 assert.match(client,/summarizeProviderVerification/);
 assert.match(client,/Verification Center/);
 assert.doesNotMatch(page,/localStorage\.setItem\(['"](?:access_token|refresh_token|client_secret)/);
});

test('server account evidence includes its actual record update time, never an invented provider probe',()=>{
 const stored={...connected('google',['identity.read']),userId:'wallet-a',providerSubject:'google-a',
   credentialRef:'private-token-ref',updatedAt:now-12345};
 const published=publicConnection(stored);
 assert.equal(published.updatedAt,now-12345,'The UI must receive an actual server record timestamp');
 assert.equal('verifiedAt' in published,false,'Storage updates are not provider verification');
 assert.equal('credentialRef' in published,false,'Token storage paths stay secret');
 assert.equal('userId' in published,false,'Public account status does not disclose internal wallet IDs');
});
