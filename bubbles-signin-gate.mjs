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
export function mountBubblesSigninGate({root=document,host=window}={}){
 const gate=root.getElementById('bubblesSigninGate');
 if(!gate)return null;
 const status=root.getElementById('bubblesSigninStatus');
 const actions={github:root.getElementById('bubblesGithubSignIn'),cloudflare:root.getElementById('bubblesCloudflareSignIn')};
 const labels={github:root.getElementById('bubblesGithubStatus'),cloudflare:root.getElementById('bubblesCloudflareStatus')};
 const cards={github:root.getElementById('bubblesGithubCard'),cloudflare:root.getElementById('bubblesCloudflareCard')};
 const chat=root.getElementById('bubblesAICard');
 const openChat=root.getElementById('bubblesOpenExistingChat');
 const retry=root.getElementById('bubblesRetrySignInCheck');
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
