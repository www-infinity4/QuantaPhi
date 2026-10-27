/* Brain -> coordinator private service-binding transport for TinyFish Web Agent.
 * No user-facing route is authenticated by a mere Origin header. This route
 * requires the secret shared only between these two Cloudflare Workers.
 * Install in the existing coordinator fetch handler before its GET-only guard.
 */
const PREFIX='/internal/tinyfish';
const API='https://agent.tinyfish.ai';
const ANSWER_HEADERS={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const fail=(error,status)=>Response.json({ok:false,error},{status,headers:ANSWER_HEADERS});
const sameSecret=(a,b)=>{
 if(typeof a!=='string'||typeof b!=='string'||a.length<16||a.length!==b.length)return false;
 let differing=0;for(let i=0;i<a.length;i++)differing|=a.charCodeAt(i)^b.charCodeAt(i);
 return differing===0;
};
const runIdPattern=/^\/v1\/runs\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const publicHost=h=>/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,25}$/i.test(h)&&!/\.local$|\.internal$/.test(h);
async function boundedJSON(response){
 if(Number(response.headers.get('content-length'))>65536)throw Error('size');
 const r=response.body?.getReader();if(!r)throw Error('empty');
 let size=0;const parts=[];
 try{for(;;){const {value,done}=await r.read();if(done)break;size+=value.byteLength;if(size>65536){await r.cancel();throw Error('size')}parts.push(value)}}
 finally{r.releaseLock();}
 const out=new Uint8Array(size);let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length}
 return JSON.parse(new TextDecoder().decode(out));
}
export async function handlePrivateTinyfishBridge(request,env,{fetcher=fetch}={}){
 const url=new URL(request.url),path=url.pathname;
 if(!path.startsWith(PREFIX+'/'))return null;
 if(!env.TINYFISH_API_KEY||!env.TINYFISH_BRIDGE_TOKEN)return fail('bridge_unconfigured',503);
 const auth=request.headers.get('Authorization')||'';
 if(!auth.startsWith('Bearer ')||!sameSecret(auth.slice(7),env.TINYFISH_BRIDGE_TOKEN))return fail('forbidden',403);
 const subpath=path.slice(PREFIX.length);
 const run=subpath==='/v1/automation/run-async'&&request.method==='POST';
 const status=runIdPattern.test(subpath)&&request.method==='GET';
 if(!run&&!status)return fail('unsupported_operation',405);
 let payload;
 if(run){
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return fail('invalid_content_type',415);
  if(Number(request.headers.get('Content-Length'))>11000)return fail('payload_too_large',413);
  try{payload=await request.json()}catch{return fail('invalid_json',400)}
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||
     Object.keys(payload).some(k=>!['url','goal','use_profile','profile_id','browser_profile','agent_config'].includes(k)))return fail('invalid_payload',400);
  let target;
  try{target=new URL(payload.url)}catch{return fail('invalid_target',400)}
  if(target.protocol!=='https:'||!publicHost(target.hostname)||target.username||target.password||target.port||target.href.length>1500)return fail('invalid_target',400);
  if(typeof payload.goal!=='string'||payload.goal.length<30||payload.goal.length>8000||
     !payload.goal.includes('READ-ONLY Quick Card navigation worker'))return fail('not_read_only_goal',400);
  if(payload.browser_profile!=='lite'||!Number.isInteger(payload.agent_config?.max_duration_seconds)||
     payload.agent_config.max_duration_seconds>120||payload.agent_config.max_duration_seconds<1)return fail('invalid_runtime',400);
  if(payload.use_profile===true&&!/^prof_[a-zA-Z0-9]{8,80}$/.test(payload.profile_id||''))return fail('invalid_profile',400);
  if(payload.use_profile!==true&&payload.profile_id!==undefined)return fail('unwanted_profile',400);
 }
 try{
  const response=await fetcher(API+subpath,{method:run?'POST':'GET',redirect:'manual',
   headers:{'X-API-Key':env.TINYFISH_API_KEY,...(run?{'Content-Type':'application/json'}:{})},
   ...(run?{body:JSON.stringify(payload)}:{}),signal:AbortSignal.timeout(18000)});
  if(!response.ok){await response.body?.cancel();return fail('tinyfish_upstream_'+response.status,502)}
  return Response.json(await boundedJSON(response),{headers:ANSWER_HEADERS});
 }catch{return fail('tinyfish_unavailable',502)}
}
