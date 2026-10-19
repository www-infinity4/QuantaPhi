// GitHub owner device sign-in in website and Android floating Bubbles.
// No access tokens in the WebView, DOM, localStorage, model prompts or messages.
export function mountGithubAuth({container,request,embedded=false}){
 if(embedded)return;
 const element=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
 const start=element('button','Sign in to GitHub');
 const disconnect=element('button','Disconnect GitHub');
 const status=element('p','GitHub sign-in checks use your verified Bubbles owner connection.');
 const codeRow=element('div');
 const code=element('input');code.type='text';code.readOnly=true;code.autocomplete='off';
 code.setAttribute('aria-label','One-time GitHub approval code');
 const link=element('a','Approve at GitHub ↗');
 link.href='https://github.com/login/device';link.target='_blank';link.rel='noopener noreferrer';
 const detail=element('p','Copy the code, open GitHub, and approve Bubbles. This is not a password or access token.');
 codeRow.append(detail,code,link);
 codeRow.hidden=true;disconnect.hidden=true;
 container.append(start,disconnect,status,codeRow);
 let pollTimer=0,generation=0;
 function stop(){generation++;clearTimeout(pollTimer);pollTimer=0;}
 function render(data){
  const connected=data.status==='connected';
  disconnect.hidden=!connected;start.hidden=connected;
  if(connected){stop();codeRow.hidden=true;code.value='';
   status.textContent='GitHub connected as '+(data.login||'owner')+
   '. Bubbles will check repository and Actions permissions when performing each action.';}
  else if(data.status==='pending')status.textContent='Waiting for GitHub approval…';
  else if(data.status==='awaiting_github_approval')status.textContent='Enter the code in GitHub to connect Bubbles.';
  else if(data.needsConfiguration)status.textContent='GitHub App sign-in requires the server-side client ID and enabled device flow.';
  else status.textContent='GitHub not connected in Bubbles.';
 }
 function poll(seq,delay){
  pollTimer=setTimeout(async()=>{
   if(seq!==generation)return;
   try{
    const result=await request('poll');
    if(seq!==generation)return;
    render(result);
    if(result.status==='pending')poll(seq,Math.max(5000,Math.min(30000,(Number(result.retryAfterSeconds)||5)*1000)));
    else if(result.status!=='connected'){
      codeRow.hidden=true;
      status.textContent='GitHub authorization stopped: '+String(result.error||result.status).slice(0,120);
    }
   }catch(error){
    if(seq!==generation)return;
    status.textContent='GitHub sign-in check failed: '+String(error.message||error).slice(0,140);
    codeRow.hidden=true;
   }
  },delay);
 }
 start.addEventListener('click',async()=>{
  start.disabled=true;stop();status.textContent='Requesting GitHub sign-in…';
  try{
   const data=await request('start');
   if(data.status!=='awaiting_github_approval')throw Error('No GitHub sign-in code returned');
   code.value=data.userCode||'';
   codeRow.hidden=false;render(data);
   poll(generation,Math.max(5000,(Number(data.intervalSeconds)||5)*1000));
  }catch(error){codeRow.hidden=true;status.textContent='GitHub sign-in unavailable: '+String(error.message||error).slice(0,160);}
  finally{start.disabled=false;}
 });
 disconnect.addEventListener('click',async()=>{
  disconnect.disabled=true;stop();
  try{render(await request('disconnect'));}
  catch(error){status.textContent='Disconnect failed: '+String(error.message||error).slice(0,140);}
  finally{disconnect.disabled=false;}
 });
 // Status never grants rights by itself; the signed owner session is still required.
 request('status').then(render).catch(()=>{});
}
