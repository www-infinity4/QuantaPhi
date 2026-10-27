// Owner-only Gemini browser trial: service-side session and receipt required.
export const PROVIDER_BROWSER_GATEWAY='https://infinity-brain-clock.marvaseater.workers.dev/work/provider-browser';
export function browserAnswerText(job){
 if(!job)return 'No browser job receipt.';
 if(job.state==='completed_browser_run')return 'Browser run completed (provider response not independently verified): '+String(job.summary||'No visible answer.').slice(0,3000);
 if(job.state==='working')return 'Provider browser request started. Check its receipt again to see whether a response arrived.';
 if(job.state==='failed')return 'Provider browser failed: '+String(job.error||'not specified');
 return 'Browser job status: '+String(job.state||'unknown');
}
export async function requestOwnerGemini(payload,{getHeaders,fetcher=fetch}={}){
 if(typeof getHeaders!=='function')throw Error('Owner verification required');
 const auth=await getHeaders();
 if(!auth?.Authorization)throw Error('Owner verification required');
 const response=await fetcher(PROVIDER_BROWSER_GATEWAY,{
  method:'POST',headers:{...auth,'Content-Type':'application/json'},
  cache:'no-store',body:JSON.stringify(payload)
 });
 const answer=await response.json();
 if(!response.ok||answer.ok!==true)throw Error(answer.error||'Browser provider unavailable');
 return answer;
}
export function mountOwnerGeminiBrowserTool(root){
 if(!root||typeof document==='undefined')return;
 const details=document.createElement('details');details.className='iqc-gemini-browser';
 const title=document.createElement('summary');title.textContent='Gemini · owner browser experiment';details.append(title);
 const form=document.createElement('form');
 const question=document.createElement('textarea');question.rows=2;question.maxLength=1000;
 question.placeholder='Question for Gemini…';question.setAttribute('aria-label','Gemini browser question');
 const go=document.createElement('button');go.type='submit';go.textContent='Ask my Gemini account';
 const check=document.createElement('button');check.type='button';check.textContent='Check result';check.hidden=true;
 const status=document.createElement('p');status.setAttribute('role','status');
 status.textContent='Experimental. Gemini sign-in was verified; browser typing and responses still need a successful test.';
 const getHeaders=()=>window.QuantaBrainOwner?.ready;
 let jobId=null;
 form.addEventListener('submit',async event=>{
  event.preventDefault();const text=question.value.trim();if(text.length<3)return;
  go.disabled=true;
  try{
   const capabilities=await requestOwnerGemini({action:'capabilities'},{getHeaders});
   if(!capabilities.configured)throw Error('The TinyFish backend key is not configured.');
   const receipt=await requestOwnerGemini({action:'ask',provider:'gemini',question:text},{getHeaders});
   jobId=receipt.job?.id||null;check.hidden=!jobId;status.textContent=browserAnswerText(receipt.job);
  }catch(error){status.textContent=String(error.message||error).replace(/_/g,' ');}
  finally{go.disabled=false;}
 });
 check.addEventListener('click',async()=>{
  if(!jobId)return;check.disabled=true;
  try{const receipt=await requestOwnerGemini({action:'status',id:jobId},{getHeaders});
   status.textContent=browserAnswerText(receipt.job);
  }catch(error){status.textContent=String(error.message||error).replace(/_/g,' ');}
  finally{check.disabled=false;}
 });
 form.append(question,go,check,status);details.append(form);root.append(details);
}
