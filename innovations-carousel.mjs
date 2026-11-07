/* Original Infinity Oracle Octaves Innovations carousel.
 * No automatic scraping, no pretend product checkout, no invented AI search.
 * Public source records may be added only after provenance/review.
 */
import {INNOVATION_CARDS, nextInnovationIndex, researchQueryFor} from './innovations-carousel-core.mjs';
import {mountCardActions} from './quanta-card-actions.mjs';

const root=document.getElementById('innovationsCarousel');
if(root){
 const stage=root.querySelector('#innovationsStage'),previous=root.querySelector('#innovationsPrevious'),
   next=root.querySelector('#innovationsNext'),now=root.querySelector('#innovationsNow'),
   picker=root.querySelector('#innovationsPicker'),status=root.querySelector('#innovationsStatus');
 const make=(tag,cls,value)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(value!==undefined)el.textContent=value;
  return el;
 };
 const cards=INNOVATION_CARDS.map((entry,i)=>{
  const card=make('article','innovations-slide');
  card.hidden=i!==0;card.dataset.innovationId=entry.id;
  card.setAttribute('role','group');
  card.setAttribute('aria-label',entry.name+' research Quick Card');
  const image=make('img','innovations-card-image');
  image.src=entry.image;image.alt=entry.imageAlt;
  image.decoding='async';image.loading=i===0?'eager':'lazy';
  const media=make('div','innovations-media');
  media.append(image);
  const artCredit=make('small','innovations-art-credit','Original concept illustration · not a product photograph');
  media.append(artCredit);
  image.addEventListener('error',()=>{
   image.hidden=true;
   artCredit.textContent='Illustration unavailable. Original research source remains accessible.';
  },{once:true});
  const body=make('div','innovations-copy');
  body.append(make('small','innovations-eyebrow','INFINITY® · '+entry.category));
  body.append(make('h3','innovations-title',entry.name));
  body.append(make('p','innovations-headline',entry.headline));
  body.append(make('p','innovations-summary',entry.summary));
  body.append(make('p','innovations-readiness',
    'Stage: '+entry.readiness.replaceAll('-',' ')+' · Source '+entry.sourceDate+' · Checked '+entry.checkedAt+(entry.readiness==='field-applications'?' · Project-specific availability':' · Not a retail offer')));
  const actions=make('div','innovations-primary-actions');
  const read=make('button','innovations-read','Explore the idea');
  read.type='button';
  const details=make('section','innovations-details');
  details.id='innovationsDetails'+i;details.hidden=true;
  read.setAttribute('aria-controls',details.id);
  read.setAttribute('aria-expanded','false');
  read.addEventListener('click',()=>{
   details.hidden=!details.hidden;
   const opened=!details.hidden;
   read.textContent=opened?'Close research notes':'Explore the idea';
   read.setAttribute('aria-expanded',String(opened));
  });
  const research=make('button','innovations-research','Research related ideas');
  research.type='button';
  research.addEventListener('click',()=>{
   const q=document.getElementById('q');
   const go=document.getElementById('go');
   const query=researchQueryFor(entry.id);
   if(!q||!go||!query){
    status.textContent='QuantaPhi research search is not available on this page.';
    return;
   }
   q.value=query;
   q.dispatchEvent(new Event('input',{bubbles:true}));
   status.textContent='Searching for related research on QuantaPhi. Review sources before accepting new claims or cards.';
   go.click();
   q.scrollIntoView({block:'center',behavior:'smooth'});
  });
  actions.append(read,research);
  const article=make('a','innovations-source',entry.sourceLabel+' ↗');
  article.href=entry.source;article.target='_blank';article.rel='noopener noreferrer';
  const params=new URLSearchParams({website:entry.source,title:entry.name+' · My research card'});
  const buildHref='/quick-card-builder.html?'+params.toString();
  body.append(actions,article);
  const points=make('ul','innovations-applications');
  for(const text of entry.applications)points.append(make('li','',text));
  details.append(make('h4','','Possible applications'),points,
   make('h4','','Reality check'),
   make('p','innovations-caveat',entry.caveat));
  body.append(details);
  const shared=make('div','innovations-shared-actions');
  mountCardActions(shared,{
   id:'innovation-'+entry.id,name:entry.name,
   category:entry.category,route:'/?innovation='+encodeURIComponent(entry.id),
   website:entry.source,official:entry.source,featureUrl:entry.source,
   shareImage:entry.image,shareDescription:entry.summary,
   previewMode:'interactive'
  },{showPreview:false,showOriginal:false,showSearch:false,websiteReader:false});
  // Shared +1 Build must never focus a hidden owner-only executor.
  // Use the real moderated creator when Bubbles job input is unavailable.
  shared.addEventListener('click',event=>{
   const action=event.target.closest('button[data-action="build"]');
   if(!action||!shared.contains(action))return;
   const executor=document.getElementById('robotDirectionsInput');
   if(executor&&!executor.closest('[hidden]'))return;
   event.preventDefault();
   event.stopPropagation();
   location.assign(buildHref);
  },true);
  body.append(shared);
  card.append(media,body);
  stage.append(card);
  return card;
 });
 const choices=INNOVATION_CARDS.map((entry,i)=>{
  const button=make('button','innovations-choice');
  button.type='button';
  button.setAttribute('aria-label','Show '+entry.name);
  button.setAttribute('aria-controls','innovationsStage');
  button.append(make('span','innovations-dot'));
  button.addEventListener('click',()=>show(i));
  picker.append(button);
  return button;
 });
 let index=-1;
 function show(nextIndex){
  if(nextIndex<0||nextIndex>=cards.length||nextIndex===index)return;
  index=nextIndex;
  cards.forEach((card,i)=>{card.hidden=i!==index;});
  choices.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  const entry=INNOVATION_CARDS[index];
  now.textContent=entry.name;
  status.textContent=(index+1)+' of '+cards.length+
   ' · Source-checked research, not a retail offer. New discoveries require review.';
 }
 previous?.addEventListener('click',()=>show(nextInnovationIndex(index,-1,cards.length)));
 next?.addEventListener('click',()=>show(nextInnovationIndex(index,1,cards.length)));
 let requested=null;try{requested=new URL(location.href).searchParams.get('innovation');}catch{}
 const requestedIndex=INNOVATION_CARDS.findIndex(x=>x.id===requested);
 show(requestedIndex>=0?requestedIndex:0);
 previous.disabled=next.disabled=cards.length<2;
}
