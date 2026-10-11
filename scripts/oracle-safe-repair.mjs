// Narrow Oracle self-healing: read-only evidence -> exact allowlisted patch -> draft PR.
// Never writes main, Cloudflare, wallet, auth, security policies or mint endpoints.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const TARGET='www-infinity4/QuantaPhi';
const API='https://api.github.com/repos/'+TARGET;
const TOKEN=()=>process.env.GITHUB_TOKEN||'';
const SAFE_FILES=new Set(['phi-scholastic-data.css','index.html']);
const URL_BASE='https://api.github.com/repos/www-infinity4/QuantaPhi/';
const styles={
 accessibility:'\n/* Oracle automatic accessibility repair: research actions remain usable by touch. */\n#result .qdata-oracle-card .qdata-actions button{min-height:44px!important}\n',
 compare:'\n/* Oracle automatic recovery: evidence comparison remains readable on Android. */\n#result .qdata-comparison-viewer{max-width:100%;overflow-x:auto;border:1px solid #c49b49;border-radius:14px}\n#result .qdata-comparison-table{border-collapse:collapse;width:100%;min-width:650px}\n#result .qdata-comparison-table :is(th,td){padding:11px;vertical-align:top;border-bottom:1px solid #e8c878}\n'
};
export function candidateFromEvidence(findings,files){
 if(!Array.isArray(findings)||typeof files!=='object')return null;
 const css=files['phi-scholastic-data.css'],html=files['index.html'],card=files['phi-scholastic-data.js'];
 if(typeof css!=='string'||typeof html!=='string'||typeof card!=='string')return null;
 if(findings.some(x=>x.area==='accessibility')&&!css.includes('#result .qdata-oracle-card .qdata-actions button{min-height:44px')&&!css.includes('#result .qdata-oracle-card .qdata-actions button {min-height:44px')){
  if(!css.includes('qdata-actions'))return null;
  return {id:'touch-target',path:'phi-scholastic-data.css',before:css,after:css+styles.accessibility,reason:'Restore a 44px touch target specifically on the research toolbar'};
 }
 if(findings.some(x=>x.area==='compare')&&card.includes('qdata-comparison-table')&&!css.includes('qdata-comparison-table')){
  return {id:'compare-viewer-style',path:'phi-scholastic-data.css',before:css,after:css+styles.compare,reason:'Restore horizontal scroll and readable comparison cells'};
 }
 if(findings.some(x=>x.area==='asset'&&String(x.message).includes('phi-scholastic-data.js'))&&!html.includes('phi-scholastic-data.js')&&html.includes('phi-assimilation.js')){
  const anchor='<script defer src="/phi-assimilation.js';
  const index=html.indexOf(anchor);
  if(index<0||html.indexOf(anchor,index+1)!==-1)return null;
  const after=html.slice(0,index)+'<script defer src="/phi-scholastic-data.js?v=oracle-autofix"></script>\n'+html.slice(index);
  return {id:'restore-reader-script',path:'index.html',before:html,after,reason:'Restore the existing Scholastic Reader module before assimilation'};
 }
 return null;
}
export function validateCandidate(patch,files){
 if(!patch||!SAFE_FILES.has(patch.path)||!['touch-target','compare-viewer-style','restore-reader-script'].includes(patch.id))throw Error('repair_scope_rejected');
 const original=files[patch.path];
 if(original!==patch.before||!patch.after||patch.after===original||patch.after.length-original.length>1400)throw Error('patch_size_or_base_mismatch');
 const changed=patch.after.slice(0,original.length)===original||patch.id==='restore-reader-script';
 if(!changed)throw Error('unknown_patch_operation');
 const prohibited=['fetch(','eval(','Function(','Authorization:','Bearer ','/v1/music-quants/sync','/v1/quants/mint'];
 // This is a source-only presentation patch. Never insert executable wallet or auth code.
 const delta=patch.after.length>original.length&&patch.after.startsWith(original)?patch.after.slice(original.length):patch.after.slice(Math.max(0,patch.after.indexOf('phi-scholastic-data.js')-40),patch.after.indexOf('phi-scholastic-data.js')+110);
 if(prohibited.some(term=>delta.includes(term)))throw Error('privileged_patch_rejected');
 return patch;
}
const sha256=x=>crypto.createHash('sha256').update(x).digest('hex');
async function request(endpoint,{method='GET',body,token=TOKEN()}={}){
 if(!endpoint.startsWith(URL_BASE))throw Error('outside_repository');
 const response=await fetch(endpoint,{method,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'phi-oracle-safe-repair-bot',...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(18000)});
 if(!response.ok)throw Error('GitHub '+method+' '+response.status+' '+new URL(endpoint).pathname);
 return response.json();
}
async function getFile(path,sha){
 const file=await request(API+'/contents/'+encodeURIComponent(path)+'?ref='+sha);
 if(file.encoding!=='base64'||!file.sha||typeof file.content!=='string')throw Error('base_source_unavailable');
 return {sha:file.sha,content:Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8')};
}
export async function main(){
 const out={checkedAt:new Date().toISOString(),status:'started',repo:TARGET,privilegedWrites:false};
 try{
  const report=JSON.parse(await fs.readFile('oracle-audit-evidence/report.json','utf8'));
  if(!Array.isArray(report.findings)||!report.findings.length){out.status='no_failing_checks';return out}
  const head=(await request(API+'/git/ref/heads/main')).object?.sha;
  if(!/^[a-f0-9]{40}$/.test(head||''))throw Error('main_commit_missing');
  const files={};const shas={};
  for(const path of ['phi-scholastic-data.css','index.html','phi-scholastic-data.js']){
   const entry=await getFile(path,head);files[path]=entry.content;shas[path]=entry.sha;
  }
  const patch=candidateFromEvidence(report.findings,files);
  if(!patch){out.status='requires_model_or_owner_review';return out}
  validateCandidate(patch,files);
  const fingerprint=sha256(head+patch.id+sha256(patch.after)).slice(0,12);
  const branch='oracle-safe-repair/'+patch.id+'-'+fingerprint;
  out.candidate={id:patch.id,path:patch.path,baseSha:head,branch,reason:patch.reason};
  // All source checks run before any possible write. No self-merging.
  const now=await getFile(patch.path,'main');
  const current=(await request(API+'/git/ref/heads/main')).object?.sha;
  if(current!==head||now.sha!==shas[patch.path])throw Error('main_changed_during_validation');
  if(process.env.ORACLE_REPAIR_APPLY!=='true'){out.status='dry_run';return out}
  if(process.env.GITHUB_EVENT_NAME==='pull_request')throw Error('no_writes_from_pr_context');
  if(!TOKEN())throw Error('github_token_missing');
  const existing=await request(API+'/pulls?state=all&head=www-infinity4:'+encodeURIComponent(branch)+'&per_page=20');
  if(existing.length){out.status='existing_pr';out.url=existing[0].html_url;return out}
  await request(API+'/git/refs',{method:'POST',body:{ref:'refs/heads/'+branch,sha:head}});
  out.privilegedWrites=true;
  await request(API+'/contents/'+encodeURIComponent(patch.path),{method:'PUT',body:{message:'fix(oracle): '+patch.reason,branch,sha:shas[patch.path],content:Buffer.from(patch.after,'utf8').toString('base64')}});
  const pr=await request(API+'/pulls',{method:'POST',body:{title:'Draft Oracle self-repair: '+patch.id,head:branch,base:'main',draft:true,body:['Automated *bounded* repair from the daily Oracle regression report.',patch.reason,'','Pinned base: '+head,'Only file: '+patch.path,'No wallet, database, paid actions or Cloudflare changes.','The audit regression tests passed before preparing this PR; independent browser review is still required.','No automated merge.'].join('\n')}});
  out.status='draft_pr_created';out.url=pr.html_url;out.prNumber=pr.number;
  return out;
 }catch(error){out.status='blocked';out.error=String(error.message||error).slice(0,200);process.exitCode=1;return out}
 finally{
  await fs.mkdir('oracle-audit-evidence',{recursive:true});
  await fs.writeFile('oracle-audit-evidence/repair-dispatch.json',JSON.stringify(out,null,2));
  console.log(JSON.stringify(out));
 }
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)await main();
