import {browserAction} from '../bubbles-tools/browser-cdp.mjs';
export const CHECK_PATH='/browser-check';
const CHECK_URL='https://bubbles-cloud-browser.marvaseater.workers.dev'+CHECK_PATH;
const PUBLIC_BUBBLES_URL='https://quantaphi.org/bubbles.html';
const BEFORE='Waiting for browser check.';
const AFTER='Bubbles clicked this control.';
export const browserCheckPage=()=>new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bubbles browser check</title><style>body{background:#f7f4f0;color:#312722;font:18px/1.5 system-ui;padding:24px}main{max-width:600px;margin:auto;background:white;border-radius:20px;padding:24px}button{min-height:48px;padding:12px 20px;background:#b72d30;color:white;border:0;border-radius:24px;font:inherit}</style><main><h1>Bubbles cloud browser</h1><p>This control tests a real browser interaction.</p><button type="button" id="check">Run browser check</button><p id="result" role="status">${BEFORE}</p></main><script>document.getElementById('check').addEventListener('click',()=>{document.getElementById('result').textContent='${AFTER}';});</script></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"}});
const approved=async store=>(await store.chatgptStatus()).enabled&&(await store.status()).enabled;
const deny=(error,status)=>({ok:false,error,status});
// A fixed, public, harmless browser exercise. No caller-selected URL, session,
// label, JavaScript, live-view credential or private owner page is accepted.
export async function signedBrowserCheck({claims,body,db,store,env,now=Date.now(),act=browserAction,pause=ms=>new Promise(r=>setTimeout(r,ms))}){
 if(!await approved(store))return deny('existing_five_day_approval_required',403);
 if(!body||body.operation!=='browser_check'||Object.keys(body).some(k=>k!=='operation'))return deny('invalid_browser_check',400);
 if(!env.BROWSER?.acquire)return deny('browser_binding_unavailable',503);
 const id='chatgpt_browser_'+claims.run_id;
 await db.prepare("INSERT OR IGNORE INTO bubbles_chatgpt_bridge(id,action,payload,status,created_ms,updated_ms,expires_ms) VALUES(?,'server_browser_check','{}','server_pending',?,?,?)").bind(id,now,now,now+240000).run();
 const row=await db.prepare('SELECT status,result,expires_ms FROM bubbles_chatgpt_bridge WHERE id=?').bind(id).first();
 if(!row)return deny('browser_check_not_stored',503);
 if(row.expires_ms<=now)return deny('browser_check_expired',410);
 if(row.status!=='server_pending'){
  let result;try{result=JSON.parse(row.result||'null')}catch{}
  return {ok:true,jobId:id,state:row.status,...(result?{result}:{})};
 }
 const claim=await db.prepare("UPDATE bubbles_chatgpt_bridge SET status='working' WHERE id=? AND action='server_browser_check' AND status='server_pending'").bind(id).run();
 if(claim.meta?.changes!==1)return {ok:true,jobId:id,state:'working'};
 let sessionId='',targetId='',phase='acquire',result={ok:false},closed=false;
 let publicPage={readVerified:false,title:'',controls:[],reason:'not_attempted'};
 const requireConsent=async()=>{if(!await approved(store))throw Error('consent_revoked');};
 const observe=async text=>{
  for(let n=0;n<5;n++){
   await requireConsent();
   const page=await act(env,{sessionId,targetId,action:'read'});
   if(page.ok!==false&&page.url===CHECK_URL&&page.text?.includes(text))return page;
   if(n<4)await pause(300*(n+1));
  }
  throw Error('page_state_not_observed');
 };
 try{
  await requireConsent();
  const session=await env.BROWSER.acquire({keepAlive:120000,targets:true});
  sessionId=typeof session==='string'?session:session?.sessionId;
  if(!/^[a-f0-9-]{36}$/i.test(sessionId||''))throw Error('session_not_created');
  phase='navigate';
  await requireConsent();
  const tab=await env.BROWSER.devtools.newTarget(sessionId,CHECK_URL);
  if(!tab?.id)throw Error('target_not_created');targetId=tab.id;
  phase='read_before';const before=await observe(BEFORE);
  if(!Array.isArray(before.controls)||!before.controls.some(item=>item?.label==='Run browser check'&&item.disabled!==true))throw Error('control_inventory_not_observed');
  phase='click';await requireConsent();
  const click=await act(env,{sessionId,targetId,action:'click',label:'Run browser check'});
  if(click.ok!==true)throw Error('click_not_accepted');
  phase='read_after';const after=await observe(AFTER);
  // A second, fixed public URL checks real Bubbles navigation and accessible
  // control discovery. No caller-selected URL, prior Chrome profile, sign-in,
  // credentials, click, or owner-page access. Failure is separately reported.
  try{
   await requireConsent();
   const publicTab=await env.BROWSER.devtools.newTarget(sessionId,PUBLIC_BUBBLES_URL);
   if(!publicTab?.id)throw Error('public_tab_unavailable');
   let observed;
   for(let i=0;i<6;i++){
    await requireConsent();
    const page=await act(env,{sessionId,targetId:publicTab.id,action:'read'});
    if(page?.url===PUBLIC_BUBBLES_URL&&page.title&&Array.isArray(page.controls)&&page.controls.length){observed=page;break}
    if(i<5)await pause(250*(i+1));
   }
   if(!observed)throw Error('public_page_not_observed');
   publicPage={readVerified:true,title:String(observed.title).slice(0,130),
    controls:observed.controls.slice(0,24).map(item=>({
     label:String(item.label||'').slice(0,110),
     context:String(item.context||'').slice(0,80),
     disabled:item.disabled===true})),
    reason:'verified_public_dom'};
  }catch(error){
   // Revocation is never ignored; the final approval check below rejects
   // all evidence if owner consent has expired or been revoked.
   publicPage={readVerified:false,title:'',controls:[],
    reason:error?.message==='consent_revoked'?'consent_revoked':'public_page_unavailable'};
  }
  await requireConsent();
  result={ok:true,output:'Bubbles opened cloud Chrome, clicked Run browser check, and verified the changed page text.',
   publicPage,
   before:BEFORE,after:AFTER,url:CHECK_URL,
   receipt:{tool:'browser.click_check',status:'complete',clickObserved:true,beforeObserved:before.text.includes(BEFORE),afterObserved:after.text.includes(AFTER),publicPageReadVerified:publicPage.readVerified,ownerPageVerified:false}};
 }catch(error){
  const known=['consent_revoked','session_not_created','target_not_created','page_state_not_observed','control_inventory_not_observed','click_not_accepted'];
  result={ok:false,error:known.includes(error.message)?error.message:'browser_check_failed',phase,
   output:'The cloud browser check did not confirm a completed click.',receipt:{tool:'browser.click_check',status:'failed',clickObserved:false}};
 }finally{
  if(sessionId)try{await env.BROWSER.closeSession(sessionId);closed=true}catch{}
 }
 result.receipt.sessionClosed=closed;
 if(result.ok&&!closed){result.receipt.status='partial';result.output+=' Browser cleanup was not confirmed.';}
 if(!await approved(store))result={ok:false,error:'consent_revoked',receipt:{tool:'browser.click_check',status:'failed',clickObserved:false,sessionClosed:closed}};
 await db.prepare("UPDATE bubbles_chatgpt_bridge SET status=?,result=?,updated_ms=? WHERE id=? AND action='server_browser_check' AND status='working'").bind(result.ok?'complete':'blocked',JSON.stringify(result),Date.now(),id).run();
 return {ok:true,jobId:id,state:result.ok?'complete':'blocked',result};
}
