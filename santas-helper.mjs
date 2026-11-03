/* A real, first-party Christmas carousel. These are original interactive cards,
 * not unverified product offers, AI photo analysis, retailer ads or checkout. */
import {GIFT_LANES,interpretGiftRequest,recommendGiftLanes,validMerchantLink} from './santas-helper-core.mjs';

const host=document.getElementById('santasHelperCards');
const saved=new Set();
const create=(tag,klass,content)=>{const el=document.createElement(tag);if(klass)el.className=klass;if(content!==undefined)el.textContent=content;return el};
const safeLink=(merchant)=>{
 const a=create('a','santa-retailer',merchant.name);
 a.href=validMerchantLink(merchant.url)?merchant.url:'https://quantaphi.org/';
 a.target='_blank';a.rel='noopener noreferrer';
 return a;
};
function artwork(name,description){
 const wrap=create('div','santa-art');
 const img=create('img','santa-hero');
 img.src='/assets/santas-helper-'+name+'.svg';
 img.alt='Original Christmas art: Santa Claus, festive trees and '+description;
 img.width=1200;img.height=680;img.loading=name==='welcome'?'eager':'lazy';img.decoding='async';
 wrap.append(img);return wrap;
}
function cardBase(id,title,caption,art){
 const item=create('article','santa-card');
 item.id='santa-'+id;item.setAttribute('data-santa-card',id);item.dataset.personalization='disabled';
 item.setAttribute('aria-label',title+' · Santa’s Helper Quick Card');
 item.append(artwork(art,caption));
 const area=create('div','santa-content'),eyebrow=create('p','santa-kicker','SANTA’S HELPER · ORIGINAL CHRISTMAS CARD'),
 heading=create('h2','',title),sub=create('p','santa-subtitle',caption);
 area.append(eyebrow,heading,sub);item.append(area);return {item,area};
}
function openSanta(id){
 window.dispatchEvent(new CustomEvent('quantaphi:santa-open-card',{detail:{id:'santa-'+id}}));
}
function action(label,fn,klass=''){
 const button=create('button','santa-action '+klass,label);button.type='button';button.addEventListener('click',fn);return button;
}
function renderList(){
 const status=document.getElementById('santaShortlist');if(!status)return;
 status.replaceChildren();
 const count=create('p','santa-list-summary',saved.size?saved.size+' gift ideas in this browser-only list':'Your gift list is empty. Choose an idea from the Santa cards.');
 status.append(count);
 if(!saved.size)return;
 const list=create('ul','santa-saved-list');
 for(const id of saved){const lane=GIFT_LANES.find(x=>x.id===id);if(!lane)continue;
  const li=create('li','',lane.name+' ');
  li.append(action('Remove',()=>{saved.delete(id);renderList();},'santa-mini'));list.append(li);
 }
 status.append(list);
 status.append(action('Copy gift ideas',async()=>{
  const output='Santa’s Helper gift research ideas:\n'+[...saved].map(id=>'• '+GIFT_LANES.find(x=>x.id===id)?.name).join('\n')+
   '\nVerify product details, prices and shipping on each official retailer site.';
  try{await navigator.clipboard.writeText(output);count.textContent='Copied gift ideas to clipboard.';}
  catch{count.textContent='Copy is unavailable in this browser. Select the ideas above to save them.';}
 },'santa-quiet'));
}
function addGiftIdea(lane,button){
 saved.add(lane.id);renderList();
 const status=button.parentElement?.querySelector('.santa-idea-status');
 if(status)status.textContent='Added to your local gift list.';
 button.setAttribute('aria-pressed','true');
}
function renderLane(lane){
 const {item,area}=cardBase(lane.id,lane.name,lane.subtitle,lane.id);
 const note=create('p','santa-fact','Explore real merchant websites. No live price, stock, coupon or ad partnership is claimed.');
 const links=create('div','santa-retailers');
 for(const merchant of lane.links)links.append(safeLink(merchant));
 const actions=create('div','santa-card-actions');
 const add=action('＋ Add gift idea',()=>addGiftIdea(lane,add),'santa-primary');
 actions.append(add,action('Talk to Santa',()=>openSanta('welcome'),'santa-quiet'),create('p','santa-idea-status',''));
 area.append(note,links,actions);return item;
}
function renderWelcome(){
 const {item,area}=cardBase('welcome','Santa’s Helper','Tell Santa who you are shopping for. Discover ideas from verified merchant destinations without guessing their tastes.','welcome');
 const form=create('form','santa-form');form.id='santaGiftForm';
 const label=create('label','santa-prompt','Who is this gift for? What do they enjoy?');
 label.htmlFor='santaGiftRequest';
 const input=create('textarea','santa-input');input.id='santaGiftRequest';input.rows=3;input.maxLength=600;
 input.placeholder='I want to buy for my mother. She loves books and plants. My budget is $80.';
 input.setAttribute('aria-label','Describe the person and gift ideas in your own words');
 const chips=create('div','santa-hints');
 for(const value of ['For my mother','For my father','Loves music','Loves books','Gardening','Cologne gifts']){
  chips.append(action(value,()=>{input.value=(input.value.trim()+' '+value).trim();input.focus();},'santa-mini'));
 }
 const research=create('button','santa-action santa-primary','Find gift ideas');
 research.type='submit';
 form.append(label,input,chips,research);area.append(form);
 const output=create('section','santa-results');output.id='santaGiftResults';output.setAttribute('aria-live','polite');
 const hint=create('p','santa-disclosure','Gift ideas come from your words, not private profiles. Product offers and AI shopping have not been connected yet.');
 output.append(hint);area.append(output);
 const photoLabel=create('label','santa-photo-label','Optional photo · local preview only');
 photoLabel.htmlFor='santaGiftPhoto';
 const photo=create('input','santa-photo-input');photo.id='santaGiftPhoto';photo.type='file';photo.accept='image/jpeg,image/png,image/webp';
 const photoNote=create('p','santa-photo-note','Photo preview only. No upload, face identification, AI analysis, or gift preference inference. Ask permission before using another person’s photo.');
 const preview=create('div','santa-photo-preview');preview.id='santaPhotoPreview';
 const clearPhoto=action('Remove photo',()=>{photo.value='';clearPhotoPreview();},'santa-quiet');
 clearPhoto.hidden=true;let localPhoto=null;
 function clearPhotoPreview(){if(localPhoto){URL.revokeObjectURL(localPhoto);localPhoto=null;}
  preview.replaceChildren();clearPhoto.hidden=true;
 }
 photo.addEventListener('change',()=>{
  clearPhotoPreview();
  const file=photo.files?.[0];if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){
   preview.textContent='Choose a JPEG, PNG, or WebP under 5 MB. Nothing was uploaded.';photo.value='';return;
  }
  localPhoto=URL.createObjectURL(file);
  const img=create('img','santa-photo-thumb');img.src=localPhoto;img.alt='The photo you selected, shown only in your browser';
  preview.append(img,create('p','santa-photo-note','This image is not analyzed, saved or sent to a retailer.'));clearPhoto.hidden=false;
 });
 item.addEventListener('oracle:activate',()=>{});
 area.append(photoLabel,photo,photoNote,preview,clearPhoto);
 const listTitle=create('h3','santa-list-heading','Santa’s gift list');
 const shortlist=create('div','santa-shortlist');shortlist.id='santaShortlist';area.append(listTitle,shortlist);
 form.addEventListener('submit',e=>{
  e.preventDefault();
  const request=interpretGiftRequest(input.value);
  output.replaceChildren();
  if(request.raw.length<3){output.append(create('p','santa-note','Tell Santa a little about the recipient or what they enjoy.'));return;}
  const person=request.recipient==='someone'?'someone special':'your '+request.recipient;
  const lead=create('p','santa-outcome','A few thoughtful directions for '+person+(request.budgetCents===null?'':', with a stated budget of $'+(request.budgetCents/100).toFixed(2))+':');
  output.append(lead);
  if(!request.interests.length)output.append(create('p','santa-note','No interests mentioned yet, so these are broad ideas—not guesses based on a name, relative, or photo.'));
  const candidates=recommendGiftLanes(request);
  const list=create('div','santa-recommendations');
  for(const lane of candidates){
   const block=create('div','santa-recommendation');
   block.append(create('strong','',lane.name),create('p','',lane.subtitle),action('Explore this gift card',()=>openSanta(lane.id),'santa-mini'));
   list.append(block);
  }
  output.append(list,create('p','santa-disclosure','Check each retailer for actual item variants, prices, availability, shipping and checkout. Santa’s Helper does not place orders.'));
 });
 renderList();return item;
}
function mount(){
 if(!host||host.dataset.santaMounted==='true')return;
 host.dataset.santaMounted='true';
 host.append(renderWelcome(),...GIFT_LANES.map(renderLane));
 renderList();
 window.dispatchEvent(new Event('quantaphi:santa-cards-ready'));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
else mount();
