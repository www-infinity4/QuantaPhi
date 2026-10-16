const RECORD='bubbles-github-credential-v1';
const OWNER='www-infinity4';
async function encryptionKey(env){
 if(typeof env.BOT_WORK_SECRET!=='string'||env.BOT_WORK_SECRET.length<16)throw Error('github_credential_encryption_unavailable');
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('bubbles-github-credential-v1:'+env.BOT_WORK_SECRET));
 return crypto.subtle.importKey('raw',hash,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
const encode=bytes=>btoa(String.fromCharCode(...bytes));
const decode=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
export async function connectGithubCredential(env,storage,token,request=fetch){
 if(typeof token!=='string'||token.length<20||token.length>512)throw Error('github_credential_required');
 const response=await request('https://api.github.com/user',{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','User-Agent':'Bubbles-Owner-Credential-Bridge'},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('github_credential_http_'+response.status);
 const identity=await response.json();
 if(identity.login?.toLowerCase()!==OWNER)throw Error('github_credential_owner_mismatch');
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},await encryptionKey(env),new TextEncoder().encode(token));
 const record={iv:encode(iv),ciphertext:encode(new Uint8Array(ciphertext)),login:OWNER,source:'Moltnook Actions GHP',verifiedAt:new Date().toISOString(),scopes:response.headers.get('x-oauth-scopes')||'GitHub enforces the configured fine-grained scope'};
 await storage.put(RECORD,record);
 return {ok:true,status:'connected',login:record.login,source:record.source,verifiedAt:record.verifiedAt,scopes:record.scopes};
}
export async function githubEnvironment(env,storage){
 if(env.GITHUB_TOKEN)return env;
 const record=await storage.get(RECORD);if(!record)return env;
 try{
  const token=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(record.iv)},await encryptionKey(env),decode(record.ciphertext));
  return {...env,GITHUB_TOKEN:new TextDecoder().decode(token)};
 }catch{throw Error('github_credential_decryption_failed');}
}
export async function githubCredentialStatus(env,storage){
 const record=await storage.get(RECORD);
 return {connected:!!env.GITHUB_TOKEN||!!record,login:record?.login||null,source:env.GITHUB_TOKEN?'Worker secret':record?.source||null,verifiedAt:record?.verifiedAt||null,scopes:record?.scopes||null};
}
