/* Fixed source allowlist, same-origin byte-range streaming for the reel editor.
   Archive's download redirect does not consistently retain its CORS header. */
export const SOURCES={
 night_of_the_living_dead_dvd:'https://archive.org/download/night_of_the_living_dead_dvd/Night.mp4',
 HouseOnHauntedHill1959:'https://archive.org/download/HouseOnHauntedHill1959/House-On-Haunted-Hill_512kb.mp4',
 HorrorExpress:'https://archive.org/download/HorrorExpress/MoviePowderPresentsHorrorExpress_512kb.mp4',
 Nosferatu1922_58:'https://archive.org/download/Nosferatu1922_58/Nosferatu-mid-3.mp4',
 WhiteZombie:'https://archive.org/download/WhiteZombie/White_Zombie_512kb.mp4',
 TheLittleShopOfHorrors:'https://archive.org/download/TheLittleShopOfHorrors/The%20Little%20Shop%20of%20Horrors.mp4'
};
export default {async fetch(request){
 const url=new URL(request.url);if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const id=url.pathname.slice('/api/cinema-media/'.length);const source=Object.hasOwn(SOURCES,id)?SOURCES[id]:'';if(!source||!url.pathname.startsWith('/api/cinema-media/'))return new Response('Unknown cinema source',{status:404});
 const range=request.headers.get('Range');if(range&&!/^bytes=(?:\d+-\d*|-\d+)$/.test(range))return new Response('Single byte range required',{status:416});
 const headers={'Accept':'video/mp4'};if(range)headers.Range=range;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 let upstream;try{let target=source;for(let hop=0;hop<4;hop++){upstream=await fetch(target,{method:request.method,headers,redirect:'manual',signal:controller.signal,cf:{cacheTtl:0}});if(![301,302,303,307,308].includes(upstream.status))break;const next=new URL(upstream.headers.get('Location'),target);if(next.protocol!=='https:'||!(next.hostname==='archive.org'||next.hostname.endsWith('.archive.org')))return new Response('Unexpected source destination',{status:502});target=next.href;}}catch{return new Response('Archive source unavailable',{status:502})}finally{clearTimeout(timer)}
 const final=new URL(upstream.url);if(final.protocol!=='https:'||!(final.hostname==='archive.org'||final.hostname.endsWith('.archive.org')))return new Response('Unexpected source destination',{status:502});
 if(!upstream.ok&&upstream.status!==416)return new Response('Archive source unavailable',{status:502});
 const out=new Headers({'Content-Type':'video/mp4','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Cache-Control':'public,max-age=3600'});
 for(const key of ['Content-Length','Content-Range','ETag','Last-Modified'])if(upstream.headers.has(key))out.set(key,upstream.headers.get(key));
 return new Response(request.method==='HEAD'?null:upstream.body,{status:upstream.status,headers:out});
}};
