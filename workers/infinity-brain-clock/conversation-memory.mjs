// Owner-only conversation archive. Kept separate from verified engineering outcomes.
const initialized=new WeakSet();
export const capabilities=[
 {name:'conversation memory',source:'owner/conversation',status:'owner-authenticated archive and indexed retrieval'},
 {name:'repair jobs and reports',source:'bubbles-brain-actions.js',status:'owner-authenticated submission; execution requires runner receipts'},
 {name:'voice transcription',source:'workers/bubbles-tools/worker.mjs',status:'Cloudflare transcription; Android also has native capture'},
 {name:'news and resonance calculator',source:'workers/bubbles-tools/worker.mjs',status:'connected tools'},
 {name:'repository creation',source:'workers/bubbles-tools/worker.mjs',status:'not connected; never claim a repository was created'}
];
export const schema=[
 'CREATE TABLE IF NOT EXISTS bubbles_messages (owner TEXT NOT NULL,id TEXT NOT NULL,role TEXT NOT NULL,text TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(owner,id))',
 'CREATE INDEX IF NOT EXISTS bubbles_messages_time ON bubbles_messages(owner,at)',
 'CREATE VIRTUAL TABLE IF NOT EXISTS bubbles_message_index USING fts5(owner UNINDEXED,id UNINDEXED,text)',
 'CREATE TABLE IF NOT EXISTS bubbles_voice (owner TEXT PRIMARY KEY,client TEXT NOT NULL,expires INTEGER NOT NULL)'
];
export function normalizeMessages(messages){
 if(!Array.isArray(messages)||messages.length>20)throw Error('message_batch_invalid');
 return messages.map(m=>{
  if(!/^[a-zA-Z0-9_-]{8,100}$/.test(m?.id||'')||!['user','assistant'].includes(m.role)||typeof m.text!=='string'||!m.text.trim()||m.text.length>6000)throw Error('message_invalid');
  return {id:m.id,role:m.role,text:m.text,at:Number.isSafeInteger(m.at)&&m.at>0&&m.at<=Date.now()+60000?m.at:Date.now()};
 });
}
export function searchTerms(query){return [...new Set(String(query||'').toLowerCase().match(/[a-z0-9]{3,32}/g)||[])].slice(0,12).map(x=>'"'+x+'"').join(' OR ');}
export async function conversationMemory(db,owner,body){
 if(!initialized.has(db)){for(const sql of schema)await db.prepare(sql).run();initialized.add(db);}
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
 const messages=normalizeMessages(body.messages||[]);
 if(messages.length){
  const statements=[];
  for(const m of messages){
   statements.push(db.prepare('INSERT OR IGNORE INTO bubbles_messages(owner,id,role,text,at) VALUES (?,?,?,?,?)').bind(owner,m.id,m.role,m.text,m.at));
   statements.push(db.prepare('INSERT INTO bubbles_message_index(owner,id,text) SELECT owner,id,text FROM bubbles_messages WHERE owner=? AND id=? AND NOT EXISTS (SELECT 1 FROM bubbles_message_index WHERE owner=? AND id=?)').bind(owner,m.id,owner,m.id));
  }
  await db.batch(statements);
 }
 const recent=await db.prepare('SELECT id,role,text,at FROM bubbles_messages WHERE owner=? ORDER BY at DESC,id DESC LIMIT 64').bind(owner).all();
 const query=searchTerms(body.query);let related=[];
 if(query){const rows=await db.prepare('SELECT m.id,m.role,m.text,m.at FROM bubbles_message_index JOIN bubbles_messages m ON m.owner=bubbles_message_index.owner AND m.id=bubbles_message_index.id WHERE bubbles_message_index MATCH ? AND m.owner=? ORDER BY rank LIMIT 16').bind(query,owner).all();related=rows.results||[];}
 return {ok:true,capabilities,saved:messages.map(m=>m.id),recent:(recent.results||[]).reverse(),related,retention:'archive',retrieval:'recent64-and-indexed16'};
}
