import {notificationSettings} from './notification-settings.mjs';
import {oracleSynapse} from './oracle-synapse-memory.mjs';
// Owner-only conversation archive. Kept separate from verified engineering outcomes.
const initialized=new WeakSet();
export const capabilities=[
 {name:'in-chat card catalog and diagnostics',source:'bubbles-card-catalog.mjs',status:'registered cards open in the shared chat workspace; Infinity Radio has a declared Play control; observe media state before claiming playback'},
 {name:'conversation memory',source:'owner/conversation',status:'owner-authenticated archive and indexed retrieval'},
 {name:'repair jobs and reports',source:'bubbles-brain-actions.js',status:'owner-authenticated submission; execution requires runner receipts'},
 {name:'voice transcription',source:'workers/bubbles-tools/worker.mjs',status:'Cloudflare transcription; Android also has native capture'},
 {name:'news and resonance calculator',source:'workers/bubbles-tools/worker.mjs',status:'connected tools'},
 {name:'direct GitHub repository tools',source:'work/github',status:'owner-authenticated adapter for repository read/create/write and Actions; verify live capabilities and each receipt'},
 {name:'Python, Bash, Node, Git and GitHub CLI',source:'.github/workflows/bubbles-coder-sandbox.yml',status:'remote Linux workflow; dispatch acceptance is not execution; inspect run receipts'},
 {name:'Android screen recorder and clips',source:'QuantaBubbles.drainNativeCaptureRequest',status:'native overlay bridge with Android consent; inspect current capture state; unavailable to a plain browser'},
 {name:'web search and weather',source:'workers/bubbles-tools/search.mjs',status:'network lookup through the shared chat gateway'}
];
export const schema=[
 'CREATE TABLE IF NOT EXISTS bubbles_messages (owner TEXT NOT NULL,id TEXT NOT NULL,role TEXT NOT NULL,text TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(owner,id))',
 'CREATE INDEX IF NOT EXISTS bubbles_messages_time ON bubbles_messages(owner,at)',
 'CREATE VIRTUAL TABLE IF NOT EXISTS bubbles_message_index USING fts5(owner UNINDEXED,id UNINDEXED,text)',
 'CREATE TABLE IF NOT EXISTS bubbles_sessions (owner TEXT NOT NULL,session_id TEXT NOT NULL,title TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(owner,session_id))',
 'CREATE INDEX IF NOT EXISTS bubbles_sessions_recent ON bubbles_sessions(owner,updated DESC)',
 'CREATE TABLE IF NOT EXISTS bubbles_session_messages (owner TEXT NOT NULL,session_id TEXT NOT NULL,message_id TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(owner,session_id,message_id))',
 'CREATE INDEX IF NOT EXISTS bubbles_session_messages_recent ON bubbles_session_messages(owner,session_id,at DESC)',
 'CREATE TABLE IF NOT EXISTS bubbles_voice (owner TEXT PRIMARY KEY,client TEXT NOT NULL,expires INTEGER NOT NULL)'
];
export function normalizeMessages(messages){
 if(!Array.isArray(messages)||messages.length>20)throw Error('message_batch_invalid');
 return messages.map(m=>{
  if(!/^[a-zA-Z0-9_-]{8,100}$/.test(m?.id||'')||!['user','assistant'].includes(m.role)||typeof m.text!=='string'||!m.text.trim()||m.text.length>6000)throw Error('message_invalid');
  return {id:m.id,role:m.role,text:m.text,at:Number.isSafeInteger(m.at)&&m.at>0&&m.at<=Date.now()+60000?m.at:Date.now(),
   sessionId:/^[a-zA-Z0-9_-]{10,80}$/.test(m.sessionId||'')?m.sessionId:null};
 });
}
export function searchTerms(query){return [...new Set(String(query||'').toLowerCase().match(/[a-z0-9]{3,32}/g)||[])].slice(0,12).map(x=>'"'+x+'"').join(' OR ');}
export async function conversationMemory(db,owner,body){
 if(!initialized.has(db)){for(const sql of schema)await db.prepare(sql).run();initialized.add(db);}
 if(typeof body.mode==='string'&&body.mode.startsWith('synapse-'))return oracleSynapse(db,owner,body);
 if(['notification-preferences','notification-claim'].includes(body.mode))return notificationSettings(db,owner,body);
 if(['voice-claim','voice-renew','voice-status','voice-release'].includes(body.mode)){
  if(!/^[a-zA-Z0-9_-]{8,100}$/.test(body.client||''))throw Error('voice_client_invalid');
  const now=Date.now(),expires=now+35000;
  const previous=await db.prepare('SELECT client,expires FROM bubbles_voice WHERE owner=?').bind(owner).first();
  const current=previous?.expires>now?previous:null;
  // A connected Android companion owns the single active microphone when the
  // website and APK are paired to the same verified owner. Website chat remains
  // fully usable; an owner-authenticated web page cannot steal Android's mic.
  const androidClient=body.client.startsWith('android_');
  const androidActive=current?.client.startsWith('android_');
  if(body.mode==='voice-claim'&&(!current||androidClient||!androidActive||current.client===body.client)){
   await db.prepare('INSERT INTO bubbles_voice(owner,client,expires) VALUES (?,?,?) ON CONFLICT(owner) DO UPDATE SET client=excluded.client,expires=excluded.expires WHERE bubbles_voice.expires<=? OR substr(bubbles_voice.client,1,8)<>\'android_\' OR substr(excluded.client,1,8)=\'android_\' OR bubbles_voice.client=excluded.client').bind(owner,body.client,expires,now).run();
  }else if(body.mode==='voice-renew'&&current?.client===body.client){
   await db.prepare('UPDATE bubbles_voice SET expires=? WHERE owner=? AND client=? AND expires>?').bind(expires,owner,body.client,now).run();
  }else if(body.mode==='voice-release'&&current?.client===body.client){
   await db.prepare('DELETE FROM bubbles_voice WHERE owner=? AND client=?').bind(owner,body.client).run();
  }
  const lease=await db.prepare('SELECT client,expires FROM bubbles_voice WHERE owner=?').bind(owner).first();
  const active=lease?.expires>now?lease:null;
  return {ok:true,owned:!!active&&active.client===body.client,active:active?(active.client.startsWith('android_')?'android':'website'):'none',expiresAt:active?.expires||0};
 }
 const sessionId=typeof body.sessionId==='string'&&/^[a-zA-Z0-9_-]{10,80}$/.test(body.sessionId)?body.sessionId:null;
 const now=Date.now();
 if(body.mode==='sessions-list'){
  // Preserve older unpartitioned history as its own accessible legacy conversation.
  const legacy=await db.prepare("SELECT COUNT(*) AS amount, MIN(at) AS first, MAX(at) AS last FROM bubbles_messages m WHERE owner=? AND NOT EXISTS (SELECT 1 FROM bubbles_session_messages sm WHERE sm.owner=m.owner AND sm.message_id=m.id)").bind(owner).first();
  if((legacy?.amount||0)>0){
   await db.prepare("INSERT OR IGNORE INTO bubbles_sessions(owner,session_id,title,created,updated) VALUES (?,?,?,?,?)").bind(owner,'legacy-history','Earlier Bubbles chats',legacy.first||now,legacy.last||now).run();
   await db.prepare("INSERT OR IGNORE INTO bubbles_session_messages(owner,session_id,message_id,at) SELECT owner,'legacy-history',id,at FROM bubbles_messages m WHERE owner=? AND NOT EXISTS (SELECT 1 FROM bubbles_session_messages sm WHERE sm.owner=m.owner AND sm.message_id=m.id)").bind(owner).run();
  }
  const found=await db.prepare('SELECT session_id AS id,title,created,updated FROM bubbles_sessions WHERE owner=? ORDER BY updated DESC LIMIT 100').bind(owner).all();
  return {ok:true,sessions:found.results||[]};
 }
 if(body.mode==='sessions-get'){
  if(!sessionId)throw Error('session_required');
  const record=await db.prepare('SELECT session_id AS id,title,created,updated FROM bubbles_sessions WHERE owner=? AND session_id=?').bind(owner,sessionId).first();
  if(!record)return {ok:false,error:'conversation_not_found'};
  const rows=await db.prepare('SELECT m.id,m.role,m.text,m.at FROM bubbles_session_messages sm JOIN bubbles_messages m ON m.owner=sm.owner AND m.id=sm.message_id WHERE sm.owner=? AND sm.session_id=? ORDER BY sm.at DESC,m.id DESC LIMIT 400').bind(owner,sessionId).all();
  return {ok:true,session:record,messages:(rows.results||[]).reverse().map(m=>({...m,sessionId}))};
 }
 if(body.mode==='sessions-create'||body.mode==='sessions-rename'){
  if(!sessionId)throw Error('session_required');
  const title=typeof body.title==='string'?body.title.trim().replace(/\s+/g,' ').slice(0,90):'New conversation';
  if(body.mode==='sessions-create'){
   await db.prepare('INSERT OR IGNORE INTO bubbles_sessions(owner,session_id,title,created,updated) VALUES (?,?,?,?,?)').bind(owner,sessionId,title||'New conversation',now,now).run();
  }else{
   if(!title)throw Error('session_title_required');
   await db.prepare('UPDATE bubbles_sessions SET title=? WHERE owner=? AND session_id=?').bind(title,owner,sessionId).run();
  }
  return {ok:true,sessionId};
 }
 const messages=normalizeMessages(body.messages||[]);
 if(messages.length){
  const statements=[];
  for(const m of messages){
   statements.push(db.prepare('INSERT OR IGNORE INTO bubbles_messages(owner,id,role,text,at) VALUES (?,?,?,?,?)').bind(owner,m.id,m.role,m.text,m.at));
   // Associate untagged messages with the explicitly selected conversation.
   // Only genuinely unscoped historical messages belong in the legacy archive.
   const target=m.sessionId||sessionId;
   if(target){
    // The owner is derived from verified Brain credentials, never client input.
    statements.push(db.prepare('INSERT OR IGNORE INTO bubbles_sessions(owner,session_id,title,created,updated) VALUES (?,?,?,?,?)').bind(owner,target,'New conversation',m.at,m.at));
    statements.push(db.prepare('INSERT OR IGNORE INTO bubbles_session_messages(owner,session_id,message_id,at) VALUES (?,?,?,?)').bind(owner,target,m.id,m.at));
    statements.push(db.prepare('UPDATE bubbles_sessions SET updated=MAX(updated,?) WHERE owner=? AND session_id=?').bind(m.at,owner,target));
    if(m.role==='user'){
     const firstTitle=m.text.trim().replace(/\s+/g,' ').slice(0,65);
     statements.push(db.prepare("UPDATE bubbles_sessions SET title=? WHERE owner=? AND session_id=? AND title='New conversation'").bind(firstTitle||'New conversation',owner,target));
    }
   }
   statements.push(db.prepare('INSERT INTO bubbles_message_index(owner,id,text) SELECT owner,id,text FROM bubbles_messages WHERE owner=? AND id=? AND NOT EXISTS (SELECT 1 FROM bubbles_message_index WHERE owner=? AND id=?)').bind(owner,m.id,owner,m.id));
  }
  await db.batch(statements);
 }
 const recent=sessionId
  ?await db.prepare('SELECT m.id,m.role,m.text,m.at FROM bubbles_session_messages sm JOIN bubbles_messages m ON m.owner=sm.owner AND m.id=sm.message_id WHERE sm.owner=? AND sm.session_id=? ORDER BY sm.at DESC,m.id DESC LIMIT 64').bind(owner,sessionId).all()
  :await db.prepare('SELECT id,role,text,at FROM bubbles_messages WHERE owner=? ORDER BY at DESC,id DESC LIMIT 64').bind(owner).all();
 const query=searchTerms(body.query);let related=[];
 if(query){const rows=await db.prepare('SELECT m.id,m.role,m.text,m.at FROM bubbles_message_index JOIN bubbles_messages m ON m.owner=bubbles_message_index.owner AND m.id=bubbles_message_index.id WHERE bubbles_message_index MATCH ? AND m.owner=? ORDER BY rank LIMIT 16').bind(query,owner).all();related=rows.results||[];}
 // Preferences are retrieved independently of the current topic and recent window.
 // Read immutable archived USER rows only: assistant replies cannot teach owner rules.
 const candidates=await db.prepare("SELECT id,role,text,at FROM bubbles_messages WHERE owner=? AND role='user' AND (lower(text) LIKE '%don%t%' OR lower(text) LIKE '%do not%' OR lower(text) LIKE '%never%' OR lower(text) LIKE '%stop %' OR lower(text) LIKE '%remember%' OR lower(text) LIKE '%prefer%') ORDER BY at DESC,id DESC LIMIT 64").bind(owner).all();
 const userInstructions=(candidates.results||[]).filter(m=>/\b(?:don['’]t|do not|never|stop|remember|prefer)\b/i.test(m.text)).slice(0,32).reverse().map(m=>({...m,text:m.text.slice(0,1000)}));
 const notificationPreferences=(await notificationSettings(db,owner,{mode:'notification-preferences'})).preferences;
 return {ok:true,notificationPreferences,userInstructions,capabilities,saved:messages.map(m=>m.id),recent:(recent.results||[]).reverse().map(m=>sessionId?{...m,sessionId}:m),related,retention:'archive',retrieval:'recent64-and-indexed16'};
}
