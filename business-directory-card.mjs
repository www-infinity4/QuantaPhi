/* Public national business directory — one real source-backed listing per
 * changing panel. Never read wallet balances or infer sensitive interests. */
const root=document.getElementById('businessDirectoryCard');
if(root){
 const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
 root.className='qbd-card';root.dataset.personalization='disabled';
 root.append(make('small','qbd-kicker','INFINITY® · LOCAL & VACATION DIRECTORY'),make('h2','qbd-title','Explore businesses across the United States'),
 make('p','qbd-intro','Original-source directory listings. No invented prices, reviews, advertising partnerships or live opening hours.'));
 const form=make('form','qbd-form');
 const city=make('input','qbd-input'),state=make('input','qbd-input'),query=make('input','qbd-input');
 city.value='Denver';city.placeholder='City';city.maxLength=80;city.setAttribute('aria-label','City');
 state.value='CO';state.placeholder='State';state.maxLength=2;state.setAttribute('aria-label','Two-letter state or territory');
 query.placeholder='Search restaurant, bookstore, clothing…';query.maxLength=65;query.setAttribute('aria-label','Business search');
 const submit=make('button','qbd-button','Search businesses');submit.type='submit';
 form.append(city,state,query,submit);
 const status=make('p','qbd-status','Choose a location and search.');status.setAttribute('role','status');
 const article=make('article','qbd-listing'),image=make('img','qbd-image'),name=make('h3','qbd-name'),
  place=make('p','qbd-place'),source=make('p','qbd-source'),link=make('a','qbd-visit','Visit official website');
 article.hidden=true;image.hidden=true;image.loading='lazy';image.referrerPolicy='no-referrer';
 link.target='_blank';link.rel='noopener noreferrer';article.append(image,name,place,source,link);
 const nav=make('div','qbd-nav'),prev=make('button','qbd-button','‹ Previous'),next=make('button','qbd-button','Next ›'),
  count=make('span','qbd-count');prev.type=next.type='button';nav.append(prev,count,next);nav.hidden=true;
 root.append(form,status,article,nav);
 let rows=[],cursor=0,page=0,more=false,loading=false,requestId=0,activated=false;
 function render(){
  const row=rows[cursor];article.hidden=!row;nav.hidden=rows.length===0;
  if(!row)return;
  name.textContent=row.name;place.textContent=[row.category,row.address||[row.city,row.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
  source.textContent='Independent listing · source: '+row.source_name;
  image.hidden=!row.image_url;if(row.image_url){image.alt=row.name;image.src=row.image_url}else image.removeAttribute('src');
  const href=row.website||row.source_url;link.href=href;link.textContent=row.website?'Visit official website':'See source record';
  count.textContent=(cursor+1)+' / '+rows.length+(more?' + more results':'');
  prev.disabled=cursor===0;next.disabled=cursor===rows.length-1&&!more;
 }
 async function search({append=false}={}){
  if(loading)return;
  if(!/^[A-Za-z]{2}$/.test(state.value.trim())){status.textContent='Enter a two-letter state or territory.';return;}
  if(!city.value.trim()&&query.value.trim().length<2){status.textContent='Enter a city or a search term.';return;}
  loading=true;submit.disabled=true;const version=++requestId;
  status.textContent='Looking up source-backed business records…';
  try{
   const params=new URLSearchParams({state:state.value.trim().toUpperCase(),city:city.value.trim(),q:query.value.trim(),page:String(append?page:0)});
   const response=await fetch('/api/business/search?'+params,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(9500)});
   if(!response.ok)throw new Error('unavailable');
   const data=await response.json();if(version!==requestId)return;
   const items=Array.isArray(data.items)?data.items.filter(x=>x?.name&&x?.source_url):[];
   if(append){rows.push(...items);cursor=Math.max(0,rows.length-items.length)}
   else{rows=items;cursor=0;page=0}
   more=data.has_more===true;status.textContent=rows.length?rows.length+' sourced listings loaded. Select Next to view each business.':'No matching public listings yet. Try another city or category.';
   render();
  }catch{status.textContent='Business directory is not currently available. No results or advertisements were invented.';if(!append){rows=[];more=false;render()}}
  finally{loading=false;submit.disabled=false}
 }
 form.addEventListener('submit',e=>{e.preventDefault();void search()});
 prev.addEventListener('click',()=>{if(cursor>0){cursor--;render()}});
 next.addEventListener('click',()=>{if(cursor<rows.length-1){cursor++;render()}else if(more&&!loading){page++;void search({append:true})}});
 root.addEventListener('oracle:activate',()=>{if(!activated){activated=true;void search()}});
 const reduce=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const timer=setInterval(()=>{
  if(!root.isConnected){clearInterval(timer);return}
  if(!reduce&&!document.hidden&&article.getClientRects().length>0&&rows.length>1&&!loading&&
   !root.contains(document.activeElement)){cursor=(cursor+1)%rows.length;render()}
 },24000);
}
