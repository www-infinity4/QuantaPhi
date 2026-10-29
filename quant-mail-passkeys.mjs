/* Quant Mail WebAuthn client: credential creation/sign-in must run on the
 * user's own phone. This never issues a session or trusts the email alone.
 * Service endpoints are deliberately NOT enabled by this frontend module.
 */
export const OWNER_MAIL_ALIASES=Object.freeze([
 'kris@quantaphi.org','administrator@quantaphi.org'
]);
export const PASSKEY_RP_ID='quantaphi.org';
export const PASSKEY_ORIGIN='https://quantaphi.org';
const API='/api/quant-mail/passkeys';
const MAX_BODY=30000;
export function strictAlias(value){
 if(typeof value!=='string')return null;
 const normalized=value.toLowerCase().trim();
 return OWNER_MAIL_ALIASES.includes(normalized)?normalized:null;
}
export function isPasskeySiteReady(locationLike,secureContext){
 return secureContext===true && locationLike?.origin===PASSKEY_ORIGIN &&
   locationLike?.hostname===PASSKEY_RP_ID;
}
export function decodeOptions(result,kind,Credential=globalThis.PublicKeyCredential){
 const json=kind==='create'?result?.publicKey:result?.publicKey;
 if(!json||typeof json!=='object'||typeof json.challenge!=='string')
  throw Error('passkey_options_invalid');
 if(kind==='create'){
  if(json.rp?.id!==PASSKEY_RP_ID||json.authenticatorSelection?.userVerification!=='required')
   throw Error('passkey_options_invalid');
  if(typeof Credential?.parseCreationOptionsFromJSON!=='function')
   throw Error('passkey_browser_update_required');
  return Credential.parseCreationOptionsFromJSON(json);
 }
 if(json.rpId!==PASSKEY_RP_ID||json.userVerification!=='required')
  throw Error('passkey_options_invalid');
 if(typeof Credential?.parseRequestOptionsFromJSON!=='function')
  throw Error('passkey_browser_update_required');
 return Credential.parseRequestOptionsFromJSON(json);
}
export function safeCredentialJSON(credential){
 if(!credential||credential.type!=='public-key'||typeof credential.toJSON!=='function')
  throw Error('passkey_browser_update_required');
 const data=credential.toJSON();
 if(!data||typeof data.id!=='string'||!data.id||data.type!=='public-key')
  throw Error('passkey_credential_invalid');
 return data;
}
export async function passkeyServerRequest(path,body,{request=fetch,token=null}={}){
 if(!/^\/(?:status|register\/(?:begin|finish)|login\/(?:begin|finish))$/.test(path))
  throw Error('passkey_endpoint_not_allowed');
 if(body && JSON.stringify(body).length>MAX_BODY)throw Error('passkey_payload_too_large');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await request(API+path,{
   method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',
   headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},
   ...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal
  });
  if(!response?.ok)throw Error(response?.status===404?'passkey_service_not_ready':'passkey_service_unavailable');
  const result=await response.json();
  if(result?.ok!==true)throw Error('passkey_service_unavailable');
  return result;
 }finally{clearTimeout(timer);}
}
export async function runPasskeyCeremony({
 kind,alias,request=fetch,Credential=globalThis.PublicKeyCredential,
 credentials=globalThis.navigator?.credentials,
 walletToken=null,locationLike=globalThis.location,
 secureContext=globalThis.isSecureContext
}={}){
 const name=strictAlias(alias);
 if(!name)throw Error('passkey_alias_not_supported');
 if(!isPasskeySiteReady(locationLike,secureContext))throw Error('passkey_secure_origin_required');
 if(!credentials)throw Error('passkey_browser_update_required');
 if(kind!=='register'&&kind!=='login')throw Error('passkey_ceremony_invalid');
 if(kind==='register'&&!(typeof walletToken==='string'&&/^sq_[A-Za-z0-9_-]{32,}$/.test(walletToken)))
  throw Error('verified_wallet_required');
 const options=await passkeyServerRequest('/'+kind+'/begin',{alias:name},{
  request,token:kind==='register'?walletToken:null
 });
 const publicKey=decodeOptions(options,kind==='register'?'create':'get',Credential);
 const credential=kind==='register'
  ?await credentials.create({publicKey})
  :await credentials.get({publicKey});
 if(!credential)throw Error('passkey_cancelled');
 const finish=await passkeyServerRequest('/'+kind+'/finish',{
  alias:name,attemptId:options.attemptId,credential:safeCredentialJSON(credential)
 },{request,token:kind==='register'?walletToken:null});
 // A successful response must report a server-verified credential, not just HTTP 200.
 if(finish.passkeyVerified!==true||finish.alias!==name||finish.rpId!==PASSKEY_RP_ID)
  throw Error('passkey_verification_incomplete');
 if(kind==='login'&&finish.sessionEstablished!==true)
  throw Error('passkey_session_unavailable');
 if(kind==='register'&&finish.registrationStored!==true)
  throw Error('passkey_registration_not_saved');
 return {verified:true,alias:name,sessionEstablished:kind==='login',
  status:kind==='register'?'Passkey registered on your phone.':'Passkey sign-in verified.'};
}
export async function mountQuantMailPasskeys(doc=document,root=window){
 const status=doc.getElementById('quantMailPasskeyStatus'),
  register=doc.getElementById('quantMailPasskeyRegister'),
  login=doc.getElementById('quantMailPasskeyLogin'),
  aliasInput=doc.getElementById('quantMailPasskeyAlias');
 if(!status||!register||!login||!aliasInput)return;
 let serviceEnabled=false,busy=false;
 const announce=(msg,ok=false)=>{status.textContent=msg;status.dataset.state=ok?'verified':'checking';};
 const setButtons=()=>{register.disabled=busy||!serviceEnabled;login.disabled=busy||!serviceEnabled;};
 const available=isPasskeySiteReady(root.location,root.isSecureContext);
 if(!available){
  announce('Passkeys require opening https://quantaphi.org in Chrome on your phone.');setButtons();return;
 }
 try{
  const result=await passkeyServerRequest('/status',null,{request:(...args)=>root.fetch(...args)});
  serviceEnabled=result.enabled===true&&result.rpId===PASSKEY_RP_ID &&
    result.registrationReady===true&&result.loginReady===true;
  const overall=doc.getElementById('quantMailOverallStatus');
  if(overall&&serviceEnabled)overall.textContent='Email delivery is still being configured. Phone passkey setup is now available for your verified owner wallet.';
  announce(serviceEnabled?'Passkey service is available. Complete the phone confirmation to enroll.':
   'Passkey enrollment is not active yet. Existing Bubbles/StarQuest sign-in remains unchanged.');
 }catch{
  announce('Passkey service is not active yet. No phone credential or mailbox was changed.');
 }
 setButtons();
 const execute=async(kind)=>{
  if(!serviceEnabled||busy)return;busy=true;setButtons();
  announce(kind==='register'?'Preparing your phone passkey…':'Preparing passkey sign-in…');
  try{
   let walletToken=null;
   if(kind==='register'){
    const {resolveConnectorWalletToken}=await import('/bubbles-connections.mjs?v=20261028-gmail-wallet1');
    walletToken=await resolveConnectorWalletToken(root);
   }
   const res=await runPasskeyCeremony({kind,alias:aliasInput.value,
    request:(...args)=>root.fetch(...args),Credential:root.PublicKeyCredential,
    credentials:root.navigator?.credentials,walletToken,
    locationLike:root.location,secureContext:root.isSecureContext});
   announce(res.status,true);
  }catch(error){
   const code=String(error?.message||'');
   const reasons={
    verified_wallet_required:'Verify your existing owner wallet before registering a passkey.',
    passkey_alias_not_supported:'Choose kris@quantaphi.org or administrator@quantaphi.org.',
    passkey_service_unavailable:'Passkey verification is unavailable. No login was changed.',
    passkey_verification_incomplete:'The server could not verify this passkey.',
    passkey_browser_update_required:'Update Chrome or your Android passkey provider to continue.',
    passkey_cancelled:'Phone passkey confirmation was canceled.',
    passkey_secure_origin_required:'Open the original https://quantaphi.org site in Chrome.'
   };
   announce(reasons[code]||'Passkey setup/sign-in did not complete. The existing wallet remains unchanged.');
  }finally{busy=false;setButtons();}
 };
 register.addEventListener('click',()=>void execute('register'));
 login.addEventListener('click',()=>void execute('login'));
}
if(typeof document!=='undefined'){
 const mount=()=>void mountQuantMailPasskeys(document,window);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
}
