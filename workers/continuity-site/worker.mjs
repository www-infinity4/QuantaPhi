/* Public static shell only. Private work stays behind the existing Brain owner gate. */
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',mjs:'text/javascript; charset=utf-8',md:'text/markdown; charset=utf-8'};
async function hashes(html,tag){
 const values=[];
 for(const match of html.matchAll(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+tag+'>','g'))){
  if(!match[1].trim())continue;
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(match[1])));
  values.push("'sha256-"+btoa(String.fromCharCode(...bytes))+"'");
 }
 return values.join(' ');
}
export function createContinuitySite(assets,sourceRef){
 if(!/^[a-f0-9]{40}$/.test(sourceRef))throw Error('pinned_source_required');
 return {async fetch(request,env){
  const url=new URL(request.url);
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
  const relative=url.pathname.startsWith('/continuity/')?url.pathname.slice('/continuity/'.length):url.pathname.replace(/^\/+/, '');
  const file=!relative?'index.html':relative.endsWith('/')?relative+'index.html':relative;
  if(/^api\/bubbles\/public-x\/(health|inbox)$/.test(file)){
   if(!env.PUBLIC_X)return Response.json({ok:false,error:'public_reader_unavailable'},{status:503});
   try{
    // Do not forward caller credentials, cookies, URLs or arbitrary source paths.
    const response=await env.PUBLIC_X.fetch(new Request('https://public-x.internal/'+file.split('/').at(-1)));
    return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
   }catch{return Response.json({ok:false,error:'public_reader_unavailable'},{status:503});}
  }
  if(!Object.hasOwn(assets,file))return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
  const body=assets[file],owner=file==='owner/index.html';
  const scriptHashes=owner?await hashes(body,'script'):'',styleHashes=owner?await hashes(body,'style'):'';
  const policy="default-src 'self'; script-src 'self' "+scriptHashes+"; style-src 'self' "+styleHashes+
   "; connect-src 'self' https://api.github.com"+(owner?' https://infinity-brain-clock.marvaseater.workers.dev':'')+
   "; base-uri 'self'; object-src 'none'; frame-ancestors 'none'";
  return new Response(request.method==='HEAD'?null:body,{headers:{'Content-Type':types[file.split('.').at(-1)]||'text/plain; charset=utf-8',
   'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':policy,'X-Continuity-Source':sourceRef}});
 }};
}
