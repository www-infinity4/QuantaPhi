/* On-demand, independently indexed public pages for existing QuantaPhi Quick Cards.
 * This is NOT a provider's private API, checkout, login, price feed or licensed image feed.
 * Never allow a card title, user URL or remote search result to change the host allowlist.
 */
const BROKER='https://orange-brook-a2ac.marvaseater.workers.dev/search';
const profiles=Object.freeze({
 ebay:{name:'eBay listings',site:'ebay.com/itm',hosts:['ebay.com'],path:'/itm/'},
 'vintage-toys':{name:'eBay vintage toys',site:'ebay.com/itm',hosts:['ebay.com'],path:'/itm/'},
 'antique-collectibles':{name:'eBay antiques',site:'ebay.com/itm',hosts:['ebay.com'],path:'/itm/'},
 'us-mint':{name:'U.S. Mint',site:'usmint.gov',hosts:['usmint.gov']},
 pcgs:{name:'PCGS',site:'pcgs.com',hosts:['pcgs.com']},
 ngc:{name:'NGC',site:'ngccoin.com',hosts:['ngccoin.com']},
 cnn:{name:'CNN',site:'cnn.com',hosts:['cnn.com']},
 'fox-news':{name:'Fox News',site:'foxnews.com',hosts:['foxnews.com']},
 'yahoo-news':{name:'Yahoo News',site:'news.yahoo.com',hosts:['news.yahoo.com']}
});
export function liveSourceProfile(id){return Object.hasOwn(profiles,id)?profiles[id]:null;}
const short=(v,n)=>String(v||'').replace(/\s+/g,' ').trim().slice(0,n);
export function safeSourceResultUrl(profile,value){
 if(!profile)return null;
 try{
  const u=new URL(String(value));
  if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
  if(!profile.hosts.some(h=>u.hostname===h||u.hostname.endsWith('.'+h)))return null;
  if(profile.path&&!u.pathname.startsWith(profile.path))return null;
  u.hash='';return u.href;
 }catch{return null;}
}
export function verifiedSourceRows(profile,payload){
 if(!profile)return [];
 const out=[],seen=new Set();
 for(const row of Array.isArray(payload?.results)?payload.results.slice(0,40):[]){
  const url=safeSourceResultUrl(profile,row?.url);
  const title=short(row?.title,175);
  if(!url||!title||seen.has(url))continue;
  seen.add(url);
  out.push(Object.freeze({url,title,snippet:short(row.content||row.description||row.snippet,250)}));
  if(out.length===4)break;
 }
 return out;
}
export function sourceBrokerUrl(id,query,engine='google'){
 const p=liveSourceProfile(id),q=short(query,110);
 if(!p||!q)return null;
 const terms='site:'+p.site+' '+q;
 const args=new URLSearchParams({q:terms,format:'json',categories:'general',safesearch:'1'});
 if(engine)args.set('engines',engine);
 return BROKER+'?'+args.toString();
}
/** Public attributed results only; a refusal or zero matching domains is NOT a success. */
export async function fetchLiveSourceResults(id,query,fetcher=fetch){
 const p=liveSourceProfile(id);
 if(!p||!short(query,110))throw Error('unsupported_source_query');
 let lastError=null;
 for(const engine of ['google','']){
  const endpoint=sourceBrokerUrl(id,query,engine);
  try{
   const res=await fetcher(endpoint,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(8500)});
   if(!res.ok)throw Error('source_broker_http_'+res.status);
   const payload=await res.json();
   const items=verifiedSourceRows(p,payload);
   if(items.length)return {source:p.name,items,checkedAt:new Date().toISOString(),method:'independent web search'};
  }catch(error){lastError=error;}
 }
 if(lastError)throw Error('source_results_unavailable');
 return {source:p.name,items:[],checkedAt:new Date().toISOString(),method:'independent web search'};
}
/** Render real source links on an existing card, not a second query bar or fake storefront. */
export async function showLiveSourceResults(host,id,query,{fetcher=fetch}={}){
 if(!host)return;
 const p=liveSourceProfile(id);if(!p)return;
 host.replaceChildren();
 const status=document.createElement('p');status.className='qcx-source-status';status.setAttribute('role','status');
 status.textContent='Searching public '+p.name+' pages…';host.append(status);
 try{
  const data=await fetchLiveSourceResults(id,query,fetcher);
  if(!host.isConnected)return; // Avoid rendering a card replaced during navigation.
  host.replaceChildren();
  status.textContent=data.items.length?data.items.length+' source-linked matches · '+data.method:'No verified public '+p.name+' matches. Use the original website.';
  host.append(status);
  const list=document.createElement('div');list.className='qcx-source-list';
  for(const item of data.items){
   const article=document.createElement('article');article.className='qcx-source-item';
   const a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';
   a.textContent=item.title;
   const origin=document.createElement('small');origin.textContent=new URL(item.url).hostname;
   article.append(a,origin);
   if(item.snippet){const desc=document.createElement('p');desc.textContent=item.snippet;article.append(desc);}
   list.append(article);
  }
  host.append(list);
 }catch{
  if(!host.isConnected)return;
  status.textContent='Live source results are unavailable. Open the original website instead.';
 }
}
