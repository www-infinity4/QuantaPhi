// Live no-write diagnostic for the actual Bubbles /v1/assist gateway.
// Run from GitHub Actions; receipts are observed, never invented.
import fs from 'node:fs/promises';
import {TESTS,SANDBOX_REPO,auditReply} from '../test-ground-ai/engine.mjs';
const API='https://bubbles-tools.marvaseater.workers.dev';
const results=[];let health=null;
try{
 const response=await fetch(API+'/health',{signal:AbortSignal.timeout(12000)});
 health={http:response.status,body:(await response.json()).service||'unknown'};
}catch(e){health={error:String(e?.message||e)}}
async function requestBubbles(t){
 const startedAt=new Date().toISOString();
 try{
  const response=await fetch(API+'/v1/assist',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://quantaphi.org'},
   body:JSON.stringify({request:t.request,mcp:t.mcp===true}),signal:AbortSignal.timeout(45000)});
  const body=await response.json();
  const judgement=auditReply(t,{...body,ok:response.ok&&body?.ok===true});
  const line={test:t.id,question:t.request,http:response.status,tool:body?.receipt?.tool||'none',
   receiptStatus:body?.receipt?.status||'none',state:judgement.state,reason:judgement.reason,
   sample:String(body?.output||body?.error||'').slice(0,700),observedAt:startedAt};
  results.push(line);console.log(t.id+': '+line.state+' · '+line.reason);
 }catch(error){
  results.push({test:t.id,state:'failed',reason:String(error?.message||error),observedAt:startedAt});
  console.log(t.id+': failed · '+String(error?.message||error));
 }
}
try{
 const res=await fetch('https://api.github.com/repos/'+SANDBOX_REPO,{headers:{Accept:'application/vnd.github+json','User-Agent':'test-ground-ai-bubbles-qa'},signal:AbortSignal.timeout(15000)});
 const json=await res.json();
 results.push({test:'github-http',state:res.ok&&json.full_name===SANDBOX_REPO?'passed':'unverified',http:res.status,repository:json.full_name||null});
}catch(e){results.push({test:'github-http',state:'unverified',reason:String(e?.message||e)})}
for(const t of TESTS)await requestBubbles(t);
// Conversation first: these probes ask the deployed Bubbles AI in natural
// language, not its local parser or an imitation model. Keep writes disabled.
const SEMANTIC_DIALOGUES=[
 {id:'semantic-starter',expectedTool:'semantic.intent',mcp:true,
  request:'Bubbles, I want one shared meaning pipeline rather than memorized commands. Grammar Phi interprets language and uncertainty; QuantaPhi supplies memory and evidence; reasoning plans a permitted action; Code Phi and Robot Brain execute only with authenticated receipts; you explain completed, blocked or waiting states. Explain what you can actually verify in this conversation and what still requires a source or permission. Do not claim a code edit.'},
 {id:'weather-jacket',expectedTool:'weather.current',mcp:true,
  request:'I am heading outside in Albia Iowa; should I bring a jacket? Please check real conditions instead of guessing.'},
 {id:'weather-chilly',expectedTool:'weather.current',mcp:true,
  request:'How chilly does it feel around Albia, Iowa this afternoon? Please verify the forecast.'},
 {id:'weather-outdoors',expectedTool:'weather.current',mcp:true,
  request:'Could you find out what it feels like outdoors in Albia, Iowa and where the report came from?'},
 {id:'weather-ambiguous',expectedTool:'weather.current',mcp:true,
  request:'Is it cold where I am? I have not shared my location in this request; please do not invent a city.'}
];
for(const turn of SEMANTIC_DIALOGUES)await requestBubbles(turn);
const summary={health,passed:results.filter(r=>r.state==='passed').length,
 unverified:results.filter(r=>r.state==='unverified').length,
 flagged:results.filter(r=>r.state==='flagged').length,
 failed:results.filter(r=>r.state==='failed').length,total:results.length,
 allWritesDisabled:true,minted:0,accountTransfers:0,
 note:'Only tool receipts verify Bubbles capabilities. A response about commits, browser playback or wallet payouts is not a verified action.'};
await fs.mkdir('test-results',{recursive:true});
await fs.writeFile('test-results/test-ground-bubbles-live.json',JSON.stringify({summary,results},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
if(health?.body!=='bubbles-tools')process.exitCode=1;
