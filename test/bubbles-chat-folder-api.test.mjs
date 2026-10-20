import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/bubbles-chat-folders/worker.mjs';
import {readFileSync} from 'node:fs';
const base='https://bubbles-chat-folders.marvaseater.workers.dev';
const request=(path,origin,authorization,body={mode:'sessions-list'})=>new Request(base+path,{method:'POST',
 headers:{Origin:origin,Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('Cloud chat folder health is read-only and never exposes owner tokens',async()=>{
 const r=await worker.fetch(new Request(base+'/health'),{BRAIN:{fetch(){}},WORK_DB:{prepare(){}}});
 assert.equal(r.status,200);
 const body=await r.json();assert.equal(body.dbBound,true);assert.equal(body.brainBound,true);
 assert.equal(JSON.stringify(body).includes('owner'),false);
});
test('Browser-only consent is not a wallet or Brain login',async()=>{
 const env={BRAIN:{fetch:async()=>({ok:true})},WORK_DB:{prepare:()=>assert.fail('unverified browser should not read private cloud chats')}};
 const bad=await worker.fetch(request('/v1/folders','https://quantaphi.org','Bearer bcb_'+ 'a'.repeat(43)),env);
 assert.equal(bad.status,403);
 const foreign=await worker.fetch(request('/v1/folders','https://evil.example','Bearer rb_'+ 'a'.repeat(64)),env);
 assert.equal(foreign.status,403);
});
test('Owner authorization is verified by live Brain service before reading D1',async()=>{
 let checked=0;
 const env={BRAIN:{fetch:async(url,opts)=>{checked++;assert.equal(new URL(url).pathname,'/health');assert.ok(opts.headers.Authorization.startsWith('Bearer rb_'));return {ok:false};}},WORK_DB:{prepare:()=>assert.fail('denied owner must not read D1')}};
 const response=await worker.fetch(request('/v1/folders','https://quantaphi.org','Bearer rb_'+ 'a'.repeat(64)),env);
 assert.equal(response.status,403);assert.equal(checked,1);
});
test('Cloud chat folders have a separate backend and never modify the Brain ticket runner',()=>{
 const source=readFileSync('workers/bubbles-chat-folders/worker.mjs','utf8');
 assert.match(source,/bubbles_session_messages/);
 assert.match(source,/sessions-list/);
 assert.match(source,/sessions-get/);
 assert.match(source,/sessions-save/);
 assert.match(source,/COUNT\(DISTINCT owner\)/);
 assert.doesNotMatch(source,/work\/tickets\/create|BOT_WALLET|github_pat/);
 const ui=readFileSync('bubbles-ai.js','utf8');
 assert.match(ui,/FOLDER_API/);assert.match(ui,/syncCloudFolder\(activeThread/);
});
