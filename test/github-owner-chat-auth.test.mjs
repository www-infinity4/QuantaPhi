import test from 'node:test';
import assert from 'node:assert/strict';
import {ownerGithubChatConfig,verifyGithubChatPat,admitGithubChatAttempt,issueGithubChatSession,checkGithubChatSession,revokeGithubChatSession} from '../workers/infinity-brain-clock/github-owner-chat-auth.mjs';
const env={GITHUB_OWNER_CHAT_ENABLED:'1',GITHUB_OWNER_CHAT_ID:'12345',WRITER_OWNER_HASH:'a'.repeat(64)};
const cfg=ownerGithubChatConfig(env);
const pat='github_pat_'+ 'x'.repeat(80);
function storage(){const rows=new Map();const store={rows,async get(k){return rows.get(k)},async put(k,v){rows.set(k,v)},async delete(k){rows.delete(k)},async transaction(fn){return fn(store)}};return store;}
test('backup sign-in is disabled without independently pinned owner and explicit feature flag',()=>{
 assert.equal(ownerGithubChatConfig({...env,GITHUB_OWNER_CHAT_ENABLED:'0'}),null);
 assert.equal(ownerGithubChatConfig({...env,GITHUB_OWNER_CHAT_ID:''}),null);
 assert.equal(ownerGithubChatConfig({...env,WRITER_OWNER_HASH:''}),null);
});
test('only live GitHub user identity matching pinned numeric owner ID is accepted',async()=>{
 let calls=0;
 const result=await verifyGithubChatPat(pat,cfg,async(url,options)=>{
  calls++;assert.equal(url,'https://api.github.com/user');assert.equal(options.redirect,'error');
  assert.equal(options.headers.Authorization,'Bearer '+pat);
  return Response.json({id:12345,type:'User',login:'renamed-owner'});
 });
 assert.deepEqual(result,{ok:true});assert.equal(calls,1);
 assert.equal((await verifyGithubChatPat(pat,cfg,async()=>Response.json({id:12346,type:'User',login:'www-infinity4'}))).ok,false);
 assert.equal((await verifyGithubChatPat(pat,cfg,async()=>Response.json({id:12345,type:'Bot'}))).ok,false);
 assert.equal((await verifyGithubChatPat(pat,cfg,async()=>new Response(null,{status:401}))).ok,false);
 assert.equal((await verifyGithubChatPat(pat,cfg,async()=>{throw Error(pat)})).error,'github_verifier_unavailable');
 assert.equal((await verifyGithubChatPat(pat,null,async()=>{throw Error('must not call')})).ok,false);
});
test('login attempts are bounded and session is limited, expires, replaces previous token and stores no PAT',async()=>{
 const db=storage(),now=1000000;
 for(let i=0;i<8;i++)assert.equal(await admitGithubChatAttempt(db,now),true);
 assert.equal(await admitGithubChatAttempt(db,now),false);
 assert.equal(await admitGithubChatAttempt(db,now+60000),true);
 const first=await issueGithubChatSession(db,cfg,now);
 assert.match(first.token,/^gc_[a-f0-9]{64}$/);
 assert.equal(first.scope,'owner-chat-context');
 assert.equal(await checkGithubChatSession(db,cfg,first.token,now),true);
 assert.equal(await checkGithubChatSession(db,{...cfg,id:9},first.token,now),false);
 assert.equal(await checkGithubChatSession(db,cfg,first.token,first.expiresAt),false);
 assert.equal(await checkGithubChatSession(db,cfg,'rb_'+ 'a'.repeat(64),now),false);
 const second=await issueGithubChatSession(db,cfg,now+1);
 assert.equal(await checkGithubChatSession(db,cfg,first.token,now+1),false);
 assert.equal(await checkGithubChatSession(db,cfg,second.token,now+1),true);
 assert.equal(JSON.stringify([...db.rows]).includes(second.token),false);
 assert.equal(JSON.stringify([...db.rows]).includes(pat),false);
});

test('logout revokes only the matching backup session',async()=>{
 const db=storage(),now=1000000;
 const first=await issueGithubChatSession(db,cfg,now);
 const second=await issueGithubChatSession(db,cfg,now+1);
 assert.equal(await revokeGithubChatSession(db,cfg,first.token,now+2),false);
 assert.equal(await checkGithubChatSession(db,cfg,second.token,now+2),true);
 assert.equal(await revokeGithubChatSession(db,cfg,second.token,now+2),true);
 assert.equal(await checkGithubChatSession(db,cfg,second.token,now+2),false);
});
