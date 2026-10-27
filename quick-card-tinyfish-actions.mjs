import {acceptedBrand} from './infinity-accepted-catalog.mjs';
/* Explicit tap -> verified Brain session -> typed server adapter -> real browser.
 * Public brand reads use a fresh browser, without the owner's saved accounts.
 */
export const QUICK_CARD_BROWSER_URL='https://infinity-brain-clock.marvaseater.workers.dev/work/quick-card-browser';
export const CARD_ACTIONS=Object.freeze({levis:['products','compare','availability','search','inspect'],
 ebay:['products','compare','availability','search','inspect'],walmart:['products','compare','availability','search','inspect'],
 google:['search','inspect'],bing:['search','inspect'],gemini:['inspect'],claude:['inspect'],copilot:['inspect'],
 'microsoft-copilot':['inspect'],'ibm-watsonx':['inspect'],starmaker:['search','inspect'],'levis-affiliate':['inspect']});
export function cardActionsFor(id){
 const brand=acceptedBrand(id);
 return brand?(brand.sourceStatus==='observed'?brand.actions.map(x=>x.id):[]):
  Object.hasOwn(CARD_ACTIONS,id)?[...CARD_ACTIONS[id]]:[];
}
export function browserStatus(job){
 if(!job)return 'Choose a website action.';
 if(job.state==='working')return 'Browser running. Check results in a moment.';
 if(job.state==='dispatch_uncertain')return 'The browser request is uncertain. Recover this request before starting another.';
 if(job.state==='completed_browser_read')return job.report?.blocker?
  'Website action blocked: '+job.report.blocker:'Read completed. '+String(job.report?.summary||'See the original source links below.');
 if(job.state==='failed')return 'Website action failed: '+String(job.error||'Unknown error');
 if(job.state==='blocked_browser_read')return 'Website action blocked: '+String(job.report?.blocker||'The website could not be read.');
 if(job.state==='unverified_browser_result')return 'Browser finished without verified source links. Open the official website to check.';
 return 'Browser status: '+String(job.state||'unknown');
}
export async function callCardBrowser(payload,{headers,fetcher=fetch,url=QUICK_CARD_BROWSER_URL}={}){
 if(typeof headers!=='function'){const error=Error('Owner session required');error.responseReceived=true;throw error;}
 const auth=await headers();
 if(!auth?.Authorization){const error=Error('Owner session required');error.responseReceived=true;throw error;}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{
  const response=await fetcher(url,{method:'POST',headers:{Authorization:auth.Authorization,'Content-Type':'application/json'},
   cache:'no-store',signal:controller.signal,body:JSON.stringify(payload)});
  const data=await response.json();
  if(!response.ok||!data.ok){const error=Error(data.error||'TinyFish browser unavailable');
   error.responseReceived=true;error.job=data.job;throw error;}
  return data;
 }finally{clearTimeout(timer)}
}
export function createCardBrowserSession(cardId,send){
 let request=null,job=null,busy=false;
 const finish=result=>{job=result.job||job;return result};
 const dispatch=async()=>{
  try{return finish(await send(request))}
  catch(error){if(error.job)job=error.job;
   else if(!error.responseReceived)job={state:'dispatch_uncertain'};
   else {job=null;request=null}
   throw error;
  }
 };
 return {
  get job(){return job},get busy(){return busy},
  async start(kind,query=''){
   if(busy||['working','dispatch_uncertain'].includes(job?.state))throw Error('Check the existing browser request first.');
   busy=true;request={action:'start',cardId,kind,query,requestId:crypto.randomUUID()};
   try{return await dispatch()}finally{busy=false}
  },
  async check(){
   if(busy||!request)return null;busy=true;
   try{
    if(job?.jobId)return finish(await send({action:'status',jobId:job.jobId}));
    // Reuse the exact request ID after transport loss, never issue a second run.
    return await dispatch();
   }finally{busy=false}
  }
 };
}
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
async function ownerHeaders(){
 let timer;
 try{return await Promise.race([window.QuantaBrainOwner?.ready||Promise.resolve(null),
  new Promise(resolve=>{timer=setTimeout(()=>resolve(null),4000)})]);}
 finally{clearTimeout(timer)}
}
function safeResultUrl(url,card){
 try{const u=new URL(url),hosts=new Set([new URL(card.official).hostname,...card.actions.map(x=>new URL(x.url).hostname)]);
  return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&hosts.has(u.hostname)?u.href:null;
 }catch{return null}
}
export function mountQuickCardTinyfishTools(host,card){
 const trusted=acceptedBrand(card?.id);if(!host||!trusted||trusted.official!==card.official)return;
 const box=node('section',undefined,'iac-browser'),actions=node('div',undefined,'iac-website-actions');
 box.setAttribute('aria-label',card.name+' website actions');
 const status=node('p','Choose what to open on the real website.','iac-status');status.setAttribute('role','status');
 const result=node('div',undefined,'iac-results'),check=node('button','Check results','iac-check');check.type='button';check.hidden=true;
 const signin=node('a','Open Bubbles to sign in');signin.href='/bubbles.html';signin.hidden=true;
 const buttons=[];let active=false;
 const session=createCardBrowserSession(card.id,payload=>callCardBrowser(payload,{headers:ownerHeaders}));
 function refresh(){
  active=session.busy||['working','dispatch_uncertain'].includes(session.job?.state);
  buttons.forEach(b=>b.disabled=active);check.hidden=!session.job;check.disabled=session.busy;
  check.textContent=session.job?.state==='dispatch_uncertain'?'Recover request':'Check results';
 }
 function render(){
  const job=session.job;status.textContent=browserStatus(job);result.replaceChildren();refresh();
  if(job?.jobId){const receipt=node('small','Receipt '+job.jobId,'iac-receipt');result.append(receipt)}
  if(job?.state!=='completed_browser_read')return;
  for(const item of job.report?.items||[]){
   const row=node('div',undefined,'iac-result');row.append(node('strong',String(item.name||'Source result')));
   if(item.price)row.append(node('span',String(item.price)+' · observed on source'));
   if(item.note)row.append(node('p',String(item.note)));
   const href=safeResultUrl(item.url,card);
   if(href){const a=node('a','Open original result ↗');a.href=href;a.target='_blank';a.rel='noopener noreferrer';row.append(a)}
   result.append(row);
  }
  const observed=job.report?.observedAt;
  if(observed)result.append(node('small','Observed '+observed));
 }
 function explain(error){
  const text=String(error.message||error);
  status.textContent=/backend_not_configured/.test(text)?'Website browsing is awaiting activation. Open the official website below.':
   /Owner session|required|authorization|401/.test(text)?'Sign in to Bubbles to use the owner browser pilot.':text.replaceAll('_',' ');
  signin.hidden=!/Owner session|required|authorization|401/.test(text);
  if(session.job?.state==='dispatch_uncertain')status.textContent=browserStatus(session.job);
  refresh();
 }
 for(const action of trusted.actions){
  const button=node('button',action.label,'iac-web-action');button.type='button';button.dataset.websiteAction=action.id;
  button.dataset.websiteDestination=action.url;button.setAttribute('aria-label',action.label+' on '+card.name);
  button.addEventListener('click',async()=>{
   status.textContent='Opening the website through Bubbles…';buttons.forEach(b=>b.disabled=true);
   try{
    const auth=await ownerHeaders();if(!auth?.Authorization)throw Error('Owner session required');
    const capabilities=await callCardBrowser({action:'capabilities'},{headers:async()=>auth});
    if(capabilities.configured!==true){const e=Error('tinyfish_backend_not_configured');e.responseReceived=true;throw e;}
    const advertised=capabilities.supported?.find(x=>x.id===card.id);
    if(!advertised?.actions?.includes(action.id))throw Error('This website action is not available yet.');
    await session.start(action.id);render();
   }catch(error){explain(error)}
   finally{refresh()}
  });buttons.push(button);actions.append(button);
 }
 check.addEventListener('click',async()=>{
  try{const work=session.check();refresh();await work;render()}catch(error){explain(error)}finally{refresh()}
 });
 box.append(actions,status,signin,check,result);host.append(box);return {session,box};
}
