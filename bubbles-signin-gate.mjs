import {AccountConnections,resolveConnectorWalletToken,providerAuthorizationActions} from './bubbles-connections-gate.mjs?v=20261026-full-consent6';

export function summarizeGate(payload){
 const summary={ready:false,signedIn:false,providers:{},state:'unverified'};
 for(const id of ['github','cloudflare']){
  const record=payload?.providers?.[id];
  const configured=record?.configured===true;
  const connected=configured&&record?.connected===true;
  const approved=connected&&record?.permissionsApproved===true;
  // Request every capability registered for this application. A missing project
  // capability must not prevent account sign-in or imply that access was granted.
  const authorizationActions=providerAuthorizationActions({id,...record});
  summary.providers[id]={configured,connected,approved,authorizationActions,
   label:connected&&typeof record.label==='string'?record.label:'',
   reconnect:record?.reconnectRequired===true,
   scopeSetupRequired:record?.scopeSetupRequired===true,
   missing:Array.isArray(record?.missingActions)?record.missingActions.filter(a=>typeof a==='string'&&a.length<80).slice(0,6):[]};
 }
 summary.ready=summary.providers.github.approved&&summary.providers.cloudflare.approved&&payload?.ready===true;
 summary.signedIn=summary.providers.github.connected&&summary.providers.cloudflare.connected;
 summary.state=summary.ready?'ready':summary.signedIn?'signed-in':'setup';
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
 const retry=get('bubblesRetrySignInCheck');
 const cancel=get('bubblesCancelSignIn');
 const client=new AccountConnections({token:()=>resolveConnectorWalletToken(host),root:host});
 let loading=false,oauthInProgress=false,latest=null,lastChecked=0;
 const setStatus=text=>{status.textContent=text;};
 const updateButtons=()=>{
  for(const id of ['github','cloudflare']){
   actions[id].disabled=loading||oauthInProgress||!latest?.providers[id]?.configured||!latest.providers[id].authorizationActions.length;
  }
  if(retry)retry.disabled=loading||oauthInProgress;
  if(cancel)cancel.hidden=!oauthInProgress||!client.pending;
  for(const button of Object.values(actions))button.setAttribute?.('aria-busy',String(oauthInProgress));
 };
 const render=data=>{
  const summary=summarizeGate(data);latest=summary;
  for(const id of ['github','cloudflare']){
   const value=summary.providers[id];
   cards[id].dataset.status=value.connected?'connected':value.configured?'pending':'unavailable';
   cards[id].hidden=value.connected;
   actions[id].textContent='Sign in with '+(id==='github'?'GitHub':'Cloudflare');
   labels[id].textContent=value.connected?
    'Signed in'+(value.label?' as '+value.label:''):
    !value.configured?'Sign-in is temporarily unavailable. Please try again later.':
    value.reconnect?'Your session expired. Sign in again.':
    'Continue securely on '+(id==='github'?'GitHub':'Cloudflare')+'.';
  }
  // Account sign-in and project authorization are separate. Only the server can
  // approve a tool's permissions; hiding this form never authorizes a tool.
  gate.dataset.ready=String(summary.ready);
  gate.hidden=summary.signedIn;
  if(summary.signedIn)setStatus('You’re signed in.');
  else if(summary.providers.github.connected)setStatus('Continue with Cloudflare.');
  else setStatus('Sign in to connect your accounts.');
  updateButtons();
  return summary;
 };
 const refresh=async()=>{
  if(loading||oauthInProgress)return latest;
  loading=true;updateButtons();
  setStatus('Checking your sign-in…');
  try {
   const data=await client.call('/gate/status');
   lastChecked=Date.now();
   return render(data);
  } catch(error) {
   latest=null;gate.hidden=false;gate.dataset.ready='false';
   const code=String(error?.message||'');
   if(code==='verified_wallet_required'){
    setStatus('Restore your existing wallet to connect these accounts.');
   }else if(code==='connection_timeout'){
    setStatus('The connection timed out. Try again.');
   }else setStatus('Couldn’t check your sign-in. Try again.');
   for(const id of ['github','cloudflare']){
    labels[id].textContent='';
    actions[id].textContent='Sign in with '+(id==='github'?'GitHub':'Cloudflare');
   }
   return null;
  } finally {loading=false;updateButtons();}
 };
 for(const id of ['github','cloudflare']){
  actions[id].addEventListener('click',async()=>{
   if(actions[id].disabled||oauthInProgress||loading||!latest?.providers[id]?.configured)return;
   const authorizationActions=latest.providers[id].authorizationActions;
   if(!authorizationActions.length)return;
   oauthInProgress=true;updateButtons();
   setStatus('Continue on '+(id==='github'?'GitHub':'Cloudflare')+' to sign in.');
   try{
    await client.connect(id,authorizationActions,async (error)=>{
     oauthInProgress=false;
     if(error)setStatus('Sign-in wasn’t completed. Try again.');
     else {
      const summary=await refresh();
      if(summary?.signedIn&&chat)chat.scrollIntoView({behavior:'smooth',block:'start'});
     }
     updateButtons();
    });
    updateButtons();
   }catch(error){
    oauthInProgress=false;
    setStatus(error?.message==='cloudflare_client_scopes_unavailable'?
     'Cloudflare has not enabled the requested permissions for this application.':
     'Couldn’t open sign-in. Try again.');
    updateButtons();
   }
  });
 }
 if(retry)retry.addEventListener('click',()=>void refresh());
 if(cancel)cancel.addEventListener('click',()=>{
  client.cancelConnect();oauthInProgress=false;
  setStatus('Sign-in cancelled. You can try again.');updateButtons();
 });
 host.addEventListener('pageshow',()=>{if(Date.now()-lastChecked>15000)void refresh();});
 root.addEventListener('visibilitychange',()=>{if(!root.hidden&&Date.now()-lastChecked>15000)void refresh();});
 // Resume the existing wallet-bound Android handoff after same-window navigation.
 const resuming=client.resumePending(async (error)=>{
  oauthInProgress=false;
  if(error)setStatus('Sign-in wasn’t completed. Try again.');
  const summary=await refresh();
  if(!error&&summary?.signedIn&&chat)chat.scrollIntoView({behavior:'smooth',block:'start'});
 });
 if(resuming){
  oauthInProgress=true;updateButtons();
  setStatus('Finishing sign-in…');
 }else void refresh();
 return {refresh};
}
