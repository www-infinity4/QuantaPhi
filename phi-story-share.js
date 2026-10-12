/* Portable Phi story links: the full user-approved text travels with the URL.
   No backend publication, wallet mint or private draft upload occurs. */
(function(global){
 'use strict';
 const LIMIT=34000,MAX_LINK=18000;
 const encode64=bytes=>{
   let raw='';
   for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));
   return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 };
 const decode64=value=>{
   const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));
   return Uint8Array.from(raw,c=>c.charCodeAt(0));
 };
 const safeSource=url=>{try{const u=new URL(url);return u.protocol==='https:'?u.href:''}catch{return''}};
 async function create(record){
   const body=String(record?.body||record?.full||'');
   const title=String(record?.title||'').trim();
   if(!title||!body.trim())throw Error('The complete story is not ready to share.');
   const content={v:1,kind:record.kind==='fiction'?'fiction':'research',title:title.slice(0,180),
     body,summary:String(record.summary||'').slice(0,900),
     sourceTitle:String(record.sourceTitle||'').slice(0,250),sourceUrl:safeSource(record.sourceUrl)};
   const original=new TextEncoder().encode(JSON.stringify(content));
   if(original.length>LIMIT)throw Error('Story is too long for a portable link; copy the full story instead.');
   let data=original,format='j';
   if(typeof CompressionStream==='function'){
     try{
       const zipped=new Uint8Array(await new Response(new Blob([original]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
       if(zipped.length<original.length){data=zipped;format='g'}
     }catch(_){/* raw UTF-8 fallback */}
   }
   const link=new URL('/story/',location.origin);
   link.hash='s='+format+'.'+encode64(data);
   if(link.href.length>MAX_LINK)throw Error('Story is too long for a browser share link; copy its text instead.');
   return link.href;
 }
 async function read(fragment){
   const found=/^#s=([jg])\.([a-z0-9_-]+)$/i.exec(String(fragment||''));
   if(!found||found[2].length>MAX_LINK)throw Error('No complete shared story was supplied.');
   let data=decode64(found[2]);
   if(found[1]==='g'){
     if(typeof DecompressionStream!=='function')throw Error('This browser cannot unpack the story. Please update your browser.');
     data=new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
   }
   if(data.length>LIMIT)throw Error('Story exceeds the supported reader size.');
   const story=JSON.parse(new TextDecoder().decode(data));
   if(story?.v!==1||typeof story.title!=='string'||typeof story.body!=='string'||!story.title.trim()||!story.body.trim())throw Error('The shared story data is invalid.');
   return {...story,sourceUrl:safeSource(story.sourceUrl)};
 }
 global.PhiStoryShare={create,read};
})(window);
