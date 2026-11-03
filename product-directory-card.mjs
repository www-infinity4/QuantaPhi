/* One original interactive Oracle Quick Card backed by the public Cloudflare catalog.
 * Directory listings are not sponsored advertising or real-time merchandise offers. */
import {CATALOG_ENDPOINT,departments,requestPath,readBrands,readCollections,chooseBrand} from './product-directory-core.mjs';
const root=document.getElementById('productDirectoryCard');
if(root){
 const el=(tag,cls,copy)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(copy!==undefined)node.textContent=copy;return node};
 const action=text=>{const b=el('button','qpd-button',text);b.type='button';return b};
 const anchor=title=>{const a=el('a','qpd-link',title);a.target='_blank';a.rel='noopener noreferrer';return a};
 root.classList.add('qpd-card');root.dataset.personalization='disabled';root.replaceChildren();
 const head=el('header','qpd-head');
 head.append(el('small','qpd-tag','INFINITY® · VERIFIED BRAND DIRECTORY'),el('h2','qpd-heading','Discover real brands and products'),el('p','qpd-intro','Original-source brand listings. Current photos, prices, inventory and paid offers appear only when separately verified.'));
 const filters=el('div','qpd-filters'),label=el('label','qpd-filter-label','Choose department');
 const select=el('select','qpd-select');select.setAttribute('aria-label','Quick Card merchandise department');
 departments.forEach(d=>{const opt=el('option','',d==='Mixed'?'Mixed · all ages':d);opt.value=d;select.append(opt)});
 label.append(select);
 const search=el('input','qpd-search');search.type='search';search.placeholder='Find a brand in this department';search.maxLength=70;search.setAttribute('aria-label','Filter currently loaded brands');
 const reload=action('Refresh sources');filters.append(label,search,reload);
 const visual=el('div','qpd-art');visual.setAttribute('role','img');visual.setAttribute('aria-label','Independent illustrative brand-directory artwork, not photographs of merchandise');
 for(const symbol of ['◈','◇','✧'])visual.append(el('span','qpd-art-shape',symbol));
 const panel=el('article','qpd-panel'),meta=el('div','qpd-meta');
 const logo=el('img','qpd-favicon');logo.alt='';logo.hidden=true;logo.loading='lazy';logo.referrerPolicy='no-referrer';logo.addEventListener('error',()=>{logo.hidden=true});
 const name=el('h3','qpd-name','Choose a department');meta.append(logo,name);
 const type=el('p','qpd-category'),summary=el('p','qpd-summary'),source=el('p','qpd-source'),links=el('div','qpd-links'),details=el('div','qpd-collections');
 const visit=anchor('Explore official website');links.append(visit);panel.append(meta,type,summary,source,links,details);
 const nav=el('div','qpd-nav'),previous=action('‹ Previous brand'),next=action('Next brand ›'),count=el('span','qpd-count','0 of 0');nav.append(previous,count,next);
 const pageNav=el('div','qpd-pagination'),pageBack=action('← Earlier page'),pageNext=action('More brands →');pageNav.append(pageBack,pageNext);
 const status=el('p','qpd-status','Loading source-backed brands…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 root.append(head,filters,visual,status,panel,nav,pageNav,el('p','qpd-fine','Independent directory · No paid placement, store account access or in-card checkout.'));
 let department='Mixed',page=0,index=0,rows=[],shown=[],seq=0,detailSeq=0,lastPageSize=0,lastBrand='',collectionsCache=new Map();
 const applyFilter=()=>{
  const query=search.value.trim().toLocaleLowerCase();
  shown=rows.filter(r=>!query||[r.name,r.description,r.primary_shelf].join(' ').toLocaleLowerCase().includes(query));
  if(index>=shown.length)index=0;render();
 };
 const render=()=>{
  const brand=chooseBrand(shown,index,0);
  panel.hidden=!brand;nav.hidden=!brand;pageNav.hidden=rows.length===0&&!page;
  previous.disabled=next.disabled=shown.length<=1;pageBack.disabled=page===0;pageNext.disabled=lastPageSize<24;
  count.textContent=brand?`${index+1} of ${shown.length} · page ${page+1}`:'0 brands';
  if(!brand){lastBrand='';status.textContent=rows.length?'No brands match your search. Clear the filter to continue.':'No verified brands in this department at this time.';return;}
  name.textContent=brand.name;type.textContent=`${brand.primary_department} / ${brand.primary_shelf}`;
  summary.textContent=brand.description||'Explore original publisher details and verify current offerings there.';
  source.textContent=`Source checked: ${brand.source_checked_at} · Independent listing`;visit.href=brand.official_url;
  logo.hidden=false;logo.src=new URL('/favicon.ico',brand.official_url).href;
  status.textContent=`Showing ${shown.length} independently sourced brand${shown.length===1?'':'s'} in ${department}.`;
  if(lastBrand===brand.brand_id)return;lastBrand=brand.brand_id;
  details.replaceChildren();const mine=++detailSeq;
  const addCollections=collections=>collections.slice(0,4).forEach(c=>{const a=anchor(c.title);a.href=c.source_url;details.append(a)});
  if(collectionsCache.has(brand.brand_id)){addCollections(collectionsCache.get(brand.brand_id));return;}
  fetch(`${CATALOG_ENDPOINT}/v1/collections?brand=${encodeURIComponent(brand.brand_id)}&limit=8`,{credentials:'omit',cache:'no-store',headers:{Accept:'application/json'}})
   .then(r=>r.ok?r.json():Promise.reject(Error('collections_unavailable')))
   .then(data=>{if(mine!==detailSeq)return;const collections=readCollections(data,brand.brand_id);collectionsCache.set(brand.brand_id,collections);addCollections(collections);})
   .catch(()=>{if(mine===detailSeq)details.replaceChildren()});
 };
 const load=async()=>{
  const path=requestPath(department,page);if(!path)return;
  const mine=++seq;detailSeq++;lastBrand='';panel.hidden=true;nav.hidden=true;pageNav.hidden=true;
  status.textContent='Checking the current Cloudflare brand directory…';reload.disabled=true;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);
  try{
   const response=await fetch(CATALOG_ENDPOINT+path,{credentials:'omit',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('catalog_not_available');
   const payload=await response.json();if(!Array.isArray(payload?.data))throw Error('invalid_source_feed');
   if(mine!==seq)return;
   lastPageSize=payload.data.length;rows=readBrands(payload,department);index=0;applyFilter();
  }catch(e){if(mine!==seq)return;rows=[];shown=[];lastPageSize=0;panel.hidden=true;pageNav.hidden=page===0;status.textContent='The source feed is unavailable. Use Refresh sources to retry; no placeholder inventory is shown.';}
  finally{clearTimeout(timeout);if(mine===seq)reload.disabled=false;}
 };
 select.addEventListener('change',()=>{department=select.value;page=0;index=0;search.value='';void load()});
 reload.addEventListener('click',()=>void load());search.addEventListener('input',applyFilter);
 previous.addEventListener('click',()=>{if(shown.length){index=(index-1+shown.length)%shown.length;render()}});
 next.addEventListener('click',()=>{if(shown.length){index=(index+1)%shown.length;render()}});
 pageBack.addEventListener('click',()=>{if(page>0){page--;void load()}});
 pageNext.addEventListener('click',()=>{if(lastPageSize===24){page++;void load()}});
 void load();
}
