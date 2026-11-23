/* Device-local public-link/metadata drafts, not account ownership, minting,
 * private photo import, hosted files or wallet settlement. */
import {validateWebsite} from './creator-gpt-handoff-core.mjs';
export const ORIGINAL_KINDS=Object.freeze(['image','music','video','quick-card','website','other']);
const text=(s,max)=>String(s||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
export function normalizeOriginalDraft(raw){
 if(!raw||typeof raw!=='object')throw Error('Draft data missing.');
 const title=text(raw.title,85),description=text(raw.description,400);
 if(title.length<3)throw Error('Give your original a title of at least three characters.');
 const kind=ORIGINAL_KINDS.includes(raw.kind)?raw.kind:'other';
 const website=raw.website?validateWebsite(raw.website).href:'';
 let image='';
 if(raw.image){
  const u=validateWebsite(raw.image);
  if(!/\.(?:png|jpe?g|webp)(?:$|[?#])/i.test(u.pathname+u.search))
   throw Error('Use a permitted HTTPS JPG, PNG or WebP image URL.');
  image=u.href;
 }
 const id=/^[a-z0-9-]{8,70}$/i.test(String(raw.id||''))?raw.id:'';
 return Object.freeze({id,title,description,kind,website,image});
}
export function storeDrafts(storage,drafts){
 if(!Array.isArray(drafts)||drafts.length>50)throw Error('Up to 50 device-local drafts are supported.');
 const clean=drafts.map(normalizeOriginalDraft);
 const ids=new Set(clean.map(d=>d.id));
 if(ids.has('')||ids.size!==clean.length)throw Error('Each saved draft needs a unique local ID.');
 storage.setItem('quanta:my-originals-local:v1',JSON.stringify(clean));
 return clean;
}
export function loadDrafts(storage){
 try{
  const rows=JSON.parse(storage.getItem('quanta:my-originals-local:v1')||'[]');
  if(!Array.isArray(rows))return [];
  return rows.slice(0,50).flatMap(row=>{try{return [normalizeOriginalDraft(row)]}catch{return []}});
 }catch{return []}
}
