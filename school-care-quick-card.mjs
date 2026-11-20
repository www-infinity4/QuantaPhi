import {educationCarePhotos,nextEducationCareIndex} from './education-care-gallery.mjs';
// Single original Oracle card. Every control meets the 48px Android touch target.
const MIN_TOUCH_TARGET_PX=48;
const root=globalThis.document?.getElementById('educationCareQuickCard');
if(root){
 root.dataset.personalization='disabled';
 const el=(tag,cls='',label='')=>{
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(label)n.textContent=label;
  return n;
 };
 const kicker=el('p','ec-kicker','INFINITY® · EDUCATION & CARE');
 const heading=el('h2','ec-heading','Schools, daycare & babysitting');
 const intro=el('p','ec-intro','Explore licensed photos of learning spaces and care activities. These are visual examples, not verified local providers or child-care recommendations.');
 const filterLabel=el('label','ec-filter-label','View photo category');
 const filter=el('select','ec-select');
 filter.id='ecPhotoCategory';
 for(const [value,label] of [['all','All photos'],['schools','Schools'],['daycare','Daycare & preschool'],['babysitting','Babysitting activities']]){
  const opt=el('option','',label);opt.value=value;filter.append(opt);
 }
 filterLabel.htmlFor=filter.id;
 const tools=el('div','ec-tools');tools.append(filterLabel,filter);
 const figure=el('figure','ec-figure');
 const photo=el('img','ec-photo');
 photo.alt='';photo.loading='lazy';photo.decoding='async';photo.referrerPolicy='no-referrer';
 const fallback=el('p','ec-fallback','Image unavailable. Use the original file link below.');fallback.hidden=true;
 const title=el('h3','ec-photo-title');
 const credit=el('figcaption','ec-credit');
 const source=el('a','ec-credit-link','Photo source and creator');
 source.target='_blank';source.rel='noopener noreferrer';
 const license=el('a','ec-credit-link','License details');
 license.target='_blank';license.rel='noopener noreferrer';
 credit.append(source,license);figure.append(photo,fallback,title,credit);
 const controls=el('nav','ec-controls');controls.setAttribute('aria-label','Education photo carousel controls');
 const previous=el('button','ec-button','← Previous photo'),next=el('button','ec-button','Next photo →');
 previous.style.minHeight=next.style.minHeight=MIN_TOUCH_TARGET_PX+'px';
 previous.type=next.type='button';
 const counter=el('span','ec-counter');counter.setAttribute('role','status');counter.setAttribute('aria-live','polite');
 controls.append(previous,counter,next);
 const note=el('p','ec-note','Photographs are credited to their original creators. Schools, centers and caregivers shown here are not being advertised or vetted. No child profiles, locations, identities, photos or contact details are collected.');
 root.replaceChildren(kicker,heading,intro,tools,figure,controls,note);
 let currentCategory='all',index=0;
 function render(){
  const photos=educationCarePhotos(currentCategory);const item=photos[index];
  if(!item){photo.removeAttribute('src');title.textContent='No photos available';counter.textContent='0 of 0';return}
  photo.hidden=false;fallback.hidden=true;
  photo.src=item.imageUrl;photo.alt=item.alt;title.textContent=item.title;
  source.href=item.creditUrl;
  source.textContent='Photo by '+item.attribution+' · Original';
  license.href=item.licenseUrl;
  license.textContent=item.license;
  counter.textContent=(index+1)+' of '+photos.length;
  previous.disabled=next.disabled=photos.length<2;
 }
 photo.addEventListener('error',()=>{photo.hidden=true;fallback.hidden=false});
 filter.addEventListener('change',()=>{currentCategory=filter.value;index=0;render()});
 previous.addEventListener('click',()=>{index=nextEducationCareIndex(index,educationCarePhotos(currentCategory).length,-1);render()});
 next.addEventListener('click',()=>{index=nextEducationCareIndex(index,educationCarePhotos(currentCategory).length,1);render()});
 render();
}
