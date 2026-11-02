/* One source-linked shopping carousel; not a provider checkout, listing feed or bidding API.
 * A search result title is not proof of live price, condition, auction type or availability.
 */
import {fetchLiveSourceResults,liveSourceProfile,safeSourceResultUrl} from './quanta-card-live-source.mjs';

export const MARKETPLACE_SOURCES=Object.freeze([
 Object.freeze({id:'ebay',name:'eBay',search:'https://www.ebay.com/sch/i.html?_nkw='}),
 Object.freeze({id:'etsy',name:'Etsy',search:'https://www.etsy.com/search?q='}),
 Object.freeze({id:'mercari',name:'Mercari',search:'https://www.mercari.com/search/?keyword='}),
 Object.freeze({id:'poshmark',name:'Poshmark',search:'https://poshmark.com/search?query='})
]);
const boundedQuery=value=>String(value||'').replace(/\s+/g,' ').trim().slice(0,110);
export function marketSearchLink(id,query,mode='all'){
 const source=MARKETPLACE_SOURCES.find(x=>x.id===id),term=boundedQuery(query);
 if(!source||!term)return null;
 const u=new URL(source.search+encodeURIComponent(term));
 if(id==='ebay'&&mode==='auction')u.searchParams.set('LH_Auction','1');
 if(id==='ebay'&&mode==='buy_now')u.searchParams.set('LH_BIN','1');
 return u.href;
}
export function combineMarketplaceResults(results,limit=16){
 const safe=[];
 const sources=MARKETPLACE_SOURCES.map(provider=>{
  const rows=Array.isArray(results?.[provider.id]?.items)?results[provider.id].items:[];
  return {provider,rows:rows.filter(x=>Boolean(safeSourceResultUrl(liveSourceProfile(provider.id),x?.url))).slice(0,4)};
 });
 const seen=new Set();
 for(let i=0;i<4;i++)for(const {provider,rows} of sources){
  const item=rows[i];if(!item||seen.has(item.url))continue;
  seen.add(item.url);
  safe.push(Object.freeze({provider:provider.name,providerId:provider.id,
   title:String(item.title||'').trim().slice(0,175),
   url:safeSourceResultUrl(liveSourceProfile(provider.id),item.url),
   snippet:String(item.snippet||'').slice(0,250)}));
  if(safe.length>=Math.min(16,Math.max(1,Number(limit)||16)))return safe;
 }
 return safe;
}
export async function searchMarketplaceListings(query,{fetcher=fetch,sourceIds=MARKETPLACE_SOURCES.map(x=>x.id)}={}){
 const q=boundedQuery(query);
 if(q.length<2)throw Error('marketplace_query_required');
 const eligible=MARKETPLACE_SOURCES.filter(x=>sourceIds.includes(x.id));
 const settled=await Promise.all(eligible.map(async source=>{
  try{
   const result=await fetchLiveSourceResults(source.id,q,fetcher);
   return {id:source.id,state:result.items.length?'found':'empty',result};
  }catch{return {id:source.id,state:'unavailable',result:null}}
 }));
 const status={},sourceResults={};let observedAt='';
 for(const row of settled){
  status[row.id]=row.state;
  if(row.result){sourceResults[row.id]=row.result;observedAt=row.result.checkedAt||observedAt}
 }
 return {items:combineMarketplaceResults(sourceResults),status,query:q,
  checkedAt:observedAt||null,method:'Independent public web index · source linked',
  checkoutConnected:false,biddingConnected:false};
}

