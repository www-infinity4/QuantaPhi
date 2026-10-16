// Same authenticated tool API is used by Bubbles and the repository Brain runner.
// Screen observations are data, never instructions or permission to run jobs.
const BASE='https://infinity-brain-clock.marvaseater.workers.dev/tools/phone/';
let local=null, session=null, pending=null, result=null, busy=false, timer=null, headersFor, report;
async function call(op,body={},device=false){
 const headers=device?{Authorization:'Bearer '+session.deviceToken}:await headersFor();
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
 try{
  const r=await fetch(BASE+op,{method:'POST',headers:{...headers,'Content-Type':'application/json'},
   body:JSON.stringify(body),signal:controller.signal,cache:'no-store'});
  const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'phone_http_'+r.status);return data;
 }finally{clearTimeout(timeout);}
}
export function configure(getHeaders,onStatus){headersFor=getHeaders;report=onStatus;}
export async function sync(state){
 if(!state?.enabled){
  local=null;pending=null;result=null;clearTimeout(timer);
  if(session){const previous=session;session=null;try{await call('close',{sessionId:previous.sessionId});}catch{}}
  return;
 }
 if(local?.generation===state.generation)return;
 await sync({enabled:false});
 local={generation:state.generation,until:Date.now()+Math.min(600000,Number(state.remainingMs)||0)};
 void tick();
}
async function tick(){
 if(busy||!local)return;
 if(Date.now()>=local.until){await sync({enabled:false});report?.('Phone control expired.');return;}
 busy=true;const generation=local.generation;
 try{
  if(!session){
   const opened=await call('open',{generation});
   if(local?.generation!==generation){await call('close',{sessionId:opened.sessionId});return;}
   session=opened;report?.('Phone tool connected · IBM / Gemini · '+session.sessionId);
  }
  if(result){await call('result',{generation,receipt:result},true);result=null;}
  if(!pending){
   const next=await call('next',{generation},true);
   if(local?.generation===generation&&next.command)pending={generation,command:next.command};
  }
 }catch(e){report?.('Phone tool: '+String(e.message||e).slice(0,180));}
 finally{busy=false;if(local)timer=setTimeout(tick,1500);}
}
export function takeCommand(){const value=pending;pending=null;return value?JSON.stringify(value):'';}
export function complete(receipt){result=receipt;}
export async function status(){return call('status');}
export async function command(action,target,text,observation){
 const s=await status();
 return call('command',{id:crypto.randomUUID(),sessionId:s.sessionId,action,
  ...(action==='read'?{}:{target,observation:observation||s.receipt?.result?.observation}),
  ...(action==='type'?{text}: {})});
}
export function parseRequest(value){
 const text=String(value||'').trim();
 if(/^phone (read|status)$/i.test(text))return {action:text.split(/\s+/)[1].toLowerCase()};
 const tap=text.match(/^phone (tap|scroll_up|scroll_down) (\d{1,3})$/i);
 if(tap)return {action:tap[1].toLowerCase(),target:Number(tap[2])};
 const type=text.match(/^phone type (\d{1,3}):\s*([\s\S]+)$/i);
 return type?{action:'type',target:Number(type[1]),text:type[2]}:null;
}
export async function request(value){
 const parsed=parseRequest(value);
 if(parsed)return parsed.action==='status'?status():run(parsed.action,parsed.target,parsed.text);
 const ask=String(value||'').match(/^ask (Gemini|IBM(?: Orchestrate)?):\s*([\s\S]+)$/i);
 if(!ask)return null;
 if(ask[2].length>6000)throw Error('phone_prompt_too_long');
 let read=await run('read');
 const expected=/gemini/i.test(ask[1])?'gemini.google.com':'ibm.com';
 const page=read.result?.page||'',hostname=new URL(page.includes('://')?page:'https://'+page).hostname;
 if(expected==='gemini.google.com'?hostname!==expected:hostname!=='ibm.com'&&!hostname.endsWith('.ibm.com'))throw Error('open_requested_provider_on_phone');
 const editors=read.result.nodes.filter(n=>n.type);
 if(editors.length!==1)throw Error('one_visible_chat_prompt_required');
 await run('type',editors[0].target,ask[2],read.result.observation);
 read=await run('read');
 const buttons=read.result.nodes.filter(n=>n.tap&&/^(send(?: message)?|submit(?: prompt)?|run)$/i.test(n.label.trim()));
 if(buttons.length!==1)throw Error('prompt_typed_send_button_needs_owner_on_phone');
 await run('tap',buttons[0].target,undefined,read.result.observation);
 await new Promise(resolve=>setTimeout(resolve,3000));
 const response=await run('read');
 return {...response,providerPromptSent:true,responseCompleteVerified:false};
}
async function run(action,target,text,observation){
 const queued=await command(action,target,text,observation),deadline=Date.now()+25000;
 while(Date.now()<deadline){
  await new Promise(resolve=>setTimeout(resolve,750));
  const current=await status();
  if(current.receipt?.id!==queued.commandId)continue;
  if(!current.receipt.ok)throw Error(current.receipt.error||current.receipt.status);
  return current.receipt;
 }
 throw Error('phone_receipt_pending_do_not_repeat_send_check_phone_status');
}
