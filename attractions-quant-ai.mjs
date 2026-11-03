/* Quant AI attractions: transparent, anonymous recommendation from public D1.
 * This is an on-device discovery ranker, NOT authenticated Quant-AI wallet
 * matching, and never infers somebody's private purchases or location. */
import {mountCardActions} from './quanta-card-actions.mjs?v=20261031-heritage-signin1';
const API='https://quantaphi-attractions-directory.marvaseater.workers.dev';
const STATES=new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
const TAGS=Object.freeze({
 glacier:{glacier:44,national_park:16,scenic_lookout:13},
 history:{historic_site:46,history_museum:45,museum:33,visitor_center:10},
 wildlife:{wildlife_viewing:50,wildlife_refuge:46,national_park:18},
 hiking:{nature_trail:50,hiking_area:50,national_park:22,glacier:18},
 museum:{museum:45,history_museum:45,historic_site:30,visitor_center:9},
 parks:{national_park:45,state_park:42,park:40,visitor_center:16}
});
const safeSite=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.hostname.includes('.')?u.href:''}catch{return ''}};
const create=(tag,cls,label)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(label!==undefined)e.textContent=label;return e};
export const interestTags=raw=>[...new Set((Array.isArray(raw)?raw:[raw]).flatMap(x=>String(x||'').toLowerCase().split(/[^a-z]+/)).filter(x=>Object.hasOwn(TAGS,x)))].slice(0,3);
export function attractionSourceId(item){
 const id=String(item?.id||'');
 if(!STATES.has(item?.state)||!/^(?:curated:[a-z][a-z0-9-]{8,100}|overture:[a-zA-Z0-9-]{10,100})$/.test(id))return null;
 let hash=2166136261;
 for(const c of id)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
 return 'attraction-'+String(item?.state||'').toLowerCase()+'-'+hash.toString(36).padStart(7,'0');
}
export function rankAttractions(items,{interests=[],seen=[],limit=8}={}){
 const tags=interestTags(interests);
 const ignored=new Set(Array.isArray(seen)?seen:[]);
 const unique=new Set();
 const rows=(Array.isArray(items)?items:[]).filter(x=>{
  if(!x||!STATES.has(x.state)||!x.name||!safeSite(x.source_url)||!x.license||
    !attractionSourceId(x)||unique.has(x.id))return false;
  unique.add(x.id);return true;
 });
 const score=row=>{
  const base=Math.round(Math.max(0,Math.min(1,Number(row.confidence)||0))*10);
  const boost=tags.reduce((n,t)=>n+(TAGS[t][row.category]||0),0);
  return base+boost-(ignored.has(row.id)?22:0);
 };
 const ordered=rows.sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));
 const selected=[],remaining=[...ordered],categories=new Set();
 const cap=Math.max(0,Math.min(12,Number.isFinite(limit)?Math.floor(limit):8));
 // A public recommender should not give one business/category all exposures.
 while(remaining.length&&selected.length<cap){
  let index=remaining.findIndex(row=>!categories.has(row.category));
  if(index<0){categories.clear();index=0}
  const [row]=remaining.splice(index,1);
  selected.push({...row,match_reason:tags.length?
   ('Matched your selected '+tags.join(' / ')+' interests'):'Source-backed public attraction; no personal profile used'});
  categories.add(row.category);
 }
 return selected;
}
const directions=row=>{
 const url=new URL('https://www.google.com/maps/search/?api=1');
 url.searchParams.set('query',[row.name,row.address||row.city,row.state].filter(Boolean).join(', '));
 return url.href;
};
const anchor=(parent,label,url)=>{
 const href=safeSite(url);if(!href)return;
 const a=create('a','ad-rec-source-link',label);a.href=href;a.rel='noopener noreferrer';a.target='_blank';parent.append(a);
};
export function makeAttractionCard(row,reason){
 if(typeof document==='undefined'||!attractionSourceId(row))return null;
 const id=attractionSourceId(row);
 const art=create('article','iqc-card premium-card ad-rec-card');
 art.dataset.sourceId=id;art.dataset.sourceReady='true';art.dataset.sourceName=row.name;
 art.dataset.official=safeSite(row.website)||safeSite(row.source_url);
 art.dataset.sourceCategory='Travel & adventure';
 art.dataset.sourceQuery=[row.name,row.city,row.category].join(' ');
 const type=create('p','iqc-kind','QUANT AI · VERIFIED '+row.state+' ATTRACTION');
 const title=create('h3','ad-rec-title',row.name);
 const category=create('p','ad-rec-category',(row.category||'Attraction').replaceAll('_',' ')+' · '+[row.city,row.state].filter(Boolean).join(', '));
 const visual=create('div','ad-rec-media');
 const photo=safeSite(row.image_url);
 if(photo&&row.image_attribution){
  const img=create('img');img.src=photo;img.alt=row.name+' · source-attributed landscape';img.loading='lazy';img.referrerPolicy='no-referrer';
  img.addEventListener('error',()=>{visual.replaceChildren(create('p','ad-rec-fallback','Photograph unavailable · See official visitor photos'))},{once:true});
  visual.append(img,create('small','ad-rec-credit',row.image_attribution));
 }else visual.append(create('p','ad-rec-fallback','View original destination photography and visitor details at the official source.'));
 const body=create('div','ad-rec-body');
 const reasonText=create('p','ad-rec-match',reason||'Independent, source-backed public recommendation');
 const links=create('nav','ad-rec-links');links.setAttribute('aria-label',row.name+' visitor actions');
 if(safeSite(row.website))anchor(links,'Original visitor site',row.website);
 else anchor(links,'Source listing',row.source_url);
 anchor(links,'Directions',directions(row));
 anchor(links,'Verified source',row.source_url);
 const notice=create('p','ad-rec-disclosure','Location may be approximate · Check official access, seasonal closures and availability. No paid placement.');
 const controls=create('div','ad-rec-actions');
 mountCardActions(controls,{
  id,name:row.name,category:'Travel & adventure',official:row.website||row.source_url,
  featureUrl:row.website||row.source_url,route:'/?card='+encodeURIComponent(id),
  description:row.name+' in '+row.state+' · public, source-backed travel discovery'
 });
 body.append(type,title,category,reasonText,links,notice,controls);
 art.append(visual,body);
 return art;
}
const MAX_SOURCE_CARDS=12;
export function mountAttractionCards(bank,items,{interests=[],limit=8}={}){
 if(!bank||typeof document==='undefined')return 0;
 let mounted=bank.querySelectorAll('.ad-rec-card[data-source-id]').length;
 let count=0;
 for(const row of rankAttractions(items,{interests,limit})){
  if(mounted>=MAX_SOURCE_CARDS)break;
  const id=attractionSourceId(row);
  if(!id||bank.querySelector('[data-source-id="'+id+'"]'))continue;
  const card=makeAttractionCard(row,row.match_reason);
  if(card){bank.append(card);count++;mounted++}
 }
 if(count)window.dispatchEvent(new Event('quantaphi:source-cards-ready'));
 return count;
}
// A small, bounded Alaska card launch on load; additional states are sourced
// through the existing directory search. No bulk DOM rendering or profile sync.
async function start(){
 const bank=document.getElementById('premiumSourceCards');if(!bank)return;
 const chosen=new URLSearchParams(location.search).get('interest')||'';
 const interests=interestTags(chosen);
 try{
  const res=await fetch(API+'/api/attractions/feed?state=AK&page=0',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!res.ok)return;
  const payload=await res.json();
  if(!Array.isArray(payload.items)||payload.state!=='AK')return;
  mountAttractionCards(bank,payload.items,{interests,limit:8});
 }catch{}
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void start()},{once:true});
 else void start();
}
