import {AccountConnections,resolveConnectorWalletToken} from './bubbles-connections.mjs';

const REQUIRED=Object.freeze({
 github:['repository.read'],
 cloudflare:['account.read','projects.build','ledger.read']
});
export function summarizeGate(payload){
 const summary={ready:false,providers:{},state:'unverified'};
 for(const id of ['github','cloudflare']){
  const record=payload?.providers?.[id];
  const configured=record?.configured===true;
  const connected=configured&&record?.connected===true;
  const approved=connected&&record?.permissionsApproved===true;
  summary.providers[id]={configured,connected,approved,
   label:approved&&typeof record.label==='string'?record.label:'',
   reconnect:record?.reconnectRequired===true,
   missing:Array.isArray(record?.missingActions)?record.missingActions.filter(a=>typeof a==='string'&&a.length<80).slice(0,6):[]};
 }
 summary.ready=summary.providers.github.approved&&summary.providers.cloudflare.approved&&payload?.ready===true;
 summary.state=summary.ready?'ready':'setup';
 return summary;
}
export function mountBubblesSigninGate({root=document,host=window,prefix=''}={}){
 const get=id=>root.getElementById(prefix+id);
 const gate=get('bubblesSigninGate');
 if(!gate)return null;
 const status=get('bubblesSigninStatus');
 const actions={github:get('bubblesGithubSignIn'),cloudflare:get('bubblesCloudflareSignIn')};
 const labels={github:get('bubblesGithubStatus'),cloudflare:get('bubblesCloudflareStatus')};
 const cards={github:get('bubblesGithubCard'),cloudflare:get('bubblesCloudflareCard')};
 const chat=get('bubblesAICard');
 const backupStatus=get('bubblesBackupStatus');
 const backupNote=text=>{if(backupStatus)backupStatus.textContent=text;};
 const openChat=get('bubblesOpenExistingChat');
 const retry=get('bubblesRetrySignInCheck');
 const client=new AccountConnections({token:()=>resolveConnectorWalletToken(host),root:host});
 let loading=false,oauthInProgress=false,latest=null,lastChecked=0;
 const setStatus=text=>{status.textContent=text;};
 const render=data=>{
  const summary=summarizeGate(data);latest=summary;
  for(const id of ['github','cloudflare']){
   const value=summary.providers[id];
   cards[id].dataset.status=value.approved?'connected':value.configured?'pending':'unavailable';
   actions[id].disabled=!value.configured||oauthInProgress||loading;
   actions[id].textContent=value.approved?'Connected — review permissions':
     value.configured?'Sign in with '+(id==='github'?'GitHub':'Cloudflare'):'Awaiting provider setup';
   labels[id].textContent=value.approved?
    'Verified'+(value.label?' · '+value.label:'')+' · authorization saved securely':
    value.connected?'Signed in, but additional permissions must be approved':
    !value.configured?'The provider application is not configured yet. No access is claimed.':
    value.reconnect?'Authorization expired or disconnected; sign in again.':
    'Not connected. Sign in once and approve the requested permissions.';
  }
  gate.dataset.ready=String(summary.ready);
  if(summary.ready){
   setStatus('GitHub and Cloudflare are verified. You can open Bubbles chat.');
   // The production gate remains in preview until Cloudflare OAuth is live-tested
   // and automatic private backup creation/verification is implemented.
  }else if(!summary.providers.cloudflare.configured){
   setStatus('GitHub sign-in is available. Cloudflare account authorization is awaiting service activation. Chat stays available during setup.');
  }else setStatus('Approve both sign-ins to connect your accounts. Chat stays available during this pilot.');
  return summary;
 };
 const bootstrap=async()=>{
  if(!latest?.ready)return;
  // Website and in-chat gate share the same in-flight server operation.
  // No credential, repo name or user ID is stored in browser persistence.
  const now=Date.now();
  if(host.__bubblesAutoBackupPromise){
   backupNote('Confirming the private GitHub backup…');
  }else if(now-(host.__bubblesAutoBackupAttemptAt||0)<4000)return;
  else{
   host.__bubblesAutoBackupAttemptAt=now;
   host.__bubblesAutoBackupPromise=client.call('/github/starcoins/auto-bootstrap',{})
    .finally(()=>{host.__bubblesAutoBackupPromise=null;});
  }
  backupNote('Checking your verified private GitHub backup…');
  try{
   const result=await host.__bubblesAutoBackupPromise;
   const status=result?.status;
   if(['committed','already_backed_up'].includes(status)&&result?.private===true){
    backupNote('Private StarCoin backup verified on GitHub. Complete Infinity, Quant and Music history still awaits Stage 4.');
   }else if(status==='needs_github_app_repository_installation'){
    backupNote('Private repository created. GitHub still needs to grant Bubbles access to that repository before a backup can be written.');
   }else backupNote('Backup status: '+String(status||'unverified').slice(0,80)+'. No wallet balances were changed.');
  }catch(error){
   const code=String(error?.message||'').slice(0,120);
   const messages={
    backup_both_provider_authorizations_required:'Both account permissions are required before backup.',
    github_repository_creation_permission_required:'GitHub has not permitted Bubbles to create a private repository.',
    github_repository_name_collision_review_required:'A repository with that name already exists. It was not overwritten; manual review is required.',
    backup_in_progress:'A backup is already being prepared; please check again.',
    github_private_write_not_verified:'GitHub has not granted repository write permission to Bubbles.',
    starcoin_sources_disagree:'The original wallet sources disagree. Backup is paused until they match.'
   };
   backupNote(messages[code]||'Private GitHub backup could not be verified. No wallet balances were changed.');
  }
 };
 const refresh=async()=>{
  if(loading||oauthInProgress)return latest;
  loading=true;
  for(const button of Object.values(actions))button.disabled=true;
  setStatus('Checking your saved GitHub and Cloudflare account authorizations…');
  try {
   const data=await client.call('/gate/status');
   lastChecked=Date.now();
   const summary=render(data);
   if(summary?.ready)void bootstrap();
   else backupNote('First private backup will start automatically after both authorizations are verified.');
   return summary;
  } catch(error) {
   latest=null;gate.dataset.ready='false';
   const code=String(error?.message||'');
   if(code==='verified_wallet_required'){
    setStatus('This browser does not have a verified QuantaPhi wallet session. Recover your existing wallet first; no new wallet will be created.');
   } else if(code==='connections_not_configured'||code==='provider_not_configured'){
    setStatus('Account connection service is not ready. Chat remains available while the service is repaired.');
   } else setStatus('Could not verify the account connections right now. You can retry without signing out of Bubbles.');
   Object.values(labels).forEach(label=>{label.textContent='Not verified in this browser.';});
   for(const button of Object.values(actions)){button.disabled=true;button.textContent='Waiting for verified wallet';}
   return null;
  } finally {loading=false;if(latest)for(const id of ['github','cloudflare'])actions[id].disabled=!latest.providers[id].configured||oauthInProgress;}
 };
 for(const id of ['github','cloudflare']){
  actions[id].addEventListener('click',async()=>{
   if(oauthInProgress||loading||!latest?.providers[id]?.configured)return;
   oauthInProgress=true;
   for(const button of Object.values(actions))button.disabled=true;
   setStatus('Complete the '+(id==='github'?'GitHub':'Cloudflare')+' permission request in its official sign-in window.');
   try{
    await client.connect(id,REQUIRED[id],async (error)=>{
     oauthInProgress=false;
     if(error){setStatus('Sign-in was not completed: '+String(error.message||'authorization_error').slice(0,180));}
     else {
      setStatus('Authorization returned. Verifying it with the server…');
      const summary=await refresh();
      if(summary?.ready&&chat)chat.scrollIntoView({behavior:'smooth',block:'start'});
     }
     for(const provider of ['github','cloudflare'])actions[provider].disabled=!latest?.providers?.[provider]?.configured;
    });
   }catch(error){
    oauthInProgress=false;
    setStatus('Could not start sign-in: '+String(error.message||'authorization_error').slice(0,180));
    for(const provider of ['github','cloudflare'])actions[provider].disabled=!latest?.providers?.[provider]?.configured;
   }
  });
 }
 if(retry)retry.addEventListener('click',()=>void refresh());
 if(openChat)openChat.addEventListener('click',()=>{
  // Not an authentication bypass: production policy is not enforced until
  // provider setup, backup and lost-phone recovery are independently proven.
 });
 host.addEventListener('pageshow',()=>{if(Date.now()-lastChecked>15000)void refresh();});
 root.addEventListener('visibilitychange',()=>{if(!root.hidden&&Date.now()-lastChecked>15000)void refresh();});
 void refresh();
 return {refresh};
}
