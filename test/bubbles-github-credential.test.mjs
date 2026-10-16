import test from 'node:test';
import assert from 'node:assert/strict';
import {connectGithubCredential,githubEnvironment,githubCredentialStatus} from '../workers/infinity-brain-clock/github-credential.mjs';
const env={BOT_WORK_SECRET:'test-encryption-key-0123456789'};
function storage(){const rows=new Map();return {rows,get:async k=>rows.get(k),put:async(k,v)=>rows.set(k,v)};}
test('existing owner key is encrypted at rest and only decrypted for the server executor',async()=>{
 const db=storage(),token='test-owner-github-token-123456';
 const result=await connectGithubCredential(env,db,token,async()=>Response.json({login:'www-infinity4'},{headers:{'x-oauth-scopes':'repo, workflow'}}));
 assert.equal(result.status,'connected');assert.ok(!JSON.stringify([...db.rows]).includes(token));
 assert.ok(!JSON.stringify(result).includes(token));
 assert.equal((await githubEnvironment(env,db)).GITHUB_TOKEN,token);
 assert.equal((await githubCredentialStatus(env,db)).connected,true);
 await assert.rejects(githubEnvironment({BOT_WORK_SECRET:'different-encryption-key-0123456789'},db),/decryption_failed/);
});
test('a key for another account is rejected and never saved',async()=>{
 const db=storage();
 await assert.rejects(connectGithubCredential(env,db,'test-other-github-token-123456',async()=>Response.json({login:'other'})),/owner_mismatch/);
 assert.equal(db.rows.size,0);
});
