import {available,openVideo,openMedia} from './open-video.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function videoAPI(request,env,fetcher=fetch){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/api/video/media'&&request.method==='GET')return openMedia(request,env,fetcher);
 if(path==='/api/video/config'&&request.method==='GET')return json({ok:true,configured:!!env.XAI_API_KEY&&!!env.VIDEO_RATE_LIMITER,engines:available(env),defaultProvider:'open',provider:'Grok Imagine',model:env.XAI_VIDEO_MODEL||'grok-imagine-video-1.5'});
 if(request.method!=='POST')return json({ok:false,error:'Method not allowed'},405);
 if(request.headers.get('Origin')!==url.origin)return json({ok:false,error:'Same-origin request required'},403);

 const token=request.headers.get('Authorization')||'';
 if(!/^Bearer sq_[A-Za-z0-9_-]{32,}$/.test(token))return json({ok:false,error:'Connect your StarQuest wallet first.'},401);
 const wallet=await fetcher('https://unified-wallet.marvaseater.workers.dev/v1/wallet/state',{headers:{Authorization:token},signal:AbortSignal.timeout(10000)});
 if(!wallet.ok)return json({ok:false,error:'Wallet authentication failed'},401);
 const raw=await request.text();if(raw.length>15000000)return json({ok:false,error:'Reference image is too large'},413);
 let body;try{body=JSON.parse(raw)}catch{return json({ok:false,error:'Invalid JSON'},400)}
 if(body.provider==='open'){if(path==='/api/video/generate'&&(typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>6000||![5,10,15].includes(body.duration)||!['16:9','9:16','1:1'].includes(body.aspect_ratio)))return json({ok:false,error:'Invalid generation settings'},400);return openVideo(request,env,body,token,fetcher);}
 if(!env.XAI_API_KEY)return json({ok:false,error:'Imagine is not configured; select an open-model renderer.'},503);
 const headers={Authorization:'Bearer '+env.XAI_API_KEY,'Content-Type':'application/json'};
 let endpoint,payload;
 if(path==='/api/video/status'){
  if(!/^[a-zA-Z0-9_-]{8,160}$/.test(body.request_id||''))return json({ok:false,error:'Invalid job'},400);
  // A signed job receipt prevents one wallet from polling another wallet's render.
  if(!body.receipt||body.receipt!==await receipt(body.request_id,token,env.XAI_API_KEY))return json({ok:false,error:'Job ownership check failed'},403);
  endpoint='https://api.x.ai/v1/videos/'+body.request_id;
 }else if(path==='/api/video/generate'){
  if(typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>6000)return json({ok:false,error:'Describe your video in 1–6000 characters'},400);
  if(![5,10,15].includes(body.duration)||!['16:9','9:16','1:1'].includes(body.aspect_ratio)||!['720p','1080p'].includes(body.resolution))return json({ok:false,error:'Invalid video settings'},400);
  if(!env.VIDEO_RATE_LIMITER)return json({ok:false,error:'Video render limiter is not configured'},503);
  if(!(await env.VIDEO_RATE_LIMITER.limit({key:token})).success)return json({ok:false,error:'Render limit reached. Wait before starting another video.'},429);
  payload={model:env.XAI_VIDEO_MODEL||'grok-imagine-video-1.5',prompt:body.prompt.trim(),duration:body.duration,aspect_ratio:body.aspect_ratio,resolution:body.resolution,generate_audio:body.generate_audio===true};
  if(body.image){if(typeof body.image!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(body.image))return json({ok:false,error:'Use a PNG, JPG or WebP reference image'},400);payload.image={url:body.image};}
  endpoint='https://api.x.ai/v1/videos/generations';
 }else return json({ok:false,error:'Unknown video route'},404);
 try{
  const upstream=await fetcher(endpoint,{method:payload?'POST':'GET',headers,body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(30000)});
  if(!upstream.ok)return json({ok:false,error:upstream.status===429?'Imagine usage limit reached. Try later.':'Imagine rejected the request. Check provider access and credits.',providerStatus:upstream.status},502);
  const data=await upstream.json();
  if(payload){if(!data.request_id)return json({ok:false,error:'Provider returned no video job'},502);return json({ok:true,request_id:data.request_id,receipt:await receipt(data.request_id,token,env.XAI_API_KEY)});}
  if(data.status==='done'){
   let output;try{output=new URL(data.video?.url)}catch{return json({ok:false,error:'Provider returned no video'},502)}
   if(output.protocol!=='https:'||data.video?.respect_moderation===false)return json({ok:false,error:'Video unavailable'},502);
   return json({ok:true,status:'done',url:output.href,duration:data.video.duration});
  }
  return json({ok:true,status:data.status==='failed'?'failed':'pending'});
 }catch{return json({ok:false,error:'Video provider timed out. Resume the existing job; do not generate again.'},504)}
}
async function receipt(id,token,secret){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(id+'|'+token));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
