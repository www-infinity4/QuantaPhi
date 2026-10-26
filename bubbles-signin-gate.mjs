import {AccountConnections,resolveConnectorWalletToken} from './bubbles-connections-gate.mjs?v=20261025-required1';

const REQUIRED=Object.freeze({github:['repository.read'],cloudflare:['account.read','projects.build','ledger.read','projects.full']});
export function summarizeGate(payload){
 const summary={ready:false,providers:{},state:'unverified'};
 for(const id of ['github','cloudflare']){
  const record=payload?.providers?.[id];
  const configured=record?.configured===true,connected=configured&&record?.connected===true;
  const approved=connected&&record?.permissionsApproved===true;
  summary.providers[id]={configured,connected,approved,
   label:approved&&typeof record.label==='string'?record.label.slice(0,160):'',
   reconnect:record?.reconnectRequired===true,scopeSetupRequired:record?.scopeSetupRequired===true,
   missing:Array.isArray(record?.missingActions)?record.missingActions.filter(a=>typeof a==='string'&&a.length<80).slice(0,6):[]};
 }
 summary.ready=summary.providers.github.approved&&summary.providers.cloudflare.approved&&payload?.ready===true&&
  payload?.mode==='required'&&payload?.integra?.status==='passed';
 summary.state=summary.ready?'ready':'setup';
 return summary;
}
export function mountBubblesSigninGate({root=document,host=window,prefix='',onChange=()=>{},client:providedClient}={}){
 const get=id=>root.getElementById(prefix?prefix+id[0].toUpperCase()+id.slice(1):id),gate=get('bubblesSigninGate');
 if(!gate)return null;
 const status=get('bubblesSigninStatus'),application=get('bubblesApplication');
 const actions={github:get('bubblesGithubSignIn'),cloudflare:get('bubblesCloudflareSignIn')};
 const labels={github:get('bubblesGithubStatus'),cloudflare:get('bubblesCloudflareStatus')};
 const cards={github:get('bubblesGithubCard'),cloudflare:get('bubblesCloudflareCard')};
 const retry=get('bubblesRetrySignInCheck');
 const client=providedClient||new AccountConnections({token:()=>resolveConnectorWalletToken(host),root:host});
 let loading=false,oauthInProgress=false,latest=null,lastChecked=0,refreshTask=null;
 const setStatus=text=>{status.textContent=text;};
 const publish=summary=>{
  gate.dataset.ready=String(summary?.ready===true);gate.hidden=summary?.ready===true;
  if(application){application.hidden=!summary?.ready;application.inert=!summary?.ready;}
  onChange(summary);
 };
 const updateButtons=()=>{
  for(const id of ['github','cloudflare']){
   const value=latest?.providers[id];
   actions[id].disabled=loading||oauthInProgress||!value?.configured||value.approved||
    (id==='cloudflare'&&(!latest?.providers.github.approved||value.scopeSetupRequired));
  }
  if(retry)retry.disabled=loading||oauthInProgress;
 };
 const render=data=>{
  const summary=summarizeGate(data);latest=summary;
  for(const id of ['github','cloudflare']){
   const value=summary.providers[id];
   cards[id].dataset.status=value.approved?'connected':value.configured?'pending':'unavailable';
   actions[id].textContent=value.approved?'Connected':!value.configured?'Provider setup needed':
    value.scopeSetupRequired?'Cloudflare app permissions need setup':'Sign in with '+(id==='github'?'GitHub':'Cloudflare');
   labels[id].textContent=value.approved?'Verified'+(value.label?' · '+value.label:''):
    !value.configured?'Bubbles’ '+(id==='github'?'GitHub':'Cloudflare')+' sign-in application needs administrator setup.':
    value.scopeSetupRequired?'The Cloudflare application has not registered the required permissions. Repeating sign-in cannot fix this.':
    value.connected?'The required permissions have not all been approved.':
    value.reconnect?'Authorization expired or was disconnected. Please sign in again.':'Sign in to continue.';
  }
  cards.github.hidden=summary.providers.github.approved;
  cards.cloudflare.hidden=!summary.providers.github.approved||summary.providers.cloudflare.approved;
  publish(summary);
  if(summary.ready)setStatus('GitHub and Cloudflare verified. Opening Bubbles.');
  else if(!summary.providers.github.approved)setStatus('Step 1 of 2 · Sign in with GitHub.');
  else if(!summary.providers.cloudflare.configured)setStatus('GitHub verified. Cloudflare sign-in needs administrator setup before Bubbles can open.');
  else if(summary.providers.cloudflare.scopeSetupRequired)setStatus('GitHub verified. The Cloudflare application needs its project permissions configured.');
  else if(summary.providers.cloudflare.approved)setStatus('The connection service needs its required-sign-in update. Bubbles stays locked until Integra verifies both connections.');
  else setStatus('Step 2 of 2 · Sign in with Cloudflare.');
  updateButtons();return summary;
 };
 const refresh=()=>{
  if(refreshTask)return refreshTask;
  if(oauthInProgress)return Promise.resolve(latest);
  refreshTask=(async()=>{
   loading=true;updateButtons();setStatus('Checking your saved account authorizations…');
   try{const data=await client.call('/gate/status');lastChecked=Date.now();return render(data);}
   catch(error){
    latest=null;publish(null);cards.github.hidden=false;cards.cloudflare.hidden=true;
    const code=String(error?.message||'');
    setStatus(code==='verified_wallet_required'?'Restore your existing QuantaPhi account session, then sign in with GitHub. No new wallet is created.':
     code==='connection_timeout'?'The account check timed out. Bubbles stays locked; use Check sign-ins again to retry.':
     /not_configured/.test(code)?'The account connection service needs administrator setup before Bubbles can open.':
     'Could not verify your sign-ins. Bubbles stays locked; retry the account check.');
    Object.values(labels).forEach(label=>{label.textContent='Verification unavailable. Saved permissions were not changed.';});
    Object.values(actions).forEach(button=>{button.textContent='Verification unavailable';});
    return null;
   }finally{loading=false;refreshTask=null;updateButtons();}
  })();return refreshTask;
 };
 for(const id of ['github','cloudflare'])actions[id].addEventListener('click',async()=>{
  if(actions[id].disabled||oauthInProgress||loading)return;
  oauthInProgress=true;updateButtons();
  setStatus('Complete '+(id==='github'?'GitHub':'Cloudflare')+' sign-in in its official window.');
  const finished=async(error)=>{
   oauthInProgress=false;
   if(error){setStatus('Sign-in was not completed. '+String(error.message||'Please try again.').slice(0,180));updateButtons();}
   else{setStatus('Authorization returned. Integra is verifying it…');await refresh();
    host.dispatchEvent(new host.Event('bubbles:connections-changed'));}
  };
  try{await client.connect(id,REQUIRED[id],finished);}catch(error){await finished(error);}
 });
 retry?.addEventListener('click',()=>void refresh());
 host.addEventListener('pageshow',()=>{if(Date.now()-lastChecked>15000)void refresh();});
 host.addEventListener('bubbles:connections-changed',()=>void refresh());
 root.addEventListener('visibilitychange',()=>{if(!root.hidden&&Date.now()-lastChecked>15000)void refresh();});
 publish(null);void refresh();
 return {refresh,check:()=>Date.now()-lastChecked<15000?Promise.resolve(latest):refresh(),get snapshot(){return latest;}};
}
