import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectConnectionIntegrity,ENTRY_REQUIREMENTS} from '../workers/bubbles-connections/integra.mjs';
const now=100000,configured={github:true,cloudflare:true};
const account=(provider,extra={})=>({provider,label:'Verified account',status:'connected',expiresAt:now+60000,integrityVerified:true,grantedActions:[...ENTRY_REQUIREMENTS[provider]],...extra});
const inspect=(accounts,extra={})=>inspectConnectionIntegrity({accounts,configured,cloudflareFullReady:true,now,...extra});
test('Integra confirms both server-verified connections but grants no execution authority',()=>{
 const result=inspect([account('github'),account('cloudflare')]);
 assert.equal(result.ready,true);assert.equal(result.integra.status,'passed');
 assert.equal(result.integra.executionAuthorized,false);assert.equal(result.enforced,false);
 assert.deepEqual(result.integra.blockers,[]);
});
test('missing, corrupted, expired, revoked and partial connections remain blocked',()=>{
 for(const change of [{integrityVerified:false},{integrityVerified:undefined},{expiresAt:now},{expiresAt:now+30000},{status:'disconnected'},{grantedActions:[]}]){
  const result=inspect([account('github'),account('cloudflare',change)]);
  assert.equal(result.ready,false);assert.equal(result.integra.status,'blocked');
 }
 assert.equal(inspect([]).ready,false);
});
test('app registration and every configured scope must agree with the saved grant',()=>{
 const accounts=[account('github'),account('cloudflare')];
 assert.equal(inspect(accounts,{configured:{github:true,cloudflare:false}}).ready,false);
 const limited=inspect(accounts,{cloudflareFullReady:false});
 assert.equal(limited.ready,true);assert.equal(limited.providers.cloudflare.scopeSetupRequired,true);
 assert.equal(limited.providers.cloudflare.projectPermissionsApproved,false);
 assert.deepEqual(limited.integra.blockers,[]);
});
test('a complete verified account wins over another partial saved account',()=>{
 const result=inspect([account('github'),account('cloudflare',{grantedActions:[]}),account('cloudflare')]);
 assert.equal(result.ready,true);
});

test('minimum verified Cloudflare identity permits app entry without project-admin consent',()=>{
 const result=inspect([account('github'),account('cloudflare',{grantedActions:['account.read']})],{cloudflareFullReady:false});
 assert.equal(result.ready,true);
 assert.equal(result.providers.cloudflare.permissionsApproved,true);
 assert.equal(result.providers.cloudflare.projectPermissionsApproved,false);
 assert.equal(result.integra.executionAuthorized,false);
});
