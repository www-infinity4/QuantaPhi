/* ShopPhi / AdPhi six-way contextual switchboard.
 * One live Oracle hero; six companion positions. No fake ads, login proxy,
 * charge, invented merchant inventory, visitor tracking or private-search upload.
 */
import {loadOwnQuantScores} from './quanta-feed-quants.mjs';
import {housingCompanions,housingResource} from './housing-help-catalog.mjs';
import {createHousingHelpCard} from './housing-help-cards.mjs';
import {chapterFor} from './shopphi-showcase-core.mjs';

export const SLOT_COUNT=6;
// Companion pages can advance without fetching ads or changing the selected hero.
export function nextCompanionPage(page,total){
 const pages=Math.ceil(Math.max(0,Number(total)||0)/2);
 const current=Number.isInteger(page)&&page>=0?page:0;
 return pages>1?(current+1)%pages:0;
}
export function companionRotationAllowed({total=0,visible=false,pageHidden=false,focused=false,shelfOpen=false,paused=false,reducedMotion=false}={}){
 return total>2&&visible&&!pageHidden&&!focused&&!shelfOpen&&!paused&&!reducedMotion;
}
const SENSITIVE=/\b(religion|church|politic|election|race|ethnic|medical|health|disability|sexual|addiction|therapy)\b/i;
const LANES=Object.freeze([
 {id:'cookout',match:/\b(oscar mayer|hot dogs?|grills?|charcoal|barbecue|bbq|picnic|patio|cookout|lawn games?)\b/i,
  topics:['hot dogs and picnic food','charcoal grills','picnic tables','outdoor cooking','cookout accessories','coolers and yard games'],
  clues:['hot dog','sausage','grill','charcoal','barbecue','picnic','patio','outdoor','cooler','cookout','bbq','lawn']},
 {id:'movie-night',match:/\b(movies?|movie night|popcorn|candy|dvd|blu.ray|sofa|couch|home theater|television|tv screen)\b/i,
  topics:['family movie night','living room sofas','televisions','popcorn and candy','movie accessories','home entertainment'],
  clues:['movie','popcorn','candy','dvd','blu-ray','sofa','couch','tv','television','theater','entertainment','living room']},
 {id:'kitchen',match:/\b(recipes?|kitchens?|stoves?|ovens?|refrigerators?|cookware|appliances?|rent.a.center|rent.to.own)\b/i,
  topics:['recipes and ingredients','kitchen cookware','stoves and ranges','refrigerators','home appliances','rent-to-own home goods'],
  clues:['recipe','kitchen','stove','oven','refrigerator','cookware','appliance','range','dishwasher','rent-to-own']},
 {id:'family',match:/\b(strollers?|pushchairs?|nursery|baby gear|car seats?)\b/i,
  topics:['strollers','stroller accessories','baby bags','nursery accessories','family travel','stroller covers'],
  clues:['stroller','pushchair','nursery','baby','infant','toddler','family','travel']},
 {id:'tools',match:/\b(micrometers?|calipers?|precision measuring|wrenches?|socket sets?|tools?)\b/i,
  topics:['precision measuring tools','wrenches and sockets','workshop tools','tool accessories','industrial parts','tool support'],
  clues:['micrometer','caliper','measuring','wrench','socket','tools','workshop','precision','saw','gage']},
 {id:'outdoors',match:/\b(camping|hiking|backpack|outdoor clothing|tents?|trail gear)\b/i,
  topics:['camping gear','outdoor clothing','tents','hiking backpacks','water treatment','trail accessories'],
  clues:['camp','hiking','backpack','outdoor','tent','trail','mountain','gear']},
 {id:'coins',match:/\b(morgan|silver dollar|coin|numismatic|pcgs|ngc|gold eagle|bullion|mintmark|mercury dime)\b/i,
  topics:['gold coins','coin grading pcgs','coin collecting supplies','jeweler loupe','coin albums','silver dollars'],
  clues:['coin','gold','silver','dollar','numismatic','pcgs','ngc','loupes','loupe','album','grading','supplies','bullion']},
 {id:'denim',match:/\b(jeans?|denim|levis|levi.s|wrangler|pants|trousers)\b/i,
  topics:['shirts','denim jackets','belts','casual shoes','denim care','clothing'],
  clues:['jeans','denim','shirt','jacket','belt','shoe','clothing','boots','apparel','fashion','pants']},
 {id:'grocery',match:/\b(pizza|grocer|food|recipe|snack|ingredient|frozen meal)\b/i,
  topics:['grocery deals','pizza ingredients','cookware','snacks','kitchen tools','groceries'],
  clues:['grocery','pizza','ingredients','food','cook','kitchen','snack','recipe']},
 {id:'radio',match:/\b(antique radio|vacuum tube|shortwave|ham radio|electronics repair)\b/i,
  topics:['radio parts','vacuum tubes','electronics tools','radio kits','repair supplies','antique radios'],
  clues:['radio','parts','tube','repair','kits','electronics','solder','capacitor']},
 {id:'shopping',match:/\b(shop|shopping|product|store|marketplace|buy|sale|retail)\b/i,
  topics:['related products','shopping supplies','accessories','product comparisons','retail shops','shopping'],
  clues:['shop','product','store','supplies','accessories','retail','marketplace']}
]);
const scrub=x=>String(x||'').trim().slice(0,220);
export function httpsUrl(input){
 try {const u=new URL(String(input));const h=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||!h.includes('.')||h==='localhost'||h.endsWith('.local')||u.href.length>1800)return '';
  if(/^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h))return '';
  return u.href;
 }catch{return ''}
}
export function contextFor(hero={}){
 const text=[hero.title,hero.category,hero.description].filter(Boolean).join(' ').slice(0,600);
 if(SENSITIVE.test(text))return {id:'neutral',topics:[],clues:[],sensitive:true};
 return LANES.find(x=>x.match.test(text))||{id:'discovery',topics:[],clues:[],sensitive:false};
}
const tokenize=x=>new Set((scrub(x).toLowerCase().match(/[a-z0-9]{3,}/g)||[]).slice(0,65));
export function normalizeCandidate(raw={}){
 const id=scrub(raw.id).slice(0,110),title=scrub(raw.title);
 const url=httpsUrl(raw.url);
 if(!id||title.length<3||!url)return null;
 const type=['sponsored','published-card','website-card','shop-item'].includes(raw.type)?raw.type:'';
 if(!type)return null;
 if(type==='published-card'&&raw.status!=='approved')return null;
 if(type==='shop-item'&&raw.status!=='published')return null;
 const image=httpsUrl(raw.image);
 return {id,title,url,image,type,
  // Keep the signed/publicly validated state through later candidate ranking.
  // approvedQuickCards()/shopItems() are normalized before chooseCompanions().
  status:type==='published-card'?'approved':type==='shop-item'?'published':'',
  sponsor:type==='sponsored'?scrub(raw.sponsor)||'Advertiser':'',
  sourceId:scrub(raw.sourceId),contextTopic:scrub(raw.contextTopic),description:scrub(raw.description),
  category:scrub(raw.category),merchant:scrub(raw.merchant),price:scrub(raw.price)};
}
function relation(candidate,hero,lane){
 const text=[candidate.title,candidate.description,candidate.category,candidate.contextTopic].join(' ').toLowerCase();
 const words=tokenize(text);const clues=lane.clues||[];
 let match=0;
 for(const clue of clues){const key=clue.toLowerCase();if(words.has(key)||text.includes(key))match++;}
 if(lane.id==='discovery'||lane.id==='neutral'){
  // Generic category labels do not establish an actual merchant relationship.
  const noise=new Set(['interactive','source','website','original','brand','card','cards',
   'related','products','product','infinity','accepted','shopphi','transport',
   'environmental','systems','tactical','and','from','with']);
  const anchor=tokenize([hero.title,hero.description].join(' '));
  for(const w of anchor)if(!noise.has(w)&&words.has(w))match++;
  return Math.min(7,match)>=2?Math.min(7,match):0;
 }
 return Math.min(7,match);
}
function stable(id){let n=2166136261;for(const c of id){n=Math.imul(n^c.charCodeAt(0),16777619)}return n>>>0}
export function chooseCompanions(hero,inventory,{quantScores={},exposures={},rotation=0,slots=SLOT_COUNT}={}){
 const lane=contextFor(hero),unique=new Map();
 for(const raw of Array.isArray(inventory)?inventory:[]){
  const c=normalizeCandidate(raw);if(!c)continue;
  if(c.id===hero.id||c.sourceId===hero.id||c.url===hero.url||unique.has(c.url))continue;
  const match=relation(c,hero,lane);
  if(match===0)continue; // Unrelated high-value ads cannot buy their way in.
  const quant=Math.min(30,Math.max(0,Number(quantScores[c.id])||0));
  const count=Math.min(200,Math.max(0,Number(exposures[c.id])||0));
  const fairness=(stable(c.id+'|'+String(rotation))%11);
  const score=match*22+quant/2+fairness+(c.image?16:0)-Math.min(100,count*8);
  unique.set(c.url,{...c,score,reason:c.contextTopic||(
   lane.id==='coins'?'Useful for coin collecting':
   lane.id==='denim'?'Complements denim shopping':
   lane.id==='grocery'?'Related grocery discovery':'Related to this card')});
 }
 const sorted=[...unique.values()].sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 const selected=[],sponsors=new Set(),sourceCounts=new Map();
 for(const c of sorted){
  // QuantaPhi hosts thousands of independent published website cards on one
  // domain. Group paid ads by advertiser and organic cards by actual source,
  // not quantaphi.org or the six-slot view will collapse to two cards.
  const source=c.type==='sponsored'?('sponsor:'+c.sponsor.toLowerCase()):
   c.type==='shop-item'?('merchant:'+(c.merchant||new URL(c.url).hostname).toLowerCase()):
   ('card:'+c.sourceId);
  const limit=c.type==='sponsored'?1:c.type==='shop-item'?2:1;
  if((sourceCounts.get(source)||0)>=limit)continue;
  if(c.type==='sponsored'&&sponsors.has(source))continue;
  selected.push(c);sourceCounts.set(source,(sourceCounts.get(source)||0)+1);
  if(c.type==='sponsored')sponsors.add(source);
  if(selected.length>=Math.max(1,Math.min(6,slots)))break;
 }
 return selected;
}
export function approvedQuickCards(payload){
 return (Array.isArray(payload?.cards)?payload.cards:[]).filter(x=>x.status==='approved')
 .map(x=>normalizeCandidate({id:'quick-'+x.slug,title:x.title,description:x.description,category:x.kind,
  image:x.image,url:x.cardUrl,type:'published-card',status:x.status,sourceId:x.slug})).filter(Boolean);
}
export function shopItems(payload){
 return (Array.isArray(payload?.items)?payload.items:[]).filter(x=>x.state==='published')
 .map(x=>normalizeCandidate({id:'shop-'+x.item_id,title:x.title,description:x.description,
  image:x.image_url,url:x.source_url,merchant:x.merchant,price:x.price_label,
  type:'shop-item',status:x.state,sourceId:x.item_id,category:'Shopping'})).filter(Boolean);
}