const el=(tag,cls,text)=>{
 const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;
};
const outbound=(title,url,cls='')=>{
 const a=el('a',cls,title);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
};
/* Mount under the existing eBay/vintage/antique Quick Card, never a second top-level carousel. */
export function mountMarketplaceCarousel(root,card,{search=searchMarketplaceListings}={}){
 if(!root)return false;
 const panel=el('section','qcm-panel');panel.setAttribute('aria-label','Competing auction and marketplace listings');
 const headline=el('h3','','Shop competing sellers');
 const intro=el('p','qcm-intro','One search across eBay, Etsy, Mercari and Poshmark. Public listings link to their original seller; prices, availability and bids must be confirmed there.');
 const form=el('form','qcm-form'),field=el('input','qcm-query'),submit=el('button','qcm-search','Search listings');
 field.type='search';field.required=true;field.maxLength=110;field.placeholder='Coins, radios, antiques, gifts…';
 field.setAttribute('aria-label','Search competing marketplace listings');
 submit.type='submit';form.append(field,submit);
 const filters=el('div','qcm-filters');filters.setAttribute('aria-label','Marketplace filters');
 const choices=[{id:'all',name:'All'},...MARKETPLACE_SOURCES];
 let active='all',items=[],index=0,requestId=0,lastQuery='';
 const notice=el('p','qcm-status','Search to compare source-linked listings.');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
 const viewer=el('div','qcm-viewer');viewer.setAttribute('aria-label','Marketplace result carousel');
 const controls=el('div','qcm-nav');
 const prev=el('button','qcm-step','Previous'),count=el('span','qcm-count','0 listings'),next=el('button','qcm-step','Next');
 prev.type='button';next.type='button';controls.append(prev,count,next);
 const shortcuts=el('div','qcm-links');
 function selected(){return active==='all'?items:items.filter(x=>x.providerId===active)}
 function render(){
  const filtered=selected();
  const tabs=filters.querySelectorAll('button');
  for(const tab of tabs)tab.setAttribute('aria-pressed',String(tab.dataset.market===active));
  if(index>=filtered.length)index=0;
  viewer.replaceChildren();
  count.textContent=filtered.length?(index+1)+' / '+filtered.length+' listings':'0 listings';
  prev.disabled=next.disabled=filtered.length<2;
  if(!filtered.length){
   viewer.append(el('p','qcm-empty',lastQuery
    ?'No verified public listing matches in this view. Open an original marketplace search below.'
    :'Search to compare auctions and other sellers.'));
   return;
  }
  const item=filtered[index];
  const article=el('article','qcm-listing');
  article.append(el('p','qcm-seller',item.provider+' · Original listing'),
   el('h4','qcm-title',item.title));
  if(item.snippet)article.append(el('p','qcm-description',item.snippet));
  article.append(outbound('View listing on '+item.provider,item.url,'qcm-open'));
  article.append(el('small','qcm-fact','Listed information is from an independent web index. Check the current price, shipping, availability, auction status and seller terms on '+item.provider+'.'));
  viewer.append(article);
 }
 for(const choice of choices){
  const tab=el('button','qcm-filter',choice.name);tab.type='button';tab.dataset.market=choice.id;
  tab.addEventListener('click',()=>{active=choice.id;index=0;render()});filters.append(tab);
 }
 prev.addEventListener('click',()=>{const rows=selected();if(!rows.length)return;index=(index-1+rows.length)%rows.length;render()});
 next.addEventListener('click',()=>{const rows=selected();if(!rows.length)return;index=(index+1)%rows.length;render()});
 form.addEventListener('submit',async event=>{
  event.preventDefault();const q=boundedQuery(field.value);if(q.length<2)return;
  const current=++requestId;lastQuery=q;submit.disabled=true;
  notice.textContent='Checking independently indexed seller pages…';viewer.replaceChildren();
  render();
  shortcuts.replaceChildren();
  for(const src of MARKETPLACE_SOURCES){
   const url=marketSearchLink(src.id,q);
   if(url)shortcuts.append(outbound('Search '+src.name,url,'qcm-source-link'));
  }
  shortcuts.prepend(outbound('eBay auctions',marketSearchLink('ebay',q,'auction'),'qcm-source-link'),
   outbound('eBay Buy It Now',marketSearchLink('ebay',q,'buy_now'),'qcm-source-link'));
  try{
   const found=await search(q);
   if(current!==requestId)return;
   items=Array.isArray(found.items)?found.items.filter(x=>safeSourceResultUrl(liveSourceProfile(x.providerId),x.url)):[];
   active='all';index=0;
   const unavailable=MARKETPLACE_SOURCES.filter(x=>found.status?.[x.id]==='unavailable').map(x=>x.name);
   notice.textContent=items.length+' public source-linked listings · '+(found.method||'Independent index')+
    (unavailable.length?'. Unavailable: '+unavailable.join(', ')+'.':'')+
    '. Not an authorized bidding or checkout integration.';
  }catch{
   if(current!==requestId)return;
   items=[];notice.textContent='Marketplace index unavailable. Official searches below are still accessible.';
  }finally{if(current===requestId){submit.disabled=false;render()}}
 });
 const first=String(card?.id||'')==='vintage-toys'?'vintage toys':
  String(card?.id||'')==='antique-collectibles'?'antiques':'';
 if(first)field.value=first;
 panel.append(headline,intro,form,filters,notice,viewer,controls,shortcuts);
 root.append(panel);render();return true;
}
