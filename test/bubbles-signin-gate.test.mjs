import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeGate} from '../bubbles-signin-gate.mjs';

test('both real authorizations must be server-confirmed before gate says ready',()=>{
 const valid={ready:true,providers:{
  github:{configured:true,connected:true,permissionsApproved:true,label:'gh-account'},
  cloudflare:{configured:true,connected:true,permissionsApproved:true,label:'cf-account',missingActions:[]}
 }};
 const result=summarizeGate(valid);
 assert.equal(result.ready,true);
 assert.equal(result.providers.github.label,'gh-account');
 assert.equal(result.providers.cloudflare.approved,true);
 assert.equal(result.state,'ready');
});
test('browser content cannot turn a disconnected or unconfigured provider into a valid connection',()=>{
 const misconfigured={ready:true,providers:{
  github:{configured:false,connected:true,permissionsApproved:true,label:'unverified'},
  cloudflare:{configured:true,connected:true,permissionsApproved:false,missingActions:['projects.build']}
 }};
 const result=summarizeGate(misconfigured);
 assert.equal(result.ready,false);
 assert.equal(result.providers.github.approved,false);
 assert.equal(result.providers.github.label,'');
 assert.equal(result.providers.cloudflare.connected,true);
 assert.equal(result.providers.cloudflare.approved,false);
 assert.deepEqual(result.providers.cloudflare.missing,['projects.build']);
});
test('missing server status and spoofed local positive status never enable the gate',()=>{
 for(const data of [null,undefined,{}, {ready:true}, {ready:false,providers:{github:{configured:true,connected:true,permissionsApproved:true},cloudflare:{configured:true,connected:true,permissionsApproved:true}}}]){
  assert.equal(summarizeGate(data).ready,false);
 }
});
