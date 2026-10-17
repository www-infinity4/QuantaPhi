// One owner-approved, ten-minute phone session. Runs inside the Brain Durable
// Object's concurrency gate. Delivery is at most once: an uncertain tap/send is
// never automatically replayed. The phone independently enforces local consent.
const KEY='phone-tool-session-v1', TTL=600000;
const fail=(error,status=400)=>({status,body:{ok:false,error}});
const reply=body=>({status:200,body:{ok:true,...body}});
const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
const uuid=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
const secret=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
export function validatePhoneCommand(body){
 const {id,action,target,text,observation}=body||{};
 if(!uuid(id)||!['read','tap','type','scroll_up','scroll_down'].includes(action))throw Error('invalid_phone_command');
 if(['tap','type','scroll_up','scroll_down'].includes(action)&&(!uuid(observation)||!Number.isInteger(target)||target<0||target>180))throw Error('fresh_phone_target_required');
 if(action==='type'&&(typeof text!=='string'||!text.trim()||text.length>6000))throw Error('invalid_phone_text');
 if(action!=='type'&&text!==undefined)throw Error('unexpected_phone_text');
 return {id,action,...(action==='read'?{}:{target,observation}),...(action==='type'?{text}: {})};
}
function publicState(s,now){
 return {sessionId:s.id,expiresAt:s.expiresAt,connected:now-s.seenAt<15000,
  status:s.pending?'queued':s.inFlight?'executing':'ready',used:s.used,
  receipt:s.receipt||null,scope:'IBM and Gemini in Chrome; explicit local Android consent'};
}
export async function phoneTool(storage,op,body,deviceToken='',now=Date.now()){
 let s=await storage.get(KEY);
 if(s&&s.expiresAt<=now){await storage.delete(KEY);s=null;}
 if(op==='open'){
  if(!uuid(body.generation))return fail('invalid_phone_generation');
  // Repeated open cannot extend consent or take over an existing session.
  if(s)return fail('phone_session_already_open',409);
  const token=secret();s={id:crypto.randomUUID(),generation:body.generation,tokenHash:await hash(token),
   expiresAt:now+TTL,seenAt:now,used:0,commands:[],pending:null,inFlight:null,receipt:null};
  await storage.put(KEY,s);return reply({...publicState(s,now),deviceToken:token});
 }
 if(!s)return fail('phone_session_off',409);
 if(['next','result'].includes(op)){
  if(!/^[a-f0-9]{64}$/.test(deviceToken)||await hash(deviceToken)!==s.tokenHash)return fail('phone_device_required',401);
  if(body.generation!==s.generation)return fail('phone_generation_changed',409);
 }else if(op!=='status'&&body.sessionId!==s.id)return fail('phone_session_changed',409);
 if(op==='status')return reply(publicState(s,now));
 if(op==='close'){await storage.delete(KEY);return reply({status:'closed'});}
 if(op==='command'){
  let command;try{command=validatePhoneCommand(body);}catch(e){return fail(e.message);}
  if(s.commands.includes(command.id))return reply({...publicState(s,now),duplicate:true});
  if(now-s.seenAt>=15000)return fail('phone_not_connected',409);
  if(s.pending||s.inFlight)return fail('phone_action_in_progress',409);
  if(s.used>=100)return fail('phone_session_action_limit',429);
  s.used++;s.commands.push(command.id);s.pending={...command,expiresAt:now+30000};
  s.receipt=null;await storage.put(KEY,s);return reply({...publicState(s,now),commandId:command.id});
 }
 if(op==='next'){
  s.seenAt=now;
  if(s.inFlight&&now-s.inFlight.deliveredAt>30000){
   s.receipt={id:s.inFlight.id,ok:false,status:'outcome_unknown',error:'Receipt missing. Inspect the phone before any new action.'};
   // Keep inFlight: a late receipt can resolve it; no second action is allowed.
  }
  let command=null;
  if(s.pending){
   if(s.pending.expiresAt<=now)s.receipt={id:s.pending.id,ok:false,status:'expired'};
   else{command=s.pending;s.inFlight={id:command.id,deliveredAt:now};}
   s.pending=null;
  }
  await storage.put(KEY,s);return reply({sessionId:s.id,expiresAt:s.expiresAt,command});
 }
 if(op==='result'){
  const r=body.receipt;
  if(r?.id&&r.id===s.receipt?.id&&!s.inFlight)return reply({received:true,id:r.id,duplicate:true});
  if(!r||r.id!==s.inFlight?.id||JSON.stringify(r).length>35000)return fail('phone_receipt_rejected',409);
  s.receipt={id:r.id,ok:r.ok===true,status:r.ok===true?'android_reported':'blocked',
   result:r.result||null,error:typeof r.error==='string'?r.error.slice(0,200):null,receivedAt:now};
  s.inFlight=null;await storage.put(KEY,s);return reply({received:true,id:r.id});
 }
 return fail('unknown_phone_operation',404);
}
