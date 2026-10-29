/* Quant Mail's account-entry layer; no mailbox is created by a wallet check.
 * Mail delivery and per-user alias claims need separate audited server provisioning.
 */
export const MAIL_DOMAIN='quantaphi.org';
export const RESERVED_MAIL_NAMES=new Set([
 'kris','admin','administrator','abuse','postmaster','security','support',
 'root','noreply','no-reply','mailer-daemon','billing','wallet','bubbles'
]);
export function mailNamePreview(raw){
 const value=typeof raw==='string'?raw.trim().toLowerCase():'';
 if(!value)return {valid:false,address:'yourname@'+MAIL_DOMAIN,reason:'Enter a name to preview an address.'};
 if(!/^[a-z][a-z0-9._-]{2,29}$/.test(value)||/[._-]{2}/.test(value)||/[._-]$/.test(value))
  return {valid:false,address:null,reason:'Use 3–30 letters, numbers, dots, underscores or hyphens, starting with a letter; no consecutive punctuation.'};
 if(RESERVED_MAIL_NAMES.has(value))
  return {valid:false,address:null,reason:'This address name is reserved and requires separate owner or service verification.'};
 return {valid:true,address:value+'@'+MAIL_DOMAIN,reason:'Address preview only. Availability and mailbox delivery are not yet verified.'};
}
export async function verifyQuantMailWallet({tokenProvider,request,timeoutMs=9000}){
 // This checks the already authenticated Bubbles wallet: it is never an email
 // password, mailbox claim or a new provider OAuth grant.
 let token;
 try{token=await tokenProvider();}catch{return {verified:false,reason:'No verified QuantaPhi wallet session in this browser.'};}
 if(typeof token!=='string'||!/^sq_[A-Za-z0-9_-]{32,}$/.test(token))
  return {verified:false,reason:'Sign in with your verified StarQuest wallet to continue.'};
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await request('/api/bubbles/connections/session',{
   method:'GET',cache:'no-store',
   headers:{Authorization:'Bearer '+token},signal:controller.signal
  });
  if(!response?.ok)return {verified:false,reason:'QuantaPhi could not verify this wallet session. Reconnect the existing wallet and try again.'};
  const result=await response.json();
  if(result?.ok===true&&result?.walletVerified===true)
   return {verified:true,reason:'Signed in to QuantaPhi with a verified wallet. Quant Mail mailbox activation is still pending.'};
  return {verified:false,reason:'The account service did not verify this wallet session.'};
 }catch{
  return {verified:false,reason:'QuantaPhi sign-in could not be checked. Your existing wallet and messages were not changed.'};
 }finally{clearTimeout(timeout);}
}
async function mountQuantMail(){
 const input=document.getElementById('mail-handle'),preview=document.getElementById('mail-preview');
 const notice=document.getElementById('mail-name-notice');
 const button=document.getElementById('mail-check'),status=document.getElementById('mail-session-status');
 if(!input||!preview||!notice||!button||!status)return;
 const render=()=>{
  const value=mailNamePreview(input.value);
  preview.textContent=value.address||'Address name unavailable';
  notice.textContent=value.reason;
  notice.setAttribute('role',value.valid?'note':'status');
 };
 input.addEventListener('input',render);
 render();
 let pending=false;
 button.addEventListener('click',async()=>{
  if(pending)return;pending=true;button.disabled=true;
  status.textContent='Verifying your existing QuantaPhi account…';status.dataset.state='checking';
  try{
   const {resolveConnectorWalletToken}=await import('/bubbles-connections.mjs?v=20261028-gmail-wallet1');
   const result=await verifyQuantMailWallet({
    tokenProvider:()=>resolveConnectorWalletToken(window),
    request:(...args)=>fetch(...args)
   });
   status.textContent=result.reason;
   status.dataset.state=result.verified?'verified':'failed';
  }catch{
   status.textContent='Account verification could not start; no mailbox was created.';
   status.dataset.state='failed';
  }finally{pending=false;button.disabled=false;}
 });
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void mountQuantMail(),{once:true});
 else void mountQuantMail();
}
