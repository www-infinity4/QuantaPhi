import {mountCardActions} from './quanta-card-actions.mjs';

/* Incremental, original-source art-card factory.
 * Art Institute of Chicago's documented public API/IIIF URLs; only records
 * marked public domain AND containing source image metadata are displayed.
 * 1000 is a maximum catalog target, not a claim that unqueried items exist.
 * No artwork is represented as for sale and no invented valuation is shown.
 */
export const ART_CARD_TARGET=1000;
export const ART_PAGE_SIZE=100;
export const ART_SOURCE='https://api.artic.edu/api/v1/artworks/search';
const FIELDS='id,title,artist_title,artist_display,date_display,image_id,is_public_domain,medium_display';
const safeImageId=s=>typeof s==='string'&&/^[a-zA-Z0-9-]{8,80}$/.test(s);
const cleaned=s=>String(s||'').replace(/<[^>]*>/g,'').trim().slice(0,200);
export function normalizeArtwork(row,base='https://www.artic.edu/iiif/2'){
 if(!row||!Number.isSafeInteger(row.id)||row.id<=0||row.is_public_domain!==true||!safeImageId(row.image_id))return null;
 const title=cleaned(row.title),artist=cleaned(row.artist_title)||'Artist not listed';
 if(!title)return null;
 let imageBase;
 try{const x=new URL(base);if(x.protocol!=='https:'||x.hostname!=='www.artic.edu')return null;imageBase=x.href.replace(/\/$/,'')}catch{return null}
 const id='aic-'+row.id;
 return Object.freeze({id,name:title,artist,date:cleaned(row.date_display),
  medium:cleaned(row.medium_display),category:'Art · Public domain',
  feature:'Explore this museum artwork, artist and related research',
  image:imageBase+'/'+row.image_id+'/full/843,/0/default.jpg',
  url:'https://www.artic.edu/artworks/'+row.id,
  origin:'Art Institute of Chicago',imageRights:'Public domain per museum record'});
}
export function museumPageUrl(page){
 if(!Number.isInteger(page)||page<1||page>100)return null;
 const url=new URL(ART_SOURCE);
 url.searchParams.set('page',String(page));
 url.searchParams.set('limit',String(ART_PAGE_SIZE));
 url.searchParams.set('fields',FIELDS);
 url.searchParams.set('query[term][is_public_domain]','true');
 return url.href;
}
function element(tag,cls,label){
 const e=document.createElement(tag);if(cls)e.className=cls;
 if(label!==undefined)e.textContent=label;
 return e;
}
function external(label,url,cls=''){
 const a=element('a',cls,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function originalSearch(label,query,cls){
 const url='https://www.google.com/search?'+new URLSearchParams({q:query});
 return external(label,url,cls);
}
export function createMuseumCard(art){
 if(!art||!/^aic-\d+$/.test(art.id))throw Error('invalid_museum_art_card');
 const card=element('article','iqc-card aic-art-card');
 card.dataset.sourceId=art.id;card.dataset.sourceName=art.name+' · '+art.artist;
 card.dataset.sourceReady='true';card.dataset.category='Art';card.dataset.sourceProvider='Art Institute of Chicago';
 const photoLink=external('',art.url,'aic-picture');
 photoLink.setAttribute('aria-label','Open museum record for '+art.name);
 const img=element('img','aic-art-image');img.src=art.image;img.alt=art.name+' by '+art.artist;
 img.loading='lazy';img.decoding='async';img.referrerPolicy='strict-origin-when-cross-origin';
 img.addEventListener('error',()=>{
  // Broken source images are never replaced with an unrelated stock photo.
  card.dataset.sourceReady='false';card.remove();
  window.dispatchEvent(new Event('quantaphi:source-cards-ready'));
 },{once:true});
 photoLink.append(img);
 const meta=element('div','aic-meta');
 meta.append(element('span','aic-label','ART INSTITUTE OF CHICAGO · PUBLIC DOMAIN'),
  element('h3','aic-title',art.name),element('p','aic-artist',art.artist),
  element('p','aic-details',[art.date,art.medium].filter(Boolean).join(' · ')));
 const explore=element('div','aic-explore');
 explore.append(
  originalSearch('Images',art.name+' '+art.artist+' art images','aic-research'),
  originalSearch('History',art.name+' '+art.artist+' art history','aic-research'),
  originalSearch('Market',art.name+' '+art.artist+' auction results','aic-research')
 );
 const disclosure=element('p','aic-disclosure','Museum collection, not a sale listing. Market-search links do not establish an appraisal or offer.');
 const actions=element('div','aic-actions');
 mountCardActions(actions,{
  id:art.id,name:art.name+' · '+art.artist,category:art.category,
  featureUrl:art.url,official:art.url,url:art.url,
  route:'/?card='+encodeURIComponent(art.id)
 },{showSearch:false});
 meta.append(explore,external('View the original museum record',art.url,'aic-museum-link'),disclosure,actions);
 card.append(photoLink,meta);return card;
}
export async function loadMuseumPage(page,request=fetch){
 const url=museumPageUrl(page);
 if(!url)throw Error('invalid_art_page');
 const result=await request(url,{credentials:'omit',cache:'default'});
 if(!result.ok)throw Error('museum_api_unavailable');
 const data=await result.json();
 const base=data?.config?.iiif_url||'https://www.artic.edu/iiif/2';
 const rows=Array.isArray(data?.data)?data.data:[];
 return rows.map(row=>normalizeArtwork(row,base)).filter(Boolean);
}
function mountMuseumCollection(){
 const bank=document.getElementById('premiumSourceCards');
 if(!bank||bank.dataset.aicMounted==='true')return;
 bank.dataset.aicMounted='true';
 const registry=new Set();
 let page=0,busy=false,more=true,lastRequest=0;
 const control=element('article','iqc-card aic-loader-card');
 const intro=element('h2','aic-loader-title','Art studios · museum originals');
 const note=element('p','aic-loader-note','Explore actual public-domain artwork, sourced images and artist records. Each discovered artwork becomes its own interactive rotating card.');
 const status=element('p','aic-loader-status','Source-backed artwork catalog ready to discover.');
 status.setAttribute('role','status');
 const button=element('button','aic-load-button','Discover museum artworks');
 button.type='button';
 const visit=external('Museum collection','https://www.artic.edu/collection','aic-museum-link');
 control.append(intro,note,button,visit,status);
 // The load control itself is not an artwork card and is never counted as one.
 bank.append(control);
 const done=()=>registry.size>=ART_CARD_TARGET||page>=100||!more;
 async function loadNext(){
  if(busy||done())return;
  busy=true;button.disabled=true;status.textContent='Checking official museum artwork and images…';
  try{
   // Follow museum guidance: no concurrent fetching and <=1 new page/second.
   const cooldown=Math.max(0,1000-(Date.now()-lastRequest));
   if(cooldown)await new Promise(resolve=>setTimeout(resolve,cooldown));
   lastRequest=Date.now();
   const items=await loadMuseumPage(page+1);
   page++;
   if(!items.length)more=false;
   let added=0;
   const nodes=[];
   for(const art of items){
    if(registry.size>=ART_CARD_TARGET)break;
    if(registry.has(art.id))continue;
    registry.add(art.id);nodes.push(createMuseumCard(art));added++;
   }
   if(nodes.length)control.before(...nodes);
   if(added)window.dispatchEvent(new CustomEvent('quantaphi:source-cards-ready',{
    detail:{source:'art-institute',count:added,total:registry.size}
   }));
   status.textContent=registry.size+' source-backed artwork cards loaded · '+page+' museum page'+(page===1?'':'s')+' checked.';
   if(done()){button.disabled=true;button.textContent='Collection batch complete';}
   else button.textContent='Discover more artworks';
  }catch{
   status.textContent='Museum data is unavailable. The existing cards still work. Retry for additional artwork.';
  }finally{busy=false;if(!done())button.disabled=false;}
 }
 button.addEventListener('click',()=>{void loadNext()});
 // Load only one page initially. On older Android devices never flood the DOM
 // with 1000 images or make uncontrolled background API requests.
 void loadNext();
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountMuseumCollection,{once:true});
 else mountMuseumCollection();
}
