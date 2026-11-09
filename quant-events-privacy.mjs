import {resolveConnectorWalletToken} from '/bubbles-connections.mjs?v=20261106-google-multi-cloudflare-full8';

const endpoint='/api/quant-events/consent';
const status=document.getElementById('status');
const checkbox=document.getElementById('analytics-consent');
const allow=document.getElementById('save-consent');
const revoke=document.getElementById('revoke-consent');
const refresh=document.getElementById('refresh-consent');
let available=false,enabled=false,pending=false;

function render(message){
  status.textContent=message;
  checkbox.disabled=!available||pending||enabled;
  allow.disabled=!available||pending||enabled||!checkbox.checked;
  revoke.disabled=!available||pending||!enabled;
  refresh.disabled=pending;
}
async function call(body){
  const token=await resolveConnectorWalletToken(window);
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try {
    const response=await fetch(endpoint,{
      method:body?'POST':'GET',
      cache:'no-store',
      headers:{
        Authorization:'Bearer '+token,
        ...(body?{'Content-Type':'application/json'}:{})
      },
      ...(body?{body:JSON.stringify(body)}:{}),
      signal:controller.signal
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.error||'service_unavailable');
    if(typeof data.enabled!=='boolean'||data.policyVersion!=='v1'||data.location!==false) {
      throw Error('unexpected_consent_response');
    }
    return data;
  }finally{clearTimeout(timeout);}
}
function humanError(error) {
  const reason=String(error?.message||'');
  if(reason==='verified_wallet_required')return 'Sign into your existing QuantaPhi Wallet in this browser to manage analytics.';
  if(['event_collection_disabled','consent_management_disabled','consent_service_unavailable','service_unavailable'].includes(reason)){
    return 'This preference service is not active yet. No change could be confirmed.';
  }
  if(reason==='wallet_session_not_verified')return 'Wallet sign-in could not be verified. No change could be confirmed.';
  if(reason==='analytics_consent_required')return 'Your analytics consent has not been granted.';
  return 'Unable to verify this preference ('+(reason||'connection_failed')+'). No change confirmed.';
}
async function apply(body){
  if(pending)return;
  pending=true;
  render('Checking your verified Wallet preference…');
  try {
    const data=await call(body);
    enabled=data.enabled;
    available=true;
    checkbox.checked=enabled;
    render(enabled
      ? 'First-party analytics consent is enabled for this signed-in Wallet account. Location collection is off.'
      : 'First-party analytics consent is off for this signed-in Wallet account.');
  }catch(error){
    available=false;
    enabled=false;
    checkbox.checked=false;
    render(humanError(error));
  }finally{pending=false;render(status.textContent);}
}
checkbox.addEventListener('change',()=>render(status.textContent));
allow.addEventListener('click',()=>{
  if(!checkbox.checked||!available||enabled)return;
  apply({action:'grant',opt_in:true,policy_version:'v1'});
});
revoke.addEventListener('click',()=>{
  if(!available||!enabled)return;
  apply({action:'revoke'});
});
refresh.addEventListener('click',()=>apply());
apply();


// Privacy data management is deliberately separate from optional event
// collection. No export or deletion request fires on page load.
const exportButton=document.getElementById('export-events');
const eraseButton=document.getElementById('erase-events');
const eraseCheck=document.getElementById('confirm-erasure');
const dataStatus=document.getElementById('data-status');
let dataBusy=false;
function dataState(message){
  dataStatus.textContent=message;
  exportButton.disabled=dataBusy;
  eraseCheck.disabled=dataBusy;
  eraseButton.disabled=dataBusy||!eraseCheck.checked;
}
async function dataRequest(method,body,cursor){
  const token=await resolveConnectorWalletToken(window);
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const suffix=cursor?'?cursor='+encodeURIComponent(cursor):'';
    const result=await fetch('/api/quant-events/data'+suffix,{
      method,cache:'no-store',
      headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),
      signal:controller.signal
    });
    const data=await result.json().catch(()=>({}));
    if(!result.ok)throw Error(data.error||'data_service_unavailable');
    return data;
  }finally{clearTimeout(timeout);}
}
function dataError(error){
  const code=String(error?.message||'unknown_error');
  if(code==='data_management_disabled'||code==='data_service_unavailable')
    return 'Your event data service is not active yet. Nothing was downloaded or changed.';
  if(code==='wallet_session_not_verified'||code==='verified_wallet_required')
    return 'Sign into your verified QuantaPhi Wallet before using the data controls.';
  if(code==='export_too_large')
    return 'Your event history is larger than this browser export limit. No partial download was represented as complete.';
  return 'Could not verify the data operation ('+code+'). Check status before trying again.';
}
exportButton.addEventListener('click',async()=>{
  if(dataBusy)return;
  dataBusy=true;
  dataState('Reading your verified Wallet event history…');
  try{
    const events=[];
    let cursor=null,complete=false;
    for(let page=0;page<50;page++){
      const result=await dataRequest('GET',null,cursor);
      if(!Array.isArray(result.events)||result.events.length>100||
         (result.nextCursor!==null&&typeof result.nextCursor!=='string'))
        throw Error('unexpected_export_response');
      events.push(...result.events);
      cursor=result.nextCursor;
      if(cursor===null){complete=true;break;}
    }
    if(!complete)throw Error('export_too_large');
    const file=new Blob([JSON.stringify({
      source:'QuantaPhi first-party Quick Card analytics',
      exportedAt:new Date().toISOString(),events
    },null,2)],{type:'application/json'});
    const href=URL.createObjectURL(file);
    const link=document.createElement('a');
    link.href=href;
    link.download='quantaphi-my-events.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(href),60000);
    dataState('Export generated for '+events.length+' event records. Your Wallet was not changed.');
  }catch(err){dataState(dataError(err));}
  finally{dataBusy=false;dataState(dataStatus.textContent);}
});
eraseCheck.addEventListener('change',()=>dataState(dataStatus.textContent));
eraseButton.addEventListener('click',async()=>{
  if(dataBusy||!eraseCheck.checked)return;
  if(!window.confirm('Erase saved QuantaPhi first-party analytics events and turn off that consent? Your Wallet and coins will not be erased.'))return;
  dataBusy=true;
  dataState('Requesting verified account-specific erasure…');
  try{
    const answer=await dataRequest('POST',{action:'erase',confirm:'DELETE_MY_ANALYTICS'});
    if(answer.erased!==true||answer.remainingEvents!==0||answer.analyticsConsent!==false)
      throw Error('erasure_not_confirmed');
    eraseCheck.checked=false;
    dataState('Erasure verified: no saved Quick Card analytics events remain for this account. A minimal revocation marker remains.');
    await apply();
  }catch(err){dataState(dataError(err));}
  finally{dataBusy=false;dataState(dataStatus.textContent);}
});
dataState('Export and erase are available only when the separate private service is enabled.');
