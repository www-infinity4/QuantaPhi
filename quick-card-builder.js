import {shareQuickCard} from '/quick-card-share.js?v=3';
import {openQuickCardPreview} from '/quick-card-preview.mjs';
const form=document.getElementById('quickCardCreate'),result=document.getElementById('qcpResult'),kind=document.getElementById('qcpKind');
const show=()=>{document.getElementById('qcpSearchLine').hidden=kind.value!=='search';document.getElementById('qcpVideoLine').hidden=kind.value!=='video';};
kind.addEventListener('change',show);show();
// Help creators configure official search interactions without inventing arbitrary APIs.
const websiteInput=form.elements.namedItem('website'),searchInput=form.elements.namedItem('searchTemplate');
// Explicit prefill from the wiring study; never publish on navigation.
try {
 const from=new URLSearchParams(location.search),raw=from.get('website'),text=from.get('title');
 const site=raw&&new URL(raw);
 if(site?.protocol==='https:'&&!site.username&&!site.password&&!site.port&&/^[a-z0-9.-]+$/i.test(site.hostname)){
  websiteInput.value=site.href;
  if(text)form.elements.namedItem('title').value=text.slice(0,85);
  form.elements.namedItem('description').value='Explore the original '+(text||site.hostname)+' website, using its authorized actions and source links.';
  form.elements.namedItem('interactionRequest').value='Use real provider URLs, preserve original sign-in, and show working controls with a reliable official-site fallback.';
 }
}catch{/* Ignore malformed navigation parameters. */}
function suggestSearch(){
 if(kind.value!=='search'||searchInput.value.trim())return;
 try{
  const url=new URL(websiteInput.value),host=url.hostname.toLowerCase();
  const known={
   'www.google.com':'/search?q={query}',
   'google.com':'/search?q={query}',
   'www.bing.com':'/search?q={query}',
   'bing.com':'/search?q={query}',
   'www.ebay.com':'/sch/i.html?_nkw={query}',
   'ebay.com':'/sch/i.html?_nkw={query}',
   'www.youtube.com':'/results?search_query={query}',
   'youtube.com':'/results?search_query={query}'
  };
  if(url.protocol==='https:'&&known[host])searchInput.value=url.origin+known[host];
 }catch{}
}
kind.addEventListener('change',suggestSearch);
websiteInput.addEventListener('change',suggestSearch);

const pageShareStatus=document.getElementById('qcpPageShareStatus');
document.getElementById('qcpSharePage')?.addEventListener('click',()=>void shareQuickCard({
 url:'https://quantaphi.org/quick-card-builder.html',
 title:'Build interactive Quick Cards on QuantaPhi',
 status:pageShareStatus
}));
const button=document.getElementById('qcpPublish');
form.addEventListener('submit',async event=>{
 event.preventDefault();button.disabled=true;result.replaceChildren();button.textContent='Publishing…';
 const body=Object.fromEntries(new FormData(form).entries());
 try{
  const response=await fetch('/api/quick-cards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const value=await response.json();
  if(!response.ok||!value.ok)throw new Error(value.error||'Publishing was not confirmed.');
  const message=document.createElement('p');message.textContent='Card published. Your link is ready to share. Placement in the homepage rotation requires review.';
  const field=document.createElement('input');field.type='url';field.readOnly=true;field.value=value.cardUrl;field.setAttribute('aria-label','Your shareable card URL');
  const row=document.createElement('div');row.className='qcp-share';
  const link=document.createElement('a');link.href=value.cardUrl;link.textContent='Open your card';link.target='_blank';link.rel='noopener';
  const copy=document.createElement('button');copy.type='button';copy.textContent='Copy link';copy.addEventListener('click',async()=>{
   try{await navigator.clipboard.writeText(value.cardUrl);copy.textContent='Copied';}catch{field.focus();field.select();copy.textContent='Select and copy the link';}
  });
  const previewButton=document.createElement('button');previewButton.type='button';previewButton.id='qcpPreviewPublished';previewButton.textContent='◫ Preview live card';
  previewButton.addEventListener('click',()=>openQuickCardPreview({url:value.cardUrl,title:body.title,description:body.description,image:body.image,official:body.website,previewMode:body.previewMode}));
  const publishedShare=document.createElement('button');publishedShare.type='button';publishedShare.id='qcpSharePublished';publishedShare.textContent='↗ Share published card';
  publishedShare.addEventListener('click',()=>void shareQuickCard({url:value.cardUrl,title:body.title+' · QuantaPhi Quick Card',image:body.image||'',description:body.description||'',status:message}));
  row.append(previewButton,publishedShare,link,copy);result.append(message,field,row);
 }catch(error){const p=document.createElement('p');p.textContent=error.message||'Could not publish your card.';result.append(p);}
 finally{button.disabled=false;button.textContent='Publish shareable card';}
});