/* An explicit Quick Card button -> typed owner action -> Bubbles Brain -> TinyFish.
 * This is NOT a general public proxy or provider login form.
 * Every billed browser run requires an actual owner click. No polling by default.
 */
export const QUICK_CARD_BROWSER_URL='https://infinity-brain-clock.marvaseater.workers.dev/work/quick-card-browser';
export const CARD_ACTIONS=Object.freeze({
 levis:['products','compare','availability','search','inspect'],
 ebay:['products','compare','availability','search','inspect'],
 walmart:['products','compare','availability','search','inspect'],
 google:['search','inspect'],
 bing:['search','inspect'],
 gemini:['inspect'],claude:['inspect'],copilot:['inspect'],
 'microsoft-copilot':['inspect'],'ibm-watsonx':['inspect'],
 starmaker:['search','inspect'],'levis-affiliate':['inspect']
});
export function cardActionsFor(id){return CARD_ACTIONS[id]||[]}
export function browserStatus(job){
 if(!job)return 'No browser receipt has been returned.';
 if(job.state==='completed_browser_read'){
  const r=job.report||{};
  return 'Read completed. '+String(r.summary||'').slice(0,650)
   +(r.providerResultUnverified?' Browser observations need independent source checking.':'');
 }
 if(job.state==='working')return 'Browser job running · receipt '+job.jobId+'. Tap Check results when ready.';
 if(job.state==='dispatch_uncertain')return 'Dispatch uncertain. Do not press Run again for this request.';
 if(job.state==='failed')return 'Browser action failed: '+String(job.error||'unspecified');
 return 'Browser status: '+job.state;
}
export async function callCardBrowser(payload,{headers,fetcher=fetch,url=QUICK_CARD_BROWSER_URL}={}){
 if(typeof headers!=='function')throw Error('Owner session required');
 const auth=await headers();
 if(!auth?.Authorization)throw Error('Owner session required');
 const response=await fetcher(url,{method:'POST',headers:{...auth,'Content-Type':'application/json'},
  cache:'no-store',body:JSON.stringify(payload)});
 const data=await response.json();
 if(!response.ok||!data.ok)throw Error(data.error||'TinyFish browser unavailable');
 return data;
}
function el(tag,text,css){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(css)n.className=css;return n}
export async function mountQuickCardTinyfishTools(host,card){
 const types=cardActionsFor(card?.id);if(!host||!types.length)return;
 // Do not display owner-only controls to guest users in ordinary source cards.
 try{
  const auth=await window.QuantaBrainOwner?.ready;
  if(!auth?.Authorization||!host.isConnected)return;
 }catch{return}
 const section=el('details',undefined,'qcb-navigator');
 const header=el('summary','Bubbles · inspect this website with TinyFish');section.append(header);
 const panel=el('div',undefined,'qcb-navigator-body');
 const context=el('p','Owner-only experimental web research. TinyFish steps may cost money. Site sign-ins remain in their own authenticated session. No purchases or private history.', 'qcb-small');
 const form=el('form');const sel=el('select');sel.setAttribute('aria-label','Browser action');
 for(const action of types){const opt=el('option',action.replaceAll('_',' '));opt.value=action;sel.append(opt)}
 const input=el('input');input.type='search';input.maxLength=180;input.placeholder='What should Bubbles find?';
 input.setAttribute('aria-label','Quick Card research query');
 const run=el('button','Inspect site');run.type='submit';
 const receipt=el('p','No browser action requested.','qcb-small');receipt.setAttribute('role','status');
 const check=el('button','Check results');check.type='button';check.hidden=true;
 const links=el('div',undefined,'qcb-results');
 let lastId='';
 const headers=()=>window.QuantaBrainOwner?.ready;
 function show(result){
  const job=result.job||null;receipt.textContent=browserStatus(job);links.replaceChildren();
  const report=job?.report;
  if(job?.state==='completed_browser_read'&&Array.isArray(report?.items)){
   for(const item of report.items.slice(0,5)){
    const row=el('div',undefined,'qcb-result');
    row.append(el('strong',item.name||'Verified source link'));
    if(item.price)row.append(el('small',item.price));
    if(item.url){
     const a=el('a','Open original product ↗');a.href=item.url;
     a.target='_blank';a.rel='noopener noreferrer';
     row.append(a);
    }
    links.append(row);
   }
  }
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();run.disabled=true;links.replaceChildren();
  receipt.textContent='Checking owner authorization and browser availability…';
  const kind=sel.value,query=input.value.trim();
  if(kind!=='inspect'&&query.length<2){receipt.textContent='Enter a search topic or product name.';run.disabled=false;return}
  try{
   const requestId=crypto.randomUUID();
   const result=await callCardBrowser({action:'start',cardId:card.id,kind,query,requestId},{headers});
   lastId=result.job?.jobId||'';check.hidden=!lastId;show(result);
  }catch(error){receipt.textContent=String(error.message||error).replace(/_/g,' ');}
  finally{run.disabled=false}
 });
 check.addEventListener('click',async()=>{
  if(!lastId)return;check.disabled=true;
  try{show(await callCardBrowser({action:'status',jobId:lastId},{headers}))}
  catch(error){receipt.textContent=String(error.message||error).replace(/_/g,' ')}
  finally{check.disabled=false}
 });
 form.append(sel,input,run,check);panel.append(context,form,receipt,links);
 section.append(panel);host.append(section);
}
