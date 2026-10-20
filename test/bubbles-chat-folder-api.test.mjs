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

test('owner folder API pages more than 120 ChatGPT sessions and every message beyond 400',async()=>{
 const sessions=Array.from({length:251},(_,i)=>({
  id:'chat_'+i.toString(16).padStart(32,'0'),title:'ChatGPT archive '+i,
  created:1710000000000+i,updated:1710000010000+i,source:'chatgpt'
 })).reverse();
 const source=sessions[0].id;
 const rows=Array.from({length:540},(_,i)=>({
  id:'im_'+i.toString().padStart(8,'0'),role:i%2?'assistant':'user',
  text:'Saved message '+i,at:1710000000000+i
 }));
 const prepared=[];
 const db={prepare(sql){
  const stmt={sql,args:[],
   bind(...args){this.args=args;return this;},
   async run(){prepared.push({sql:this.sql,args:this.args});return {meta:{changes:1}};},
   async first(){
    if(sql.includes('COUNT(DISTINCT owner)'))return {count:1,owner:'owner_key'};
    if(sql.includes('NOT EXISTS'))return {count:0};
    if(sql.includes('COUNT(*) AS total'))return {total:rows.length};
    if(sql.includes('LEFT JOIN bubbles_session_sources')&&sql.includes('s.session_id=?')){
     const found=sessions.find(x=>x.id===this.args[1]);return found?{
      id:found.id,title:found.title,created:found.created,updated:found.updated,source:found.source
     }:null;
    }
    throw Error('Unexpected first query '+sql);
   },
   async all(){
    if(sql.includes('LEFT JOIN bubbles_session_sources')&&sql.includes('LIMIT ? OFFSET ?'))
     return {results:sessions.slice(this.args[2],this.args[2]+this.args[1])};
    if(sql.includes('JOIN bubbles_messages')&&sql.includes('LIMIT ? OFFSET ?'))
     return {results:rows.slice(this.args[3],this.args[3]+this.args[2])};
    throw Error('Unexpected list query '+sql);
   }};
  return stmt;
 }};
 const env={WORK_DB:db,BRAIN:{fetch:async()=>({ok:true})}};
 const invoke=async body=>{
  const r=await worker.fetch(request('/v1/folders','https://quantaphi.org',
   'Bearer rb_'+'a'.repeat(64),body),env);
  assert.equal(r.status,200);
  return r.json();
 };
 let offset=0,seen=[];
 for(let i=0;i<3;i++){
  const page=await invoke({mode:'sessions-list',offset});
  seen.push(...page.sessions);
  if(page.nextOffset===null)break;
  offset=page.nextOffset;
 }
 assert.equal(seen.length,251);
 assert.ok(seen.every(item=>item.source==='chatgpt'));
 assert.equal(seen[0].title,'ChatGPT archive 250');
 assert.equal(seen[250].title,'ChatGPT archive 0');
 let messages=[],messageOffset=0;
 for(let i=0;i<6;i++){
  const page=await invoke({mode:'sessions-get',sessionId:source,offset:messageOffset});
  messages.push(...page.messages);
  assert.equal(page.total,540);
  if(page.nextOffset===null)break;
  messageOffset=page.nextOffset;
 }
 assert.equal(messages.length,540);
 assert.equal(messages[0].text,'Saved message 0');
 assert.equal(messages.at(-1).text,'Saved message 539');
 const imported=await invoke({mode:'sessions-create',sessionId:'chat_'+'f'.repeat(32),
  title:'Original GPT title',source:'chatgpt',created:1710000000000,updated:1710000010000});
 assert.equal(imported.ok,true);
 assert.ok(prepared.some(entry=>entry.sql.includes('INSERT INTO bubbles_session_sources')));
 assert.ok(prepared.some(entry=>entry.sql.includes('INSERT OR IGNORE INTO bubbles_sessions')
  &&entry.args.includes(1710000000000)));
});
