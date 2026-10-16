/* Infinity Phone: PUBLIC UI offline shell, not a working offline call.
 * Root scope is deliberately /phone/ and not all QuantaPhi services.
 * Owner-key backups and private telephone number mappings stay OUT of Cache API.
 */
'use strict';
const VERSION='phone-shell-20261015-a';
const CACHE='infinity-'+VERSION;
const PREFIX='infinity-phone-shell-';
const SHELL='/phone/index.html';
const STATIC=[
 SHELL,
 '/phone/phone.css?v=20261015-offline1',
 '/phone/quickdial.js?v=20261015-infinitysignal1',
 '/phone/phone.js?v=20261015-infinitysignal1'
];
const base=self.location.origin;
const whitelist=new Set(STATIC.map(u=>new URL(u,base).href));
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try{await cache.addAll(STATIC.map(u=>new Request(u,{cache:'reload',credentials:'omit'})))}
  catch(e){await caches.delete(CACHE);throw e}
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name.startsWith(PREFIX)&&name!==CACHE)
    .map(name=>caches.delete(name)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||request.headers.has('authorization'))return;
 const url=new URL(request.url);
 if(url.origin!==base)return;
 // Exact canonical shell and public assets only. NEVER cache /phone/<alias>,
 // /phone/n/<number>, registration, carrier/SIP, owner/secret or server responses.
 const canonical=url.pathname==='/phone/'||url.pathname===SHELL;
 const asset=whitelist.has(url.href);
 if(!canonical&&!asset)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(asset&&!canonical){
   const cached=await cache.match(request);
   if(cached)return cached;
   const response=await fetch(request);
   if(response.ok&&response.type==='basic')await cache.put(request,response.clone());
   return response;
  }
  try{
   const response=await fetch(request);
   if(response.ok&&response.type==='basic'&&!url.search)
    await cache.put(SHELL,response.clone());
   return response;
  }catch(e){
   const offline=await cache.match(SHELL);
   if(offline)return offline;
   return new Response('Infinity Phone offline UI not installed. Live calls need Internet.',{
    status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}
   });
  }
 })());
});