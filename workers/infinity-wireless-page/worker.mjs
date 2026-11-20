/* Tiny, isolated Infinity Wireless page route.
 * Serves reviewed first-party source; does not replace the QuantaPhi root Worker.
 * Route only /wireless*; /api/wireless/* belongs to the separate D1 intake Worker.
 */
const ORIGIN='https://raw.githubusercontent.com/www-infinity4/QuantaPhi/main';
const ASSETS=Object.freeze({
 '/wireless/':{file:'/wireless/index.html',type:'text/html; charset=utf-8'},
 '/wireless/index.html':{file:'/wireless/index.html',type:'text/html; charset=utf-8'},
 '/wireless/order.mjs':{file:'/wireless/order.mjs',type:'application/javascript; charset=utf-8'},
 '/wireless/switchboard.svg':{file:'/wireless/switchboard.svg',type:'image/svg+xml; charset=utf-8'}
});
export const routeAsset=path=>Object.hasOwn(ASSETS,path)?ASSETS[path]:null;
const headers={
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin',
 'Cache-Control':'public, max-age=90'
};
export default {async fetch(request){
 const url=new URL(request.url);
 if(url.pathname==='/wireless')return Response.redirect(url.origin+'/wireless/'+url.search,308);
 if(!['GET','HEAD'].includes(request.method))return Response.json({ok:false,error:'method_not_allowed'},{status:405});
 const asset=routeAsset(url.pathname);
 if(!asset)return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 try{
  const upstream=await fetch(ORIGIN+asset.file,{headers:{Accept:asset.type.split(';')[0]},cf:{cacheTtl:60,cacheEverything:true}});
  if(!upstream.ok)return new Response('Wireless card temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store'}});
  const out=new Headers(headers);
  out.set('Content-Type',asset.type);
  if(asset.file.endsWith('.html'))out.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; form-action 'self'; object-src 'none'; frame-ancestors 'self'; base-uri 'none'");
  return new Response(request.method==='HEAD'?null:upstream.body,{status:200,headers:out});
 }catch{return new Response('Wireless card temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store'}})}
}};
