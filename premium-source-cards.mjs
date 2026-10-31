import {mountRotatingSpotlights} from './quick-card-spotlights.mjs?v=20261031-source-ad-first1';
import {mountCardActions} from './quanta-card-actions.mjs?v=20261030-live-share1';
// Real source searches, not invented inventory, account data or offers.
const provider=(id,name,category,official,query,topics,color)=>({id,name,category,official,query,topics,color});
export const PREMIUM_CARDS=Object.freeze([
 provider('vamworld','VAMWorld','Coin varieties','https://vamworld.com/','Morgan dollar',['1888 O Scarface VAM 1B','1888 O Hot Lips VAM 4','1891 CC Spitting Eagle VAM 3'],'#514536'),
 provider('pcgs','PCGS CoinFacts','Coins','https://www.pcgs.com/coinfacts','Morgan dollar',['Morgan dollars','Photograde','Certification verification'],'#243b56'),
 provider('ngc','NGC Coin Explorer','Coins','https://www.ngccoin.com/coin-explorer/','Morgan dollar',['Morgan dollars','Coin census','Variety attribution'],'#333f6c'),
 provider('heritage','Heritage Auctions','Auctions','https://coins.ha.com/','Morgan dollar auction',['Carson City Morgan','Early silver dollars','Gold coins'],'#42332c'),
 provider('topps','Topps','Trading cards','https://www.topps.com/','baseball cards',['Baseball releases','Basketball cards','Chrome'],'#a72532'),
 provider('beckett','Beckett','Trading cards','https://www.beckett.com/','baseball card grading',['Grading','Vintage baseball','Card price guide'],'#1b4255'),
 provider('christies',"Christie’s",'Auctions','https://www.christies.com/','photographs auction',['Photography','Jewellery','Music memorabilia'],'#712f38'),
 provider('morrison-hotel-gallery','Morrison Hotel Gallery','Music photography','https://morrisonhotelgallery.com/','Pink Floyd',['Pink Floyd','The Rolling Stones','Jazz photography'],'#292727'),
 provider('rolling-stone','Rolling Stone','Music','https://www.rollingstone.com/','music',['Pink Floyd','Tool','Music news'],'#a62831'),
 provider('coinworld','Coin World','Coin news','https://www.coinworld.com/','Morgan dollars',['Morgan dollars','U.S. coins','Auction news'],'#334a58'),
 provider('coinage','COINage','Coin news','https://www.coinagemag.com/','silver dollars',['Silver dollars','Coin collecting','Rare coins'],'#716044'),
 provider('shoplc-premium','Shop LC · Premium','Shopping','https://www.shoplc.com/collections/chairmans-collection','platinum diamond jewelry',['Platinum','Diamond rings','Tanzanite'],'#3e304a'),
 provider('sonic','SONIC','Restaurants','https://pages-a.sonicdrivein.com/deals/','deals',['Deals','Rewards','Menu'],'#a12c39'),
 provider('burger-king','Burger King','Restaurants','https://www.bk.com/','offers',['Royal Perks','Offers','Menu'],'#843b23'),
 provider('mcdonalds','McDonald’s','Restaurants','https://www.mcdonalds.com/us/en-us/deals.html','deals',['App deals','Rewards','Menu'],'#9b2429'),
 provider('loc','Library of Congress','Archives','https://www.loc.gov/collections/','historic radio photographs',['Historic radios','Jazz photographs','Historic maps'],'#3b3849'),
 provider('nasa-library','NASA Image Library','Science','https://images.nasa.gov/','Carina nebula',['Carina nebula','James Webb telescope','Apollo 11'],'#172d50')
]);
const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls||'';if(text!==undefined)e.textContent=text;return e};
export function sourceURL(value,host){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return null;if(host&&u.hostname!==host&&!u.hostname.endsWith('.'+host))return null;return u.href}catch{return null}}
export function normalizeResults(data,card){
 if(card.id==='nasa-library')return (data?.collection?.items||[]).map(x=>{const d=x.data?.[0]||{};return {title:d.title,url:'https://images.nasa.gov/details/'+encodeURIComponent(d.nasa_id||''),image:x.links?.find(l=>l.rel==='preview')?.href,description:d.description,credit:d.secondary_creator||d.photographer||d.center||'NASA',date:d.date_created}}).filter(x=>x.title&&sourceURL(x.image));
 const host=new URL(card.official).hostname.replace(/^www\./,'').replace(/^coins\./,'');
 return (Array.isArray(data?.results)?data.results:[]).filter(x=>sourceURL(x.url,host)).map(x=>({title:String(x.title||''),url:x.url,image:sourceURL(x.img_src||x.thumbnail_src||x.thumbnail||''),description:String(x.content||x.description||''),credit:new URL(x.url).hostname,date:x.publishedDate||''})).filter(x=>x.title).slice(0,8);
}
const cache=new Map();
async function lookup(card,query){
 const key=card.id+'|'+query,cached=cache.get(key);if(cached&&Date.now()-cached.time<900000)return cached;
 const url=card.id==='nasa-library'?new URL('https://images-api.nasa.gov/search'):new URL('https://orange-brook-a2ac.marvaseater.workers.dev/search');
 if(card.id==='nasa-library'){url.search=new URLSearchParams({q:query,media_type:'image',page_size:'12'})}
 else {const host=new URL(card.official).hostname.replace(/^www\./,'').replace(/^coins\./,'');url.search=new URLSearchParams({q:'site:'+host+' '+query,format:'json',categories:'general',safesearch:'1'})}
 const response=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(14000)});if(!response.ok)throw new Error('Source search unavailable');
 let rows=normalizeResults(await response.json(),card);
 // Use the broker's attributed image previews when available; never invent art.
 if(card.id!=='nasa-library'){
  try{const pictures=new URL(url);pictures.searchParams.set('categories','images');const r=await fetch(pictures,{credentials:'omit',signal:AbortSignal.timeout(7000)});if(r.ok){const art=normalizeResults(await r.json(),card).filter(x=>x.image);const urls=new Set(rows.map(x=>x.url));rows=rows.map(row=>({...row,image:art.find(x=>x.url===row.url)?.image||row.image}));for(const row of art)if(!urls.has(row.url)){rows.push(row);urls.add(row.url)}if(art.length&&!rows[0]?.image)rows=[art[0],...rows.filter(x=>x.url!==art[0].url)];}}catch{}
 }
 const result={time:Date.now(),rows:rows.slice(0,12)};cache.set(key,result);return result;
}
export function mountPremiumCard(card){
 const article=make('article','iqc-card premium-card');article.dataset.sourceId=card.id;article.dataset.sourceName=card.name;article.dataset.sourceReady='true';article.dataset.official=card.official;article.dataset.sourceCategory=card.category;article.dataset.sourceQuery=card.query;article.style.setProperty('--premium-accent',card.color);
 const header=make('header','premium-heading');header.append(make('p','iqc-kind',card.category+' · INFINITY 2026®'),make('h2','',card.name));
 const identity=make('a','premium-origin',new URL(card.official).hostname);identity.href=card.official;identity.target='_blank';identity.rel='noopener noreferrer';header.append(identity);
 const browse=make('a','premium-browse-source','Explore '+card.name+' listings ↗');browse.href=card.official;browse.target='_blank';browse.rel='noopener noreferrer';header.append(browse);
 const form=make('form','premium-search');const label=make('label','',card.id==='nasa-library'?'Explore the NASA image collection':'Search '+card.name);
 const field=make('input');field.type='search';field.value=card.query;field.required=true;field.maxLength=160;field.setAttribute('aria-label','Search '+card.name);label.append(field);
 const submit=make('button','','Search');submit.type='submit';form.append(label,submit);
 const topics=make('div','premium-topics');topics.setAttribute('aria-label',card.name+' topics');
 for(const topic of card.topics){const b=make('button','',topic);b.type='button';b.addEventListener('click',()=>{article.dataset.spotlightManual='true';field.value=topic;void run()});topics.append(b)}
 const state=make('p','premium-state','Choose a topic or search the original source.');state.setAttribute('role','status');
 const content=make('div','premium-content'),actions=make('div');
 const disclaimer=make('p','premium-footnote',card.id==='nasa-library'?'NASA collection images and captions. Check the original record for credits and usage guidance.':card.category==='Restaurants'?'Search original restaurant pages. Confirm current offers, dates and eligibility at the restaurant.':card.category==='Auctions'||card.category==='Shopping'?'Original-source search results. Confirm price, availability and sale details on the source page.':'Independent QuantaPhi research card · original publisher sources.');
 article.append(header,content,form,topics,state,disclaimer,actions);
 mountCardActions(actions,{...card,route:'/?card='+card.id,featureUrl:card.official});
 const rotating=['Restaurants','Shopping','Trading cards','Auctions'].includes(card.category);
 let serial=0,loaded=false;
 if(rotating)mountRotatingSpotlights(article,card,{onEmpty:()=>{if(!loaded)void run()}});
 async function run(){
  const query=field.value.trim();if(!query)return;const request=++serial;loaded=true;state.textContent='Searching '+card.name+'…';article.setAttribute('aria-busy','true');
  try{
   const result=await lookup(card,query);if(request!==serial)return;
   content.replaceChildren();const rows=result.rows;const requested=new URLSearchParams(location.search).get('item');let selected=Math.max(0,rows.findIndex(row=>hash(row.url)===requested));
   state.textContent=rows.length+' original-source results · checked '+new Date(result.time).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
   if(!rows.length){state.textContent='No verified source results returned. Try another topic or use the original source above.';return}
   const visual=make('section','premium-selected');const nav=make('div','premium-result-nav');
   const previous=make('button','','‹ Previous item'),count=make('span'),next=make('button','','Next item ›');previous.type=next.type='button';nav.append(previous,count,next);
   function show(){
    const row=rows[selected];visual.replaceChildren();
    const media=make('div','premium-media');
    const fallback=make('div','premium-photo-fallback');
    fallback.append(make('strong','','Publisher photograph unavailable here'),
     make('p','','View the original result for full photographs, availability and sale details.'));
    const photoLink=make('a','premium-photo-source','See images at '+card.name+' ↗');
    photoLink.href=row.url;photoLink.target='_blank';photoLink.rel='noopener noreferrer';fallback.append(photoLink);
    media.append(fallback);visual.append(media);
    if(row.image){
     const image=make('img','premium-photo');image.alt=row.title;image.referrerPolicy='no-referrer';image.loading='lazy';image.hidden=true;
     image.addEventListener('load',()=>{if(image.isConnected){image.hidden=false;fallback.hidden=true}},{once:true});
     image.addEventListener('error',()=>{image.remove();fallback.hidden=false},{once:true});
     media.prepend(image);image.src=row.image;
    }
    visual.append(make('p','premium-credit',row.credit+(row.date?' · '+String(row.date).slice(0,10):'')),make('h3','',row.title),make('p','premium-description',String(row.description||'').replace(/<[^>]*>/g,'').slice(0,600)));
    const open=make('a','premium-open','Read at '+card.name+' ↗');open.href=sourceURL(row.url);open.target='_blank';open.rel='noopener noreferrer';visual.append(open);
    const itemActions=make('div');mountCardActions(itemActions,{id:card.id+'-item-'+hash(row.url),name:row.title,category:card.category,url:row.url,route:'/?card='+card.id+'&topic='+encodeURIComponent(query)+'&item='+hash(row.url)});visual.append(itemActions);
    count.textContent=(selected+1)+' / '+rows.length;previous.disabled=selected===0;next.disabled=selected===rows.length-1;
   }
   previous.addEventListener('click',()=>{selected--;show()});next.addEventListener('click',()=>{selected++;show()});content.append(visual,nav);show();
  }catch{if(request===serial){content.replaceChildren();state.textContent=card.name+' search is unavailable right now. Retry or use the original source above.'}}
  finally{if(request===serial)article.removeAttribute('aria-busy')}
 }
 article.addEventListener('oracle:activate',()=>{if(!rotating&&!loaded)void run()});
 form.addEventListener('submit',e=>{e.preventDefault();article.dataset.spotlightManual='true';void run()});
 const params=new URLSearchParams(location.search);if(params.get('card')===card.id&&params.get('topic'))field.value=params.get('topic').slice(0,160);
 // Only the card actually displayed makes a request; hidden banks never fan out.
 const observer=new IntersectionObserver(items=>{if(items.some(x=>x.isIntersecting)&&!loaded&&!rotating)void run()});observer.observe(article);
 return article;
}
function hash(text){let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0).toString(36)}
function mount(){const bank=document.getElementById('premiumSourceCards');if(!bank)return;for(const card of PREMIUM_CARDS)bank.append(mountPremiumCard(card));window.dispatchEvent(new Event('quantaphi:source-cards-ready'))}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
