export default {
 async fetch(request) {
  const incoming=new URL(request.url);
  let path=incoming.pathname;
  if(path==='/'||path==='/index.html')path='/QuantaPhi/index.html';
  else if(!path.slice(1).includes('/'))path='/QuantaPhi'+path;
  const origin=new URL('https://www-infinity4.github.io'+path);
  origin.search=incoming.search;
  const fresh=/\.(?:html|js|css|json)$/i.test(path);
  if(fresh)origin.searchParams.set('__qpedge','20261003-domain3');
  const headers=new Headers(request.headers);headers.delete('Host');headers.delete('Cookie');headers.delete('Authorization');
  if(fresh)headers.set('Cache-Control','no-cache');
  const upstream=await fetch(new Request(origin,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'follow'}));
  const out=new Headers(upstream.headers);out.set('x-quantaphi-edge','quantaphi-net-v3-assets');
  if(fresh)out.set('Cache-Control','no-cache, max-age=0, must-revalidate');
  return new Response(upstream.body,{status:upstream.status,headers:out});
 }
};
