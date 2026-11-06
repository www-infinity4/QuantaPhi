import {AccountConnections,resolveConnectorWalletToken,providerAuthorizationActions} from './bubbles-connections-gate.mjs?v=20261106-google-multi-cloudflare-full8';

export function summarizeGate(payload){
 const summary={ready:false,signedIn:false,walletVerified:payload?.ok===true&&payload?.walletVerified===true,providers:{},state:'unverified'};
 // The authenticated /accounts view can confirm a live account even if
 // /gate/status is stale. No cookie, URL hint or dashboard login is proof.
 const verifiedAccounts=summary.walletVerified&&payload?.accountsVerified===true&&
  Array.isArray(payload?.accountRecords)?payload.accountRecords:[];
 for(const id of ['github','cloudflare']){
  const record=payload?.providers?.[id];
  const live=verifiedAccounts.find(account=>account?.provider===id&&
   account.status==='connected'&&Number.isFinite(account.expiresAt)&&
   account.expiresAt>Date.now()+30000);
  const configured=record?.configured===true||(record==null&&!!live);
  const connected=configured&&(record?.connected===true||!!live);
  const approved=connected&&record?.permissionsApproved===true;
  // Request every capability registered for this application. A missing project
  // capability must not prevent account sign-in or imply that access was granted.
  const authorizationActions=providerAuthorizationActions({id,...record});
  summary.providers[id]={configured,connected,approved,authorizationActions,
   label:connected?(typeof live?.label==='string'?live.label:typeof record?.label==='string'?record.label:''):'',
   reconnect:record?.reconnectRequired===true,
   scopeSetupRequired:record?.scopeSetupRequired===true,
   missing:Array.isArray(record?.missingActions)?record.missingActions.filter(a=>typeof a==='string'&&a.length<80).slice(0,6):[]};
 }
 // /accounts is read with the same authenticated wallet session as /gate/status.
 // An OAuth redirect or browser flag alone never earns a green check.
 const knownGoogle=payload?.ok===true&&payload?.walletVerified===true&&
  payload?.accountsVerified===true&&Array.isArray(payload?.accountRecords);
 const googleAccount=knownGoogle?payload.accountRecords.find(account=>
  account?.provider==='google'&&account.status==='connected'&&
  Number.isFinite(account.expiresAt)&&account.expiresAt>Date.now()+30000):null;
 summary.providers.google={connected:!!googleAccount,known:knownGoogle,
  label:googleAccount&&typeof googleAccount.label==='string'?googleAccount.label:''};
 summary.ready=summary.providers.github.approved&&summary.providers.cloudflare.approved&&payload?.ready===true;
 summary.signedIn=summary.providers.github.connected&&summary.providers.cloudflare.connected;
 summary.state=summary.ready?'ready':summary.signedIn?'signed-in':'setup';
 return summary;
}
export function mountBubblesSigninGate({root=document,host=window,prefix=''}={}){
 // Inline chat uses chatBubbles… IDs; the page uses bubbles… IDs.
 const get=id=>root.getElementById(prefix?prefix+id[0].toUpperCase()+id.slice(1):id);
 const gate=get('bubblesSigninGate');
 if(!gate)return null;
 const status=get('bubblesSigninStatus');
 const connectionSummary=get('bubblesConnectionSummary');
 const actions={github:get('bubblesGithubSignIn'),cloudflare:get('bubblesCloudflareSignIn')};
 const labels={github:get('bubblesGithubStatus'),cloudflare:get('bubblesCloudflareStatus')};
 const cards={github:get('bubblesGithubCard'),cloudflare:get('bubblesCloudflareCard')};
 const chat=get('bubblesAICard');
 const retry=get('bubblesRetrySignInCheck');
 const recover=get('bubblesRecoverWallet');
 const walletIdentity=get('bubblesWalletIdentity');
 const cancel=get('bubblesCancelSignIn');
 const client=new AccountConnections({token:()=>resolveConnectorWalletToken(host),root:host});
 let loading=false,oauthInProgress=false,latest=null,lastChecked=0,refreshInFlight=null,cloudflareRecoveryAttempted=false;
 const NOTE_KEY='bubbles:oauth-return-note:v1';
 const returned=(()=>{
  try{
   const value=JSON.parse(host.sessionStorage?.getItem(NOTE_KEY)||'null');
   return value&&['cloudflare','google'].includes(value.provider)&&['received','failed','declined'].includes(value.result)&&
    Number.isFinite(value.at)&&value.at<=Date.now()&&value.at>Date.now()-300000?value:null;
  }catch{return null;}
 })();
 const reasonTexts={
  callback_missing_code:'Cloudflare returned without an authorization code.',
  callback_state_invalid:'Bubbles could not match this return to the original sign-in session.',
  callback_handoff_failed:'Bubbles could not reach the secure authorization handoff. The Worker may be unavailable.',
  callback_handoff_state_invalid:'Your earlier Cloudflare sign-in session expired or disappeared. Start a new sign-in.',
  callback_handoff_conflict:'A different Cloudflare authorization return was already saved for this session. Start a new sign-in.',
  callback_handoff_decrypt_failed:'Bubbles could not decrypt your original sign-in session. The server keyring needs repair without erasing existing credentials.',
  callback_handoff_encrypt_failed:'Bubbles could not encrypt Cloudflare authorization. The server keyring needs repair.',
  callback_handoff_store_failed:'Bubbles could not write the encrypted authorization to secure storage.',
  invalid_scope:'Cloudflare rejected the permissions requested by Bubbles.',
  invalid_request:'Cloudflare rejected the sign-in request.',
  unauthorized_client:'Cloudflare did not authorize this OAuth application.',
  access_denied:'Cloudflare access was declined.',
  server_error:'Cloudflare authorization service reported an error.',
  temporarily_unavailable:'Cloudflare authorization service is temporarily unavailable.'
 };
 const returnedProviderName=returned?.provider==='google'?'Google':'Cloudflare';
 let returnIssue=returned?.result==='declined'?
  returnedProviderName+' authorization was declined. No account permission was granted.':
  returned?.result==='failed'?
  returnedProviderName+' returned an authorization error: '+(Object.hasOwn(reasonTexts,returned?.reason)?reasonTexts[returned.reason].replaceAll('Cloudflare',returnedProviderName):'Callback could not complete.')+' Your Bubbles account is not connected.':
  returned?.result==='received'?
  returnedProviderName+' returned to Bubbles. Waiting to verify your account with the server.':'';
 const clearReturnNote=()=>{try{host.sessionStorage?.removeItem(NOTE_KEY);}catch{}};
 const setStatus=text=>{status.textContent=text;};
 const finalizeReturn=async(id,error)=>{
  oauthInProgress=false;
  const providerName={cloudflare:'Cloudflare',github:'GitHub',google:'Google'}[id]||'Account';
  const summary=await refresh();
  if(error){
   returnIssue=providerName+' sign-in did not complete: '+String(error.message||'Authorization could not be verified.')+
    ' Your account remains unverified.';
  }else if(summary?.providers?.[id]?.connected){
   clearReturnNote();
   returnIssue=summary.providers[id].approved?
    providerName+' sign-in verified and required permissions approved.':
    providerName+' sign-in verified. Optional project permissions are managed separately.';

    // OAuth return must not move the visitor away from the active Quick Card.
  }else{
   returnIssue=providerName+' returned, but Bubbles could not verify a connected account. Check that you are in the original wallet-authorized Chrome tab.';
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
  if(connectionSummary){
   const names={google:'Google',github:'GitHub',cloudflare:'Cloudflare'};
   connectionSummary.textContent=['google','github','cloudflare'].map(id=>{
    const provider=summary.providers[id];
    return provider?.connected?'✅ '+names[id]+' signed in':
     id==='google'&&!provider?.known?'Google status unavailable':names[id]+' not connected';
   }).join(' · ');
   connectionSummary.hidden=false;
  }
  for(const id of ['github','cloudflare']){
   const value=summary.providers[id];
   cards[id].dataset.status=value.connected?'connected':value.configured?'pending':'unavailable';
   // Keep project access review separate from an already verified identity.
   // Connected means signed in, regardless of optional project grants.
   cards[id].hidden=value.connected;
   actions[id].hidden=value.connected;
   actions[id].textContent=value.connected&&!value.approved&&id==='cloudflare'?'Review Cloudflare project access':
    'Sign in with '+(id==='github'?'GitHub':'Cloudflare');
   labels[id].textContent=value.connected?
    'Signed in'+(value.label?' as '+value.label:''):
    !value.configured?'Sign-in is temporarily unavailable. Please try again later.':
    value.reconnect?'Your session expired. Sign in again.':
    'Continue securely on '+(id==='github'?'GitHub':'Cloudflare')+'.';
  }
  // Account sign-in and project authorization are separate. Only the server can
  // approve a tool's permissions; hiding this form never authorizes a tool.
  gate.dataset.ready=String(summary.ready);
  gate.hidden=summary.ready||summary.signedIn||summary.walletVerified||(prefix==='chat'&&gate.dataset.ownerVerified==='true');
  if(walletIdentity){
   walletIdentity.hidden=!summary.walletVerified;
   walletIdentity.textContent=summary.walletVerified?'Signed in to Bubbles with your Unified Wallet.':'';
  }
  if(summary.ready){
   clearReturnNote();returnIssue='';
   setStatus('You’re signed in with the required permissions.');
  }else if(returnIssue)setStatus(returnIssue);
  else if(summary.signedIn)setStatus('Your accounts are signed in. Optional project permissions are managed in Account Connections.');
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
    const session=await client.call('/session');
    let data;
    try{data=await client.call('/gate/status');}
    catch(error){
     if(session?.walletVerified!==true)throw error;
     data={ok:true,ready:false,providers:{}};
    }
    // Google is in the verified accounts catalog, not build-permissions gate.
    let accountRecords=null;
    if(session?.walletVerified===true){
     try{
      const accounts=await client.call('/accounts');
      if(Array.isArray(accounts?.accounts))accountRecords=accounts.accounts;
     }catch{}
    }
    // The Android callback can be received securely while the original tab
    // loses its browser-local return note. Finish that already-authorized
    // Cloudflare handoff once, without initiating a fresh OAuth sign-in.
    if(!cloudflareRecoveryAttempted&&session?.walletVerified===true&&
       Array.isArray(accountRecords)&&!client.pending&&!oauthInProgress&&
       !accountRecords.some(account=>account?.provider==='cloudflare'&&
         account.status==='connected'&&Number.isFinite(account.expiresAt)&&
         account.expiresAt>Date.now()+30000)){
      cloudflareRecoveryAttempted=true;
      try{
       const recovered=await client.call('/handoff/cloudflare/resume',{},45000);
       if(recovered.status==='connected'&&recovered.account){
        const current=await client.call('/accounts');
        if(Array.isArray(current?.accounts))accountRecords=current.accounts;
       }
      }catch(error){
       returnIssue='Cloudflare authorization recovery failed: '+String(error?.message||'unverified')+
        '. Your connection remains unverified.';
      }
    }
    lastChecked=Date.now();
    return render({...data,walletVerified:session?.walletVerified===true,
     accountsVerified:Array.isArray(accountRecords),accountRecords:accountRecords||[]});
   } catch(error) {
    latest=null;gate.hidden=prefix==='chat'&&gate.dataset.ownerVerified==='true';gate.dataset.ready='false';
    if(connectionSummary){connectionSummary.textContent='Account status unavailable · Open Account Connections to retry';connectionSummary.hidden=false;}
    if(walletIdentity){walletIdentity.hidden=true;walletIdentity.textContent='';}
    const code=String(error?.message||'');
    if(code==='verified_wallet_required'){
     setStatus('Sign in with StarQuest to connect your existing Unified Wallet to Bubbles.');
     if(recover)recover.hidden=false;
    }else if(code==='connection_timeout'){
     setStatus('The account check timed out. Tap Sign in with Cloudflare to retry.');
    }else{
     setStatus('Could not check the account session. Tap Sign in with Cloudflare to retry; no permissions were changed.');
    }
    for(const id of ['github','cloudflare']){
     cards[id].hidden=false;actions[id].hidden=false;
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
   if(provider.connected)return;
   // Sign-in must open Cloudflare's small account consent. Large project
   // scopes require separate, explicit permission review after verification.
   const authorizationActions=id==='cloudflare'?['account.read']:provider.authorizationActions;
   oauthInProgress=true;updateButtons();
   setStatus('Opening '+(id==='github'?'GitHub':'Cloudflare')+' account authorization…');
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
 // Android may return seconds after provider consent. Always revalidate.
 host.addEventListener('pageshow',()=>void refresh());
 root.addEventListener('visibilitychange',()=>{if(!root.hidden)void refresh();});
 // Resume the existing wallet-bound Android handoff after same-window navigation.
 const pendingHandoff=client.readPendingHandoff();
 // Both Google and Cloudflare recover an already-received callback in a
 // lost Android tab only through the server's wallet-bound sealed handoff.
 const recoveredProvider=returned?.result==='received'&&
  ['google','cloudflare'].includes(returned.provider)?returned.provider:null;
 const resumingProvider=pendingHandoff?.provider||recoveredProvider||'cloudflare';
 const resuming=client.resumePending(error=>void finalizeReturn(resumingProvider,error),{
  recoverGoogle:recoveredProvider==='google',
  recoverCloudflare:recoveredProvider==='cloudflare'
 });
 if(resuming){
  oauthInProgress=true;updateButtons();
  setStatus('Finishing sign-in…');
 }else void refresh();
 return {refresh};
}
