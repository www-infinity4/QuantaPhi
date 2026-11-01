const states={
 AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',
 DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',
 IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',
 MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',
 NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',
 NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',
 PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',
 TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',
 WI:'Wisconsin',WY:'Wyoming'
};
const query=document.getElementById('businessQuery'),city=document.getElementById('businessCity'),
 state=document.getElementById('businessState'),category=document.getElementById('businessCategory'),
 results=document.getElementById('results'),more=document.getElementById('more'),
 status=document.getElementById('status'),totals=document.getElementById('totals');
for(const [code,name] of Object.entries(states)){
 const option=document.createElement('option');option.value=code;option.textContent=name;state.append(option);
}
state.value='CO';let cursor=0,searchId=0;
const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;
 if(text!==undefined)n.textContent=text;return n};
const sourceUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}};
const addLink=(root,label,url)=>{const href=sourceUrl(url);if(!href)return;const a=el('a','',label);
 a.href=href;a.target='_blank';a.rel='noopener noreferrer';root.append(a)};
const cardRoute=id=>{
 const match=/^(?:curated:|restaurant:curated:)(denver-[a-z0-9-]+)$/.exec(id||'');
 return match?'https://quantaphi.org/?card='+encodeURIComponent(match[1]):'';
};
function makeCard(business){
 const article=el('article','business'),kind=el('p','category',business.category||'Business');
 const title=el('h2','',business.name),address=el('p','address',business.address||business.city+', '+business.state);
 const actions=el('div','actions');
 addLink(actions,'Original website',business.website||business.source_url);
 if(business.address)addLink(actions,'Directions','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(business.address));
 if(cardRoute(business.id))addLink(actions,'Infinity Quick Card',cardRoute(business.id));
 const src=el('p','sources','Source: '+(business.source_name||'Public source')+
  ' · '+(business.sponsored?'Verified partner':'Independent listing'));
 article.append(kind,title,address,actions,src);
 if(business.source_url&&business.source_url!==business.website){
  const source=document.createElement('p');source.className='sources';addLink(source,'View source record',business.source_url);
  article.append(source);
 }
 return article;
}
async function run(append=false){
 const id=++searchId;if(!append){cursor=0;results.replaceChildren()}
 const u=new URL('/api/business-directory/records',location.origin);
 for(const [k,v] of Object.entries({q:query.value.trim(),city:city.value.trim(),state:state.value,
  category:category.value,offset:String(cursor),limit:'24'})){if(v)u.searchParams.set(k,v)}
 status.textContent='Searching Cloudflare business records…';more.disabled=true;
 try{
  const response=await fetch(u,{credentials:'omit'});if(!response.ok)throw Error('API unavailable');
  const data=await response.json();if(id!==searchId)return;
  for(const record of data.records||[])results.append(makeCard(record));
  cursor=data.next_offset??0;more.hidden=!data.has_more;more.disabled=false;
  status.textContent=(results.children.length?results.children.length+' businesses shown':'No records for these filters')+
   (data.has_more?' · More records available':'')+'.';
 }catch{if(id===searchId){status.textContent='Directory unavailable at the moment. Try again later.';more.hidden=true}}
}
document.getElementById('businessSearch').addEventListener('submit',event=>{event.preventDefault();void run()});
document.getElementById('clear').addEventListener('click',()=>{query.value='';city.value='';state.value='';category.value='';void run()});
more.addEventListener('click',()=>void run(true));
fetch('/api/business-directory/health',{credentials:'omit'}).then(r=>r.ok?r.json():Promise.reject())
 .then(data=>{totals.textContent=data.businesses+' published business records · '+data.queued+' cities queued across '+data.queued_states+' states.'})
 .catch(()=>{totals.textContent='Business records are temporarily unavailable.'});
void run();
