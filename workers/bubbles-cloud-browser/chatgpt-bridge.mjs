/*
 * Explicit five-day owner-approved bridge between this account's Cloudflare API
 * D1 queue and the same Bubbles Browser Run session.
 * No browser bearer, session proof, live-view URL, or password is written to D1.
 */
export const BRIDGE_ACTIONS=Object.freeze(['read','navigate','click','type','viewport','message']);
const MAX_AGE_MS=5*60*1000;
const clip=(v,n)=>String(v||'').slice(0,n);
const err=(error,status=403)=>({ok:false,error,status});
export async function processChatGPTJob({db,store,request,env,body,browserTool,now=Date.now()}){
 if(!db?.prepare)return err('bridge_database_not_bound',503);
 const grant=await store.chatgptStatus();
 if(!grant.enabled)return err('chatgpt_five_day_approval_required',403);
 const record=await db.prepare("SELECT id,action,payload,created_ms,expires_ms FROM bubbles_chatgpt_bridge WHERE status='queued' ORDER BY created_ms LIMIT 1").first();
 if(!record)return {ok:true,queue:'empty'};
 if(typeof record.id!=='string'||record.id.length>80)return err('invalid_job_id',400);
 const expired=!Number.isFinite(Number(record.expires_ms))||Number(record.expires_ms)<now||
  !Number.isFinite(Number(record.created_ms))||Number(record.created_ms)>now+30000||now-Number(record.created_ms)>MAX_AGE_MS;
 const action=record.action;
 let args={};try{args=JSON.parse(record.payload||'{}')}catch{}
 if(!args||typeof args!=='object'||Array.isArray(args))args={};
 const claim=await db.prepare("UPDATE bubbles_chatgpt_bridge SET status='working',updated_ms=? WHERE id=? AND status='queued'").bind(now,record.id).run();
 if((claim.meta?.changes||0)!==1)return {ok:true,queue:'claimed_elsewhere'};
 const finish=async value=>{
  const safe=JSON.stringify(value).slice(0,12000);
  await db.prepare("UPDATE bubbles_chatgpt_bridge SET status=?,result=?,updated_ms=? WHERE id=? AND status='working'")
   .bind(value.ok?'complete':'blocked',safe,Date.now(),record.id).run();
  return {ok:true,jobId:record.id,status:value.ok?'complete':'blocked',result:value};
 };
 if(expired||!BRIDGE_ACTIONS.includes(action)){
  return finish({ok:false,error:expired?'job_expired':'unsupported_bridge_action'});
 }
 if(action==='message'){
  const text=clip(args.text,1800).trim();
  if(!text)return finish({ok:false,error:'empty_message'});
  // No model/owner privileges are inferred from a queued string.
  return {ok:true,jobId:record.id,status:'needs_bubbles_reply',message:text};
 }
 const existing=typeof body.sessionId==='string'&&/^[a-f0-9-]{36}$/i.test(body.sessionId);
 const browserAction=action==='navigate'&&!existing?'start':action;
 const payload={action:browserAction};
 if(existing){payload.sessionId=body.sessionId;payload.proof=body.proof}
 if(action==='navigate')payload.url=clip(args.url,1800);
 if(action==='click')payload.label=clip(args.label,110);
 if(action==='type'){payload.field=clip(args.field,100);payload.value=clip(args.value,500)}
 if(action==='viewport')payload.mode=args.mode==='phone'?'phone':'desktop';
 const forward=new Request('https://bubbles-cloud-browser.internal/v1/browser',{
  method:'POST',headers:{Origin:request.headers.get('Origin')||'https://quantaphi.org',
   Authorization:request.headers.get('Authorization')||'',
   'Content-Type':'application/json'},body:JSON.stringify(payload)});
 let result;
 try{const response=await browserTool(forward,env);result=await response.json()}
 catch{return finish({ok:false,error:'browser_operation_failed'})}
 if(!result.ok)return finish({ok:false,error:clip(result.error||result.result?.error||'browser_operation_blocked',100)});
 const details=result.result||{};
 const safe={ok:true,action,
  title:clip(details.title,150),url:clip(details.url||(action==='navigate'?args.url:''),1800),
  text:clip(details.text,8500),label:clip(details.label,120),
  status:clip(result.status||'verified',50)};
 const returned=await finish(safe);
 if(browserAction==='start'){
  // The private live view and owner proof go ONLY to the owner browser UI.
  returned.view={sessionId:result.sessionId,proof:result.proof,url:result.url};
 }
 return returned;
}
export async function completeChatGPTMessage({db,store,id,reply,now=Date.now()}){
 if(!(await store.chatgptStatus()).enabled)return err('chatgpt_five_day_approval_required',403);
 if(!/^[A-Za-z0-9_-]{12,80}$/.test(id||''))return err('invalid_job_id',400);
 const data={ok:reply?.ok===true,action:'message',
  reply:clip(reply?.reply,8000),error:clip(reply?.error,140)};
 const done=await db.prepare("UPDATE bubbles_chatgpt_bridge SET status=?,result=?,updated_ms=? WHERE id=? AND action='message' AND status='working'")
  .bind(data.ok?'complete':'blocked',JSON.stringify(data),now,id).run();
 return (done.meta?.changes||0)===1?{ok:true,status:data.ok?'complete':'blocked'}:err('message_not_pending',409);
}
