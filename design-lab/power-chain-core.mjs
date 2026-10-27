/* QuantaPhi Design Lab · Power Chain v1.
 * A one-press, consented, bounded public-index circuit. This queries QuantaPhi's
 * existing independent search broker; it DOES NOT fetch or sign in to 40 websites,
 * impersonate a provider, or claim the future 1000-host worker grid is online.
 */
export const BROKER='https://orange-brook-a2ac.marvaseater.workers.dev/search';
export const LANES=Object.freeze([
 Object.freeze({id:'collect',label:'Collect',purpose:'Find authentic item pages and grading references',icon:'◇',domains:Object.freeze(['ebay.com','usmint.gov','pcgs.com','ngccoin.com','vamworld.com','ha.com','stacksbowers.com','coinworld.com','numista.com','liveauctioneers.com'])}),
 Object.freeze({id:'research',label:'Research',purpose:'Trace original research, archives and reference evidence',icon:'✳',domains:Object.freeze(['nasa.gov','loc.gov','wikipedia.org','archive.org','si.edu','arxiv.org','britannica.com','nature.com','pubmed.ncbi.nlm.nih.gov','scholar.google.com'])}),
 Object.freeze({id:'shop',label:'Shop',purpose:'Discover listings on the real merchant websites',icon:'⌁',domains:Object.freeze(['walmart.com','target.com','homedepot.com','lowes.com','bestbuy.com','jcpenney.com','levi.com','guess.com','carhartt.com','macys.com'])}),
 Object.freeze({id:'signal',label:'Signal',purpose:'Compare original reporting across news and technology sources',icon:'↗',domains:Object.freeze(['reuters.com','apnews.com','cnn.com','foxnews.com','bbc.com','npr.org','cnbc.com','theverge.com','arstechnica.com','techcrunch.com'])})
]);
const cleanText=(s,max=200)=>String(s??'').replace(/\s+/g,' ').trim().slice(0,max);
export const ALL_TARGETS=Object.freeze([...new Set(LANES.flatMap(l=>l.domains))]);
const validDomain=d=>ALL_TARGETS.includes(d);
export function safeChainResult(target,row){
 if(!validDomain(target))return null;
 try{
  const url=new URL(String(row?.url||''));
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  if(!(url.hostname===target||url.hostname.endsWith('.'+target)))return null;
  const title=cleanText(row.title,150);
  if(!title)return null;
  url.hash='';
  return Object.freeze({target,title,url:url.href,snippet:cleanText(row.content||row.snippet||row.description,225)});
 }catch{return null;}
}
export function planChain({query,lanes=['collect'],limit=12}={}){
 const q=cleanText(query,110);
 if(q.length<3)throw Error('Enter a research intent of at least three characters.');
 const requested=new Set(Array.isArray(lanes)?lanes:[]);
 const selected=LANES.filter(l=>requested.has(l.id));
 if(!selected.length)throw Error('Choose at least one source circuit.');
 const count=Math.min(ALL_TARGETS.length,Math.max(1,Math.floor(Number(limit)||12)));
 const targets=[...new Set(selected.flatMap(l=>l.domains))].slice(0,count);
 return Object.freeze({query:q,lanes:selected.map(l=>l.id),targets:Object.freeze(targets),execution:'public-web-index',directWebsiteHits:0});
}
export function chainBrokerUrl(target,query){
 if(!validDomain(target))throw Error('Target not in approved circuit registry.');
 const args=new URLSearchParams({q:'site:'+target+' '+cleanText(query,110),format:'json',categories:'general',safesearch:'1'});
 return BROKER+'?'+args.toString();
}
/** onStep fires for each completed source, including 0-results, abort, and error. */
export async function runPowerChain(plan,{fetcher=fetch,signal,onStep=()=>{},concurrency=4}={}){
 if(!plan?.targets?.length||!plan.targets.every(validDomain))throw Error('Invalid source circuit');
 const targets=plan.targets;const results=[];const steps=[];let index=0;
 const parallel=Math.max(1,Math.min(4,Math.floor(Number(concurrency)||4)));
 async function worker(){
  while(index<targets.length&&!signal?.aborted){
   const target=targets[index++];let status='empty',found=[],message='';
   const own=new AbortController();
   const stop=()=>own.abort();
   if(signal?.aborted)stop();else signal?.addEventListener('abort',stop,{once:true});
   const timer=setTimeout(stop,9000);
   try{
    if(own.signal.aborted)throw Error('cancelled');
    const response=await fetcher(chainBrokerUrl(target,plan.query),{cache:'no-store',credentials:'omit',signal:own.signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw Error('Search service HTTP '+response.status);
    const data=await response.json();
    const seen=new Set();
    for(const row of (Array.isArray(data.results)?data.results:[]).slice(0,35)){
     const safe=safeChainResult(target,row);
     if(!safe||seen.has(safe.url))continue;seen.add(safe.url);found.push(safe);
     if(found.length===2)break;
    }
    if(found.length)status='matched';
   }catch(error){
    status=signal?.aborted?'stopped':'error';
    message=status==='error'?'Source search unavailable':'Run stopped';
   }finally{
    clearTimeout(timer);signal?.removeEventListener('abort',stop);
   }
   results.push(...found);
   const step=Object.freeze({target,status,results:found.length,message});
   steps.push(step);onStep(step,{completed:steps.length,total:targets.length,matches:results.length});
  }
 }
 await Promise.all(Array.from({length:Math.min(parallel,targets.length)},()=>worker()));
 return Object.freeze({query:plan.query,targets:targets.length,checked:steps.length,matchedSources:steps.filter(x=>x.status==='matched').length,
  found:results.length,failed:steps.filter(x=>x.status==='error').length,
  stopped:Boolean(signal?.aborted),results,steps,finishedAt:new Date().toISOString(),execution:'public-web-index'});
}
