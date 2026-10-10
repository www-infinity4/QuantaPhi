import { DurableObject } from 'cloudflare:workers';
const PERIOD=30000;
const REPOS=new Set(['QuantaPhi','Moltnook','Oracle-Octaves','claude-flow','InfinityPhi','OmniPhi','NewsPhi','Bitcoin-Crusher']);
const origins=new Set(['https://quantaphi.org','https://www.quantaphi.org','https://www-infinity4.github.io']);
function output(request,value){
 const origin=request.headers.get('Origin');
 return Response.json(value,{headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://quantaphi.org','Vary':'Origin'}});
}
export function validateInstruction(value){
 if(!value||value.target_element!=='robotDirections'||!['inspect_repository','idle'].includes(value.action)||
 !value.payload||typeof value.payload.reason!=='string'||value.payload.reason.length>1000)throw Error('instruction_schema_rejected');
 if(Object.keys(value).some(k=>!['target_element','action','payload'].includes(k))||
 Object.keys(value.payload).some(k=>k!=='reason'))throw Error('instruction_extra_fields_rejected');
 return value;
}
async function digest(value){
 const data=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return [...new Uint8Array(data)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function read(url,max=14000){
 const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(12000),headers:{Accept:'text/html,application/json,text/plain'}});
 if(!r.ok)throw Error('source_http_'+r.status);
 const reader=r.body.getReader();let bytes=0,chunks=[];
 try{while(bytes<max){const n=await reader.read();if(n.done)break;const c=n.value.subarray(0,max-bytes);chunks.push(c);bytes+=c.length;}}finally{await reader.cancel().catch(()=>{});}
 const data=new Uint8Array(bytes);let i=0;for(const c of chunks){data.set(c,i);i+=c.length;}
 return {url,text:new TextDecoder().decode(data),http:r.status,sha256:await digest(new TextDecoder().decode(data)),truncated:bytes===max};
}
export class BrainClock extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.ctx=ctx;this.env=env;this.running=false;}
 async emit(agent,to,kind,message,url){
  const entries=await this.ctx.storage.get('events')||[];
  entries.push({id:crypto.randomUUID(),agent,to,kind,phase:kind,project:'Robot Brain',when:new Date().toISOString(),message:String(message).slice(0,390),
   url:url||'https://infinity-brain-clock.marvaseater.workers.dev/activity/feed.json'});
  await this.ctx.storage.put('events',entries.slice(-1000));
 }
 async fetch(request){
  if(new URL(request.url).pathname==='/start'){
   if(!await this.ctx.storage.getAlarm())await this.ctx.storage.setAlarm(Date.now()+1000);
   return Response.json({ok:true});
  }
  const state=await this.ctx.storage.get('state')||{status:'starting'};
  if(new URL(request.url).pathname==='/feed')return Response.json({schemaVersion:1,items:await this.ctx.storage.get('events')||[],state});
  return Response.json({ok:true,...state,periodMs:PERIOD,nextAlarm:await this.ctx.storage.getAlarm(),executor:'bounded repository inspection; no code writer'});
 }
 async alarm(){
  if(this.running)return;this.running=true;
  let delay=PERIOD;
  // Recovery alarm is installed before network calls, so a crashed turn can recover.
  await this.ctx.storage.setAlarm(Date.now()+120000);
  try{
   const page=await read('https://quantaphi.org/',150000);
   const rows=await this.env.WORK_DB.prepare("SELECT id,context_json,request FROM work_tickets WHERE status IN ('ready','working','blocked') AND json_extract(context_json,'$.kind')='robot-directions' ORDER BY created_at ASC LIMIT 100").all();
   let selected=null;
   for(const ticket of rows.results||[]){
    let context;try{context=JSON.parse(ticket.context_json);}catch{continue;}
    for(const job of context.color_jobs||[]){
     const revision=await digest(JSON.stringify({instructions:job.instructions,acceptance:job.acceptance,repository:job.repository}));
     const key='receipt:'+ticket.id+':'+job.id+':'+revision;
     if(!await this.ctx.storage.get(key)){selected={ticket,context,job,key};break;}
    }
    if(selected)break;
   }
   const telemetry={page:{http:page.http,sha256:page.sha256,brainMounted:page.text.includes('id="quantaAgentIterations"'),
    instructionMounted:page.text.includes('id="robotDirections"')},pendingJob:selected?{ticketId:selected.ticket.id,job:selected.job}:null};
   const signature=await digest(JSON.stringify(telemetry));
   const state=await this.ctx.storage.get('state')||{};
   if(signature!==state.signature){
    await this.emit('state-delta-tracker','blueberry','observation','Read the live QuantaPhi page and checked saved owner jobs. HTTP '+page.http+'. No browser interaction or repair is claimed.','https://quantaphi.org/');
    let plan;
    try{plan=await this.env.MODELS.plan(telemetry);validateInstruction(plan.instruction);
     await this.emit('blueberry','purple-pearl','model instruction','Gemini returned a validated '+plan.instruction.action+' instruction ('+plan.model+').');
    }catch(e){
     // Fail visibly, back off, and retain the unhandled queue. No fake Gemini fallback.
     throw Error('Gemini: '+e.message);
    }
    if(selected&&plan.instruction.action==='inspect_repository'){
     const {ticket,context,job,key}=selected;
     const repo=String(job.repository||'').replace(/^www-infinity4\//,'');
     if(!REPOS.has(repo))throw Error('repository_outside_inspection_allowlist');
     const sources=[];
     for(const file of ['README.md','index.html']){
      try{sources.push(await read('https://raw.githubusercontent.com/www-infinity4/'+repo+'/main/'+file,9000));}
      catch(e){sources.push({url:'https://github.com/www-infinity4/'+repo,unavailable:e.message});}
     }
     await this.emit('greenbeans','pink-panther','repository inspection','Inspected '+sources.filter(s=>s.http===200).length+' bounded source files for '+ticket.id+'/'+job.id+'. Source excerpts and hashes retained.','https://github.com/www-infinity4/'+repo);
     const reviewed=await this.env.MODELS.review({job,receipts:sources,page:telemetry.page});
     const review=reviewed.review;
     if(typeof review.approved!=='boolean'||typeof review.summary!=='string'||typeof review.next!=='string')throw Error('purple_review_schema_rejected');
     const receipt={when:new Date().toISOString(),sources,gemini:{model:plan.model,instruction:plan.instruction},purple:{...reviewed},status:'blocked',blocker:'repository_write_executor_not_connected'};
     await this.ctx.storage.put(key,receipt);
     const fresh=await this.env.WORK_DB.prepare('SELECT context_json FROM work_tickets WHERE id=?').bind(ticket.id).first();
     const current=JSON.parse(fresh.context_json||'{}');
     const index=(current.color_jobs||[]).findIndex(j=>j.id===job.id);
     if(index>=0 && JSON.stringify(current.color_jobs[index].instructions)===JSON.stringify(job.instructions)){
      current.color_jobs[index]={...current.color_jobs[index],status:'blocked',last_inspected_at:receipt.when,
       progress:{summary:review.summary.slice(0,1500),next:review.next.slice(0,1500),blocker:receipt.blocker,receipt_key:key}};
      const serialized=JSON.stringify(current);
      if(serialized.length>24000)throw Error('ticket_context_full_receipt_retained_in_clock');
      // Compare-and-swap protects simultaneous owner edits.
      await this.env.WORK_DB.prepare("UPDATE work_tickets SET context_json=?,claimed_by='Purple Pearl / Brain Clock',status='working',updated_at=? WHERE id=? AND context_json=?")
       .bind(serialized,Date.now(),ticket.id,fresh.context_json).run();
     }
     await this.emit('purple-pearl','greenbeans','progress review','GPT-OSS reviewed the source evidence for '+ticket.id+'/'+job.id+'. Inspection is recorded; implementation is blocked because a repository writer is not connected.','https://github.com/www-infinity4/'+repo);
    }
    await this.ctx.storage.put('state',{status:selected?'inspecting_queue':'watching',lastTick:Date.now(),signature,failures:0,
     provider:plan.provider,model:plan.model,monitor:'live HTML and source reads; no rendered-browser telemetry'});
   }else await this.ctx.storage.put('state',{...state,status:'idle',lastTick:Date.now(),failures:0});
  }catch(e){
   const previous=await this.ctx.storage.get('state')||{},failures=Math.min(8,(previous.failures||0)+1);
   delay=Math.min(30*60*1000,PERIOD*2**failures);
   if(previous.error!==e.message)await this.emit('pink-panther','purple-pearl','blocked','Loop caught '+e.message+'. Work is retained; next attempt backs off. No completion is claimed.');
   await this.ctx.storage.put('state',{...previous,status:'blocked',error:e.message,failures,lastTick:Date.now(),retryAt:Date.now()+delay});
  }finally{this.running=false;await this.ctx.storage.setAlarm(Date.now()+delay);}
 }
}
export default{
 async scheduled(event,env){await env.CLOCK.get(env.CLOCK.idFromName('infinity-main')).fetch('https://clock.internal/start');},
 async fetch(request,env){
  const path=new URL(request.url).pathname;
  if(request.method!=='GET'||!['/health','/activity/feed.json'].includes(path))return new Response('Not found',{status:404});
  const r=await env.CLOCK.get(env.CLOCK.idFromName('infinity-main')).fetch('https://clock.internal/'+(path.includes('feed')?'feed':'status'));
  return output(request,await r.json());
 }
};
