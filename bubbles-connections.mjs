const API = '/api/bubbles/connections';
const NAMES = {cloudflare:'Cloudflare',google:'Google',github:'GitHub',ebay:'eBay',walmart:'Walmart',ibm:'IBM',anthropic:'Anthropic'};
export function availableCloudflareLoginActions(provider) {
  if(provider?.id!=='cloudflare'||provider.configured!==true||!Array.isArray(provider.actions))return [];
  return ['account.read','projects.build','ledger.read','projects.full'].filter(action=>provider.actions.includes(action));
}

export function providerAuthorizationActions(provider) {
  if(!provider?.configured)return [];
  if(provider.id!=='cloudflare')return provider.id==='github'?['repository.read']:[];
  const available=provider.authorizationActions??provider.actions;
  const required=['account.read','projects.build','ledger.read','projects.full'];
  if(Array.isArray(available)&&available.includes('owner.full'))return ['owner.full'];
  return Array.isArray(available)?required.filter(action=>available.includes(action)):
    provider.fullProjectConfigured===false||provider.scopeSetupRequired===true?['account.read']:required;
}
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
export function connectionCodeMessage(error) {
  const messages={
    verified_wallet_required:'This browser has no verified wallet session. Open Account Connections in the browser that holds your existing wallet.',
    too_many_requests:'Wait ten seconds before creating another code.',
    wallet_validation_unavailable:'The connection service cannot reach the wallet verification service. Code creation is blocked until that connection is restored.',
    origin_not_allowed:'The connection request was rejected because its website origin was not accepted. Open Account Connections on https://quantaphi.org.',
    connection_operation_failed:'The server failed while verifying the wallet or creating the code (connection_operation_failed). This needs a service repair.',
    connections_not_configured:'The account connection service setup is incomplete (connections_not_configured).',
    connection_response_invalid:'The connection endpoint returned an unreadable response (connection_response_invalid).',
    connection_timeout:'The connection check timed out after ten seconds. Chat is still available; try again.',
    TimeoutError:'The connection request timed out. Check your connection and try once more.',
    AbortError:'The connection request was interrupted. Try once more.',
    TypeError:'The connection request could not reach the service. Check your connection and try once more.'
  };
  return messages[error?.message]||messages[error?.name]||'Code creation failed (account_connection_unavailable). The service needs further diagnosis.';
}
export function providerSignInErrorMessage(code){
  const value=String(code||'');
  if(value==='callback_session_mismatch'||value==='verified_wallet_required')
    return 'Bubbles could not verify this browser session. Return to the original Bubbles browser and sign in again.';
  if(value==='state_invalid_or_used'||value==='state_expired')
    return 'This authorization was already used or expired. Start a new Cloudflare authorization.';
  if(value==='connection_operation_failed'||value.startsWith('connection_complete_'))
    return 'Cloudflare returned to Bubbles, but Bubbles could not complete the account connection. Please retry; the connector needs repair if this repeats.';
  if(value==='cloudflare_client_scopes_unavailable'||value==='provider_not_configured')
    return 'The Bubbles Cloudflare OAuth application requires configuration before this permission can be authorized.';
  if(value==='provider_response_invalid'||value==='provider_identity_invalid'||value.startsWith('cloudflare_exchange'))
    return 'Cloudflare did not return a usable authorization. Retry the Bubbles Cloudflare connection.';
  return 'Bubbles could not confirm the authorization. Retry Cloudflare sign-in.';
}
export class AccountConnections {
  constructor({token,request = (...args)=>fetch(...args),root = window,timeoutMs=10000}) {
    this.token=token;this.request=request;this.root=root;this.pending=null;this.timeoutMs=Math.max(1,Number(timeoutMs)||10000);
  }
  async call(path,body) {
    // Cover wallet readiness, the network request AND JSON parsing. AbortController
    // alone cannot settle a hung bridge or a fetch mock that ignores abort.
    const controller=new AbortController();
    let timer;
    const attempt=async()=>{
      const credential=path==='/pair/redeem'?'':await this.token();
      const response=await this.request(API+path,{method:body?'POST':'GET',cache:'no-store',
        headers:{...(credential?{Authorization:'Bearer '+credential}:{}),...(body?{'Content-Type':'application/json'}:{})},
        ...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal});
      let data;
      try {data=await response.json();} catch {throw Error('connection_response_invalid');}
      if(!response.ok||!data.ok)throw Error(data.error||'account_connection_unavailable');
      return data;
    };
    try {
      return await Promise.race([attempt(),new Promise((_,reject)=>{
        timer=setTimeout(()=>{controller.abort();reject(Error('connection_timeout'));},this.timeoutMs);
      })]);
    } finally {clearTimeout(timer);}
  }
  readPendingHandoff() {
    try{
      const saved=JSON.parse(this.root.sessionStorage?.getItem('bubbles:oauth-pending:v1')||'null');
      if(saved&&['github','google','cloudflare'].includes(saved.provider)&&
        /^[A-Za-z0-9_-]{43}$/.test(saved.state)&&Number.isFinite(saved.expiresAt)&&
        saved.expiresAt>Date.now()&&saved.expiresAt<=Date.now()+300000&&saved.flow==='same-window')return saved;
    }catch{}
    this.clearPendingHandoff();
    return null;
  }
  clearPendingHandoff() {
    try{this.root.sessionStorage?.removeItem('bubbles:oauth-pending:v1');}catch{}
  }
  trackHandoff({provider,state,expiresAt},popup,onComplete) {
    const expiredMessage='Authorization was not completed within five minutes. Start again and tap Authorize on '+(NAMES[provider]||provider)+'.';
    const pending={timer:null,pollTimer:null,polling:false,finished:false,onReturn:null,popup};
    this.pending=pending;
    const finish=(error,account)=>{
      if(this.pending!==pending||pending.finished)return;
      pending.finished=true;
      this.cleanup();
      this.clearPendingHandoff();
      try{popup?.close();}catch{}
      onComplete(error,account);
    };
    const poll=async()=>{
      if(this.pending!==pending||pending.polling||pending.finished)return;
      pending.polling=true;
      try{
        const data=await this.call('/handoff/status',{provider,state});
        if(data.status==='connected'&&data.account)finish(null,data.account);
        else if(data.status==='received'){
          const completed=await this.call('/handoff/finish',{provider,state});
          if(completed.status==='connected'&&completed.account)finish(null,completed.account);
          else if(completed.status==='expired')finish(Error(expiredMessage));
          else if(completed.status==='declined')finish(Error('Account authorization was declined.'));
        }else if(data.status==='declined')finish(Error('Account authorization was declined.'));
        else if(data.status==='expired')finish(Error(expiredMessage));
      }catch(error){
        // Callback/code exchange failures cannot be cured by polling. Surface a
        // recoverable, sanitized error now rather than waiting five minutes and
        // incorrectly reporting that the user never authorized the account.
        const code=String(error?.message||'');
        if(!['connection_timeout','AbortError','TimeoutError','TypeError','refresh_in_progress'].includes(code)){
          finish(Error(providerSignInErrorMessage(code)));
        }
      }finally{
        pending.polling=false;
        if(this.pending===pending&&!pending.finished)
          pending.pollTimer=this.root.setTimeout(()=>void poll(),2500);
      }
    };
    pending.onReturn=()=>{
      if(this.pending!==pending||pending.finished)return;
      if(popup?.closed){finish(Error('The sign-in window was closed. Tap Sign in to retry.'));return;}
      void poll();
    };
    this.root.addEventListener?.('focus',pending.onReturn);
    this.root.addEventListener?.('pageshow',pending.onReturn);
    this.root.document?.addEventListener?.('visibilitychange',pending.onReturn);
    pending.timer=this.root.setTimeout(()=>finish(Error(expiredMessage)),
      Math.max(1,expiresAt-Date.now()));
    void poll();
  }
  resumePending(onComplete) {
    if(this.pending)return false;
    const saved=this.readPendingHandoff();
    if(!saved)return false;
    this.trackHandoff(saved,null,onComplete);
    return true;
  }
  async connect(provider,actions,onComplete) {
    if(this.pending)throw Error('Finish the current sign-in window first.');
    // Open synchronously on the user's tap where supported. Android WebViews
    // may block window.open; use same-window navigation with session-bound
    // short-lived state as a fallback, never a provider code or wallet token.
    // Navigate the initiating browser directly. Android Chrome/PWA/WebView must
    // never receive an empty popup while /start is resolving asynchronously.
    // The callback resumes from this tab's sealed short-lived session state.
    const sameWindow=Boolean(this.root.location?.assign&&this.root.sessionStorage);
    let popup=null;
    if(!sameWindow){
      try{popup=this.root.open?.('about:blank','bubbles-account-connect','popup,width=520,height=720')||null;}catch{}
      if(!popup)throw Error('This viewer cannot open sign-in. Open Account Connections in Chrome.');
    }
    try{
      const result=await this.call('/start',{provider,actions});
      const authorization=new URL(result.authorizationUrl),state=authorization.searchParams.get('state');
      const expectedHost=provider==='google'?'accounts.google.com':provider==='github'?'github.com':provider==='cloudflare'?'dash.cloudflare.com':'';
      if(authorization.protocol!=='https:'||authorization.hostname!==expectedHost||authorization.port||
         !/^[A-Za-z0-9_-]{43}$/.test(state||''))throw Error('Sign-in address rejected.');
      const returnPath=this.root.location?.pathname==='/bubbles-accounts.html'?'/bubbles-accounts.html':'/bubbles.html';
      const saved={provider,state,returnPath,flow:sameWindow?'same-window':'popup',expiresAt:Date.now()+Math.min(300,Math.max(1,Number(result.expiresIn)||300))*1000};
      try{this.root.sessionStorage?.setItem('bubbles:oauth-pending:v1',JSON.stringify(saved));}
      catch{if(!popup)throw Error('This viewer cannot preserve sign-in. Open Account Connections in Chrome.');}
      this.trackHandoff(saved,popup,onComplete);
      if(sameWindow)this.root.location.assign(authorization.href);
      else popup.location.href=authorization.href;
    }catch(error){
      try{popup?.close();}catch{}
      this.cleanup();
      this.clearPendingHandoff();
      throw error;
    }
  }
  cancelConnect() {
    const pending=this.pending;
    this.cleanup();
    this.clearPendingHandoff();
    try{pending?.popup?.close();}catch{}
  }
  cleanup() {
    const pending=this.pending;
    if(!pending)return;
    this.pending=null;
    if(pending.timer)this.root.clearTimeout(pending.timer);
    if(pending.pollTimer)this.root.clearTimeout(pending.pollTimer);
    if(pending.onReturn){
      this.root.removeEventListener?.('focus',pending.onReturn);
      this.root.removeEventListener?.('pageshow',pending.onReturn);
      this.root.document?.removeEventListener?.('visibilitychange',pending.onReturn);
    }
  }
}
function element(tag,text,className='') {
  const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node;
}
export function mountConnections(container,{token}) {
  const sessionKey='bubbles:connector-session:v1';
  const paired=()=>{try{const value=JSON.parse(sessionStorage.getItem(sessionKey)||'null');return value?.expiresAt>Date.now()?value.token:'';}catch{return '';}};
  const client=new AccountConnections({token:async()=>{const session=paired();if(session)return session;try{return await token();}catch{return '';}}}),section=element('section','','ba-connection-section'),status=element('p','Choose an account service.','ba-muted');
  const refresh=element('button','Check connected accounts','ba-control'),catalog=element('div','','ba-provider-catalog'),accounts=element('div','');
  const cancel=element('button','Cancel sign-in','ba-control');cancel.type='button';cancel.hidden=true;
  cancel.addEventListener('click',()=>{client.cancelConnect();cancel.hidden=true;status.textContent='Sign-in cancelled. You can try again.';void load();});
  refresh.type='button';status.setAttribute('role','status');
  const scopes=element('fieldset',''),legend=element('legend','Google access');scopes.append(legend);
  const selections=[];
  for(const [name,action] of [['Find Drive files','drive.read'],['Read spreadsheets','sheets.read'],['Read calendar events','calendar.read']]) {
    const label=element('label',''),check=document.createElement('input');check.type='checkbox';check.value=action;label.append(check,document.createTextNode(' '+name+' '));scopes.append(label);selections.push(check);
  }
  section.append(element('h2','Your accounts'),status,catalog,cancel,accounts,scopes,refresh);container.append(section);
  const pairing=element('details','','ba-pairing');pairing.append(element('summary','Advanced: connect another browser (optional)'));
  pairing.append(element('p','On your phone, open Bubbles on quantaphi.org in the browser with your existing wallet. Open these account settings and create a two-minute code. Enter it here. This grants account-connector access for 15 minutes, without transferring your wallet token. Keep the code private.'));
  const create=element('button','Create connection code on this device','ba-control'),redeem=element('button','Connect this browser','ba-control'),end=element('button','End this browser connection','ba-control'),code=document.createElement('input'),output=element('p','');
  code.type='password';code.autocomplete='off';code.maxLength=43;code.setAttribute('aria-label','Two-minute connector pairing code');
  for(const button of [create,redeem,end])button.type='button';
  create.addEventListener('click',async()=>{create.disabled=true;output.textContent='Checking this device’s wallet…';try{const data=await client.call('/pair/create',{});output.textContent='Private code (expires in two minutes): '+data.code;setTimeout(()=>{output.textContent='Code expired. Create another if needed.';},data.expiresIn*1000);}catch(error){output.textContent=connectionCodeMessage(error);}finally{create.disabled=false;}});
  redeem.addEventListener('click',async()=>{redeem.disabled=true;try{const data=await client.call('/pair/redeem',{code:code.value.trim()});sessionStorage.setItem(sessionKey,JSON.stringify({token:data.token,expiresAt:data.expiresAt}));code.value='';output.textContent='This browser is connected for 15 minutes.';await load();}catch{output.textContent='Connection failed. Use a fresh code from your verified phone.';}finally{redeem.disabled=false;}});
  end.addEventListener('click',async()=>{try{if(paired())await client.call('/pair/end',{});sessionStorage.removeItem(sessionKey);output.textContent='Browser connection ended.';await load();}catch{output.textContent='Could not end the server session. Try again; it expires automatically after 15 minutes.';}});
  pairing.append(create,output,code,redeem,end);section.append(pairing);
  async function load() {
    refresh.disabled=true;
    try {
      // Wait for BOTH authenticated service reads before painting. Do not display
      // "Sign in" above a confirmed connected account while a second fetch runs.
      const [data,dataAccounts]=await Promise.all([client.call('/catalog'),client.call('/accounts')]);
      catalog.replaceChildren();accounts.replaceChildren();
      const activeConnection=account=>account.status==='connected'&&
        Number.isFinite(account.expiresAt)&&account.expiresAt>Date.now()+30000;
      const signedIn=new Map();
      for(const account of dataAccounts.accounts||[]){
        if(activeConnection(account)&&!signedIn.has(account.provider))signedIn.set(account.provider,account);
      }
      scopes.hidden=!data.providers.some(provider=>provider.id==='google'&&provider.configured);
      const unavailable=element('details','','ba-unavailable');unavailable.append(element('summary','Other account services'));
      for(const provider of data.providers) {
        const providerName=NAMES[provider.id]||provider.id;
        if(!provider.configured){unavailable.append(element('p',providerName+' — connection setup is not available yet.','ba-muted'));continue;}
        const card=element('div','','ba-provider-card');
        const existing=signedIn.get(provider.id);
        const upgrade=provider.id==='cloudflare'&&existing&&
          Array.isArray(provider.actions)&&provider.actions.includes('owner.full')&&
          !existing.grantedActions?.includes('owner.full');
        if(existing&&!upgrade){
          card.dataset.status='connected';
          const connected=element('p',providerName+' · Signed in'+(existing.label?' as '+existing.label:''),'ba-provider-connected');
          connected.setAttribute('role','status');
          card.append(connected);
          catalog.append(card);
          continue;
        }
        if(upgrade)card.append(element('p','Cloudflare signed in, but full toolkit access is not approved yet. Review the expanded permissions to connect them.','ba-muted'));
        const button=element('button',upgrade?'Authorize full Cloudflare toolkit':'Sign in with '+providerName,'ba-control');
        button.type='button';button.disabled=Boolean(client.pending);button.dataset.provider=provider.id;
        button.classList.add('ba-signin-button');
        button.setAttribute('aria-label','Sign in with '+providerName);
        card.append(button);
        if(provider.id==='cloudflare'){
          card.append(element('p','Cloudflare may already recognize your login and go straight to Review permissions. After authorizing, Bubbles must verify the connection.','ba-muted'));
          const inventory=provider.scopeInventory;
          if(inventory&&Number.isInteger(inventory.signInRequestScopeCount)){
            const client=typeof provider.clientIdPrefix==='string'&&provider.clientIdPrefix?
              ' OAuth client begins '+provider.clientIdPrefix+'.':'';
            card.append(element('p','Bubbles sign-in currently requests '+inventory.signInRequestScopeCount+
              ' Cloudflare scopes; its server allowlist contains '+inventory.serverAllowlistCount+
              '. This is not proof of the scopes registered on Cloudflare.'+client,'ba-muted'));
          }
          const login=element('a','Open Cloudflare login separately','ba-link');
          login.href='https://dash.cloudflare.com/login';login.target='_blank';login.rel='noopener noreferrer';
          card.append(login);
          if(provider.fullProjectConfigured===false)
            card.append(element('p','Additional project permissions need Bubbles OAuth client setup. More scopes in the Cloudflare dashboard do not automatically change this sign-in request.','ba-muted'));
        }
        const availableActions=providerAuthorizationActions(provider);
        if(provider.id!=='google'&&!availableActions.length){
          button.disabled=true;
          card.append(element('p','This provider has no registered sign-in permissions. Application setup is required.','ba-muted'));
        }
        button.addEventListener('click',async()=>{
          if(client.pending){status.textContent='Finish or cancel the current sign-in first.';return;}
          button.disabled=true;button.setAttribute('aria-busy','true');
          status.textContent=provider.id==='cloudflare'&&availableActions.includes('owner.full')?
            'Opening official Cloudflare sign-in for the 386 registered permissions. Approve only if you want to grant all 386.':
            'Opening secure '+(NAMES[provider.id]||provider.id)+' sign-in…';
          // The currently registered Cloudflare app has 386 scopes marked
          // required. Asking for only two on first sign-in does not match that
          // registration. Only send owner.full when the provider advertises it,
          // and disclose that the authorization grants the full toolkit.
          const fullCloudflare=provider.id==='cloudflare'&&availableActions.includes('owner.full');
          const actions=provider.id==='google'?selections.filter(c=>c.checked).map(c=>c.value):
            fullCloudflare?['owner.full']:
            provider.id==='cloudflare'&&!upgrade?['account.read']:availableActions;
          if(!actions.length){status.textContent='Choose the Google access you want to allow.';button.disabled=false;button.removeAttribute('aria-busy');return;}
          try {await client.connect(provider.id,actions,async(error,account)=>{
            cancel.hidden=true;
            if(error){
              // A timed-out return cannot leave its old disabled button behind.
              // Rebuild from the verified account catalog, then retain the error.
              const message=error.message;
              await load();status.textContent=message;
            }else{status.textContent='Connected '+account.label+'.';void load();}
          });cancel.hidden=false;
            status.textContent=provider.id==='cloudflare'
              ?'On Cloudflare, select your account and tap Authorize to finish connecting Bubbles.'
              :'Continue on '+providerName+' to authorize Bubbles, then return here.';
          }catch(error){status.textContent=providerSignInErrorMessage(error.message);}
          finally{button.disabled=Boolean(client.pending);button.removeAttribute('aria-busy');}
        });catalog.append(card);
      }
      if(unavailable.childNodes.length>1)catalog.append(unavailable);
      for(const account of dataAccounts.accounts) {
        const row=element('div','','ba-account-card');
        row.append(element('p',(NAMES[account.provider]||account.provider)+' · '+account.label+' · '+
          (account.status==='connected'&&!activeConnection(account)?'reconnect required':account.status)));
        if(account.provider==='cloudflare'&&activeConnection(account)){
          const grants=account.grantedActions||[];
          const access=grants.includes('projects.full')?'Full project access approved.':
            grants.includes('projects.build')?'Approved: deploy Workers, Pages and D1 projects. Additional project permissions are not yet approved.':
            'Account connected. Project deployment permission is not yet approved.';
          row.append(element('p',access,'ba-muted'));
        }
        if(account.status!=='disconnected') {
          const button=element('button','Disconnect','ba-control');button.type='button';
          button.addEventListener('click',async()=>{
            if(['github','cloudflare'].includes(account.provider)){
              const providerName=account.provider==='github'?'GitHub':'Cloudflare';
              if(!window.confirm('Disconnect '+providerName+' from Bubbles? This can stop repository builds, Cloudflare deployments and related tools until you reconnect. Your existing repositories and deployments will not be deleted by this action.'))return;
            }
            button.disabled=true;try{
            const result=await client.call('/disconnect',{id:account.id});await load();
            status.textContent=result.providerRevocation==='failed'?'Disconnected in Bubbles. Provider revocation failed; remove Bubbles access in that service’s account settings.':'Account disconnected.';
          }catch(error){status.textContent=error.message;button.disabled=false;}});row.append(button);
        }
        if(account.provider==='github'&&activeConnection(account)){
          const inspect=element('button','Check GitHub repositories','ba-control');inspect.type='button';
          const result=element('div','');result.setAttribute('role','status');
          inspect.addEventListener('click',async()=>{inspect.disabled=true;result.textContent='Checking installed repositories with GitHub…';try{
            const data=await client.call('/github/repositories',{id:account.id});
            result.replaceChildren(element('p',data.repositories.length+' repositories verified by GitHub.'));
            for(const repo of data.repositories)result.append(element('p',repo.name+' · '+(repo.permissions.write?'write available':repo.permissions.read?'read available':'permissions unconfirmed')));
            if(data.truncated)result.append(element('p','More repositories may exist beyond this bounded check.'));
          }catch{result.textContent='GitHub repository verification failed. No repository action was performed.';}finally{inspect.disabled=false;}});
          const test=element('button','Run GitHub connection test','ba-control');test.type='button';
          test.addEventListener('click',async()=>{test.disabled=true;result.textContent='Creating an isolated test branch and receipt…';try{const receipt=await client.call('/github/test',{id:account.id});result.replaceChildren(element('p','Verified commit: '+receipt.commit),element('p','Test branch: '+receipt.branch));const link=element('a','Open verified GitHub commit');link.href=receipt.url;link.target='_blank';link.rel='noopener noreferrer';result.append(link);}catch{result.textContent='Test did not return a verified commit. Check GitHub before retrying.';}finally{test.disabled=false;}});
          if(data.starcoinBackupEnabled!==true){
            row.append(inspect,test,result);
          }else{
          // One private GitHub repository per Cloudflare wallet, StarCoins only.
          // GitHub identity never authorizes wallet credits or Robot Brain.
          const walletRepo=document.createElement('select');
          walletRepo.setAttribute('aria-label','Choose a private StarCoin backup repository');
          walletRepo.className='ba-field';
          const placeholder=document.createElement('option');
          placeholder.value='';placeholder.textContent='Choose a private repository';walletRepo.append(placeholder);
          const backup=element('button','Back up StarCoins','ba-control');
          const compare=element('button','Verify StarCoin backup','ba-control');
          const createPrivate=element('button','Create private StarCoin repository','ba-control');
          const backupStatus=element('p','This backs up only the StarCoin account currently verified in Cloudflare. If your usual coins are missing, recover the original wallet before choosing a repository. GitHub cannot restore or award credits.','ba-muted');
          backupStatus.setAttribute('role','status');
          for(const b of [backup,compare,createPrivate])b.type='button';
          backup.disabled=true;compare.disabled=true;
          async function loadPrivateRepositories(){
            const data=await client.call('/github/repositories',{id:account.id});
            walletRepo.replaceChildren(placeholder);
            for(const repo of data.repositories.filter(r=>r.private===true&&r.permissions.write)){
              const choice=document.createElement('option');choice.value=repo.name;
              choice.textContent=repo.name;walletRepo.append(choice);
            }
            backup.disabled=!walletRepo.value;
            compare.disabled=!walletRepo.value;
            if(walletRepo.options.length<=1)backupStatus.textContent='Install Bubbles GitHub App with Contents write access to one private repository.';
          }
          walletRepo.addEventListener('change',()=>{
            const ready=!!walletRepo.value;backup.disabled=!ready;compare.disabled=!ready;
          });
          for(const [b,mode,path] of [[backup,'write','backup'],[compare,'verify','verify']]){
            b.addEventListener('click',async()=>{
              if(!walletRepo.value)return;
              b.disabled=true;backupStatus.textContent=mode==='write'?'Checking Cloudflare and GitHub…':'Comparing GitHub with Cloudflare…';
              try {
                const receipt=await client.call('/github/starcoins/'+path,
                  {id:account.id,repository:walletRepo.value});
                backupStatus.replaceChildren(element('strong','StarCoin: '+receipt.status+' '),
                  element('span',' · repository '+receipt.repository));
                if(receipt.url){
                  const link=element('a',' View verified commit');link.href=receipt.url;
                  link.target='_blank';link.rel='noopener noreferrer';backupStatus.append(link);
                }
                if(receipt.status==='cloud_advanced_review_needed')
                  backupStatus.append(element('span',' New Cloudflare activity needs a fresh backup; no balances changed.'));
              }catch(error){
                backupStatus.textContent='Backup not changed: '+error.message+'. No wallet balances were modified.';
              }finally{b.disabled=false;}
            });
          }
          createPrivate.addEventListener('click',async()=>{
            createPrivate.disabled=true;
            backupStatus.textContent='Requesting one private repository under your authorized GitHub account…';
            try{
              const result=await client.call('/github/starcoins/create-repository',{id:account.id});
              backupStatus.textContent=result.status==='ready_to_back_up'
                ?'Private repository created. Select it and back up StarCoins.'
                :'Repository created; grant the Bubbles GitHub App access to that repository before backup.';
              if(/^[-A-Za-z0-9_.]+\/[-A-Za-z0-9_.]+$/.test(result.repository||'')){
                const link=element('a',' Open private GitHub repository');
                link.href='https://github.com/'+result.repository;
                link.target='_blank';link.rel='noopener noreferrer';backupStatus.append(link);
              }
              await loadPrivateRepositories();
              walletRepo.value=result.repository;
              backup.disabled=!walletRepo.value;compare.disabled=!walletRepo.value;
            }catch(error){backupStatus.textContent='Private repository not created: '+error.message;}
            finally{createPrivate.disabled=false;}
          });
          // Backup controls are unrelated to signing in. Keep them optional,
          // collapsed and inert until explicitly opened by the account owner.
          const backupTools=element('details','','ba-optional-backup');
          backupTools.append(element('summary','Optional StarCoin backup'),
            walletRepo,backup,compare,createPrivate,backupStatus);
          let backupLoaded=false;
          backupTools.addEventListener('toggle',()=>{
            if(!backupTools.open||backupLoaded)return;
            backupLoaded=true;
            void loadPrivateRepositories().catch(()=>{
              backupStatus.textContent='GitHub repository list is unavailable. No backup was written.';
            });
          });
          row.append(inspect,test,result,backupTools);
          }
        }
        accounts.append(row);
        if(account.provider==='cloudflare'&&activeConnection(account)){
          const chooser=element('div','','ba-cloudflare-account-select');
          const statusLine=element('p','Choose a Cloudflare account that you own or can manage. Nothing will be deployed automatically.','ba-muted');
          statusLine.setAttribute('role','status');
          const list=document.createElement('select');list.className='ba-field';
          list.setAttribute('aria-label','Select my Cloudflare account');
          const confirm=element('button','Use this Cloudflare account','ba-control');confirm.type='button';confirm.disabled=true;
          const loadAccounts=async()=>{
            list.replaceChildren();
            const response=await client.call('/cloudflare/accounts',{id:account.id});
            const empty=document.createElement('option');empty.value='';empty.textContent='Choose account';list.append(empty);
            for(const cf of response.accounts){
              const option=document.createElement('option');option.value=cf.id;option.textContent=cf.name;list.append(option);
            }
            if(response.truncated)statusLine.textContent='The account list is incomplete. No other account can be selected without verification.';
            list.addEventListener('change',()=>{confirm.disabled=!list.value;});
          };
          confirm.addEventListener('click',async()=>{
            confirm.disabled=true;try{
              const response=await client.call('/cloudflare/select-account',{id:account.id,accountId:list.value});
              statusLine.textContent=response.account.name+' selected and verified. Cloudflare storage is not provisioned yet; no deployment or data migration was performed.';
            }catch{statusLine.textContent='Account selection failed verification. No account was changed.';}
            finally{confirm.disabled=!list.value;}
          });
          chooser.append(statusLine,list,confirm);accounts.append(chooser);
          void loadAccounts().catch(()=>{statusLine.textContent='Could not list the accounts authorized by Cloudflare. No account has been selected.';});
        }
        if(account.provider==='google'&&account.status==='connected') {
          const tools=element('details','');tools.append(element('summary','Use this Google account'));
          const output=element('pre','');output.style.whiteSpace='pre-wrap';output.style.maxHeight='22rem';output.style.overflow='auto';
          for(const [name,operation,action,kind,placeholder] of [
            ['Find Drive files','drive.list','drive.read',null,'File name to find'],
            ['Read spreadsheet','sheets.values','sheets.read','sheets','Spreadsheet ID'],
            ['Read calendar events','calendar.events','calendar.read','calendars','Calendar ID (or primary)']
          ]) {
            const control=element('div',''),value=document.createElement('input'),button=element('button',name,'ba-control');
            value.className='ba-field';value.placeholder=placeholder;value.setAttribute('aria-label',placeholder);value.maxLength=200;button.type='button';
            button.disabled=!account.grantedActions.includes(action);control.append(value);
            let range=null;
            if(kind==='sheets'){range=document.createElement('input');range.className='ba-field';range.value='A1:E20';range.setAttribute('aria-label','Spreadsheet range');range.maxLength=200;control.append(range);}
            button.addEventListener('click',async()=>{
              button.disabled=true;output.textContent='Reading the selected account…';
              try{
                const selection=value.value.trim();
                if(kind&&!selection)throw Error('Enter the resource you want to read.');
                if(kind)await client.call('/select-resource',{id:account.id,kind,resourceId:selection});
                const args=kind==='sheets'?{spreadsheetId:selection,range:range.value.trim()}:kind==='calendars'?{calendarId:selection,timeMin:new Date().toISOString()}:{query:selection};
                const result=await client.call('/read',{id:account.id,operation,args});
                output.textContent=JSON.stringify(result.data,null,2).slice(0,12000);status.textContent='Google confirmed the result.';
              }catch(error){output.textContent='Read failed: '+error.message;}
              finally{button.disabled=false;}
            });control.append(button);tools.append(control);
          }
          tools.append(output);accounts.append(tools);
        }
      }
      status.textContent=client.pending?'Complete or cancel the current sign-in.':
        dataAccounts.accounts.length?'Account connection status verified.':'No connected accounts yet.';
      cancel.hidden=!client.pending;
    }catch(error) {status.textContent=error?.message==='verified_wallet_required'?
      'This browser has no verified Bubbles account session. Open Bubbles in the browser where you are signed in.':
      'Could not verify account connections. Please retry.';}
    finally {refresh.disabled=false;}
  }
  refresh.addEventListener('click',()=>void load());
  if(client.resumePending(async(error,account)=>{
    cancel.hidden=true;
    if(error){
      // The resumed page was rendered with all buttons disabled while pending.
      // A failed/expired attempt must restore Cloudflare Sign in immediately.
      const message=error.message;
      await load();status.textContent=message;
    }else{
      status.textContent='Connected '+account.label+'.';await load();
    }
  })){cancel.hidden=false;status.textContent='Finishing Cloudflare authorization securely…';}
  return {client,refresh:load};
}
