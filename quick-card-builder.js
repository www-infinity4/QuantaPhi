import {shareQuickCard} from '/quick-card-share.js?v=3';
import {openQuickCardPreview} from '/quick-card-preview.mjs';
import {freshApprovedCreatives,freshBrokerCreative} from '/quanta-context-placement.mjs?v=20261110-1';
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
const freshHost=document.getElementById('qcpFreshAds'),freshList=document.getElementById('qcpFreshList'),
 freshStatus=document.getElementById('qcpFreshStatus'),freshRefresh=document.getElementById('qcpRefreshFresh'),
 rightsCheckbox=document.getElementById('qcpRights');
let approvedFresh=[],chosenSource=null;
const freshNode=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
function renderFresh(items){
 if(!freshHost||!freshList)return;
 freshList.replaceChildren();
 const unique=new Map(items.filter(item=>item?.id&&item?.image&&item?.website).map(item=>[item.source+'|'+item.id,item]));
 approvedFresh=[...unique.values()].slice(0,24);
 for(const item of approvedFresh){
  const panel=freshNode('article','qcp-fresh-item');
  const photo=freshNode('img','qcp-fresh-image');photo.src=item.image;photo.alt='Source-provided artwork for '+item.title;photo.loading='lazy';photo.referrerPolicy='no-referrer';
  photo.addEventListener('error',()=>{photo.remove();panel.classList.add('qcp-fresh-no-image')},{once:true});
  const info=freshNode('div','qcp-fresh-info');
  info.append(freshNode('strong','',item.title),freshNode('small','',item.source==='verified-adphi'?'REVIEWED ADPHI CAMPAIGN':'APPROVED SOURCE QUICK CARD'),
   freshNode('p','','Verified source: '+new URL(item.website).hostname+' · dated '+String(item.createdAt).slice(0,10)));
  const link=freshNode('a','qcp-fresh-open','Open original source');link.href=item.website;link.target='_blank';link.rel='noopener noreferrer';
  const use=freshNode('button','qcp-fresh-use','Build a new card for this source');use.type='button';
  use.addEventListener('click',()=>{
   chosenSource=item;
   form.elements.namedItem('website').value=item.website;
   form.elements.namedItem('title').value=(item.title||'New source').slice(0,85);
   form.elements.namedItem('description').value=('Explore the original, currently reviewed '+item.title+
    ' source in a newly designed interactive Quick Card. Verify all public claims and the current offer.').slice(0,600);
   form.elements.namedItem('interactionRequest').value=('Create a new interactive source card from '+item.website+
    ' using the current approved original website, verified working actions and fresh licensed imagery. No invented promotions or live prices.').slice(0,500);
   kind.value='visit';show();
   const imageField=form.elements.namedItem('image');
   // Never silently copy copyrighted publisher images to a new Quick Card.
   imageField.value=rightsCheckbox?.checked?item.image:'';
   freshStatus.textContent=rightsCheckbox?.checked?
    'Source selected with rights confirmation. Check the image license and offer validity before publishing.':
    'Source selected. Image was NOT copied: confirm image reuse permission before adding a photograph.';
   imageField.focus();
  });
  info.append(link,use);panel.append(photo,info);freshList.append(panel);
 }
 if(!approvedFresh.length)freshList.append(freshNode('p','qcp-muted','No new source-approved ad imagery was returned. No old or fabricated ads were inserted.'));
}
rightsCheckbox?.addEventListener('change',()=>{
 if(!chosenSource)return;
 form.elements.namedItem('image').value=rightsCheckbox.checked?chosenSource.image:'';
});
async function loadCurrentFresh({includeAdPhi=false}={}){
 if(!freshHost||!freshStatus)return;
 freshRefresh.disabled=true;freshStatus.textContent='Checking the live approved source inventory…';
 let rows=[],publisherOk=false,adphiOk=false;
 try{
  const response=await fetch('/api/quick-cards?limit=24',{cache:'no-store',credentials:'omit'});
  if(response.ok){publisherOk=true;rows=freshApprovedCreatives(await response.json());}
 }catch{/* Do not fabricate current ad inventory after an offline fetch. */}
 if(includeAdPhi){
  // Reuse QuantaPhi's existing keyless AdPhi publisher. The request uses only
  // a visitor-chosen broad category, never raw prompts, health or private data.
  const topic=document.getElementById('qcpFreshTopic')?.value||'grocery';
  if(['grocery','developer','travel','home','outdoors'].includes(topic)){
   try{
    const endpoint='https://ad-phi.marvaseater.workers.dev/v1/ads/next';
    const url=endpoint+'?topic='+encodeURIComponent(topic)+'&placement=quick-card-builder-reviewed';
    const response=await fetch(url,{cache:'no-store',credentials:'omit'});
    if(response.ok){const data=await response.json();const fresh=freshBrokerCreative(data?.ad||null);
     if(fresh){adphiOk=true;rows.unshift(fresh);}
    }
   }catch{/* Third-party AdPhi availability and CORS are not guaranteed. */}
  }
 }
 renderFresh(rows);
 freshStatus.textContent=approvedFresh.length+' verified recent source record(s)'+
  (adphiOk?' · reviewed live AdPhi creative':'')+
  (publisherOk?' · approved publisher checked':' · publisher unavailable')+
  '. Images and campaigns are not automatically copied or published.';
 freshRefresh.disabled=false;
}
freshRefresh?.addEventListener('click',()=>void loadCurrentFresh({includeAdPhi:true}));
if(freshHost)void loadCurrentFresh();
const button=document.getElementById('qcpPublish');
form.addEventListener('submit',async event=>{
 event.preventDefault();button.disabled=true;result.replaceChildren();button.textContent='Publishing…';
 const body=Object.fromEntries(new FormData(form).entries());
 // Source-derived images require explicit rights confirmation before upload.
 if(chosenSource&&!rightsCheckbox?.checked&&body.image===chosenSource.image)body.image='';

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