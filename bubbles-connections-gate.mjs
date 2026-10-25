// Current application transport. Do not inherit the legacy edge-pinned module:
// an old OAuth implementation must not silently survive a new sign-in release.
const API='/api/bubbles/connections';
const CALLBACK_ORIGIN='https://quantaphi.org';
const PROVIDERS=Object.freeze({
 github:['github.com','/login/oauth/authorize'],
 cloudflare:['dash.cloudflare.com','/oauth2/auth'],
 google:['accounts.google.com','/o/oauth2/v2/auth']
});
export async function resolveConnectorWalletToken(root=window){
 const bridge=root.QuantaCloudConnection;
 if(bridge?.ready)await bridge.ready;
 const resolved=await bridge?.resolveDeviceToken?.();
 if(/^sq_[A-Za-z0-9_-]{32,}$/.test(resolved||''))return resolved;
 if(bridge?.resolveDeviceToken)throw Error('verified_wallet_required');
 for(const Wallet of [root.InfinityCloudWallet,root.InfinityUnifiedWallet]){
  if(!Wallet)continue;
  try{return new Wallet().token();}catch{}
 }
 throw Error('verified_wallet_required');
}
export class AccountConnections {
 constructor({token,request=(...args)=>fetch(...args),root=window,timeoutMs=10000}={}){
  this.token=token;this.request=request;this.root=root;this.pending=null;
  this.timeoutMs=Math.max(1,Number(timeoutMs)||10000);
 }
 async call(path,body){
  const controller=new AbortController();
  let timer;
  const task=async()=>{
   const credential=path==='/pair/redeem'?'':await this.token();
   if(controller.signal.aborted)throw Error('connection_timeout');
   const response=await this.request(API+path,{
    method:body?'POST':'GET',cache:'no-store',
    headers:{...(credential?{Authorization:'Bearer '+credential}:{}),...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal
   });
   let data;
   try{data=await response.json()}catch{throw Error('connection_response_invalid')}
   if(!response.ok||!data.ok)throw Error(data.error||'account_connection_unavailable');
   return data;
  };
  try{
   return await Promise.race([task(),new Promise((_,reject)=>{
    timer=setTimeout(()=>{controller.abort();reject(Error('connection_timeout'))},this.timeoutMs);
   })]);
  }finally{clearTimeout(timer)}
 }
 async connect(provider,actions,onComplete){
  if(this.pending)throw Error('Finish the current sign-in window first.');
  if(!Object.hasOwn(PROVIDERS,provider))throw Error('Sign-in provider rejected.');
  const popup=this.root.open('about:blank','bubbles-current-account-connect','popup,width=520,height=720');
  if(!popup)throw Error('Allow the sign-in window to open, then try again.');
  let ended=false;
  const finish=async error=>{if(ended)return;ended=true;this.cleanup();await onComplete(error);};
  // Watch cancellation even while the server is preparing the consent URL.
  const timer=this.root.setTimeout(()=>void finish(Error('Sign-in expired. Please try again.')),300000);
  const closed=this.root.setInterval?.(()=>{
   if(popup.closed)void finish(Error('Sign-in window closed before verification. Please try again.'));
  },500);
  this.pending={popup,timer,closed};
  try{
   const result=await this.call('/start',{provider,actions});
   if(ended)return;
   if(popup.closed){await finish(Error('Sign-in window closed before verification. Please try again.'));return;}
   const authorization=new URL(result.authorizationUrl),state=authorization.searchParams.get('state');
   const [hostname,pathname]=PROVIDERS[provider];
   if(authorization.protocol!=='https:'||authorization.hostname!==hostname||authorization.pathname!==pathname||
      authorization.port||authorization.username||authorization.password||!state||
      authorization.searchParams.get('redirect_uri')!==CALLBACK_ORIGIN+API+'/'+provider+'/callback')
    throw Error('Sign-in address rejected. The callback must return to the current QuantaPhi application.');
   const listener=async event=>{
    const message=event.data;
    if(ended||event.origin!==CALLBACK_ORIGIN||event.source!==popup||message?.type!=='bubbles:oauth-return'||
       message.provider!==provider||message.state!==state)return;
    ended=true;this.cleanup(); // Consume before any asynchronous exchange.
    let complete;
    try{
     if(message.error)throw Error('Account authorization was declined.');
     // A callback from the expected popup is not proof that a usable code
     // was returned. Fail locally before any server exchange or success UI.
     if(typeof message.code!=='string'||!message.code||message.code.length>4096)
      throw Error('Provider did not return a valid authorization code.');
     complete=await this.call('/complete',{provider,state,code:message.code});
    }catch(error){
     // A declined or malformed return must not strand the OAuth popup.
     try{popup.close();}catch{}
     await onComplete(error);return;
    }
    popup.close();await onComplete(null,complete.account);
   };
   this.pending.listener=listener;this.root.addEventListener('message',listener);
   popup.location.href=authorization.href;
  }catch(error){
   if(ended)return;
   ended=true;popup.close();this.cleanup();throw error;
  }
 }
 cleanup(){
  if(!this.pending)return;
  if(this.pending.listener)this.root.removeEventListener('message',this.pending.listener);
  if(this.pending.timer!==undefined)this.root.clearTimeout(this.pending.timer);
  if(this.pending.closed!==undefined)this.root.clearInterval(this.pending.closed);
  this.pending=null;
 }
}
