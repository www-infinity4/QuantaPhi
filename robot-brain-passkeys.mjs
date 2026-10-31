/* Robot Brain private owner passkey workspace.
 * No public registration button, owner email or browser-local authentication
 * flag. Display only after an actual owner wallet check from Robot Brain.
 * The passkey API independently verifies every registration and login.
 */
const region=document.getElementById('account-security');
const root=document.getElementById('ownerPasskeyWorkspace');
const status=document.getElementById('ownerPasskeyServiceStatus');
const gateMessage=document.getElementById('ownerGateMessage');
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
  if(verified?.state!=='verified'){
   if(gateMessage)gateMessage.textContent='Owner wallet verification is required. No account change was made.';
   return;
  }
  if(gateMessage)gateMessage.textContent='Owner wallet verified. Private account security is available.';
  region.hidden=false;
  // One compact form. Address is typed by the verified owner; never
  // prepopulate or advertise either address in publicly served page HTML.
  const label=element('label','Email address');
  label.htmlFor='quantMailPasskeyAlias';
  label.style.cssText='display:block;font-weight:750;margin:14px 0 6px';
  const field=element('input');
  field.id='quantMailPasskeyAlias';
  field.type='email';field.required=true;field.inputMode='email';
  field.autocomplete='off';field.autocapitalize='off';
  field.spellcheck=false;field.placeholder='Type your email address';
  field.maxLength=254;
  field.style.cssText='display:block;width:100%;min-height:52px;border:1px solid #91aabc;border-radius:13px;padding:12px;font:16px system-ui';
  const buttons=element('div');buttons.className='controls';buttons.style.marginTop='12px';
  const register=element('button','Add phone passkey');
  register.type='button';register.id='quantMailPasskeyRegister';register.className='btn';register.disabled=true;
  const login=element('button','Sign in with passkey');
  login.type='button';login.id='quantMailPasskeyLogin';login.className='btn secondary';login.disabled=true;
  buttons.append(register,login);
  const result=element('p','Passkey enrollment is disabled until the verified server is active.');
  result.id='quantMailPasskeyStatus';result.setAttribute('role','status');
  result.setAttribute('aria-live','polite');
  const help=element('p','Enter the first address, approve its passkey on your phone, then replace the address with the second one. Exactly one passkey is allowed per address. Email delivery is a separate setup step.');
  help.className='muted';
  root.append(label,field,buttons,result,help);
  text('Owner wallet verified. Checking whether phone passkeys are available…');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),9000);
  let response;
  try{
   response=await fetch('/api/quant-mail/passkeys/status',{
    method:'GET',cache:'no-store',credentials:'same-origin',signal:controller.signal
   });
  }finally{clearTimeout(timer);}
  if(!response.ok){
   text('Email setup is visible here, but the secure passkey server is not live. Nothing can be registered yet.');
   return;
  }
  const state=await response.json();
  if(state?.ok!==true||state.enabled!==true||state.registrationReady!==true||
     state.loginReady!==true||state.rpId!=='quantaphi.org'){
   text('The secure passkey server is not enabled yet. Your existing wallet is unchanged.');
   return;
  }
  text('Passkey service ready. Enter an eligible address and confirm registration on your phone.');
  try{
   await import('/quant-mail-passkeys.mjs?v=20261029-secure-registration1');
  }catch{
   register.disabled=true;login.disabled=true;
   result.textContent='The verified passkey client could not load. No credential was saved.';
  }
 }catch{
  if(!region.hidden)text('Private account setup could not be verified. No changes were made.');
  if(gateMessage&&region.hidden)gateMessage.textContent='Owner verification or private account setup is unavailable. No changes were made.';
 }
}
void openPrivateOwnerPasskeys();
