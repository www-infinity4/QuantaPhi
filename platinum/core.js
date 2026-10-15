/* Infinity Platinum: offline-capable, local-only URL and tile rules.
 * This module never mints tokens or accesses other users' sessions. */
(function(root){
 'use strict';
 const KEY='infinity-platinum:tiles:v1',RESUME='infinity-platinum:resume:v1',LIMIT=80;
 const clean=(s,n=180)=>String(s??'').replace(/\s+/g,' ').trim().slice(0,n);
 function validUrl(value){
  let raw=String(value??'').trim();
  if(!raw||raw.length>2048||/[\u0000-\u001f\u007f]/.test(raw)||/\s/.test(raw))return '';
  if(!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)){
   if(/^[a-z][a-z0-9+.-]*:/i.test(raw))return '';
   if(!/^(?:[\w-]+\.)+[a-z]{2,}(?::\d{1,5})?(?:[/?#]|$)/i.test(raw))return '';
   raw='https://'+raw;
  }
  try{
   const u=new URL(raw);
   if(!['http:','https:'].includes(u.protocol)||!u.hostname||u.username||u.password)return '';
   return u.href;
  }catch{return ''}
 }
 function destination(value){
  const url=validUrl(value);
  if(url)return {type:'url',url};
  const query=clean(value,300);
  if(!query||/^[a-z][a-z0-9+.-]*:/i.test(query))return null;
  return {type:'search',url:'https://quantaphi.org/?q='+encodeURIComponent(query),query};
 }
 function image(value){
  const raw=String(value||'');
  if(/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(raw)&&raw.length<105000)return raw;
  return validUrl(raw);
 }
 function sanitize(item){
  const url=validUrl(item?.url);
  if(!url)return null;
  const host=new URL(url).hostname;
  const title=clean(item?.title,140)||host;
  const id=/^pt-[a-z0-9_-]{5,90}$/i.test(String(item?.id))?item.id:'pt-'+(root.crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
  return {id,url,title,preview:image(item?.preview),note:clean(item?.note,420),updatedAt:clean(item?.updatedAt,40)||new Date().toISOString()};
 }
 function read(storage=root.localStorage){
  try{
   const data=JSON.parse(storage.getItem(KEY)||'[]');
   return Array.isArray(data)?data.slice(0,LIMIT).map(sanitize).filter(Boolean):[];
  }catch{return []}
 }
 function write(tiles,storage=root.localStorage){
  try{storage.setItem(KEY,JSON.stringify(tiles.slice(0,LIMIT)));return true}catch{return false}
 }
 function save(tile,storage=root.localStorage){
  const candidate=sanitize(tile);
  if(!candidate)return {ok:false,reason:'Enter a valid HTTP or HTTPS destination.'};
  const records=read(storage);
  const existing=records.findIndex(x=>x.id===candidate.id);
  if(existing>=0)records.splice(existing,1);
  else if(records.some(x=>x.url===candidate.url))return {ok:false,reason:'That exact website is already saved. Edit its tile instead.'};
  records.unshift(candidate);
  if(!write(records,storage))return {ok:false,reason:'Browser storage is full or unavailable; tile was not saved.'};
  return {ok:true,item:candidate};
 }
 function remove(id,storage=root.localStorage){
  const records=read(storage),next=records.filter(t=>t.id!==id);
  return next.length!==records.length&&write(next,storage);
 }
 function remember(url,title,storage=root.localStorage){
  const valid=validUrl(url);if(!valid)return false;
  try{storage.setItem(RESUME,JSON.stringify({url:valid,title:clean(title,140),savedAt:new Date().toISOString()}));return true}catch{return false}
 }
 function last(storage=root.localStorage){
  try{const item=JSON.parse(storage.getItem(RESUME)||'null');if(!item)return null;const url=validUrl(item.url);return url?{url,title:clean(item.title,140),savedAt:clean(item.savedAt,40)}:null}catch{return null}
 }
 const api=Object.freeze({KEY,RESUME,LIMIT,validUrl,destination,sanitize,read,save,remove,remember,last});
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.InfinityPlatinumCore=api;
})(typeof window!=='undefined'?window:globalThis);
