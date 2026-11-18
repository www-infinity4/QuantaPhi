/* ASTEROID RADIO · source-only public X Spaces catalog rules. No X audio or wallet state. */
const SPACE_HOSTS=new Set(['x.com','www.x.com','twitter.com','www.twitter.com']);
export function normalizeAsteroidEpisode(raw){
 if(!raw||typeof raw!=='object')return null;
 if(raw.handle&&String(raw.handle).toLowerCase()!=='a5t3r0ld')return null;
 let link;try{link=new URL(String(raw.source||raw.url||''));}catch{return null;}
 if(link.protocol!=='https:'||!SPACE_HOSTS.has(link.hostname.toLowerCase())||link.username||link.password||link.port)return null;
 const match=/^\/i\/spaces\/([a-zA-Z0-9]{10,25})\/?$/.exec(link.pathname);
 if(!match||!['indexed','verified_replay'].includes(raw.availability))return null;
 const title=String(raw.title||'ASTEROID RADIO X Space').trim().slice(0,180);
 if(!title)return null;
 return {id:match[1],title,source:'https://x.com/i/spaces/'+match[1],
   date:String(raw.date||'').slice(0,32),duration:String(raw.duration||'').slice(0,16),
   availability:raw.availability,playbackVerified:false};
}
export function normalizeAsteroidCatalog(entries){
 const items=new Map();
 for(const raw of (Array.isArray(entries)?entries:[]).slice(0,1000)){
  const episode=normalizeAsteroidEpisode(raw);
  if(episode&&!items.has(episode.id))items.set(episode.id,episode);
 }
 return [...items.values()];
}
export function chooseNextAsteroid(entries,currentId,seenIds=[],randomIndex=0){
 if(!entries.length)return null;
 const seen=new Set(seenIds);
 let pool=entries.filter(e=>!seen.has(e.id));
 if(!pool.length)pool=entries.filter(e=>e.id!==currentId);
 if(!pool.length)pool=entries;
 return pool[((Math.trunc(randomIndex)%pool.length)+pool.length)%pool.length];
}

/* Respect an authoritative empty public catalog. Only use static source records
 * after a transport/error/schema failure, never when the D1 owner removed rows. */
export async function readAsteroidCatalog(fetcher,apiUrl,fallbackUrl){
 try{
  const response=await fetcher(apiUrl,{cache:'no-store'});
  if(!response.ok)throw Error('public_catalog_unavailable');
  const body=await response.json();
  if(body?.ok!==true||!Array.isArray(body.episodes))throw Error('invalid_public_catalog');
  return {episodes:normalizeAsteroidCatalog(body.episodes),source:'Media Star public D1 index',unavailable:false};
 }catch{
  try{
   const response=await fetcher(fallbackUrl,{cache:'no-store'});
   if(!response.ok)throw Error('source_file_unavailable');
   const body=await response.json();
   if(body?.handle!=='A5T3R0lD'||!Array.isArray(body.episodes))throw Error('invalid_source_file');
   return {episodes:normalizeAsteroidCatalog(body.episodes),source:'source-backed fallback',unavailable:false};
  }catch{
   return {episodes:[],source:'no catalog available',unavailable:true};
  }
 }
}
