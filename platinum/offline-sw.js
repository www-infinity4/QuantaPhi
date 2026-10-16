/* Infinity Platinum: versioned OFFLINE SHELL ONLY, not an offline Internet or AI.
 * Scoped to /platinum/; never cache third-party requests, private account APIs,
 * authentication, wallet responses, voice, or user-specific URLs.
 */
'use strict';
const VERSION='platinum-shell-20261015-a';
const CACHE='infinity-'+VERSION;
const PREFIX='infinity-platinum-shell-';
const SHELL='/platinum/index.html';
const STATIC=[
 SHELL,
 '/platinum/platinum.css?v=20261015-offline1',
 '/phi-project-package.js?v=20261012-action1',
 '/platinum/core.js?v=20261014-platinum1',
 '/platinum/platinum.js?v=20261015-offline1'
];
const base=self.location.origin;
const whitelist=new Set(STATIC.map(u=>new URL(u,base).href));
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // Transactional installation: refuse to activate a half-installed offline app.
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
 // QuantaPhi homepage, Bubbles API, robot jobs and third-party content are never
 // claimed to function offline by this limited saved-projects application shell.
 const shellRoute=url.pathname==='/platinum/'||url.pathname===SHELL;
 const asset=whitelist.has(url.href);
 if(!shellRoute&&!asset)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(asset&&!shellRoute){
   const cached=await cache.match(request);
   if(cached)return cached;
   const response=await fetch(request);
   if(response.ok&&response.type==='basic')await cache.put(request,response.clone());
   return response;
  }
  try{
   const response=await fetch(request);
   // Cache only the canonical, unparameterized public HTML shell.
   if(response.ok&&response.type==='basic'&&!url.search){
    await cache.put(SHELL,response.clone());
   }
   return response;
  }catch(e){
   const offline=await cache.match(SHELL);
   if(offline)return offline;
   return new Response('Infinity Platinum offline shell was not installed while connected.',{
    status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}
   });
  }
 })());
});