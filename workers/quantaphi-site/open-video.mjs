// Private ComfyUI host; workflows are API exports from installed model nodes.
export const engines=[
 {id:'wan',name:'Wan',role:'Text/image scenes and character motion'},
 {id:'ltx',name:'LTX',role:'Audio/video generation with the installed LTX workflow'},
 {id:'hunyuan',name:'HunyuanVideo',role:'Detailed cinematic scenes'},
 {id:'cogvideo',name:'CogVideoX',role:'Text/image video experiments'},
 {id:'framepack',name:'FramePack',role:'Progressive longer image animation'}
];
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export function config(env){try{return JSON.parse(env.OPEN_VIDEO_WORKFLOWS||'{}')}catch{return {}}}
export function available(env){const workflows=config(env);return engines.map(e=>({...e,ready:!!(env.COMFY_URL&&env.OPEN_VIDEO_SECRET&&workflows[e.id]?.prompt&&workflows[e.id]?.bindings)}))}
export function choose(rows,requested,task){if(requested!=='auto')return rows.find(e=>e.id===requested&&e.ready)?.id||null;const order=task==='long'?['framepack','wan','ltx','hunyuan','cogvideo']:task==='audio'?['ltx','wan','hunyuan','cogvideo','framepack']:['wan','hunyuan','ltx','cogvideo','framepack'];return order.find(id=>rows.some(e=>e.id===id&&e.ready))||null}
export function workflow(template,input){const graph=structuredClone(template.prompt);for(const [field,targets]of Object.entries(template.bindings)){if(input[field]===undefined)continue;for(const [node,name]of targets){if(!graph[node]?.inputs)throw Error('Workflow binding points to a missing node');graph[node].inputs[name]=input[field]}}return graph}
async function signature(text,secret){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('')}
function base(env){const u=new URL(env.COMFY_URL);if(u.protocol!=='https:')throw Error('Private render host must use HTTPS');return u}
export async function openVideo(request,env,body,token,fetcher=fetch){
 const url=new URL(request.url),route=url.pathname.split('/').pop();
 if(!env.COMFY_URL||!env.OPEN_VIDEO_SECRET)return json({ok:false,error:'No open-model GPU renderer is connected yet.'},503);
 async function call(path,options={}){const headers={'Content-Type':'application/json'};if(env.COMFY_TOKEN)headers.Authorization='Bearer '+env.COMFY_TOKEN;const r=await fetcher(new URL(path,base(env)),{...options,headers,signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Render host returned '+r.status);return r}
 try{
  if(route==='generate'){
   const engine=choose(available(env),body.engine||'auto',body.task||'scene');if(!engine)return json({ok:false,error:'That engine has no installed workflow.'},503);
   if(!env.VIDEO_RATE_LIMITER)return json({ok:false,error:'Render limiter is not configured'},503);
   if(!(await env.VIDEO_RATE_LIMITER.limit({key:token})).success)return json({ok:false,error:'Render limit reached'},429);
   const template=config(env)[engine];
   if(body.generate_audio&&!template.capabilities?.audio)return json({ok:false,error:'This installed workflow does not generate audio. Turn off generated sound or choose an audio workflow.'},400);
   let image;
   if(body.image){
    if(!template.bindings.image)return json({ok:false,error:'This installed workflow does not accept a starting image.'},400);
    if(typeof body.image!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(body.image))return json({ok:false,error:'Invalid reference image'},400);
    const [prefix,encoded]=body.image.split(','),mime=prefix.slice(5,prefix.indexOf(';')),bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
    if(bytes.length>10*1024*1024)return json({ok:false,error:'Image exceeds 10 MB'},413);
    const form=new FormData();form.append('image',new Blob([bytes],{type:mime}),'oracle-'+crypto.randomUUID()+'.'+mime.split('/')[1]);form.append('type','input');
    const headers={};if(env.COMFY_TOKEN)headers.Authorization='Bearer '+env.COMFY_TOKEN;
    const upload=await fetcher(new URL('/upload/image',base(env)),{method:'POST',headers,body:form});if(!upload.ok)throw Error('Reference upload failed');const stored=await upload.json();image=stored.subfolder?stored.subfolder+'/'+stored.name:stored.name;
   }
   const [width,height]=body.aspect_ratio==='9:16'?[480,832]:body.aspect_ratio==='1:1'?[640,640]:[832,480];
   const graph=workflow(template,{prompt:body.prompt,width,height,frames:body.duration*24+1,fps:24,image,generate_audio:body.generate_audio===true,seed:crypto.getRandomValues(new Uint32Array(1))[0]});
   const d=await(await call('/prompt',{method:'POST',body:JSON.stringify({prompt:graph})})).json();
   if(!d.prompt_id||d.error||Object.keys(d.node_errors||{}).length)throw Error('The installed workflow could not start');
   const id=d.prompt_id;return json({ok:true,request_id:id,engine,receipt:await signature(id+'|'+token,env.OPEN_VIDEO_SECRET),provider:'open'});
  }
  if(route!=='status')return json({ok:false,error:'Unknown route'},404);
  if(!/^[\w-]{8,160}$/.test(body.request_id||'')||body.receipt!==await signature(body.request_id+'|'+token,env.OPEN_VIDEO_SECRET))return json({ok:false,error:'Job ownership check failed'},403);
  const d=await(await call('/history/'+body.request_id)).json(),job=d[body.request_id];
  if(!job)return json({ok:true,status:'pending'});
  if(job.status?.status_str==='error')return json({ok:true,status:'failed'});
  const outputs=Object.values(job.outputs||{}).flatMap(o=>[...(o.videos||[]),...(o.gifs||[]),...(o.images||[])]);
  const file=outputs.find(f=>/\.(mp4|webm)$/i.test(f.filename||''));
  if(!file)return json({ok:!job.status?.completed,status:'pending',error:'Workflow completed without an encoded MP4/WebM output'},job.status?.completed?502:200);
  const asset=JSON.stringify({filename:file.filename,subfolder:file.subfolder||'',type:'output'});const key=await signature(asset,env.OPEN_VIDEO_SECRET);
  const media=new URL('/api/video/media',url.origin);media.searchParams.set('asset',asset);media.searchParams.set('key',key);
  return json({ok:true,status:'done',url:media.href});
 }catch(e){return json({ok:false,error:e.message},502)}
}
export async function openMedia(request,env,fetcher=fetch){const u=new URL(request.url),asset=u.searchParams.get('asset')||'';if(!env.OPEN_VIDEO_SECRET||asset.length>2000||u.searchParams.get('key')!==await signature(asset,env.OPEN_VIDEO_SECRET))return json({ok:false,error:'Invalid media link'},403);let f;try{f=JSON.parse(asset)}catch{return json({ok:false,error:'Invalid media'},400)}const src=new URL('/view',base(env));for(const [k,v]of Object.entries(f))src.searchParams.set(k,v);const h={};if(env.COMFY_TOKEN)h.Authorization='Bearer '+env.COMFY_TOKEN;if(request.headers.has('Range'))h.Range=request.headers.get('Range');const r=await fetcher(src,{headers:h});const out=new Headers();for(const k of ['Content-Type','Content-Length','Content-Range','Accept-Ranges'])if(r.headers.has(k))out.set(k,r.headers.get(k));out.set('Cache-Control','private,no-store');return new Response(r.body,{status:r.status,headers:out})}
