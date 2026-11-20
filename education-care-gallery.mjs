/* Education & Care photographic Quick Card, issue #1993.
 * Only source-licensed Commons images with no identifiable minors enter this public demo.
 * User example photos are visual references, NOT assets to upload or publish. */
export const EDUCATION_CARE_PHOTOS=Object.freeze([
 Object.freeze({
  id:'school-classroom',category:'schools',title:'Elementary classroom',
  alt:'Neatly arranged desks and learning displays in an elementary classroom',
  imageUrl:'https://commons.wikimedia.org/wiki/Special:FilePath/Elementary_Classroom.jpg?width=960',
  creditUrl:'https://commons.wikimedia.org/wiki/File:Elementary_Classroom.jpg',
  attribution:'Sydney.lorraine5',license:'CC BY-SA 4.0',
  licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',
  rightsStatus:'published-commons-license',identifiableChildren:false
 }),
 Object.freeze({
  id:'preschool-room',category:'daycare',title:'Preschool activity room',
  alt:'Preschool classroom arranged with small tables, learning stations and play materials',
  imageUrl:'https://commons.wikimedia.org/wiki/Special:FilePath/Preschool_Classroom.jpg?width=960',
  creditUrl:'https://commons.wikimedia.org/wiki/File:Preschool_Classroom.jpg',
  attribution:'Gammon-m',license:'CC BY-SA 4.0',
  licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',
  rightsStatus:'published-commons-license',identifiableChildren:false
 }),
 Object.freeze({
  id:'early-learning-room',category:'daycare',title:'Early learning environment',
  alt:'Small classroom with yellow walls, child-sized furniture and activity toys',
  imageUrl:'https://commons.wikimedia.org/wiki/Special:FilePath/Early_Learning_Environment.jpg?width=960',
  creditUrl:'https://commons.wikimedia.org/wiki/File:Early_Learning_Environment.jpg',
  attribution:'Trickymac',license:'CC BY-SA 4.0',
  licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',
  rightsStatus:'published-commons-license',identifiableChildren:false
 }),
 Object.freeze({
  id:'baby-toys',category:'babysitting',title:'Babysitting activity materials',
  alt:'Assortment of colorful baby books, stacking toys and play materials',
  imageUrl:'https://commons.wikimedia.org/wiki/Special:FilePath/Baby_toys.jpg?width=960',
  creditUrl:'https://commons.wikimedia.org/wiki/File:Baby_toys.jpg',
  attribution:'Mvolz',license:'CC0 1.0',
  licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',
  rightsStatus:'published-commons-license',identifiableChildren:false
 })
]);
export function educationCarePhotos(category='all'){
 if(category==='all')return EDUCATION_CARE_PHOTOS;
 return ['schools','daycare','babysitting'].includes(category)
  ?EDUCATION_CARE_PHOTOS.filter(p=>p.category===category):[];
}
export function nextEducationCareIndex(index,length,step){
 return length?((index+step)%length+length)%length:0;
}

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
