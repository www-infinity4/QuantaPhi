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
let pending=false,lastUser='';
function status(message){state.textContent=message}
function money(value){return Number.isFinite(Number(value))?Number(value).toLocaleString(undefined,{maximumFractionDigits:1}):'—'}
function accountTime(value){const number=Number(value);if(!Number.isFinite(number)||number<=0)return '';const t=new Date(number);return Number.isNaN(+t)?'':t.toLocaleString()}
async function api(url,token){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const res=await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:controller.signal});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.ok)throw Error(data.error||'Cloudflare wallet request failed ('+res.status+')');
  return data;
 }finally{clearTimeout(timer)}
}
function line(title,value){
 const span=document.createElement('span');span.className='bubbles-wallet-asset';
 const label=document.createElement('small');label.textContent=title;
 const count=document.createElement('strong');count.textContent=money(value);
 span.append(label,count);return span;
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
async function populate(token,star,unified){
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
 balances.hidden=false;
 history.hidden=false;
 status('Cloudflare verified · '+name+' · live balances');
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
}
async function load(){
 if(pending)return;
 pending=true;refresh.disabled=true;
 status('Checking your previously verified wallet…');
 try{
  await global.QuantaCloudConnection?.ready;
  const token=await global.QuantaCloudConnection?.resolveDeviceToken?.();
  if(!/^sq_[A-Za-z0-9_-]{32,}$/.test(token||'')){
   balances.hidden=true;history.hidden=true;receipts.replaceChildren();
   status('Wallet not connected in this browser or Android app. Your Cloudflare records have not been erased. Use Find Cloud Tokens to restore an existing verified wallet.');
   return;
  }
  const [star,unified]=await Promise.all([api(STAR+'/v1/state',token),api(WALLET+'/v1/wallet/state',token)]);
  await populate(token,star,unified);
 }catch(error){
  balances.hidden=true;history.hidden=true;receipts.replaceChildren();
  status('Could not verify the current wallet: '+String(error.message||error).slice(0,180)+'. Stored Cloudflare records were not changed.');
 }finally{pending=false;refresh.disabled=false}
}
refresh.addEventListener('click',()=>void load());
document.addEventListener('starquest:ledger-connected',()=>void load());
document.addEventListener('starquest:auth-changed',()=>void load());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void load()});
void load();
})(window);
