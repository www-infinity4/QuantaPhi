import {normalizeOriginalDraft,loadDrafts,storeDrafts} from './my-originals-core.mjs';
const root=document.getElementById('originalsApp');
if(root){
 const $=id=>document.getElementById(id);
 const make=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
 const list=$('originalDraftList'),count=$('originalCount'),status=$('originalStatus');
 const local=()=>{try{return localStorage}catch{return null}};
 let drafts=local()?loadDrafts(local()):[];
 function persist(rows,message){
  if(!local()){status.textContent='Browser storage is disabled; no original could be saved. You may still use the GPT builder.';return false;}
  try{storeDrafts(local(),rows);drafts=rows;status.textContent=message;render();return true}
  catch(e){status.textContent='Local save failed: '+(e?.message||'storage unavailable');return false}
 }
 function render(){
  list.replaceChildren();
  count.textContent=drafts.length+' original draft'+(drafts.length===1?'':'s')+' on this device.';
  if(!drafts.length){list.append(make('p','','No saved originals here yet. Add an original above, or create with GPT.'));return}
  for(const item of drafts){
   const card=make('article','mo-card');
   if(item.image){
    const img=make('img');img.alt=item.title+' · creator-provided cover';
    img.loading='lazy';img.referrerPolicy='no-referrer';img.src=item.image;card.append(img);
   }
   card.append(make('small','',item.kind+' · local draft'),make('h3','',item.title));
   if(item.description)card.append(make('p','',item.description));
   if(item.website){
    const site=make('a','','Open my original website');site.href=item.website;site.target='_blank';site.rel='noopener noreferrer';card.append(site);
    const builder=new URL('/quick-card-builder.html',location.origin);
    builder.searchParams.set('website',item.website);builder.searchParams.set('title',item.title);
    const publish=make('a','','Prepare Quick Card');publish.href=builder.pathname+builder.search;card.append(publish);
   }else card.append(make('p','mo-status','Add your own public website before using the online Quick Card publisher.'));
   const gpt=make('a','','Build with GPT');gpt.href='/creator-gpt-handoff.html';card.append(gpt);
   const remove=make('button','','Delete this local draft');remove.type='button';
   remove.addEventListener('click',()=>{
    if(!window.confirm('Delete this draft from this browser? This will not delete any public website.'))return;
    persist(drafts.filter(x=>x.id!==item.id),'Local draft deleted. Public content and wallets unchanged.');
   });
   card.append(remove);list.append(card);
  }
 }
 $('originalDraftForm').addEventListener('submit',e=>{
  e.preventDefault();
  try{
   const data=normalizeOriginalDraft({
    id:crypto.randomUUID(),title:$('originalTitle').value,kind:$('originalKind').value,
    description:$('originalDescription').value,website:$('originalWebsite').value,
    image:$('originalImage').value
   });
   if(drafts.length>=50){status.textContent='Up to 50 device-only drafts can be stored. Remove an older draft first.';return}
   if(persist([data,...drafts],'Your original was saved locally. No public publication or payment occurred.'))$('originalDraftForm').reset();
  }catch(error){status.textContent=String(error?.message||error)}
 });
 render();
}
