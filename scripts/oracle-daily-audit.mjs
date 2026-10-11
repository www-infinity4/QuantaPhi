// Daily Oracle research/card/wallet audit. No wallet writes and no synthetic paid actions.
// Reports deterministic issues to the repository's bot work queue (GitHub Issues).
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const required=[
 'phi-scholastic-data.js','phi-assimilation.js','quant-trail.js',
 'music-quant-cloud.js','search-wallet-sync.js','wallet-runtime.js'
];
const findings=[];
function report(area,severity,message){findings.push({area,severity,message})}
async function content(file){return readFile(file,'utf8')}
async function inspectSource(){
 const html=await content('index.html'),card=await content('phi-scholastic-data.js');
 const css=await content('phi-scholastic-data.css'),purple=await content('phi-assimilation.js');
 for(const file of required){
  if(!html.includes('/'+file))report('asset', 'high',file+' is missing from the page entrypoint');
  try{execFileSync(process.execPath,['--check',file],{stdio:'pipe'})}
  catch(error){report('syntax','high',file+': '+String(error.stderr||error.message).slice(0,300))}
 }
 for(const name of ['extract','search','compare','build','clear']){
  if(!card.includes("job==='"+name+"'")&&!card.includes("['"+name+"'"))report('controls','high','Data control '+name+' is missing its handler');
 }
 if(!card.includes('scopedTerm(')||!card.includes('selectionQueries('))report('context','high','Extraction/search is not scoped to original Quant');
 if(card.includes('phi-scholastic-reader.webp'))report('reader','medium','Reader still embeds the removed book illustration');
 if(!card.includes('qdata-comparison-table')||!css.includes('.qdata-comparison-table'))report('compare','medium','Comparison evidence matrix is not wired and styled');
 if(!purple.includes('x.overlap>0'))report('purple','medium','Purple-card context relevance gate missing');
 if(!css.includes('min-height:44px'))report('accessibility','medium','Touch target contract requires a 44px minimum');
 if(!html.includes('id="q"'))report('page','high','Main search input missing');
 // Source-level checks are safe: do not click Buy, mint, Share or Collect.
 for(const file of ['workers/quanta-phi-ledger/worker.js','phi-scholastic-data.js']){
  try{execFileSync(process.execPath,['--check',file],{stdio:'pipe'})}
  catch(e){report('syntax','high',file+': '+String(e.stderr||e.message).slice(0,300))}
 }
}
async function checkUrl(url,needle,{rejectPublic=false}={}){
 try{
  const response=await fetch(url,{redirect:'follow',cache:'no-store',signal:AbortSignal.timeout(18000),headers:{'user-agent':'Phi-Oracle-Daily-Watcher/1.0'}});
  if(rejectPublic){if(response.status!==401&&response.status!==403)report('security','high',new URL(url).pathname+' allows HTTP '+response.status+' without wallet authorization');return}
  if(!response.ok){report('live','high',url+' returns HTTP '+response.status);return}
  const body=(await response.text()).slice(0,300000);
  if(!body.includes(needle))report('live','medium',url+' missing expected markup or script: '+needle);
 }catch(error){report('live','medium',url+' unavailable: '+String(error.message||error).slice(0,100))}
}
async function inspectLive(){
 await Promise.all([
  checkUrl('https://quantaphi.org/','id="q"'),
  checkUrl('https://quantaphi.org/phi-scholastic-data.js','scopedTerm('),
  checkUrl('https://www-infinity4.github.io/Alien-Radio/','music-quant-cloud.js'),
  checkUrl('https://quanta-phi-ledger.marvaseater.workers.dev/v1/music-quants/state','',{rejectPublic:true})
 ]);
}
async function postIssue(){
 const token=process.env.GITHUB_TOKEN,repo=process.env.GITHUB_REPOSITORY;
 if(!token||!repo||!findings.length)return;
 const url='https://api.github.com/repos/'+repo+'/issues';
 const headers={authorization:'Bearer '+token,accept:'application/vnd.github+json','content-type':'application/json','x-github-api-version':'2022-11-28'};
 const issueTitle='[Agent Job] Oracle daily card, wallet and security repairs';
 const body=['Automatic daily audit '+new Date().toISOString(),'','Failed checks:',...findings.map(x=>'- ['+x.severity+'] '+x.area+': '+x.message),'','Repair instructions: inspect the exact failing asset and existing Oracle design contract; preserve the original Quant context, wallet identity, music receipt IDs and mint idempotency; make the smallest change; run Node tests plus Android browser checks; create a reviewed PR. Do not mint test tokens, rotate keys, deploy or merge without acceptance checks.','This is a work ticket, not proof the production defect is fixed.'].join('\n');
 const response=await fetch(url+'?state=open&per_page=100',{headers,signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Cannot inspect issues '+response.status);
 const items=await response.json(),existing=items.find(x=>x.title===issueTitle&&!x.pull_request);
 const endpoint=existing?url+'/'+existing.number+'/comments':url;
 const submitted=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(existing?{body}:{title:issueTitle,body,labels:['oracle-daily-audit']}),signal:AbortSignal.timeout(12000)});
 if(!submitted.ok)throw Error('Cannot file robot work ticket '+submitted.status);
}
export async function run(){
 await inspectSource();
 if(process.env.ORACLE_AUDIT_SKIP_LIVE!=='1')await inspectLive();
 await mkdir('oracle-audit-evidence',{recursive:true});
 await writeFile('oracle-audit-evidence/report.json',JSON.stringify({time:new Date().toISOString(),findings},null,2));
 console.log(JSON.stringify({checks:required.length+9,findings},null,2));
 try{await postIssue()}catch(error){console.warn('Issue dispatch pending:',error.message);process.exitCode=1}
 if(findings.some(x=>x.severity==='high'))process.exitCode=1;
 return findings;
}
if(process.argv[1]?.endsWith('/oracle-daily-audit.mjs'))await run();
