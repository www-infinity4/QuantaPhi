/* Commerce intent is a first-class Quant region; no fake sponsored ads or wallet credits. */
(function(){
'use strict';
const SEARCH='https://orange-brook-a2ac.marvaseater.workers.dev/search';
const OFFICIAL={
 radioshack:{name:'RadioShack',domain:'radioshack.com',site:'https://www.radioshack.com/',deals:'https://www.radioshack.com/c/collection/top-deals'},
 'radio shack':{name:'RadioShack',domain:'radioshack.com',site:'https://www.radioshack.com/',deals:'https://www.radioshack.com/c/collection/top-deals'}
};
const result=document.getElementById('result');if(!result)return;
const panel=document.createElement('section');panel.id='phiBusinessResult';panel.hidden=true;
panel.setAttribute('aria-label','Business and shopping results');
panel.innerHTML='<div class="pb-top"><span>ORACLE OCTAVES · BUSINESS / SHOPPING</span><small>Live source context, not a paid advertisement</small></div><h2></h2><p class="pb-description"></p><div class="pb-links"></div><div class="pb-status" role="status"></div>';
const css=document.createElement('style');css.textContent=
'#phiBusinessResult{display:block;margin:12px 4px 18px;border:2px solid #e79533;border-radius:22px;background:linear-gradient(145deg,#fff5df,#ffe7bd);padding:17px;color:#572f13;box-shadow:0 6px 18px #70380016}' +
'#phiBusinessResult[hidden]{display:none!important}#phiBusinessResult .pb-top{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px;font-size:11px;font-weight:900;letter-spacing:.07em}' +
'#phiBusinessResult .pb-top small{font-size:10px;font-weight:650;letter-spacing:0;color:#6d5140}#phiBusinessResult h2{margin:9px 0 5px;color:#5e2a0f;font-size:clamp(21px,5vw,28px)}' +
'#phiBusinessResult p{margin:0 0 12px;line-height:1.5;font-size:13px}#phiBusinessResult .pb-links{display:grid;gap:9px}' +
'#phiBusinessResult .pb-link{display:block;text-decoration:none;border:1px solid #ce9c56;border-radius:12px;background:#fffefa;padding:10px 12px;color:#3d2556;overflow-wrap:anywhere}' +
'#phiBusinessResult .pb-link strong{display:block;font-size:14px}#phiBusinessResult .pb-link span{display:block;font-size:11px;color:#69506e}' +
'#phiBusinessResult .pb-status{margin-top:10px;color:#805839;font-size:11px}';
document.head.append(css);
result.parentNode.insertBefore(panel,result);
const h=panel.querySelector('h2'),desc=panel.querySelector('.pb-description'),links=panel.querySelector('.pb-links'),status=panel.querySelector('.pb-status');
let serial=0,abort=null;
const tidy=value=>String(value||'').replace(/\s+/g,' ').trim();
const isHTTPS=value=>{try{const u=new URL(value);return u.protocol==='https:'?u:null}catch{return null}};
const matchOfficial=(url,brand)=>{const parsed=isHTTPS(url);return parsed&&(parsed.hostname===brand.domain||parsed.hostname.endsWith('.'+brand.domain))};
function offer(title,url,meta){
 const parsed=isHTTPS(url);if(!parsed)return;
 const a=document.createElement('a');a.className='pb-link';a.href=parsed.href;
 const strong=document.createElement('strong');strong.textContent=tidy(title).slice(0,180);
 const small=document.createElement('span');small.textContent=meta+' · '+parsed.hostname;
 a.append(strong,small);a.dataset.siteUrl=a.href;a.dataset.siteTitle=tidy(title).slice(0,100);
 a.addEventListener('click',e=>{
  if(typeof window.QuantaOpenSite!=='function')return;
  e.preventDefault();window.QuantaOpenSite(a);
 });links.append(a);
}
function render(q,brand,items=[]){
 h.textContent=brand?.name||q;
 desc.textContent=brand?'Official shop and currently indexed listings for '+brand.name+'. Verify prices and promotions on the original store.':'Business-related search results, with their original sources. These are not verified paid ads.';
 links.replaceChildren();
 if(brand){
  offer('Visit '+brand.name+' official online store',brand.site,'Verified source');
  if(brand.deals)offer('Browse current store deals',brand.deals,'Official promotion collection');
 }
 const matches=items.filter(x=>{
  if(!isHTTPS(x.url))return false;
  return brand?matchOfficial(x.url,brand):tidy(x.title).toLowerCase().includes(q.toLowerCase());
 });
 for(const item of matches.slice(0,3)){
  if(brand&&[brand.site,brand.deals].includes(item.url))continue;
  offer(item.title,item.url,brand?'Indexed official listing':'Search-indexed business listing');
 }
 if(!links.children.length){panel.hidden=true;return}
 status.textContent=brand?'Verified brand domain; listings are search-indexed and may not be the newest advertisements.':'Sources were discovered through public search; merchant ownership and ad status are not verified.';
 panel.hidden=false;
}
async function run(raw){
 const ticket=++serial;abort?.abort();const q=tidy(raw).slice(0,110),key=q.toLowerCase().replace(/\s+/g,' '),brand=OFFICIAL[key];
 if(!q||q.length>65||/[?\n]/.test(q)){panel.hidden=true;return}
 if(brand)render(q,brand);
 else panel.hidden=true;
 abort=new AbortController();
 try{
  const u=new URL(SEARCH);u.search=new URLSearchParams({q:q+' official store company products latest offers',format:'json',categories:'general',safesearch:'1'});
  const response=await fetch(u.href,{signal:abort.signal,cache:'no-store'});
  if(!response.ok)throw Error('search_source_unavailable');
  const data=await response.json();if(ticket!==serial)return;
  const matches=(Array.isArray(data.results)?data.results:[]).filter(x=>isHTTPS(x.url)).slice(0,20);
  if(brand)return render(q,brand,matches);
  const lower=q.toLowerCase(),evidence=matches.filter(x=>{
    const text=tidy(x.title+' '+(x.content||'')).toLowerCase();
    return text.includes(lower)&&/\b(official|store|shop|retail|business|company|products|services|online store)\b/i.test(text);
  });
  if(evidence.length>=2)render(q,null,evidence);
 }catch(e){if(ticket===serial&&brand)status.textContent='Official business links are available; live search listings could not be refreshed.'}
}
window.addEventListener('quantaphi:search-start',e=>{void run(e.detail?.query)});
const initial=new URL(location.href).searchParams.get('q');
if(initial)void run(initial);
})();