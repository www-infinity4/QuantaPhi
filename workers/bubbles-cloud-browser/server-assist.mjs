// Reusable signed conversation transport. Executes public Bubbles tools on the
// server; never impersonates an owner wallet or accesses phone/private history.
const GATEWAY='https://bubbles-tools.marvaseater.workers.dev/v1/assist';
const denied=(error,status)=>({ok:false,error,status});
async function approved(store){return (await store.chatgptStatus()).enabled&&(await store.status()).enabled;}
export async function serverAssist({claims,body,db,store,fetcher=fetch,now=Date.now()}){
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
 if(row.status==='server_pending')await executeServerAssist({id,db,store,fetcher,now});
 const latest=await db.prepare('SELECT status FROM bubbles_chatgpt_bridge WHERE id=?').bind(id).first();
 return {ok:true,jobId:id,state:latest?.status||row.status,expiresAt:row.expires_ms,execution:'server',ownerToolsVerified:false};
}

// The signed test route has ten turns but no private chat archive. Reuse only
// already-completed turns from the SAME verified GitHub run, while both grants
// remain active. Previous model text is conversation context, never authority
// to claim that a tool or owner-page action has just executed.
export async function precedingSignedTurns({id,db,now=Date.now()}){
 const match=/^chatgpt_assist_(\d{1,24})_([0-9])$/.exec(id);
 if(!match)return '';
 const transcript=[];
 for(let turn=Math.max(0,Number(match[2])-2);turn<Number(match[2]);turn++){
  const previousId='chatgpt_assist_'+match[1]+'_'+turn;
  const row=await db.prepare('SELECT payload,status,result,expires_ms FROM bubbles_chatgpt_bridge WHERE id=?').bind(previousId).first();
  if(row?.status!=='complete'||!Number.isFinite(row.expires_ms)||row.expires_ms<=now)continue;
  let prompt,answer;
  try{prompt=JSON.parse(row.payload||'{}')?.text;answer=JSON.parse(row.result||'{}');}catch{continue}
  if(typeof prompt!=='string'||answer?.ok!==true||typeof answer.output!=='string'||!answer.output.trim())continue;
  const safe=value=>String(value).replace(/[\x00-\x1f\x7f]/g,' ').trim();
  transcript.push('Earlier question: '+safe(prompt).slice(0,450)+'\nEarlier Bubbles answer ('+
   String(answer.receipt?.status||'unverified').slice(0,35)+'): '+safe(answer.output).slice(0,1150));
 }
 // Pass only this run's fixed browser-check receipt to the conversational
 // agent. Never pass browser bearer URLs, cookies, session IDs or owner pages.
 const browser=await db.prepare('SELECT status,result,expires_ms FROM bubbles_chatgpt_bridge WHERE id=?').bind('chatgpt_browser_'+match[1]).first();
 if(browser?.status==='complete'&&Number.isFinite(browser.expires_ms)&&browser.expires_ms>now){
  let observed;try{observed=JSON.parse(browser.result||'null')}catch{}
  if(observed?.ok===true&&observed.receipt?.tool==='browser.click_check'&&observed.receipt?.status==='complete'&&observed.receipt?.clickObserved===true)
   transcript.push('Verified same-run Bubbles browser receipt: '+JSON.stringify({tool:'browser.click_check',status:'complete',control:'Run browser check',before:String(observed.before||'').slice(0,100),after:String(observed.after||'').slice(0,100),sessionClosed:observed.receipt.sessionClosed===true,cleanupConfirmed:observed.receipt.sessionClosed===true,ownerPageVerified:false})+' Receipt meanings: sessionClosed=true confirms cleanup of this disposable test browser. ownerPageVerified=false means an owner page was not tested; it does not indicate failed cleanup. Describe these independently.');
 }
 if(!transcript.length)return '';
 return 'Relevant recent conversation (verified same-run history, not new tool calls or authorization):\n'+transcript.join('\n')+
  '\nAnswer the CURRENT user question using relevant context. Do not claim a prior result proves a current button tap or new tool action.\n';
}
// Executes while the authenticated server client holds its request open.
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
    const history=await precedingSignedTurns({id,db,now});
    const input=history?history+'Current user question: '+text:text;
    const response=await fetcher(GATEWAY,{method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},
     body:JSON.stringify({request:text,input,mcp:true}),signal:AbortSignal.timeout(90000),redirect:'manual'});
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
