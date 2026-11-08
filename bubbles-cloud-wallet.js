(function(global){
'use strict';
const STAR='https://starquest-ledger.marvaseater.workers.dev';
const WALLET='https://unified-wallet.marvaseater.workers.dev';
const byId=id=>document.getElementById(id);
const state=byId('bubblesWalletConnection');
const balances=byId('bubblesWalletBalances');
const history=byId('bubblesWalletHistory');
const receipts=byId('bubblesWalletReceipts');
const refresh=byId('bubblesWalletRefresh');
if(!state||!balances||!history||!receipts||!refresh)return;
let pending=false,lastUser='',walletGeneration=0;
function status(message){state.textContent=message}
function money(value){return Number.isFinite(Number(value))?Number(value).toLocaleString(undefined,{maximumFractionDigits:1}):'—'}
function accountTime(value){const number=Number(value);if(!Number.isFinite(number)||number<=0)return '';const t=new Date(number);return Number.isNaN(+t)?'':t.toLocaleString()}
async function verifiedWalletToken(){
 const bridge=global.QuantaCloudConnection;
 if(!bridge)return '';
 let timer;
 // A hung wallet initialization cannot strand the wallet status or chat.
 const read=async()=>{if(bridge.ready)await bridge.ready;return bridge.resolveDeviceToken?.();};
 try{
  return await Promise.race([read(),new Promise((_,reject)=>{
   timer=setTimeout(()=>reject(Error('wallet_session_timeout')),10000);
  })]);
 }finally{clearTimeout(timer)}
}
async function api(url,token,options={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const res=await fetch(url,{...options,headers:{...options.headers,Authorization:'Bearer '+token},cache:'no-store',signal:controller.signal});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.ok)throw Error(data.error||'Cloudflare wallet request failed ('+res.status+')');
  return data;
 }finally{clearTimeout(timer)}
}
function line(title,value){
 const span=document.createElement('span');span.className='bubbles-wallet-asset';
 const label=document.createElement('small');label.textContent=title;
 const count=document.createElement('strong');count.textContent=value===null?'—':money(value);
 span.append(label,count);return span;
}
function workAssetLine(title,asset,unavailable){
 const confirmed=asset?.available===true&&Number.isSafeInteger(asset.credited)&&asset.credited>=0;
 const entry=line(title,confirmed?asset.credited:null);
 const note=document.createElement('small');
 note.textContent=confirmed?(Number.isSafeInteger(asset.pending)?asset.pending+' pending verification':'Confirmed credits'):unavailable;
 entry.append(note);
 return entry;
}
function gptCoinImport(token,generation){
 const form=document.createElement('form');
 const label=document.createElement('label');label.textContent='GPT Coin provider receipt';
 const input=document.createElement('textarea');input.required=true;input.maxLength=4096;input.rows=3;
 const submit=document.createElement('button');submit.type='submit';submit.textContent='Import signed receipt';
 const result=document.createElement('small');result.setAttribute('role','status');
 label.append(input);form.append(label,submit,result);
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(submit.disabled)return;
  submit.disabled=true;
  try{
   const activeToken=await verifiedWalletToken();
   if(generation!==walletGeneration||activeToken!==token)return;
   const data=await api(WALLET+'/v1/wallet/gpt-coin/import',token,{
    method:'POST',headers:{'Content-Type':'application/json'},body:input.value});
   if(generation!==walletGeneration)return;
   input.value='';
   result.textContent=data.replayed?'This receipt is already in your wallet.':'Provider receipt credited.';
   void load();
  }catch{result.textContent='The wallet could not verify this provider receipt.';}
  finally{submit.disabled=false;}
 });
 return form;
}
function item(target,text){
 const li=document.createElement('li');li.textContent=text;target.append(li);
}
async function paginated(kind,token){
 let cursor=null,found=[],pages=0;
 while(pages++<50){
  const url=new URL(WALLET+'/v1/wallet/infinity-history');
  url.searchParams.set('kind',kind);url.searchParams.set('limit','100');
  if(cursor){url.searchParams.set('beforeAt',String(cursor.beforeAt));url.searchParams.set('beforeId',cursor.beforeId)}
  const page=await api(url.href,token);
  if(page.kind!==kind||!Array.isArray(page.items))throw Error('Invalid wallet history response');
  found.push(...page.items);
  if(!page.next)return {items:found,complete:true};
  if(!page.next.beforeAt||!page.next.beforeId)throw Error('Invalid wallet history cursor');
  cursor=page.next;
 }
 return {items:found,complete:false};
}
async function appendGitSerials(token,generation,git){
 const section=document.createElement('section');
 const heading=document.createElement('h3');
 heading.textContent='GIT coin serials';
 const note=document.createElement('p');
 const list=document.createElement('ol');
 list.className='bubbles-wallet-receipts';
 section.append(heading,note,list);
 receipts.append(section);
 if(git?.available!==true){
  note.textContent='GIT ledger not connected. No verified GIT serials can be displayed yet.';
  return;
 }
 let cursor=null,busy=false;
 const more=document.createElement('button');
 more.type='button';more.textContent='Load more GIT receipts';more.hidden=true;
 section.append(more);
 async function page(){
  if(busy||generation!==walletGeneration)return;
  busy=true;more.disabled=true;
  try{
   const url=new URL(WALLET+'/v1/wallet/git-serials');
   url.searchParams.set('limit','25');
   if(cursor!==null)url.searchParams.set('beforeSerial',String(cursor));
   const data=await api(url.href,token);
   if(generation!==walletGeneration||!data.available||data.asset!=='GIT'||!Array.isArray(data.items))
    throw Error('GIT receipt history unavailable');
   for(const receipt of data.items){
    if(!/^GIT-[0-9]{12,}$/.test(receipt.serial||''))continue;
    item(list,receipt.serial+' · '+String(receipt.gitType||'git:other').slice(0,60)+
      ' · receipt '+String(receipt.receiptId||'').slice(0,20));
   }
   const next=data.nextBeforeSerial;
   cursor=Number.isSafeInteger(next)&&next>0?next:null;
   more.hidden=cursor===null;
   note.textContent=list.children.length
    ?'Issued GIT receipts from your verified wallet. These are not cash.'
    :'No settled GIT receipts found in your verified wallet.';
  }catch{
   note.textContent='GIT serial history not yet available. Existing wallet records were not changed.';
   more.hidden=true;
  }finally{busy=false;more.disabled=false;}
 }
 more.addEventListener('click',async()=>{
  try{
   const active=await verifiedWalletToken();
   if(active===token&&generation===walletGeneration)await page();
  }catch{note.textContent='Reconnect your verified wallet to view older GIT receipts.';}
 });
 await page();
}
async function populate(token,star,unified,generation){
 const name=String(star.state?.username||'').trim().toLowerCase();
 const account=String(unified.user?.username||'').trim().toLowerCase();
 if(!name||name!==account||!unified.user?.id)throw Error('Wallet identity mismatch. No balances or records were changed.');
 if(lastUser&&lastUser!==unified.user.id){balances.replaceChildren();receipts.replaceChildren();}
 lastUser=unified.user.id;
 const b=unified.balances||{};
 balances.replaceChildren(
  line('StarCoins',Number(star.state.starCoins||0)+Number(star.state.pendingShareCredits||0)/10),
  line('Quants',b.QUANT),
  line('Infinity',b.INFINITY),
  line('Music Quants',b.MUSIC_QUANT)
 );
 const work=unified.workAssets||{};
 balances.append(
  workAssetLine('GIT',work.GIT,work.GIT?.status==='wallet_link_required'?'Wallet link required':'Verification ledger unavailable'),
  workAssetLine('Bubble Bits',work.BUBBLE_BIT||unified.bubbleBits,'Credit ledger unavailable'),
  workAssetLine('GPT Coin',work.GPT_COIN,work.GPT_COIN?.status==='ledger_unavailable'?'Import ledger unavailable':'Provider issuer not connected')
 );
 if(work.GPT_COIN?.importAvailable===true)balances.append(gptCoinImport(token,generation));
 balances.hidden=false;
 history.hidden=false;
 status('Cloudflare verified · '+name+' · live balances');
 if(generation!==walletGeneration)return;
 receipts.replaceChildren();
 const description=document.createElement('p');
 description.textContent='Reading the original Infinity transactions and search-token records directly from Cloudflare…';
 receipts.append(description);
 let transactions=[],tokens=[],complete=true,legacy=false;
 try{
  const result=await Promise.all([paginated('events',token),paginated('tokens',token)]);
  transactions=result[0].items;tokens=result[1].items;complete=result.every(x=>x.complete);
 }catch(error){
  // Production may still be on the earlier Worker version. Display only
  // authenticated recent records, and clearly identify the truncation.
  legacy=true;complete=false;
  transactions=(unified.history||[]).filter(x=>x.asset_code==='INFINITY');
  tokens=(unified.tokens||[]).filter(x=>x.token_type==='INFINITY_SEARCH');
 }
 if(generation!==walletGeneration)return;
 receipts.replaceChildren();
 const note=document.createElement('p');
 note.textContent=legacy?'Showing authenticated recent records only. Full Infinity history needs the updated Cloudflare Worker.':complete?'Complete available Infinity ledger history for this verified account.':'Only part of the Cloudflare history could be loaded; older records remain stored.';
 receipts.append(note);
 const header=document.createElement('h3');
 header.textContent='Infinity transactions ('+transactions.length+(complete?' total':' loaded')+')';
 receipts.append(header);
 const events=document.createElement('ol');events.className='bubbles-wallet-receipts';
 for(const e of transactions){
  const meta=e.metadata||{};const source=String(meta.source||meta.query||e.reference_id||'').slice(0,130);
  item(events,accountTime(e.created_at)+' · '+String(e.event_type||'Record')+' '+money(e.amount)+' · balance '+money(e.balance_after)+(source?' · '+source:''));
 }
 if(!transactions.length)item(events,'No Infinity transaction records returned for this account.');
 receipts.append(events);
 const tokenTitle=document.createElement('h3');tokenTitle.textContent='Infinity search tokens ('+tokens.length+(complete?' total':' loaded')+')';
 receipts.append(tokenTitle);
 const tokenList=document.createElement('ol');tokenList.className='bubbles-wallet-receipts';
 for(const t of tokens){
  const query=String(t.data?.query||t.data?.search||t.data?.title||'').slice(0,200);
  item(tokenList,accountTime(t.created_at)+' · '+String(t.source||'Unknown source').slice(0,100)+(query?' · '+query:'')+' · receipt '+String(t.token_id||'').slice(0,28));
 }
 if(!tokens.length)item(tokenList,'No Infinity search receipts returned for this account.');
 receipts.append(tokenList);
 if(generation===walletGeneration)await appendGitSerials(token,generation,work.GIT);
}
async function load(){
 if(pending)return;
 const generation=walletGeneration;
 pending=true;refresh.disabled=true;
 status('Checking your previously verified wallet…');
 try{
  const token=await verifiedWalletToken();
  if(generation!==walletGeneration)return;
  if(!/^sq_[A-Za-z0-9_-]{32,}$/.test(token||'')){
   balances.hidden=true;history.hidden=true;receipts.replaceChildren();
   status('Wallet not connected in this browser or Android app. Your Cloudflare records have not been erased. Use Find Cloud Tokens to restore an existing verified wallet.');
   return;
  }
  const [star,unified]=await Promise.all([api(STAR+'/v1/state',token),api(WALLET+'/v1/wallet/state',token)]);
  if(generation===walletGeneration)await populate(token,star,unified,generation);
 }catch(error){
  if(generation!==walletGeneration)return;
  balances.hidden=true;history.hidden=true;receipts.replaceChildren();
  status('Could not verify the current wallet: '+String(error.message||error).slice(0,180)+'. Stored Cloudflare records were not changed.');
 }finally{
  pending=false;refresh.disabled=false;
  if(generation!==walletGeneration)void load();
 }
}
refresh.addEventListener('click',()=>void load());
document.addEventListener('starquest:ledger-connected',()=>void load());
document.addEventListener('starquest:auth-changed',()=>{
 walletGeneration++;
 balances.hidden=true;balances.replaceChildren();history.hidden=true;receipts.replaceChildren();
 void load();
});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void load()});
void load();
})(window);
