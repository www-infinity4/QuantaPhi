import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {conversationMemory} from '../workers/infinity-brain-clock/conversation-memory.mjs';
import {categorizeRepository} from '../workers/infinity-brain-clock/oracle-synapse-memory.mjs';

const sqlRunner=[
 'import sqlite3,json,sys',
 'db=sqlite3.connect(sys.argv[1]);db.row_factory=sqlite3.Row',
 'rows=[]',
 'for sql,args in json.loads(sys.argv[2]):',
 ' r=db.execute(sql,args);rows.append([dict(x) for x in r.fetchall()])',
 'db.commit();print(json.dumps(rows))'
].join('\n');
function database(file){
 const run=xs=>JSON.parse(execFileSync('python3',['-c',sqlRunner,file,JSON.stringify(xs)],{encoding:'utf8'}));
 const prepare=sql=>({sql,args:[],bind(...args){this.args=args;return this;},
  async run(){run([[sql,this.args]]);return{};},
  async all(){return{results:run([[sql,this.args]])[0]};},
  async first(){return run([[sql,this.args]])[0][0]||null;}});
 return{prepare,async batch(xs){run(xs.map(x=>[x.sql,x.args]));}};
}
test('Oracle Synapse saves confirmed repository-scoped nodes and traverses links',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'oracle-synapse-')),file=path.join(dir,'brain.sqlite'),db=database(file);
 try{
  assert.deepEqual(categorizeRepository('www-infinity4/Radio-Clubhouse'),
    {category:'audio-electronics',derived:true});
  const a={mode:'synapse-save',confirmed:true,id:'mem_audio000001',
   repository:'www-infinity4/Radio-Clubhouse',
   title:'Radio playback pauses when screen turns off',
   summary:'Owner requests a reliable background playback implementation.',
   source:'conversation:chat_music_session_0001'};
  const b={mode:'synapse-save',confirmed:true,id:'mem_android0001',
   repository:'www-infinity4/QuantaPhi',
   category:'software',title:'Android foreground playback',summary:'Use verified platform behavior and test screen-off playback.',
   source:'conversation:chat_music_session_0001'};
  const saved=await conversationMemory(db,'owner-one',a);
  assert.equal(saved.category,'audio-electronics');
  assert.equal(saved.categoryInferred,true);
  await conversationMemory(db,'owner-one',b);
  assert.equal((await conversationMemory(db,'owner-one',{mode:'synapse-link',confirmed:true,from:a.id,to:b.id,relation:'related'})).status,'linked');
  const result=await conversationMemory(database(file),'owner-one',{mode:'synapse-query',query:'Radio playback'});
  assert.equal(result.nodes.length,1);
  assert.equal(result.nodes[0].repository,a.repository);
  assert.equal(result.links[0].to_id,b.id);
  assert.equal((await conversationMemory(db,'another-owner',{mode:'synapse-query',query:'Radio'})).nodes.length,0);
  await assert.rejects(()=>conversationMemory(db,'another-owner',{
   mode:'synapse-link',confirmed:true,from:a.id,to:b.id,relation:'related'}),/memory_link_target_not_found/);
  await assert.rejects(()=>conversationMemory(db,'owner-one',{...a,confirmed:false}),/memory_owner_confirmation_required/);
  await assert.rejects(()=>conversationMemory(db,'owner-one',{...a,id:'wrong-id'}),/memory_id_invalid/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('owner chat backfill uses named thread instead of misfiling into legacy',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'bubbles-backfill-')),db=database(path.join(dir,'brain.sqlite'));
 try{
  const id='chat_synced_thread_00001';
  await conversationMemory(db,'owner',{mode:'sessions-create',sessionId:id,title:'New conversation'});
  await conversationMemory(db,'owner',{sessionId:id,messages:[{
   id:'message_recovered_0001',role:'user',text:'From the APK, fix the radio.',at:123456
  }]});
  const selected=await conversationMemory(db,'owner',{mode:'sessions-get',sessionId:id});
  assert.deepEqual(selected.messages.map(x=>x.text),['From the APK, fix the radio.']);
  const folders=await conversationMemory(db,'owner',{mode:'sessions-list'});
  assert.ok(!folders.sessions.some(x=>x.id==='legacy-history'));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('cross-device chat only says synchronized after folder verification',()=>{
 const ui=readFileSync('bubbles-ai.js','utf8');
 assert.match(ui,/const uploaded=await syncCloudFolder\(activeThread,messages\)/);
 assert.match(ui,/const retrieved=await refreshConversationFolders\(\)/);
 assert.match(ui,/uploaded&&retrieved/);
 assert.match(ui,/clean\.length;i\+=10/);
 assert.doesNotMatch(ui,/One-time pairing saved · history syncs automatically/);
});

test('backfill sends each retained message in a bounded batch and stops on owner switch',async()=>{
 const source=readFileSync('bubbles-ai.js','utf8');
 const start=source.indexOf('async function syncCloudFolder(id,items){');
 const end=source.indexOf('async function refreshConversationFolders(){');
 assert.ok(start>0&&end>start);
 const implementation=source.slice(start,end);
 const create=new Function('save',`
  let ownerReady=true,keepChat=true,embedded=false;
  let ownerHeaders={Authorization:'Bearer ownerA'};
  const chatsMessage={textContent:''};
  const conversationApi=(...args)=>save(...args);
  ${implementation}
  return {syncCloudFolder,changeOwner:()=>{ownerHeaders={Authorization:'Bearer ownerB'}}};
 `);
 const msgs=Array.from({length:23},(_,i)=>({id:'message'+i,role:'user',text:'test '+i,at:i+1}));
 const batches=[];
 const good=create(async(mode,id,extra)=>{assert.equal(mode,'sessions-save');batches.push(extra.messages.length);return {ok:true}});
 assert.equal(await good.syncCloudFolder('chat_'+ 'a'.repeat(32),msgs),true);
 assert.deepEqual(batches,[10,10,3]);
 let switched=null,saves=0;
 switched=create(async()=>{saves++;if(saves===1)switched.changeOwner();return {ok:true}});
 assert.equal(await switched.syncCloudFolder('chat_'+ 'b'.repeat(32),msgs),false);
 assert.equal(saves,1,'owner switch must block later batches');
});
