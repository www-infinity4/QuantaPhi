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
