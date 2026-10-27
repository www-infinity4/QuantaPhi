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
 const recover=get('bubblesRecoverWallet');
 const cancel=get('bubblesCancelSignIn');
 const client=new AccountConnections({token:()=>resolveConnectorWalletToken(host),root:host});
 let loading=false,oauthInProgress=false,latest=null,lastChecked=0,refreshInFlight=null;
 const NOTE_KEY='bubbles:oauth-return-note:v1';
 const returned=(()=>{
  try{
   const value=JSON.parse(host.sessionStorage?.getItem(NOTE_KEY)||'null');
   return value&&value.provider==='cloudflare'&&['received','failed'].includes(value.result)&&
    Number.isFinite(value.at)&&value.at<=Date.now()&&value.at>Date.now()-300000?value:null;
  }catch{return null;}
 })();
 let returnIssue=returned?.result==='failed'?
  'Cloudflare returned an authorization error. Your Bubbles account is not connected.':
  returned?.result==='received'?
  'Cloudflare returned to Bubbles. Waiting to verify your account with the server.':'';
 const clearReturnNote=()=>{try{host.sessionStorage?.removeItem(NOTE_KEY);}catch{}};
 const setStatus=text=>{status.textContent=text;};
 const finalizeReturn=async(id,error)=>{
  oauthInProgress=false;
  const summary=await refresh();
  if(error){
   returnIssue=(id==='cloudflare'?'Cloudflare':'GitHub')+' sign-in did not complete: '+String(error.message||'Authorization could not be verified.')+
    ' Your account remains unverified.';
  }else if(summary?.providers?.[id]?.connected){
   clearReturnNote();
   returnIssue=summary.providers[id].approved?
    (id==='cloudflare'?'Cloudflare':'GitHub')+' sign-in verified and required permissions approved.':
    (id==='cloudflare'?'Cloudflare':'GitHub')+' account connected, but not all requested permissions were approved. Review the remaining permissions.';
   if(summary?.ready&&chat)chat.scrollIntoView({behavior:'smooth',block:'start'});
  }else{
   returnIssue=(id==='cloudflare'?'Cloudflare':'GitHub')+' returned, but Bubbles could not verify a connected account. Check that you are in the original wallet-authorized Chrome tab.';
  }
  setStatus(returnIssue);
  updateButtons();
 };
 const updateButtons=()=>{
  for(const id of ['github','cloudflare']){
   // A provider button must never become a dead control just because wallet
   // discovery or the account-status request failed. It remains clickable to
   // explain the prerequisite or to initiate the verified OAuth /start flow.
   actions[id].disabled=oauthInProgress;
  }
  if(retry)retry.disabled=loading||oauthInProgress;
  if(cancel)cancel.hidden=!oauthInProgress||!client.pending;
  for(const button of Object.values(actions))button.setAttribute?.('aria-busy',String(oauthInProgress));
 };
 const render=data=>{
  const summary=summarizeGate(data);latest=summary;
  if(recover)recover.hidden=true;
  for(const id of ['github','cloudflare']){
   const value=summary.providers[id];
   cards[id].dataset.status=value.connected?(value.approved?'connected':'upgrade'):value.configured?'pending':'unavailable';
   // A previous partial OAuth connection must still offer re-authorization.
   // Hiding the button because an old six-scope connection exists prevents
   // the new 386-scope consent flow from ever starting.
   cards[id].hidden=value.connected&&value.approved;
   actions[id].textContent=value.connected&&!value.approved&&id==='cloudflare'?
    'Review Cloudflare permissions':'Sign in with '+(id==='github'?'GitHub':'Cloudflare');
   labels[id].textContent=value.connected?
    value.approved?'Signed in'+(value.label?' as '+value.label:''):
    'Connected with limited permissions. Review and authorize Cloudflare access to finish setup.':
    !value.configured?'Sign-in is temporarily unavailable. Please try again later.':
    value.reconnect?'Your session expired. Sign in again.':
    'Continue securely on '+(id==='github'?'GitHub':'Cloudflare')+'.';
  }
  // Account sign-in and project authorization are separate. Only the server can
  // approve a tool's permissions; hiding this form never authorizes a tool.
  gate.dataset.ready=String(summary.ready);
  gate.hidden=summary.ready;
  if(summary.ready){
   clearReturnNote();returnIssue='';
   setStatus('You’re signed in with the required permissions.');
  }else if(returnIssue)setStatus(returnIssue);
  else if(summary.signedIn)setStatus('Your account is connected, but Cloudflare needs authorization for the remaining permissions.');
  else if(summary.providers.github.connected)setStatus('Continue with Cloudflare.');
  else setStatus('Sign in to connect your accounts.');
  updateButtons();
  return summary;
 };
 const refresh=async()=>{
  if(oauthInProgress)return latest;
  if(refreshInFlight)return refreshInFlight;
  refreshInFlight=(async()=>{
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
     setStatus('Cloudflare sign-in requires your verified Bubbles wallet in this browser. Restore that wallet first, then tap Sign in with Cloudflare again.');
     if(recover)recover.hidden=false;
    }else if(code==='connection_timeout'){
     setStatus('The account check timed out. Tap Sign in with Cloudflare to retry.');
    }else{
     setStatus('Could not check the account session. Tap Sign in with Cloudflare to retry; no permissions were changed.');
    }
    for(const id of ['github','cloudflare']){
     labels[id].textContent='';
     actions[id].textContent='Sign in with '+(id==='github'?'GitHub':'Cloudflare');
    }
    return null;
   } finally {loading=false;updateButtons();}
  })();
  try{return await refreshInFlight;}finally{refreshInFlight=null;}
 };
 for(const id of ['github','cloudflare']){
  actions[id].addEventListener('click',async()=>{
   if(oauthInProgress)return;
   // Click itself always performs a fresh status check. A missing wallet shows
   // an actionable recovery link rather than leaving a disabled login button.
   const current=await refresh();
   if(!current)return;
   const provider=current.providers[id];
   if(!provider?.configured||!provider.authorizationActions.length){
    setStatus((id==='cloudflare'?'Cloudflare':'GitHub')+' sign-in is not configured on the connection service. No authorization was started.');
    return;
   }
   const authorizationActions=provider.authorizationActions;
   oauthInProgress=true;updateButtons();
   setStatus('Continue on '+(id==='github'?'GitHub':'Cloudflare')+' to sign in.');
   try{
    returnIssue='';
    clearReturnNote();
    await client.connect(id,authorizationActions,error=>void finalizeReturn(id,error));
    updateButtons();
   }catch(error){
    oauthInProgress=false;
    const code=String(error?.message||'');
    setStatus(code==='cloudflare_client_scopes_unavailable'?
     'The OAuth client rejected the requested Cloudflare permissions; sign-in did not start.':
     code==='verified_wallet_required'?
     'Verify your Bubbles wallet in this browser before connecting Cloudflare.':
     'Could not open the official sign-in page. Try again.');
    if(code==='verified_wallet_required'&&recover)recover.hidden=false;
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
 const resuming=client.resumePending(error=>void finalizeReturn('cloudflare',error));
 if(resuming){
  oauthInProgress=true;updateButtons();
  setStatus('Finishing sign-in…');
 }else void refresh();
 return {refresh};
}
