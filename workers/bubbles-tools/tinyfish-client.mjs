// Read-only TinyFish bridge for Bubbles and Quick Cards. Never sees TINYFISH_API_KEY.
const trim=(v,n=3500)=>typeof v==='string'?v.trim().slice(0,n):'';
const build=(request,body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store',
 'Content-Type':'application/json','Access-Control-Allow-Origin':
 ['https://quantaphi.org','https://www.quantaphi.org','https://www-infinity4.github.io'].includes(request.headers.get('Origin'))
 ?request.headers.get('Origin'):'https://quantaphi.org','Vary':'Origin'}});
export async function readViaTinyfish(request,env,body){
 if(!env.TINYFISH_BROKER?.fetch||!env.TINYFISH_BRIDGE_TOKEN)
  return build(request,{ok:false,error:'tinyfish_broker_not_configured',receipt:{tool:'tinyfish.fetch',status:'blocked'}},503);
 const operation=body.tool==='tinyfish.search'?'search':'fetch';
 const payload=operation==='search'?{operation,query:trim(body.query,250)}:{operation,url:trim(body.url,1500)};
 if(!(payload.query||payload.url))
  return build(request,{ok:false,error:'missing_source',receipt:{tool:'tinyfish.'+operation,status:'invalid_input'}},400);
 try{
  const r=await env.TINYFISH_BROKER.fetch(new Request('https://continuity-session-coordinator.internal/internal/tinyfish',{
   method:'POST',headers:{'Content-Type':'application/json','X-Tinyfish-Bridge-Token':env.TINYFISH_BRIDGE_TOKEN},
   body:JSON.stringify(payload),signal:AbortSignal.timeout(22000)}));
  const raw=await r.text();if(raw.length>200000)throw Error('broker_response_too_large');
  const result=JSON.parse(raw);
  if(!r.ok||result.ok!==true)return build(request,{ok:false,error:trim(result.error,100)||'tinyfish_unavailable',
   receipt:{tool:'tinyfish.'+operation,status:'failed',upstreamStatus:r.status}},r.status>=400&&r.status<500?400:502);
  const data=result.data;
  const page=typeof data?.content==='string'?data.content:
   typeof data?.markdown==='string'?data.markdown:
   typeof data?.results?.[0]?.markdown==='string'?data.results[0].markdown:
   typeof data?.results?.[0]?.content==='string'?data.results[0].content:
   typeof data?.results?.[0]?.text==='string'?data.results[0].text:
   JSON.stringify(data);
  const excerpt=trim(page,4800);
  return build(request,{ok:true,output:excerpt,sourceUrl:result.sourceUrl||null,
   observedAt:result.observedAt,provider:'TinyFish',data:result.data,
   receipt:{tool:'tinyfish.'+operation,status:'complete',sourceReadVerified:true,
    provider:'TinyFish',paidAutomation:false,repositoryActionsVerified:false}});
 }catch{
  return build(request,{ok:false,error:'tinyfish_broker_unavailable',
   receipt:{tool:'tinyfish.'+operation,status:'failed'}},502);
 }
}
