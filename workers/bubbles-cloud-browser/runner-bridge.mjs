// Short-lived GitHub identity transports messages; it never creates owner access.
const ISSUER='https://token.actions.githubusercontent.com';
const AUDIENCE='bubbles-owner-message-bridge';
const WORKFLOW='www-infinity4/Moltnook/.github/workflows/bubbles-owner-message.yml@refs/heads/main';
const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export function checkBridgeClaims(c,now=Date.now()/1000){
 if(c.iss!==ISSUER||c.aud!==AUDIENCE||c.repository!=='www-infinity4/Moltnook'||
  c.repository_id!=='1188306316'||c.workflow_ref!==WORKFLOW||c.ref!=='refs/heads/main'||
  !['push','workflow_dispatch'].includes(c.event_name)||!/^\d{1,24}$/.test(c.run_id||'')||
  !Number.isFinite(c.exp)||c.exp<=now||!Number.isFinite(c.nbf)||c.nbf>now+30||
  !Number.isFinite(c.iat)||c.iat>now+30||now-c.iat>600)throw Error('bridge_runner_identity_rejected');
 return c;
}
export async function authenticateBridge(request,{fetcher=fetch,now=Date.now()/1000}={}){
 const auth=request.headers.get('Authorization')||'';
 if(!auth.startsWith('Bearer ')||auth.length>16000)throw Error('bridge_runner_identity_required');
 const parts=auth.slice(7).split('.');if(parts.length!==3)throw Error('bridge_runner_identity_required');
 const header=JSON.parse(new TextDecoder().decode(decode(parts[0])));
 if(header.alg!=='RS256'||typeof header.kid!=='string')throw Error('bridge_runner_signature_rejected');
 const response=await fetcher(ISSUER+'/.well-known/jwks',{signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('bridge_runner_keys_unavailable');
 const key=(await response.json()).keys?.find(k=>k.kid===header.kid&&k.kty==='RSA');
 if(!key)throw Error('bridge_runner_key_unknown');
 const imported=await crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',imported,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error('bridge_runner_signature_rejected');
 return checkBridgeClaims(JSON.parse(new TextDecoder().decode(decode(parts[1]))),now);
}
export async function runnerMessage({claims,body,db,store,now=Date.now()}){
 // Recheck consent for every submit and read. A runner identity is not owner consent.
 if(!(await store.chatgptStatus()).enabled)return {ok:false,error:'chatgpt_five_day_approval_required',status:403};
 if(!(await store.status()).enabled)return {ok:false,error:'browser_consent_required',status:403};
 const id='chatgpt_runner_'+claims.run_id;
 if(!body||Object.keys(body).some(k=>!['operation','text'].includes(k))||!['submit','status'].includes(body.operation))return {ok:false,error:'invalid_bridge_request',status:400};
 if(body.operation==='submit'){
  if(typeof body.text!=='string'||!body.text.trim()||body.text.length>1800)return {ok:false,error:'invalid_bridge_message',status:400};
  const payload=JSON.stringify({text:body.text.trim()});
  await db.prepare("INSERT OR IGNORE INTO bubbles_chatgpt_bridge(id,action,payload,status,created_ms,updated_ms,expires_ms) VALUES(?,'message',?,'queued',?,?,?)").bind(id,payload,now,now,now+240000).run();
  const row=await db.prepare('SELECT payload,status,expires_ms FROM bubbles_chatgpt_bridge WHERE id=?').bind(id).first();
  if(!row)return {ok:false,error:'bridge_message_not_stored',status:503};
  if(row.payload!==payload)return {ok:false,error:'bridge_run_message_conflict',status:409};
  return {ok:true,jobId:id,state:row.status,expiresAt:row.expires_ms};
 }
 const row=await db.prepare('SELECT status,expires_ms FROM bubbles_chatgpt_bridge WHERE id=?').bind(id).first();
 // Status only: never disclose private replies or another run's conversations.
 return {ok:true,jobId:id,state:row?.status||'missing',expired:!!row&&row.expires_ms<=now};
}
