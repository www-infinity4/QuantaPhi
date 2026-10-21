// Reusable signed conversation transport. Executes public Bubbles tools on the
// server; never impersonates an owner wallet or accesses phone/private history.
const GATEWAY='https://bubbles-tools.marvaseater.workers.dev/v1/assist';
const denied=(error,status)=>({ok:false,error,status});
async function approved(store){return (await store.chatgptStatus()).enabled&&(await store.status()).enabled;}
export async function serverAssist({claims,body,db,store,schedule,fetcher=fetch,now=Date.now()}){
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
 const inserted=await db.prepare("INSERT OR IGNORE INTO bubbles_chatgpt_bridge(id,action,payload,status,created_ms,updated_ms,expires_ms) VALUES(?,'server_assist',?,'working',?,?,?)").bind(id,payload,now,now,now+240000).run();
 const row=await db.prepare('SELECT payload,status,expires_ms FROM bubbles_chatgpt_bridge WHERE id=?').bind(id).first();
 if(!row)return denied('assist_not_stored',503);
 if(row.payload!==payload)return denied('assist_turn_conflict',409);
 if(row.expires_ms<=now)return denied('assist_result_expired',410);
 if(inserted.meta?.changes===1){
  schedule((async()=>{
   let result={ok:false,error:'bubbles_server_unavailable'},state='blocked';
   try{
    if(!await approved(store))throw Error('consent_revoked');
    const response=await fetcher(GATEWAY,{method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},
     body:JSON.stringify({request:text,input:text,mcp:true}),signal:AbortSignal.timeout(20000),redirect:'error'});
    const data=await response.json();
    if(!await approved(store))throw Error('consent_revoked');
    const output=String(data.output||data.output_text||'').trim();
    if(!response.ok||data.ok!==true||!output||!data.receipt)throw Error('no_verified_bubbles_response');
    result={ok:true,output:output.slice(0,8000),receipt:{tool:String(data.receipt.tool||'conversation').slice(0,100),status:String(data.receipt.status||'unverified').slice(0,60)},
     sources:(Array.isArray(data.sources)?data.sources:[]).slice(0,8).map(s=>({title:String(s.title||'').slice(0,200),url:String(s.url||'').slice(0,1500)})),
     scope:'public_bubbles_conversation',ownerToolsVerified:false,phoneVerified:false};
    state='complete';
   }catch(error){result={ok:false,error:error.message==='consent_revoked'?'consent_revoked':'bubbles_server_unavailable'};}
   await db.prepare("UPDATE bubbles_chatgpt_bridge SET status=?,result=?,updated_ms=? WHERE id=? AND action='server_assist' AND status='working'").bind(state,JSON.stringify(result),Date.now(),id).run();
  })());
 }
 return {ok:true,jobId:id,state:row.status,expiresAt:row.expires_ms,execution:'server',ownerToolsVerified:false};
}
