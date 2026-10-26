import {AccountConnections,resolveConnectorWalletToken} from './bubbles-connections-gate.mjs?v=20261021-timeout1';

const REQUIRED=Object.freeze({
 github:['repository.read'],
 cloudflare:['account.read','projects.build','ledger.read','projects.full']
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
   scopeSetupRequired:record?.scopeSetupRequired===true,
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
   actions[id].disabled=!value.configured||oauthInProgress||loading||(id==='cloudflare'&&value.scopeSetupRequired);
   actions[id].textContent=value.approved?'Connected — review permissions':
     value.configured?(id==='cloudflare'?(value.scopeSetupRequired?'Cloudflare app scopes need setup':'Approve full project access with Cloudflare'):'Sign in with GitHub'):'Awaiting provider setup';
   labels[id].textContent=value.approved?
    'Verified'+(value.label?' · '+value.label:'')+' · authorization saved securely':
    value.scopeSetupRequired?'Bubbles Cloudflare OAuth client lacks registered project scopes. A new sign-in will not fix this.':
    value.connected?'Account connected, but full requested permissions have not been verified':
    !value.configured?'The provider application is not configured yet. No access is claimed.':
    value.reconnect?'Authorization expired or disconnected; sign in again.':
    'Not connected. Sign in once and approve the requested permissions.';
  }
  gate.dataset.ready=String(summary.ready);
  // Only the server's verified provider status can advance the login sequence.
  const githubApproved=summary.providers.github.approved;
  cards.github.hidden=githubApproved;
  cards.cloudflare.hidden=summary.providers.cloudflare.approved;
  actions.cloudflare.disabled=actions.cloudflare.disabled||summary.providers.cloudflare.scopeSetupRequired;
  gate.hidden=summary.ready;
  if(summary.ready){
   setStatus('GitHub and Cloudflare are verified. You can open Bubbles chat.');
   // The production gate remains in preview until Cloudflare OAuth is live-tested
   // and automatic private backup creation/verification is implemented.
  }else if(!githubApproved){
   setStatus('Connect GitHub and Cloudflare independently. Each authorization is separately verified and optional until you use its tools.');
  }else if(!summary.providers.cloudflare.configured){
   setStatus('GitHub verified. Bubbles Cloudflare OAuth client registration is incomplete. Chat remains usable; no repeated sign-in needed.');
  }else if(summary.providers.cloudflare.scopeSetupRequired){
   setStatus('Cloudflare OAuth app permissions need configuration by the Bubbles administrator. Repeated login cannot grant unavailable scopes.');
  }else setStatus('GitHub verified. Next, sign in to Cloudflare and approve its project permissions.');
  return summary;
 };
 const refresh=async()=>{
  if(loading||oauthInProgress)return latest;
  loading=true;
  for(const button of Object.values(actions))button.disabled=true;
  setStatus('Checking your saved GitHub and Cloudflare account authorizations…');
  try {
   const data=await client.call('/gate/status');
   lastChecked=Date.now();
   return render(data);
  } catch(error) {
   latest=null;gate.dataset.ready='false';
   const code=String(error?.message||'');
   if(code==='verified_wallet_required'){
    setStatus('This browser does not have a verified QuantaPhi wallet session. Recover your existing wallet first; no new wallet will be created.');
   } else if(code==='connections_not_configured'||code==='provider_not_configured'){
    setStatus('Account connection service is not ready. Chat remains available while the service is repaired.');
   } else if(code==='connection_timeout'){
    setStatus('Account check timed out after ten seconds. Bubbles chat is still available. Tap Check sign-ins again to retry.');
   } else setStatus('Could not verify the account connections right now. You can retry without signing out of Bubbles.');
   Object.values(labels).forEach(label=>{label.textContent='Could not check this account. Saved permissions were not changed.';});
   for(const button of Object.values(actions)){button.disabled=true;button.textContent='Check sign-ins again to retry';}
   return null;
  } finally {loading=false;if(latest)for(const id of ['github','cloudflare'])actions[id].disabled=!latest.providers[id].configured||oauthInProgress||(id==='cloudflare'&&latest.providers.cloudflare.scopeSetupRequired);}
 };
 for(const id of ['github','cloudflare']){
  actions[id].addEventListener('click',async()=>{
   if(oauthInProgress||loading||!latest?.providers[id]?.configured||(id==='cloudflare'&&latest.providers.cloudflare.scopeSetupRequired))return;
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
     for(const provider of ['github','cloudflare'])actions[provider].disabled=!latest?.providers?.[provider]?.configured||(provider==='cloudflare'&&latest?.providers?.cloudflare?.scopeSetupRequired);
    });
   }catch(error){
    oauthInProgress=false;
    setStatus('Could not start sign-in: '+String(error.message||'authorization_error').slice(0,180));
    for(const provider of ['github','cloudflare'])actions[provider].disabled=!latest?.providers?.[provider]?.configured||(provider==='cloudflare'&&latest?.providers?.cloudflare?.scopeSetupRequired);
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
 // After a same-window Android OAuth round trip, the previous page was
 // destroyed. Recover the pending state from this tab and let the wallet-
 // authenticated server finish it; never infer approval from the callback URL.
 const resuming=client.resumePending(async (error)=>{
  oauthInProgress=false;
  if(error){
   setStatus('Sign-in was not completed: '+String(error.message||'authorization_error').slice(0,180));
  }else{
   setStatus('Authorization returned. Checking the saved account permissions…');
  }
  const summary=await refresh();
  if(!error&&summary?.ready&&chat)chat.scrollIntoView({behavior:'smooth',block:'start'});
 });
 if(resuming){
  oauthInProgress=true;
  setStatus('Checking returned account authorization securely…');
 }else void refresh();
 return {refresh};
}
