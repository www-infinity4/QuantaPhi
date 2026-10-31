/* Public listings from explicitly followed original source cards.
 * Never claim a third-party login exposes a private feed or bid permissions. */
import {fetchSpotlights,publicImageUrl,sourceUrl} from './quick-card-spotlights.mjs?v=20261031-source-ad-first1';

const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
const safeId=value=>typeof value==='string'&&/^[a-z0-9-]{1,70}$/.test(value);
const safeText=(value,max=200)=>String(value||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,max);
const safeProfile=profile=>{
 if(!safeId(profile?.id))return null;
 try{
  const url=new URL(profile.official);if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  return {...profile,name:safeText(profile.name,100)||profile.id,query:safeText(profile.query||profile.name,100),official:url.href};
 }catch{return null;}
};
export function followedPublisherProfiles(following,profiles){
 const allowed=new Set((Array.isArray(following)?following:[]).filter(safeId));
 const seen=new Set();
 return (Array.isArray(profiles)?profiles:[]).map(safeProfile).filter(x=>{
  if(!x||!allowed.has(x.id)||seen.has(x.id))return false;
  seen.add(x.id);return true;
 });
}
export function selectFollowedSourceItems(following,profiles,resultsById){
 const items=[],seen=new Set();
 for(const card of followedPublisherProfiles(following,profiles)){
  const rows=Array.isArray(resultsById?.[card.id])?resultsById[card.id]:[];
  for(const row of rows.slice(0,12)){
   const url=sourceUrl(row?.url,card.official),image=publicImageUrl(row?.image),title=safeText(row?.title,180);
   if(!url||!image||!title||seen.has(url))continue;
   seen.add(url);
   items.push({
    publisherId:card.id,publisher:card.name,title,url,image,
    description:safeText(row?.description,280),
    checkedAt:Number.isFinite(Date.parse(row?.checked_at))?row.checked_at:'',
    kind:row.kind==='Product'?'Product':'Publisher listing',
    price:typeof row.price==='string'&&/^[$€£][0-9,]+(?:\.[0-9]{2})?$/.test(row.price)?row.price:'',
    sponsored:false,authenticated:false
   });
  }
 }
 return items.slice(0,36);
}
function offerCard(item){
 const article=el('article','ofp-item');
 const photo=el('img','ofp-photo');photo.alt=item.title;photo.loading='lazy';photo.referrerPolicy='no-referrer';
 photo.addEventListener('error',()=>{photo.remove();article.classList.add('ofp-no-photo')},{once:true});photo.src=item.image;
 const info=el('div','ofp-info'),source=el('p','ofp-source',item.publisher+' · '+item.kind);
 const h=el('h4','ofp-title',item.title),description=el('p','ofp-description',item.description);
 const foot=el('p','ofp-disclosure','Original publisher listing · not a paid Infinity advertisement');
 const actions=el('div','ofp-actions');
 const visit=el('a','ofp-action','View original listing ↗');visit.href=item.url;visit.target='_blank';visit.rel='noopener noreferrer';
 const own=el('a','ofp-action','Open Infinity Quick Card');own.href='/?card='+encodeURIComponent(item.publisherId);
 actions.append(visit,own);info.append(source,h);
 if(item.price)info.append(el('p','ofp-price',item.price+' · source price'));
 if(item.description)info.append(description);
 info.append(actions,foot);article.append(photo,info);return article;
}
function unavailableRow(card){
 const article=el('div','ofp-unavailable');
 const social=/^(Social|Community|Messaging|Video|News|Music|TV)/i.test(card.category||'');
 const line=el('span','',card.name+(social?' · source posts require an authorized public feed':' · no verified listings to show right now'));
 const link=el('a','ofp-action','Open Quick Card');link.href='/?card='+encodeURIComponent(card.id);
 article.append(line,link);return article;
}
export function mountFollowingPublisherFeed(host,{getProfiles,getFollowing}={}){
 if(!host)return null;
 const body=el('div','ofp-items'),status=el('p','ofp-status');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const notice=el('p','ofp-note','Only sources you follow. Public publisher listings are shown independently; signing in at Heritage or another site does not connect private account data to Infinity.');
 host.append(status,body,notice);
 let selected=false,revision=0,shown=8,lastKey='',records={},pending=new Set();
 const more=el('button','ofp-more','Show more followed sources');more.type='button';host.append(more);
 const candidates=()=>typeof getProfiles==='function'?getProfiles():[];
 const follows=()=>typeof getFollowing==='function'?getFollowing():[];
 function paint(){
  if(!selected)return;
  const profiles=followedPublisherProfiles(follows(),candidates()),limited=profiles.slice(0,shown);
  const items=selectFollowedSourceItems(follows(),limited,records);
  body.replaceChildren();
  for(const item of items)body.append(offerCard(item));
  for(const profile of limited.filter(p=>!items.some(item=>item.publisherId===p.id)))body.append(unavailableRow(profile));
  status.textContent=!profiles.length?'Follow auction houses, brands or social Quick Cards to fill your feed.':
    items.length?items.length+' verified publisher listings from your followed sources.':
    'No verified new publisher photographs are available. Your followed Quick Cards remain accessible.';
  more.hidden=profiles.length<=shown;
 }
 async function refresh(){
  if(!selected)return;
  const profiles=followedPublisherProfiles(follows(),candidates()).slice(0,shown);
  const key=profiles.map(x=>x.id).join('|');
  if(key!==lastKey){lastKey=key;paint();}
  const canRead=card=>!/^(Social|Community|Messaging|AI|Karaoke|TV|News|Video)/i.test(card.category||'');
  const missing=profiles.filter(p=>canRead(p)&&!Object.hasOwn(records,p.id)&&!pending.has(p.id));
  if(!missing.length)return;
  // Bound network reads to followed public sources only; never forward cookies.
  await Promise.allSettled(missing.map(async card=>{
   pending.add(card.id);
   try{records[card.id]=await fetchSpotlights(card);}
   catch{records[card.id]=[];}
   finally{pending.delete(card.id);}
  }));
  if(selected)paint();
 }
 more.addEventListener('click',()=>{shown=Math.min(800,shown+8);void refresh();});
 return {
  sync({tab}={}){
   selected=tab==='following';host.hidden=!selected;revision++;
   if(selected){paint();void refresh();}
  }
 };
}
