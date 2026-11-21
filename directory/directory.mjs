import {DIRECTORY_SOURCES,directorySearch,safeProfileDraft} from './records.mjs';
const $=id=>document.getElementById(id),create=(tag,text='',className='')=>{
 const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node;
};
function addLink(parent,label,href){
 const anchor=create('a',label);anchor.href=href;
 if(/^https:/.test(href)){anchor.target='_blank';anchor.rel='noopener noreferrer'}
 parent.append(anchor);
}
const query=$('query'),type=$('type'),category=$('category');
const params=new URLSearchParams(location.search);
if(['website','organization','professional'].includes(params.get('kind')))type.value=params.get('kind');
const unique=[...new Set(DIRECTORY_SOURCES.map(x=>x.category))].sort();
for(const value of unique){const option=create('option',value);option.value=value;category.append(option)}
function render(){
 const results=directorySearch(DIRECTORY_SOURCES,{query:query.value,kind:type.value,category:category.value});
 const host=$('directoryResults');host.replaceChildren();
 $('directoryStatus').textContent=results.length+' curated public listing'+(results.length===1?'':'s')+
   ' · personal contact details are not harvested · sources may change';
 for(const record of results){
  const card=create('article','','card');
  card.append(create('span',record.category+' · '+(record.kind==='website'?'Official website':'Public organization'),'tag'),
   create('h3',record.name),create('p',record.description));
  const links=create('div','','links');
  if(record.phone)addLink(links,'☎ '+record.phoneDisplay,'tel:'+record.phone);
  if(record.email)addLink(links,'✉ Email','mailto:'+record.email);
  addLink(links,'Visit website ↗',record.website);
  if(record.facebook)addLink(links,'Facebook ↗',record.facebook);
  if(record.x)addLink(links,'X ↗',record.x);
  addLink(links,'Verify original source ↗',record.source);
  card.append(links,create('p','Source checked '+record.verifiedAt+' · independently listed','muted'));
  host.append(card);
 }
 if(!results.length)host.append(create('p','No matching verified entries. Try a wider search, or explore the official website directory.','muted'));
}
for(const input of [query,type,category])input.addEventListener('input',render);
render();
const fields={name:'draftName',website:'draftWebsite',description:'draftDescription',
 phone:'draftPhone',email:'draftEmail',facebook:'draftFacebook',x:'draftX'};
const form=$('listingDraftForm'),preview=$('preview'),status=$('draftStatus');
form.addEventListener('submit',e=>{
 e.preventDefault();preview.hidden=true;
 if(!$('draftConsent').checked){status.textContent='Permission is required before preparing a public contact draft.';return}
 const result=safeProfileDraft(Object.fromEntries(Object.entries(fields).map(([k,id])=>[k,$(id).value])));
 if(!result.ok){status.textContent=result.error;return}
 const draft=result.draft;
 try{sessionStorage.setItem('quantaphi-directory-pending-draft',JSON.stringify(draft))}
 catch{status.textContent='Browser storage unavailable; preview only.'}
 preview.textContent=[draft.name,draft.description,'Website: '+draft.website,
  draft.phone?'Business phone: '+draft.phone:'',draft.email?'Business email: '+draft.email:'',
  draft.facebook?'Facebook: '+draft.facebook:'',draft.x?'X: '+draft.x:''].filter(Boolean).join('\n');
 preview.hidden=false;
 status.textContent='Private draft prepared on this device. Not submitted, published or indexed.';
});
$('clearDraft').addEventListener('click',()=>{
 try{sessionStorage.removeItem('quantaphi-directory-pending-draft')}catch{}
 form.reset();preview.hidden=true;status.textContent='Local draft cleared.'
});
