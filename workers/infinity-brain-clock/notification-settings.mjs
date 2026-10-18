// Owner-authenticated preferences and at-most-once speech reservations.
// A reservation is not proof that a phone actually played audio.
const initialized=new WeakSet();
const modes=new Set(['brief','finished','detailed']);
export async function notificationSettings(db,owner,body){
 if(!owner)throw Error('notification_owner_required');
 if(!initialized.has(db)){
  await db.prepare('CREATE TABLE IF NOT EXISTS bubbles_notification_preferences (owner TEXT PRIMARY KEY,mode TEXT NOT NULL,updated_at INTEGER NOT NULL)').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS bubbles_notification_claims (owner TEXT NOT NULL,ticket TEXT NOT NULL,job TEXT NOT NULL,transition TEXT NOT NULL,client TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(owner,ticket,job,transition))').run();
  initialized.add(db);
 }
 if(body.preference!==undefined){
  if(body.mode!=='notification-preferences'||!modes.has(body.preference))throw Error('notification_preference_invalid');
  await db.prepare('INSERT INTO bubbles_notification_preferences(owner,mode,updated_at) VALUES (?,?,?) ON CONFLICT(owner) DO UPDATE SET mode=excluded.mode,updated_at=excluded.updated_at').bind(owner,body.preference,Date.now()).run();
 }
 const saved=await db.prepare('SELECT mode FROM bubbles_notification_preferences WHERE owner=?').bind(owner).first();
 const preferences={mode:modes.has(saved?.mode)?saved.mode:'brief'};
 if(body.mode==='notification-preferences')return {ok:true,preferences};
 if(body.mode!=='notification-claim'||!/^[a-zA-Z0-9_-]{8,100}$/.test(body.client||'')||!Array.isArray(body.events)||body.events.length>20)throw Error('notification_claim_invalid');
 if(body.events.some(event=>!/^[a-zA-Z0-9_-]{1,100}$/.test(event?.ticketId||'')||!/^[a-zA-Z0-9_-]{1,100}$/.test(event?.jobId||'')||!['started','finished'].includes(event?.transition)))throw Error('notification_event_invalid');
 const voice=await db.prepare('SELECT client,expires FROM bubbles_voice WHERE owner=?').bind(owner).first();
 if(voice?.client!==body.client||voice.expires<=Date.now())return {ok:true,preferences,notices:[],reason:'not_active_voice_owner'};
 const accepted=[];
 for(const event of body.events){
  if(preferences.mode==='finished'&&event.transition==='started')continue;
  const ticket=await db.prepare('SELECT title,context_json FROM work_tickets WHERE owner_hash=? AND id=?').bind(owner,event.ticketId).first();
  let context;try{context=JSON.parse(ticket?.context_json||'{}')}catch{continue;}
  const job=context.color_jobs?.find(j=>j.id===event.jobId),p=job?.progress;
  const runner=/^https:\/\/github\.com\/www-infinity4\/[\w.-]+\/actions\/runs\/\d+(?:[/?#]|$)/.test(String(p?.runUrl||''));
  const valid=event.transition==='started'
   ?job?.status==='working'&&Number.isFinite(Date.parse(p?.claimedAt||''))
   :['complete','deployed_verified'].includes(job?.status)&&/^[a-f0-9]{40}$/i.test(p?.commitSha||'')&&p?.testsPassed===true&&p?.browserPassed===true&&p?.deployedFilesMatched===true&&p?.reviewApproved===true;
  if(!runner||!valid)continue;
  // The same job transition can be reserved once across all owner devices.
  // SQLite's unique key, not a read-then-write check, arbitrates racing polls.
  const claimed=await db.prepare('INSERT OR IGNORE INTO bubbles_notification_claims(owner,ticket,job,transition,client,at) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM bubbles_voice WHERE owner=? AND client=? AND expires>?) RETURNING transition').bind(owner,event.ticketId,event.jobId,event.transition,body.client,Date.now(),owner,body.client,Date.now()).first();
  if(claimed)accepted.push({label:/\b(?:ui|interface|layout|button)\b/i.test(ticket.title||'')?'UI job':'Job',transition:event.transition});
 }
 const notices=[];
 for(const transition of ['finished','started'])for(const label of ['UI job','Job']){
  const count=accepted.filter(e=>e.transition===transition&&e.label===label).length;
  if(count)notices.push((count===1?label:count+' '+(label==='UI job'?'UI jobs':'jobs'))+' '+transition+'.'+(preferences.mode==='detailed'&&transition==='finished'?' Tests and deployed-browser checks passed.':''));
 }
 return {ok:true,preferences,notices,reservation:'at-most-once',playbackVerified:false};
}
