// Public read-only diagnostic. No account login, API key, browser cookie or provider billing.
const targets=[
 {name:'searxng_broker',url:'https://orange-brook-a2ac.marvaseater.workers.dev/search?'+new URLSearchParams({q:'radio astronomy',format:'json',categories:'general',safesearch:'1'})},
 {name:'bubbles_gateway_health',url:'https://bubbles-tools.marvaseater.workers.dev/health'}
];
for(const target of targets){
 const t=Date.now();
 try{
  const response=await fetch(target.url,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json'}});
  const data=await response.text();
  let parsed={};try{parsed=JSON.parse(data.slice(0,90000))}catch{}
  const result={
   target:target.name,status:response.status,contentType:response.headers.get('content-type')?.slice(0,60)||'',
   resultCount:Array.isArray(parsed.results)?parsed.results.length:null,
   error:typeof parsed.error==='string'?parsed.error.slice(0,80):null,
   location:response.status>=300&&response.status<400?'redirect_observed':null,
   durationMs:Date.now()-t
  };
  console.log('PUBLIC_BUBBLES_PROBE '+JSON.stringify(result));
 }catch(e){
  console.log('PUBLIC_BUBBLES_PROBE '+JSON.stringify({target:target.name,error:String(e?.name||'request_failed').slice(0,80),durationMs:Date.now()-t}));
 }
}
