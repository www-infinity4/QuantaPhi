// Independent, deliberately chat-only backup authentication. No wallet or writer privileges.
const SESSION='github-owner-chat-session-v1', ATTEMPTS='github-owner-chat-attempts-v1';
const lifetime=10*60*1000;
export function ownerGithubChatConfig(env){
 const id=String(env.GITHUB_OWNER_CHAT_ID||'');
 if(env.GITHUB_OWNER_CHAT_ENABLED!=='1'||!/^[1-9][0-9]{0,15}$/.test(id)||!Number.isSafeInteger(Number(id))||! /^[a-f0-9]{64}$/.test(env.WRITER_OWNER_HASH||''))return null;
 return {id:Number(id),ownerHash:env.WRITER_OWNER_HASH};
}
const deny=(error,status)=>({ok:false,error,status});
export async function verifyGithubChatPat(token,cfg,request=fetch){
 if(!cfg)return deny('github_backup_disabled',503);
 if(typeof token!=='string'||! /^(?:github_pat_[A-Za-z0-9_]{20,200}|ghp_[A-Za-z0-9]{20,100})$/.test(token))return deny('github_credential_rejected',401);
 try{
  const response=await request('https://api.github.com/user',{method:'GET',redirect:'error',cache:'no-store',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','User-Agent':'QuantaPhi-Owner-Chat-Verification'},signal:AbortSignal.timeout(10000)});
  if(!response.ok)return response.status===429||response.status>=500?deny('github_verifier_unavailable',503):deny('github_credential_rejected',401);
  const identity=await response.json();
  if(identity?.type!=='User'||identity?.id!==cfg.id)return deny('github_credential_rejected',401);
  return {ok:true};
 }catch{return deny('github_verifier_unavailable',503)}
}
export async function admitGithubChatAttempt(storage,now=Date.now()){
 return storage.transaction(async tx=>{
  const saved=await tx.get(ATTEMPTS);
  const count=saved?.start<=now&&now-saved.start<60000?saved.count:0;
  if(count>=8)return false;
  await tx.put(ATTEMPTS,{start:count?saved.start:now,count:count+1});
  return true;
 });
}
async function hash(token){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(v=>v.toString(16).padStart(2,'0')).join('')}
export async function issueGithubChatSession(storage,cfg,now=Date.now()){
 if(!cfg)throw Error('github_backup_disabled');
 const token='gc_'+crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),expiresAt=now+lifetime;
 await storage.put(SESSION,{digest:await hash(token),id:cfg.id,ownerHash:cfg.ownerHash,expiresAt});
 return {ok:true,token,expiresAt,scope:'owner-chat-context'};
}
export async function checkGithubChatSession(storage,cfg,token,now=Date.now()){
 if(!cfg||typeof token!=='string'||!/^gc_[a-f0-9]{64}$/.test(token))return false;
 const record=await storage.get(SESSION);
 return !!(record&&record.id===cfg.id&&record.ownerHash===cfg.ownerHash&&record.expiresAt>now&&record.digest===await hash(token));
}
