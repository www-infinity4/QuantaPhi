/* Infinity eBay Quick Cards: real eBay-provided listing data, never mocked ads.
 * Each card hands off to the original signed-in eBay site for bidding/checkout.
 * A production eBay Offer API grant is required before in-page bids are possible. */
import {loadOwnQuantScores} from './quanta-feed-quants.mjs';
import {fetchLiveSourceResults} from './quanta-card-live-source.mjs';
import {EBAY_TOPICS,EBAY_REPORTED_TRENDS,EBAY_TREND_SOURCE,
 ebayQuantCards,preferredEbayTopics,ebaySearchUrl,normalizeEbayFeed} from './ebay-quick-cards-core.mjs';
const host=document.getElementById('ebayQuickCards');
if(host){
 const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
 const header=make('div',undefined,'eqc-header'),eyebrow=make('small','INFINITY® · EBAY QUICK CARDS · SOURCE-LINKED');
 const title=make('h2','Active auctions & Buy It Now');
 const intro=make('p','Real eBay listings, matched to shopping interests when your Quant wallet is connected. Purchases and bids stay under your eBay account.');
 header.append(eyebrow,title,intro);host.append(header);
 const controls=make('div',undefined,'eqc-controls'),modes=make('div',undefined,'eqc-modes');
 const auctions=make('button','🔥 Active auctions'),buy=make('button','Buy It Now');
 for(const b of [auctions,buy]){b.type='button';modes.append(b)}
 const search=make('form',undefined,'eqc-search');
 const input=make('input');input.type='search';input.maxLength=85;input.placeholder='Search eBay items';input.setAttribute('aria-label','Search eBay items');
 const searchButton=make('button','Search');searchButton.type='submit';
 search.append(input,searchButton);
 const topicSelector=make('select');topicSelector.setAttribute('aria-label','Shopping category');
 for(const t of EBAY_TOPICS){const opt=make('option',t.label);opt.value=t.id;topicSelector.append(opt)}
 controls.append(modes,topicSelector,search);host.append(controls);
 const note=make('p','','eqc-note');note.setAttribute('role','status');
 const original=make('a','Browse on eBay','eqc-original');original.target='_blank';original.rel='noopener noreferrer';
 const toolbar=make('div',undefined,'eqc-toolbar');toolbar.append(note,original);host.append(toolbar);
 const results=make('div',undefined,'eqc-grid');host.append(results);
 const paging=make('div',undefined,'eqc-paging');
 const previous=make('button','‹ Previous'),next=make('button','Next listings ›');
 previous.type='button';next.type='button';
 const pageLabel=make('span','');paging.append(previous,pageLabel,next);host.append(paging);
 const trends=make('div',undefined,'eqc-trends');
 trends.append(make('strong','Reported eBay search trends · 2026'));
 for(const t of EBAY_REPORTED_TRENDS){
  const b=make('button',t.label);b.type='button';b.title=t.source;
  b.addEventListener('click',()=>{input.value=t.query;offset=0;void update()});trends.append(b);
 }
 const trendsSource=make('a','eBay trend report ↗');trendsSource.href=EBAY_TREND_SOURCE;
 trendsSource.target='_blank';trendsSource.rel='noopener noreferrer';trends.append(trendsSource);
 host.append(trends);
 const close=make('p','These are public listings, not paid ads unless explicitly labeled. eBay controls availability, buyer sign-in, bidding and payment. Always verify the current bid and shipping before committing.','eqc-disclaimer');host.append(close);
 let mode='auction',offset=0,activeQuery='',controller=null,sequence=0;
 const report=(message)=>{note.textContent=message};
 const updateMode=()=>{
  auctions.setAttribute('aria-pressed',String(mode==='auction'));
  buy.setAttribute('aria-pressed',String(mode==='buy'));
  auctions.classList.toggle('eqc-selected',mode==='auction');
  buy.classList.toggle('eqc-selected',mode==='buy');
 };
 const setQuery=()=>{const topic=EBAY_TOPICS.find(t=>t.id===topicSelector.value)||EBAY_TOPICS[0];
  activeQuery=input.value.trim()||topic.query;
  original.href=ebaySearchUrl(activeQuery,mode);
 };
 function articleCard(item,{sourceOnly=false}={}){
  const card=make('article',undefined,'eqc-listing');card.dataset.ebayListing=item.id;
  const art=make('div',undefined,'eqc-art');
  if(item.image){
   const image=make('img');image.src=item.image;image.alt=item.title;
   image.loading='lazy';image.referrerPolicy='no-referrer';
   image.addEventListener('error',()=>{art.replaceChildren(make('span','eBay item photograph unavailable','eqc-placeholder'))},{once:true});
   art.append(image);
  }else art.append(make('span','Open eBay for the original listing photograph','eqc-placeholder'));
  const body=make('div',undefined,'eqc-body');
  const badge=make('small',sourceOnly?'PUBLIC SOURCE · DETAILS ON EBAY':
   item.sponsored?'EBAY PROMOTED LISTING':mode==='auction'?'ACTIVE AUCTION':'BUY IT NOW','eqc-tag');
  const h=make('h3');const link=make('a',item.title);link.href=item.url;link.target='_blank';
  link.rel='noopener noreferrer'+(item.sponsored?' sponsored':'');h.append(link);
  body.append(badge,h);
  if(!sourceOnly){
   body.append(make('strong',(mode==='auction'?'Current bid · ':'Price · ')+item.price,'eqc-price'));
   const meta=make('div',undefined,'eqc-meta');
   if(item.bidCount!==null&&mode==='auction')meta.append(make('span',item.bidCount+' bids'));
   if(item.seller)meta.append(make('span','Seller · '+item.seller));
   if(item.shipping)meta.append(make('span',item.shipping));
   if(item.sellerFeedback!==null&&item.sellerFeedback!==undefined)meta.append(make('span','Positive seller feedback · '+item.sellerFeedback+'%'));
   if(item.topRated)meta.append(make('span','eBay Top Rated Plus buying experience'));
   if(item.condition)meta.append(make('span',item.condition));
   if(item.ends&&mode==='auction')meta.append(make('span','Ends · '+new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.ends))));
   body.append(meta);
  }
  const actions=make('div',undefined,'eqc-item-actions');
  const open=make('a',mode==='auction'?'Open eBay to bid ↗':'Open eBay to buy ↗');open.href=item.url;
  open.target='_blank';open.rel='noopener noreferrer'+(item.sponsored?' sponsored':'');
  actions.append(open);
  if(item.seller&&mode==='buy'&&!sourceOnly){
   const sellerSearch=new URL('https://www.ebay.com/sch/i.html');
   sellerSearch.searchParams.set('_ssn',item.seller);sellerSearch.searchParams.set('LH_BIN','1');
   const store=make('a','More from seller ↗');store.href=sellerSearch.href;
   store.target='_blank';store.rel='noopener noreferrer';actions.append(store);
  }
  const share=make('button','Share');share.type='button';
  share.addEventListener('click',async()=>{
   try{
    if(navigator.share)await navigator.share({title:item.title,url:item.url});
    else if(navigator.clipboard){await navigator.clipboard.writeText(item.url);report('Copied this original eBay listing link.')}
    else report('Use the original listing link to share this item.');
   }catch(e){if(e.name!=='AbortError')report('Share could not open. Use the original listing link.')}
  });
  actions.append(share);
  body.append(actions);card.append(art,body);return card;
 }
 function paint(items,{sourceOnly=false}={}){
  results.replaceChildren();
  if(!items.length){results.append(make('p','No verified listing results for this search. Try the original eBay search link.','eqc-empty'));return}
  for(const item of items)results.append(articleCard(item,{sourceOnly}));
 }
 async function update(){
  const version=++sequence;controller?.abort();controller=new AbortController();
  updateMode();setQuery();previous.disabled=true;next.disabled=true;
  report('Checking eBay listings…');results.replaceChildren();
  try{
   const url=new URL('/api/ebay/quick-cards',location.origin);
   url.searchParams.set('q',activeQuery);url.searchParams.set('mode',mode);url.searchParams.set('offset',String(offset));
   const response=await fetch(url,{credentials:'omit',cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('browse_not_available');
   const data=await response.json();if(data.ok!==true)throw Error('browse_not_available');
   if(version!==sequence)return;
   const items=normalizeEbayFeed(data,mode);
   paint(items);pageLabel.textContent='Page '+(Math.floor(offset/20)+1);
   previous.disabled=offset===0;next.disabled=items.length<20||offset+20>=Math.min(1000,Number(data.total)||1000);
   report(items.length+' verified '+(mode==='auction'?'auctions with at least 3 bids':'Buy It Now listings')+
    ' · eBay Browse API · checked '+new Date(data.fetchedAt||Date.now()).toLocaleTimeString());
  }catch(e){
   if(e.name==='AbortError'||version!==sequence)return;
   // Existing independent public search never supplies invented prices or bid counts.
   offset=0;pageLabel.textContent='';previous.disabled=true;next.disabled=true;
   try{
    const found=await fetchLiveSourceResults('ebay',activeQuery);
    if(version!==sequence)return;
    const items=found.items.map((x,i)=>({id:'public-'+i,url:x.url,title:x.title,image:''}));
    paint(items,{sourceOnly:true});
    report('eBay live API is not configured or available. Showing '+items.length+
     ' independent public listing links only; prices and bids are not verified.');
   }catch{
    if(version!==sequence)return;
    paint([]);report('The live eBay listing feed is unavailable. Open the official eBay search to continue.');
   }
  }
 }
 function selectMode(nextMode){mode=nextMode;offset=0;void update()}
 auctions.addEventListener('click',()=>selectMode('auction'));
 buy.addEventListener('click',()=>selectMode('buy'));
 topicSelector.addEventListener('change',()=>{input.value='';offset=0;void update()});
 search.addEventListener('submit',e=>{e.preventDefault();offset=0;void update()});
 previous.addEventListener('click',()=>{offset=Math.max(0,offset-20);void update()});
 next.addEventListener('click',()=>{offset=Math.min(960,offset+20);void update()});
 // Signed-in Quant scores are computed in memory; no raw ledger searches,
 // device wallet tokens or individual interest history are sent to eBay.
 const quant=await loadOwnQuantScores(window.QuantaCloudConnection,ebayQuantCards());
 if(quant.connected){
  const best=preferredEbayTopics(quant.scores,1)[0];
  topicSelector.value=best.id;
  intro.textContent='For You · shopping category selected from your authenticated Quant interests. Only this category keyword goes to eBay.';
 }else intro.textContent='Public discovery · connect your Unified Wallet for Quant-matched eBay categories. Every purchase and bid stays on eBay.';
 void update();
}
