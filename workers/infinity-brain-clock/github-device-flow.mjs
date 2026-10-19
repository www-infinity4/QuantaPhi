// Owner-only GitHub App device authorization. No GitHub token or device secret reaches the WebView.
// Requires GITHUB_OAUTH_CLIENT_ID on the Worker and device flow enabled on that GitHub App.
import {connectGithubCredential,githubCredentialStatus,disconnectGithubCredential} from './github-credential.mjs';
const KEY='bubbles-github-device-flow-v1';
const GITHUB_DEVICE='https://github.com/login/device/code';
const GITHUB_TOKEN='https://github.com/login/oauth/access_token';
const now=()=>Date.now();
function clientId(env){
 const id=env.GITHUB_OAUTH_CLIENT_ID;
 if(typeof id!=='string'||!/^[-a-zA-Z0-9._]{8,100}$/.test(id))throw Error('github_app_client_id_not_configured');
 return id;
}
async function formRequest(request,url,body){
 const response=await request(url,{method:'POST',redirect:'manual',
  headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded','User-Agent':'QuantaPhi-Bubbles-GitHub'},
  body:new URLSearchParams(body).toString(),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('github_authorization_http_'+response.status);
 return response.json();
}
function publicFlow(flow){
 return {ok:true,status:'awaiting_github_approval',userCode:flow.userCode,
  verificationUrl:'https://github.com/login/device',expiresAt:flow.expiresAt,
  intervalSeconds:Math.ceil(flow.intervalMs/1000)};
}
export async function startGithubDevice(env,storage,request=fetch){
 const id=clientId(env),old=await storage.get(KEY);
 if(old?.expiresAt>now())return publicFlow(old);
 const challenge=await formRequest(request,GITHUB_DEVICE,{client_id:id});
 if(!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(challenge.user_code||'')
  ||typeof challenge.device_code!=='string'||challenge.device_code.length<30
  ||challenge.verification_uri!=='https://github.com/login/device')
  throw Error('github_device_challenge_invalid');
 const intervalMs=Math.max(5000,Math.min(30000,Number(challenge.interval||5)*1000));
 const expiresAt=now()+Math.max(60,Math.min(900,Number(challenge.expires_in||900)))*1000;
 const flow={deviceCode:challenge.device_code,userCode:challenge.user_code,expiresAt,
  intervalMs,nextPollAt:now()+intervalMs};
 await storage.put(KEY,flow);
 return publicFlow(flow);
}
export async function pollGithubDevice(env,storage,request=fetch){
 const id=clientId(env),flow=await storage.get(KEY);
 if(!flow)return {ok:false,status:'not_started',error:'github_sign_in_not_started'};
 if(flow.expiresAt<=now()){await storage.delete(KEY);return {ok:false,status:'expired',error:'github_sign_in_expired'};}
 if(flow.nextPollAt>now())return {ok:true,status:'pending',retryAfterSeconds:Math.ceil((flow.nextPollAt-now())/1000)};
 // Persist the lease BEFORE the external request, to avoid simultaneous polls.
 flow.nextPollAt=now()+flow.intervalMs;
 await storage.put(KEY,flow);
 const result=await formRequest(request,GITHUB_TOKEN,{
  client_id:id,device_code:flow.deviceCode,grant_type:'urn:ietf:params:oauth:grant-type:device_code'});
 if(result.error==='authorization_pending')
  return {ok:true,status:'pending',retryAfterSeconds:Math.ceil(flow.intervalMs/1000)};
 if(result.error==='slow_down'){
  flow.intervalMs+=5000;flow.nextPollAt=now()+flow.intervalMs;await storage.put(KEY,flow);
  return {ok:true,status:'pending',retryAfterSeconds:Math.ceil(flow.intervalMs/1000)};
 }
 if(result.error){
  const allowed=['access_denied','expired_token','bad_verification_code','device_flow_disabled','incorrect_client_credentials'];
  await storage.delete(KEY);
  return {ok:false,status:'blocked',error:allowed.includes(result.error)?result.error:'github_authorization_failed'};
 }
 if(!/^(ghu_|gho_)[a-zA-Z0-9_]+$/.test(result.access_token||''))throw Error('github_access_token_missing');
 // GitHub App user tokens have installation/user intersection permissions. No claim of blanket account access.
 const expiresAt=result.expires_in?now()+Math.max(1,Number(result.expires_in)-60)*1000:null;
 const connected=await connectGithubCredential(env,storage,result.access_token,request,{
  source:'GitHub App device authorization',expiresAt});
 await storage.delete(KEY);
 return {ok:true,status:'connected',login:connected.login,source:connected.source,
  verifiedAt:connected.verifiedAt,expiresAt:connected.expiresAt,
  note:'GitHub enforces the app installation and user permissions; verify repository operations individually.'};
}
export async function githubDeviceStatus(env,storage){
 const [credential,flow]=await Promise.all([githubCredentialStatus(env,storage),storage.get(KEY)]);
 return {ok:true,status:credential.source==='Worker secret'?'runner_credential':credential.connected?'connected':flow?.expiresAt>now()?'awaiting_github_approval':'disconnected',
  login:credential.login,source:credential.source,verifiedAt:credential.verifiedAt,expiresAt:credential.expiresAt||null,
  needsConfiguration:!env.GITHUB_OAUTH_CLIENT_ID};
}
export async function disconnectGithubDevice(storage){
 await storage.delete(KEY);
 await disconnectGithubCredential(storage);
 return {ok:true,status:'disconnected',note:'Bubbles removed its stored GitHub credential. Revoke the app in GitHub settings to revoke access at GitHub too.'};
}
