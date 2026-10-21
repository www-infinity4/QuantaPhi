// Reusable signed conversation transport. Executes public Bubbles tools on the
// server; never impersonates an owner wallet or accesses phone/private history.
const GATEWAY='https://bubbles-tools.marvaseater.workers.dev/v1/assist';
const denied=(error,status)=>({ok:false,error,status});
async function approved(store){return (await store.chatgptStatus()).enabled&&(await store.status()).enabled;}
export async function serverAssist({claims,body,db,store,now=Date.now()}){
 if(!await approved(store))return denied('existing_five_day_approval_required',403);
 if(!body||Object.keys(body).some(k=>!['operation','text','turn'].includes(k))||!['assist','result'].includes(body.operation))return denied('invalid_assist_request',400);
 const turn=body.turn??0;
 if(!Number.isInteger(turn)||turn<0||turn>9)return denied('invalid_assist_turn',400);
 const id='chatgpt_assist_'+claims.run_id+'_'+turn;
 if(body.operation==='result'){
  const row=await db.prepare('SELECT status,result,expires_ms FROM bubbles_chatgpt_bridge WHERE id=?').bind(id).first();
  if(!row)return {ok:true,jobId:id,state:'missing'};
  // The verified identity fixes the run; no arbitrary ID or archive selector.
  if(row.expires_ms<=now)return denied('assist_result_expired',410);
  let result;try{result=JSON.parse(row.result||'null')}catch{}
  return {ok:true,jobId:id,state:row.status,...(result?{result}:{})};
 }
 if(typeof body.text!=='string'||!body.text.trim()||body.text.length>1800)return denied('invalid_assist_message',400);
 const text=body.text.trim(),payload=JSON.stringify({text});
 // A separate action and non-queued state prevent browser consumers from
 // claiming this server-owned operation. A retry cannot duplicate execution.
 await db.prepare("INSERT OR IGNORE INTO bubbles_chatgpt_bridge(id,action,payload,status,created_ms,updated_ms,expires_ms) VALUES(?,'server_assist',?,'server_pending',?,?,?)").bind(id,payload,now,now,now+240000).run();
 const row=await db.prepare('SELECT payload,status,expires_ms FROM bubbles_chatgpt_bridge WHERE id=?').bind(id).first();
 if(!row)return denied('assist_not_stored',503);
 if(row.payload!==payload)return denied('assist_turn_conflict',409);
 if(row.expires_ms<=now)return denied('assist_result_expired',410);
 if(row.status==='server_pending')await store.enqueueServerAssist(id);
 return {ok:true,jobId:id,state:row.status,expiresAt:row.expires_ms,execution:'server',ownerToolsVerified:false};
}

// Called by the existing consent Durable Object alarm, not request waitUntil.
export async function executeServerAssist({id,db,store,fetcher=fetch,now=Date.now()}){
 const row=await db.prepare("SELECT payload,status,expires_ms FROM bubbles_chatgpt_bridge WHERE id=? AND action='server_assist'").bind(id).first();
 if(!row||['complete','blocked'].includes(row.status))return;
 if(row.status==='working'||row.expires_ms<=now){
  await db.prepare("UPDATE bubbles_chatgpt_bridge SET status=?,result=?,updated_ms=? WHERE id=? AND action='server_assist'").bind('blocked',JSON.stringify({ok:false,error:row.status==='working'?'execution_interrupted':'assist_result_expired'}),now,id).run();
  return;
 }
 const claimed=await db.prepare("UPDATE bubbles_chatgpt_bridge SET status='working' WHERE id=? AND action='server_assist' AND status='server_pending'").bind(id).run();
 if(claimed.meta?.changes!==1)return;
 const {text}=JSON.parse(row.payload);
   let result={ok:false,error:'bubbles_server_unavailable'},state='blocked',phase='consent',gatewayStatus=0;
   try{
    if(!await approved(store))throw Error('consent_revoked');
    phase='gateway_fetch';
    const response=await fetcher(GATEWAY,{method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},
     body:JSON.stringify({request:text,input:text,mcp:true}),signal:AbortSignal.timeout(90000),redirect:'manual'});
    gatewayStatus=response.status;
    if(!response.ok)throw Error('gateway_http_'+response.status);
    phase='gateway_json';
    const data=await response.json();
    phase='response_validation';
    if(!await approved(store))throw Error('consent_revoked');
    const output=String(data.output||data.output_text||'').trim();
    if(data.ok!==true||!output||!data.receipt)throw Error('no_verified_bubbles_response');
    result={ok:true,output:output.slice(0,8000),receipt:{tool:String(data.receipt.tool||'conversation').slice(0,100),status:String(data.receipt.status||'unverified').slice(0,60)},
     sources:(Array.isArray(data.sources)?data.sources:[]).slice(0,8).map(s=>({title:String(s.title||'').slice(0,200),url:String(s.url||'').slice(0,1500)})),
     scope:'public_bubbles_conversation',ownerToolsVerified:false,phoneVerified:false};
    state='complete';
   }catch(error){result={ok:false,error:/^(?:consent_revoked|bubbles_tools_binding_missing|no_verified_bubbles_response|gateway_http_[1-5][0-9]{2})$/.test(error.message)?error.message:'bubbles_server_unavailable',phase,gatewayStatus};}
   await db.prepare("UPDATE bubbles_chatgpt_bridge SET status=?,result=?,updated_ms=? WHERE id=? AND action='server_assist' AND status='working'").bind(state,JSON.stringify(result),Date.now(),id).run();
}
