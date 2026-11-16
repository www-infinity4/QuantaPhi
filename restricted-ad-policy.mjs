/* Restricted advertising approval gate.
 * The browser MUST NEVER be the authority for age or jurisdiction.
 * Its only input is a same-origin, session-bound server decision after explicit opt-in.
 * The server must enforce verification, local legality, licenses, moderation
 * and opt-out again before delivering any creative. This is defense-in-depth. */
const DAYS=86400000;
const clean=(v,n)=>String(v||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,n);
const exactHttps=(raw)=>{
 try{
  const url=new URL(raw);
  if(url.protocol!=='https:'||url.username||url.password||url.port||!url.hostname.includes('.')||url.hostname.includes(':')||/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname))return null;
  return url;
 }catch{return null}
};
const fromPublisher=(raw,domain)=>{
 const url=exactHttps(raw);
 return url&&(url.hostname===domain||url.hostname.endsWith('.'+domain))?url:null;
};
export function eligibleCreative(item,decision,now=Date.now()){
 if(decision?.allowed!==true||decision?.verified_over_21!==true||decision?.opted_in!==true||
    decision?.category!=='cannabis'||!/^US-[A-Z]{2}$/.test(decision.jurisdiction||''))return null;
 if(!item||item.approved!==true||item.category!=='cannabis'||!Array.isArray(item.approved_jurisdictions)||
    !item.approved_jurisdictions.includes(decision.jurisdiction))return null;
 const review=Date.parse(item.reviewed_at);
 if(!Number.isFinite(review)||review>now||now-review>30*DAYS||!clean(item.license_id,120)||!clean(item.advertiser,100))return null;
 const domain=String(item.publisher_domain||'').toLowerCase().replace(/^www\./,'');
 if(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain))return null;
 const source=fromPublisher(item.url,domain),image=fromPublisher(item.image,domain);
 if(!source||!image||image.search||/\/(?:track|pixel|beacon)(?:[/.]|$)/i.test(image.pathname)||
    /\.(?:gif|svg)(?:$|\?)/i.test(image.pathname))return null;
 const id=clean(item.id,70),title=clean(item.title,125);
 if(!/^[a-z0-9-]{3,70}$/.test(id)||!title)return null;
 return {id,title,description:clean(item.description,230),
  advertiser:clean(item.advertiser,100),image:image.href,url:source.href};
}
export function chooseNextCreative(items,lastId='',seen=[]){
 if(!Array.isArray(items)||!items.length)return null;
 const used=new Set(Array.isArray(seen)?seen:[]);
 let candidate=items.find(x=>x.id!==lastId&&!used.has(x.id));
 if(!candidate)candidate=items.find(x=>x.id!==lastId);
 return candidate||items[0];
}
