const API = '/api/bubbles/connections';
const NAMES = {cloudflare:'Cloudflare',google:'Google',github:'GitHub',ebay:'eBay',walmart:'Walmart',ibm:'IBM',anthropic:'Anthropic'};
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
    TimeoutError:'The connection request timed out. Check your connection and try once more.',
    AbortError:'The connection request was interrupted. Try once more.',
    TypeError:'The connection request could not reach the service. Check your connection and try once more.'
  };
  return messages[error?.message]||messages[error?.name]||'Code creation failed (account_connection_unavailable). The service needs further diagnosis.';
}
export class AccountConnections {
  constructor({token,request = (...args)=>fetch(...args),root = window}) {this.token=token;this.request=request;this.root=root;this.pending=null;}
  async call(path,body) {
    const credential=path==='/pair/redeem'?'':await this.token();
    const response=await this.request(API+path,{method:body?'POST':'GET',cache:'no-store',
      headers:{...(credential?{Authorization:'Bearer '+credential}:{}),...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{})});
    let data;
    try {data=await response.json();} catch {throw Error('connection_response_invalid');}
    if(!response.ok||!data.ok)throw Error(data.error||'account_connection_unavailable');
    return data;
  }
  async connect(provider,actions,onComplete) {
    if(this.pending)throw Error('Finish the current sign-in window first.');
    // Open from the user gesture before awaiting network so popup blockers can
    // make a clear decision. Never expose platform/provider tokens to it.
    const popup=this.root.open('about:blank','bubbles-account-connect','popup,width=520,height=720');
    if(!popup)throw Error('Allow the sign-in window to open, then try again.');
    try {
      const result=await this.call('/start',{provider,actions});
      const authorization=new URL(result.authorizationUrl),state=authorization.searchParams.get('state');
      const expectedHost=provider==='google'?'accounts.google.com':provider==='github'?'github.com':provider==='cloudflare'?'dash.cloudflare.com':'';
      if(authorization.protocol!=='https:'||authorization.hostname!==expectedHost||authorization.port||!state)throw Error('Sign-in address rejected.');
      const origin='https://quantaphi.org'; // Registered callback's origin.
      const listener=async event=>{
        const message=event.data;
        if(event.origin!==origin||event.source!==popup||message?.type!=='bubbles:oauth-return'||message.provider!==provider||message.state!==state)return;
        this.cleanup();
        try {
          if(message.error)throw Error('Account authorization was declined.');
          const complete=await this.call('/complete',{provider,state,code:message.code});
          onComplete(null,complete.account);popup.close();
        } catch(error) {onComplete(error);}
      };
      const timer=this.root.setTimeout(()=>{this.cleanup();onComplete(Error('Sign-in expired. Start Connect account again.'));},300000);
      this.pending={listener,timer};this.root.addEventListener('message',listener);
      popup.location.href=authorization.href;
    } catch(error) {popup.close();this.cleanup();throw error;}
  }
  cleanup() {
    if(!this.pending)return;
    this.root.removeEventListener('message',this.pending.listener);this.root.clearTimeout(this.pending.timer);this.pending=null;
  }
}
function element(tag,text,className='') {
  const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node;
}
export function mountConnections(container,{token}) {
  const sessionKey='bubbles:connector-session:v1';
  const paired=()=>{try{const value=JSON.parse(sessionStorage.getItem(sessionKey)||'null');return value?.expiresAt>Date.now()?value.token:'';}catch{return '';}};
  const client=new AccountConnections({token:async()=>{const session=paired();if(session)return session;try{return await token();}catch{return '';}}}),section=element('section',''),status=element('p','Choose an account service.','ba-muted');
  const refresh=element('button','Check connected accounts','ba-control'),catalog=element('div',''),accounts=element('div','');
  refresh.type='button';status.setAttribute('role','status');
  const scopes=element('fieldset',''),legend=element('legend','Google access');scopes.append(legend);
  const selections=[];
  for(const [name,action] of [['Find Drive files','drive.read'],['Read spreadsheets','sheets.read'],['Read calendar events','calendar.read']]) {
    const label=element('label',''),check=document.createElement('input');check.type='checkbox';check.value=action;label.append(check,document.createTextNode(' '+name+' '));scopes.append(label);selections.push(check);
  }
  section.append(element('strong','Your connected accounts'),status,scopes,refresh,catalog,accounts);container.append(section);
  const pairing=element('details','');pairing.append(element('summary','Connect this browser using your phone'));
  pairing.append(element('p','On your phone, open Bubbles on quantaphi.org in the browser with your existing wallet. Open these account settings and create a two-minute code. Enter it here. This grants account-connector access for 15 minutes, without transferring your wallet token. Keep the code private.'));
  const create=element('button','Create connection code on this device','ba-control'),redeem=element('button','Connect this browser','ba-control'),end=element('button','End this browser connection','ba-control'),code=document.createElement('input'),output=element('p','');
  code.type='password';code.autocomplete='off';code.maxLength=43;code.setAttribute('aria-label','Two-minute connector pairing code');
  for(const button of [create,redeem,end])button.type='button';
  create.addEventListener('click',async()=>{create.disabled=true;output.textContent='Checking this device’s wallet…';try{const data=await client.call('/pair/create',{});output.textContent='Private code (expires in two minutes): '+data.code;setTimeout(()=>{output.textContent='Code expired. Create another if needed.';},data.expiresIn*1000);}catch(error){output.textContent=connectionCodeMessage(error);}finally{create.disabled=false;}});
  redeem.addEventListener('click',async()=>{redeem.disabled=true;try{const data=await client.call('/pair/redeem',{code:code.value.trim()});sessionStorage.setItem(sessionKey,JSON.stringify({token:data.token,expiresAt:data.expiresAt}));code.value='';output.textContent='This browser is connected for 15 minutes.';await load();}catch{output.textContent='Connection failed. Use a fresh code from your verified phone.';}finally{redeem.disabled=false;}});
  end.addEventListener('click',async()=>{try{if(paired())await client.call('/pair/end',{});sessionStorage.removeItem(sessionKey);output.textContent='Browser connection ended.';await load();}catch{output.textContent='Could not end the server session. Try again; it expires automatically after 15 minutes.';}});
  pairing.append(create,output,code,redeem,end);section.prepend(pairing);
  async function load() {
    refresh.disabled=true;catalog.replaceChildren();accounts.replaceChildren();
    try {
      const data=await client.call('/catalog');let available=false;
      for(const provider of data.providers) {
        const button=element('button',(provider.configured?'Connect ':'Unavailable: ')+(NAMES[provider.id]||provider.id),'ba-control');button.type='button';button.disabled=!provider.configured;
        if(provider.configured)available=true;
        button.addEventListener('click',async()=>{
          const actions=provider.id==='google'?selections.filter(c=>c.checked).map(c=>c.value):provider.id==='cloudflare'?['account.read','projects.build','ledger.read']:['repository.read'];
          if(!actions.length){status.textContent='Choose the Google access you want to allow.';return;}
          try {await client.connect(provider.id,actions,(error,account)=>{
            status.textContent=error?error.message:'Connected '+account.label+'.';if(!error)void load();
          });status.textContent='Finish authorization in the sign-in window.';}catch(error){status.textContent=error.message;}
        });catalog.append(button);
      }
      if(!available){status.textContent='Account connections are awaiting service setup. No account access has been granted.';return;}
      const dataAccounts=await client.call('/accounts');
      for(const account of dataAccounts.accounts) {
        const row=element('p',(NAMES[account.provider]||account.provider)+' · '+account.label+' · '+account.status+' ');
        if(account.status!=='disconnected') {
          const button=element('button','Disconnect','ba-control');button.type='button';
          button.addEventListener('click',async()=>{button.disabled=true;try{
            const result=await client.call('/disconnect',{id:account.id});await load();
            status.textContent=result.providerRevocation==='failed'?'Disconnected in Bubbles. Provider revocation failed; remove Bubbles access in that service’s account settings.':'Account disconnected.';
          }catch(error){status.textContent=error.message;button.disabled=false;}});row.append(button);
        }
        if(account.provider==='github'&&account.status==='connected'){
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
          row.append(inspect,test,result,walletRepo,backup,compare,createPrivate,backupStatus);
          void loadPrivateRepositories().catch(()=>{backupStatus.textContent='GitHub repository list is unavailable. No backup was written.';});
          }
        }
        accounts.append(row);
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
      status.textContent=dataAccounts.accounts.length?'Connected accounts checked.':'No connected accounts yet.';
    }catch {status.textContent='Account connections are unavailable. Connect your wallet and try again.';}
    finally {refresh.disabled=false;}
  }
  refresh.addEventListener('click',()=>void load());
  return {client,refresh:load};
}
