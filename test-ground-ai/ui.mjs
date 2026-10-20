import {TESTS,SANDBOX_REPO,auditReply,fixtureIndex,fixtureJSON,safeExport} from './engine.mjs';
const $=id=>document.getElementById(id),transcript=$('transcript'),status=$('status');
const select=$('scenario'),text=$('prompt'),go=$('ask'),run=$('runTest'),all=$('runAll'),exportButton=$('export');
const results=[];let busy=false;
const API='https://bubbles-tools.marvaseater.workers.dev/v1/assist';
for(const t of TESTS){const opt=document.createElement('option');opt.value=t.id;opt.textContent=t.title;select.append(opt)}
const append=(role,content,detail)=>{
 const card=document.createElement('article');card.className='turn '+role;
 const who=document.createElement('strong');who.textContent=role==='user'?'You':'Test Ground AI';
 const body=document.createElement('p');body.textContent=String(content||'No reply');
 card.append(who,body);
 if(detail){const d=document.createElement('details');const sum=document.createElement('summary');sum.textContent='Verification';const pre=document.createElement('pre');pre.textContent=JSON.stringify(detail,null,2);d.append(sum,pre);card.append(d)}
 transcript.append(card);transcript.scrollTop=transcript.scrollHeight;
};
const setBusy=value=>{busy=value;for(const b of [go,run,all])b.disabled=value};
async function bubbles(request,scenario){
 if(!request.trim())return;
 append('user',request);
 const headers={'Content-Type':'application/json'};
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),30000);
 let result;
 try{
  const response=await fetch(API,{method:'POST',mode:'cors',headers,body:JSON.stringify({request}),signal:controller.signal,cache:'no-store'});
  result=await response.json();if(!response.ok)result={ok:false,error:result.error||'HTTP '+response.status};
 }catch(error){result={ok:false,error:String(error?.message||error).slice(0,160)}}
 finally{clearTimeout(timeout)}
 const assessment=auditReply(scenario||{id:'repo',expectedTool:'owner.chat'},result);
 const output=String(result?.output||result?.output_text||result?.error||'No usable reply');
 append('ai',output,{verification:assessment.state,reason:assessment.reason,tool:result?.receipt?.tool||null,receiptStatus:result?.receipt?.status||null,reposWritten:result?.receipt?.repositoryActionsVerified===true});
 status.textContent='Last request: '+assessment.state.toUpperCase()+' — '+assessment.reason;
 results.push({test:scenario?.id||'free-chat',state:assessment.state,reason:assessment.reason,receiptStatus:result?.receipt?.status||'none',observedAt:new Date().toISOString()});
 return assessment;
}
async function runOne(t){
 if(t.id==='repo'){
  // A real GitHub read is attempted independently of model narration.
  try{
   const response=await fetch('https://api.github.com/repos/'+SANDBOX_REPO,{headers:{Accept:'application/vnd.github+json'},cache:'no-store',signal:AbortSignal.timeout(12000)});
   const data=await response.json();
   append('ai',response.ok?'Repository verified: '+data.full_name+' · default branch '+data.default_branch+'.':'Repository API unavailable: '+response.status,
    {source:'GitHub REST',verified:response.ok,repository:response.ok?data.full_name:null});
   results.push({test:'repo-http',state:response.ok?'passed':'unverified',reason:'GitHub HTTP '+response.status,observedAt:new Date().toISOString()});
  }catch(error){append('ai','GitHub lookup was not verified.',{error:String(error)});}
 }
 return bubbles(t.request,t);
}
go.addEventListener('click',async()=>{if(busy||!text.value.trim())return;setBusy(true);try{await bubbles(text.value.trim());text.value=''}finally{setBusy(false)}});
text.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();go.click()}});
run.addEventListener('click',async()=>{if(busy)return;setBusy(true);try{await runOne(TESTS.find(t=>t.id===select.value)||TESTS[0]);}finally{setBusy(false)}});
all.addEventListener('click',async()=>{if(busy)return;setBusy(true);try{for(const t of TESTS){status.textContent='Checking '+t.title+'…';await runOne(t)}status.textContent='Completed '+TESTS.length+' test prompts. View verification per response.';}finally{setBusy(false)}});
exportButton.addEventListener('click',()=>{
 const blob=new Blob([safeExport(results)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='test-ground-ai-evidence.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('showFiles').addEventListener('click',()=>{
 const index=fixtureIndex(),json=JSON.stringify(fixtureJSON(),null,2);
 append('ai','Sandbox index.html and application.json are shown below. These are drafts; a GitHub commit is separate.',{indexHtml:index,applicationJson:json,saveClaim:false});
});
$('repoLink').href='https://github.com/'+SANDBOX_REPO;
$('branchLink').href='https://github.com/'+SANDBOX_REPO+'/tree/feature/test-ground-ai-and-card-apps-20261020';
status.textContent='Ready. Test Ground uses real Bubbles responses; a chat reply alone never verifies a repository write.';
