// Explicit user-triggered public Quick Card source read.
// API keys never reach the browser; only the server-side Bubbles adapter can
// call the authenticated coordinator. No model/tool text is executed.
export async function readTinyfishCardSource(source,{fetcher=fetch}={}){
 const r=await fetcher('https://bubbles-tools.marvaseater.workers.dev/v1/assist',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({tool:'tinyfish.fetch',request:'Read this Quick Card public source',url:source}),
  signal:AbortSignal.timeout(24000)});
 const result=await r.json();
 if(!r.ok||result?.receipt?.status!=='complete'||result.provider!=='TinyFish')
  throw Error(result?.error||'provider_unavailable');
 return {text:String(result.output||'').slice(0,2200),observedAt:result.observedAt||null,
  sourceUrl:result.sourceUrl||source,receipt:result.receipt};
}
