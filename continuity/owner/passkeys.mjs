/* Robot Brain private owner passkey workspace.
 * No public registration button, owner email or browser-local authentication
 * flag. Display only after an actual owner wallet check from Robot Brain.
 * The passkey API independently verifies every registration and login.
 */
const region=document.getElementById('account-security');
const root=document.getElementById('ownerPasskeyWorkspace');
const status=document.getElementById('ownerPasskeyServiceStatus');
const gate=window.QuantaBrainOwner;
const text=(message)=>{if(status)status.textContent=message;};
const element=(tag,content)=>{
 const node=document.createElement(tag);
 if(content!==undefined)node.textContent=content;
 return node;
};
async function openPrivateOwnerPasskeys(){
 if(!region||!root||!status||!gate?.ready||typeof gate.walletIdentity!=='function')return;
 try{
  const headers=await gate.ready;
  if(typeof headers?.Authorization!=='string'||!headers.Authorization)return;
  const verified=await gate.walletIdentity();
  if(verified?.state!=='verified')return;
  region.hidden=false;
  text('Owner wallet verified. Checking passkey registration service…');
  // Android 12 WebView may not implement AbortSignal.timeout.
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),9000);
  let response;
  try{
   response=await fetch('/api/quant-mail/passkeys/status',{
    method:'GET',cache:'no-store',credentials:'same-origin',signal:controller.signal
   });
  }finally{clearTimeout(timer);}
  if(!response.ok){
   text('The phone passkey server is not active. No account, email or wallet was changed.');
   return;
  }
  const state=await response.json();
  if(state?.ok!==true||state.enabled!==true||state.registrationReady!==true||
     state.loginReady!==true||state.rpId!=='quantaphi.org'){
   text('The verified owner passkey service is not enabled yet. Your existing wallet remains unchanged.');
   return;
  }
  const label=element('label','Choose owner address');
  label.htmlFor='quantMailPasskeyAlias';
  label.style.cssText='display:block;font-weight:700;margin:14px 0 6px';
  const select=element('select');select.id='quantMailPasskeyAlias';
  select.style.cssText='width:100%;min-height:48px;border:1px solid #a7b6be;border-radius:10px;padding:12px;font:inherit';
  for(const address of ['kris@quantaphi.org','administrator@quantaphi.org']){
   const option=element('option',address);option.value=address;select.append(option);
  }
  const buttons=element('div');buttons.className='controls';buttons.style.marginTop='12px';
  const register=element('button','Create phone passkey');
  register.type='button';register.id='quantMailPasskeyRegister';register.className='btn';register.disabled=true;
  const login=element('button','Sign in using phone passkey');
  login.type='button';login.id='quantMailPasskeyLogin';login.className='btn secondary';login.disabled=true;
  buttons.append(register,login);
  const result=element('p','Preparing secure Android passkey confirmation…');
  result.id='quantMailPasskeyStatus';result.setAttribute('role','status');
  result.setAttribute('aria-live','polite');
  root.append(label,select,buttons,result);
  text('Phone enrollment is available only to the verified owner. Confirm the device prompt yourself.');
  try{
   // The server-side WebAuthn feature must be separately deployed and reviewed.
   // This module enables the buttons only if the authenticated service confirms readiness.
   await import('/quant-mail-passkeys.mjs?v=20261029-secure-registration1');
  }catch{
   register.disabled=true;login.disabled=true;
   result.textContent='The secure passkey client is unavailable. Nothing was registered.';
  }
 }catch{
  if(!region.hidden)text('Private account setup could not be verified. No changes were made.');
 }
}
void openPrivateOwnerPasskeys();