if(typeof document!=='undefined'){
 const stage=document.getElementById('oracleCardStage');
 const deck=document.getElementById('oracleCardDeck');
 if(stage&&deck){
  const grid=document.createElement('div');grid.className='shopphi-switchboard-grid';grid.hidden=true;
  const before=document.createElement('aside');before.className='shopphi-flanks shopphi-flanks-left';before.setAttribute('aria-label','Related offers, positions one through three');
  const after=document.createElement('aside');after.className='shopphi-flanks shopphi-flanks-right';after.setAttribute('aria-label','Related offers, positions four through six');
  const heading=document.createElement('p');heading.className='shopphi-switchboard-heading';
  heading.textContent='Related source cards · ShopPhi';
  const receipt=document.createElement('p');receipt.className='shopphi-switchboard-receipt';receipt.setAttribute('role','status');
  stage.parentNode.insertBefore(heading,stage);
  stage.parentNode.insertBefore(grid,stage);
  grid.append(before,stage,after);
  grid.after(receipt);
  const navigation=document.createElement('nav');navigation.className='shopphi-flank-navigation';
  navigation.setAttribute('aria-label','Browse larger companion cards');
  const prev=document.createElement('button');prev.type='button';prev.textContent='‹ Previous';
  const position=document.createElement('span');position.className='shopphi-flank-position';
  const next=document.createElement('button');next.type='button';next.textContent='Next ›';
  const pause=document.createElement('button');pause.type='button';pause.textContent='Pause rotation';
  pause.setAttribute('aria-label','Pause automatic companion card rotation');
  navigation.append(prev,position,next,pause);
  grid.after(navigation);
  const exposure=Object.create(null),cache=new Map();
  let seq=0,rotation=0,active=null,visiblePage=0,visibleCards=[],notifiedChapter=false;
  let pageTransition=0,fadeTimer=null;
  const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
  let rotationPaused=reducedMotion;
  function showPage({fade=false}={}){
   const generation=++pageTransition;
   if(fade&&!reducedMotion&&!grid.hidden){
    grid.classList.add('shopphi-is-fading');
    clearTimeout(fadeTimer);
    fadeTimer=setTimeout(()=>{
     if(generation!==pageTransition)return;
     grid.classList.remove('shopphi-is-fading');
     showPage();
    },260);
    return;
   }
   grid.classList.remove('shopphi-is-fading');
   const start=visiblePage*2,total=visibleCards.length;
   let index=0;
   for(const card of [...before.children,...after.children]){
    card.hidden=index<start||index>=start+2;
    index++;
   }
   position.textContent=total?String(start+1)+'–'+Math.min(total,start+2)+' of '+total:'No offers';
   prev.disabled=visiblePage===0;next.disabled=start+2>=total;
   navigation.hidden=total<3;
   pause.hidden=total<3;
   pause.textContent=rotationPaused?'Resume rotation':'Pause rotation';
   pause.setAttribute('aria-label',rotationPaused?'Resume automatic companion card rotation':'Pause automatic companion card rotation');
   pause.setAttribute('aria-pressed',String(rotationPaused));
  }
  prev.addEventListener('click',()=>{visiblePage=Math.max(0,visiblePage-1);showPage({fade:true})});
  next.addEventListener('click',()=>{visiblePage=Math.min(Math.floor((visibleCards.length-1)/2),visiblePage+1);showPage({fade:true})});
  pause.addEventListener('click',()=>{
   rotationPaused=!rotationPaused;
   showPage();
  });
  // Only advance pages while the hero is on screen and no controls are in use.
  // No sponsor is charged and no coins are minted for an automatic change.
  const rotateTimer=setInterval(()=>{
   if(!active||grid.hidden)return;
   const displayed=[...before.children,...after.children].filter(node=>!node.hidden);
   const visible=displayed.some(node=>{
    const bounds=node.getBoundingClientRect();
    return bounds.bottom>0&&bounds.top<window.innerHeight;
   });
   // A single verified offer may finish its chapter too; the older pure
   // page-rotation helper still correctly returns false for 1–2 offers.
   if(!companionRotationAllowed({total:Math.max(3,visibleCards.length),visible,
    pageHidden:document.hidden,
    focused:grid.contains(document.activeElement)||navigation.contains(document.activeElement),
    shelfOpen:document.body.classList.contains('oracle-shelf-open'),
    paused:rotationPaused,reducedMotion})||!visibleCards.length||contextFor(active).sensitive)return;
   const lastPage=Math.ceil(visibleCards.length/2)-1;
   if(visiblePage>=lastPage){
    const chapter=chapterFor([active.title,active.description].join(' '));
    if(visibleCards.some(c=>c.image)&&chapter){
     window.dispatchEvent(new CustomEvent('quantaphi:showcase-chapter-complete',
      {detail:{id:active.id,chapter}}));
    }
    visiblePage=0;
   }else visiblePage=nextCompanionPage(visiblePage,visibleCards.length);
   showPage({fade:true});
  },18000);
  window.addEventListener('pagehide',()=>clearInterval(rotateTimer),{once:true});
  const span=(text,cls)=>{const el=document.createElement('span');el.className=cls;el.textContent=text;return el};
  function draw(list,lane){
   const housing=lane.id==='housing-help';
   clearTimeout(fadeTimer);pageTransition++;grid.classList.remove('shopphi-is-fading');
   grid.classList.toggle('housing-help-layout',housing);
   heading.textContent=housing?'Housing help · related resources':'Related source cards · ShopPhi';
   before.replaceChildren();after.replaceChildren();
   const visible=list.slice(0,SLOT_COUNT);visibleCards=visible;
   grid.classList.toggle('shopphi-showcase-mode',!housing&&!lane.sensitive&&visible.some(c=>c.image)&&
    ['cookout','movie-night','kitchen','family','tools','outdoors','coins','denim','grocery','shopping'].includes(lane.id));
   visiblePage=Math.min(visiblePage,Math.max(0,Math.ceil(visible.length/2)-1));
   if(!visible.length){
    // The original Oracle stage lives INSIDE grid. Never hide the hero merely
    // because the companion inventory is empty or its network is unavailable.
    grid.hidden=false;heading.hidden=true;navigation.hidden=true;
    receipt.hidden=false;
    receipt.textContent='No verified companion offers available for this card right now. Its original links and controls still work.';
    return;
   }
   grid.hidden=false;heading.hidden=false;
   for(let i=0;i<visible.length;i++){
    const parent=i<3?before:after,c=visible[i];
    if(housing&&housingResource(c.id)){
     const card=createHousingHelpCard(c);card.classList.add('shopphi-flank');parent.append(card);continue;
    }
    const link=document.createElement('a');link.className='shopphi-flank';link.href=c.url;
    const internal=new URL(c.url).hostname===location.hostname;
    link.target=internal?'_self':'_blank';
    link.rel=c.type==='sponsored'?'noopener noreferrer sponsored':'noopener noreferrer';
    link.setAttribute('aria-label',(c.type==='sponsored'?'Sponsored: ':'Open related card: ')+c.title);
    const tag=c.type==='sponsored'?'SPONSORED':c.type==='shop-item'?'SHOP PHI PRODUCT':'INDEPENDENT SOURCE CARD';
    link.append(span(tag,'shopphi-flank-tag'));
    const art=document.createElement('div');art.className='shopphi-flank-visual';
    if(c.image){
     const img=document.createElement('img');img.src=c.image;img.alt=c.title+' source photograph or artwork';
     img.loading='lazy';img.referrerPolicy='no-referrer';
     img.addEventListener('error',()=>{img.remove();art.classList.add('shopphi-flank-no-photo');
      art.replaceChildren(span(c.merchant||new URL(c.url).hostname.replace(/^www\./,''),'shopphi-flank-brand'),
       span('Source image unavailable · open the card','shopphi-flank-visual-note'));
     },{once:true});art.append(img);
    }else{
     art.classList.add('shopphi-flank-no-photo');
     art.append(span(c.merchant||c.title,'shopphi-flank-brand'),
      span('Explore the original source','shopphi-flank-visual-note'));
    }
    link.append(art,span(c.title,'shopphi-flank-title'));
    if(c.price&&c.type==='shop-item')link.append(span(c.price,'shopphi-flank-price'));
    if(c.reason)link.append(span(c.reason,'shopphi-flank-reason'));
    link.append(span(internal?'Open interactive Quick Card →':'Open original offer →','shopphi-flank-cta'));
    link.addEventListener('click',()=>{ // Local rank rotation only; never financial or viewability reporting.
     exposure[c.id]=Math.min(200,(exposure[c.id]||0)+1);
    });
    parent.append(link);
    // A candidate being chosen isn't a paid impression, conversion or reward.
    exposure[c.id]=Math.min(200,(exposure[c.id]||0)+1);
   }
   showPage();
   heading.hidden=false;receipt.hidden=false;
   const sponsored=visible.filter(c=>c.type==='sponsored').length;
   receipt.textContent=housing?'Six Infinity-branded community help cards. Unpaid resources; service areas and current funding must be confirmed with each provider.':visible.length+' related, working card links · '+sponsored+
    ' verified sponsored offers · '+(visible.length-sponsored)+' independent source cards.'+
    (lane.sensitive?' Personalized advertising disabled for this category.':'');
  }
  function siteCards(){
   const result=[];
   for(const node of document.querySelectorAll('#siteQuickCards .iqc-card[data-source-id], #premiumSourceCards .iqc-card[data-source-id], #brandProductCards .iqc-card[data-source-id], #verifiedBrandSportsCards .iqc-card[data-source-id], #infinityAcceptedCards .iqc-card[data-source-id]')){
    if(node.dataset.sourceReady!=='true'||node.hidden)continue;
    const id=node.dataset.sourceId;
    if(!/^[a-z0-9-]{2,100}$/.test(id||''))continue;
    const source=node.querySelector('a[href^="https://"]');
    if(!httpsUrl(source?.href))continue;
    const title=node.dataset.sourceName||node.querySelector('h3')?.textContent||'';
    const image=node.querySelector('.premium-selected img, .iqc-media img, .iqc-card-art img, img[src]')?.getAttribute('src')||'';
    let actualImage='';try{actualImage=httpsUrl(new URL(image,location.href).href)}catch{}
    const c=normalizeCandidate({id:'site-'+id,sourceId:id,title,url:'https://quantaphi.org/?card=source-'+encodeURIComponent(id),
     image:actualImage,type:'website-card',category:node.querySelector('.iqc-kind')?.textContent||'',
     description:node.textContent?.slice(0,220),merchant:node.dataset.sourceName||title});
    if(c)result.push(c);
   }
   return result;
  }
  // A new provider bank may mount after the first async fetch; refresh the
  // visible companions as soon as real registered source cards arrive.
  window.addEventListener('quantaphi:source-cards-ready',()=>{
   // Inventory fetched too early cannot mask newly mounted real source cards.
   cache.clear();
   if(active)void update(active).catch(()=>{});
  });
  window.addEventListener('load',()=>{
   // Control Phi (the real AdPhi provider) can initialize after our module.
   // Retry at full page readiness rather than cache an empty sponsored feed.
   cache.clear();
   if(active)void update(active).catch(()=>{});
  });
  async function inventory(lane){
   const key=lane.id,prior=cache.get(key);
   if(prior&&Date.now()-prior.time<60000)return prior.cards;
   const calls=[fetch('/api/quick-cards?limit=24',{credentials:'omit',cache:'no-store'}).then(r=>r.ok?r.json():null)
    .then(approvedQuickCards).catch(()=>[])];
   const config=window.ShopAdPhiConfig;
   // Catalog remains owner-controlled: only public read, and only when the real site/card is configured.
   if(config&&/^[A-Za-z0-9_-]{1,80}$/.test(config.siteId||'')&&/^[A-Za-z0-9_-]{1,80}$/.test(config.instanceId||'')&&
    /^\/[A-Za-z0-9/_-]*$/.test(config.apiBase||'')){
    const url=config.apiBase.replace(/\/$/,'')+'/public/sites/'+config.siteId+'/cards/'+config.instanceId+'/shop';
    calls.push(fetch(url,{credentials:'omit',cache:'no-store'}).then(r=>r.ok?r.json():null).then(shopItems).catch(()=>[]));
   }
   if(!lane.sensitive&&typeof window.ControlPhi?.requestSponsoredCard==='function'){
    for(let i=0;i<lane.topics.length;i++){
     const topic=lane.topics[i];
     calls.push(Promise.resolve().then(()=>window.ControlPhi.requestSponsoredCard(topic,'shopphi-flank-'+(i+1)))
      .then(ad=>ad?normalizeCandidate({id:'ad-'+(ad.id||ad.campaignId||topic+'-'+ad.destinationUrl),
       title:ad.title,description:ad.body,url:ad.destinationUrl,image:ad.imageUrl,
       sponsor:ad.advertiser,type:'sponsored',contextTopic:topic}):null)
      .then(x=>x?[x]:[]).catch(()=>[]));
    }
   }
   const data=await Promise.all(calls);
   const cards=data.flat().concat(siteCards());
   cache.set(key,{time:Date.now(),cards});
   return cards;
  }
  function detailFromStage(){
   if(!stage.dataset.switchboardId)return null;
   return {id:stage.dataset.switchboardId,title:stage.dataset.switchboardTitle,
    category:stage.dataset.switchboardCategory,tab:stage.dataset.switchboardTab,
    description:stage.dataset.switchboardDescription||''};
  }
  async function update(detail){
   const revision=++seq;const changed=(detail?.id||null)!==(active?.id||null);
   active=detail||null;if(changed){visiblePage=0;notifiedChapter=false;}
   if(!active||document.body.classList.contains('oracle-shelf-open')){
    grid.hidden=true;heading.hidden=true;receipt.hidden=true;navigation.hidden=true;
    before.replaceChildren();after.replaceChildren();return;
   }
   if(changed){grid.hidden=false;heading.hidden=true;navigation.hidden=true;receipt.hidden=false;
    before.replaceChildren();after.replaceChildren();}
   const lane=contextFor(active);
   // Explicit housing help uses fixed public resources. Never send disability,
   // benefit income, or other intake answers to advertising or Quant services.
   if(active.id==='disability-housing'){
    draw(housingCompanions(),{id:'housing-help',sensitive:true});return;
   }
   if(changed)receipt.textContent='Checking approved Quick Cards and live AdPhi offers…';
   const candidates=await inventory(lane);
   if(revision!==seq)return;
   const all=candidates.concat(siteCards());
   // Only a signed-in For You selection can read existing bounded Quant card weights.
   const quant=active.tab==='for-you'?await loadOwnQuantScores(window.QuantaCloudConnection,
    all.map(c=>({id:c.id,name:c.title,category:c.category,feature:c.description,study:c.contextTopic}))):
    {connected:false,scores:{}};
   if(revision!==seq)return;
   const result=chooseCompanions(active,all,{quantScores:quant.scores,exposures:exposure,rotation:rotation++});
   draw(result,lane);
  }
  window.addEventListener('quantaphi:switchboard-change',e=>{void update(e.detail).catch(()=>{
   if(active){grid.hidden=false;navigation.hidden=true;before.replaceChildren();after.replaceChildren();
    receipt.textContent='Companion offers are temporarily unavailable. Original Quick Card is still usable.';}
  })});
  // The deck may have selected its first card before this module finished loading.
  void update(detailFromStage());
 }
}
