/**
 * Promotion gate for the very small deterministic site-integrity repair.
 * Never merges arbitrary bot changes. All conditions fail closed.
 * Does NOT deploy or claim live verification.
 */
import { repairHtml, isRepairableFile } from './site-integrity-guard.mjs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const REPO='www-infinity4/QuantaPhi';
const API='https://api.github.com/repos/'+REPO;
const BRANCH=/^site-integrity\/autofix-[a-f0-9]{12}$/;
export function eligibleRepair({pr,files,baseSource,headSource,checks,mainSha}) {
 if(!pr||!BRANCH.test(pr.head?.ref||'')||pr.head?.repo?.full_name!==REPO||pr.base?.ref!=='main')return 'untrusted_branch';
 if(pr.base.sha!==mainSha||pr.state!=='open'||pr.draft||pr.mergeable!==true||pr.mergeable_state!=='clean')return 'unmergeable_or_stale';
 if(pr.user?.login!=='github-actions[bot]')return 'untrusted_author';
 if(!Array.isArray(files)||files.length!==1||!isRepairableFile(files[0].filename)||files[0].status!=='modified')return 'unsafe_changed_files';
 const patch=repairHtml(baseSource,files[0].filename);
 if(patch.fixes.length<1||patch.fixes.length>10||patch.source!==headSource)return 'unverified_source_delta';
 // The protected check that verifies the scanner itself must pass on this SHA.
 if(!Array.isArray(checks)||checks.length<1||!checks.some(c=>c.name==='site-integrity-source-and-browser'&&c.status==='completed'&&c.conclusion==='success'))return 'guard_ci_not_green';
 if(checks.some(c=>c.status!=='completed'||!['success','neutral','skipped'].includes(c.conclusion)))return 'pending_or_failed_checks';
 return null;
}
async function main(){
 const token=process.env.GITHUB_TOKEN;
 if(!token)throw Error('github_token_missing');
 const result={checkedAt:new Date().toISOString(),status:'inspection',items:[],confirmedDeployment:false};
 const api=async(endpoint,options={})=>{
  if(!endpoint.startsWith(API+'/'))throw Error('github_endpoint_not_allowlisted');
  const response=await fetch(endpoint,{...options,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',Authorization:'Bearer '+token,'User-Agent':'QuantaPhi-site-integrity',...(options.body?{'Content-Type':'application/json'}:{})},signal:AbortSignal.timeout(18000)});
  if(!response.ok)throw Error('GitHub '+response.status+' '+new URL(endpoint).pathname);
  return response.status===204?{}:response.json();
 };
 const [ref,prs]=await Promise.all([api(API+'/git/ref/heads/main'),api(API+'/pulls?state=open&per_page=100')]);
 const mainSha=ref.object?.sha;if(!/^[a-f0-9]{40}$/.test(mainSha||''))throw Error('main_sha_missing');
 for(const item of prs.filter(p=>BRANCH.test(p.head?.ref||'')).slice(0,5)){
  const pr=await api(API+'/pulls/'+item.number);
  const base=pr.base?.sha,head=pr.head?.sha;
  if(!/^[a-f0-9]{40}$/.test(head||'')||base!==mainSha){result.items.push({number:pr.number,status:'stale_or_invalid'});continue;}
  const files=await api(API+'/pulls/'+pr.number+'/files?per_page=100');
  if(files.length!==1||!isRepairableFile(files[0].filename)||files[0].status!=='modified'){
   result.items.push({number:pr.number,status:'blocked',reason:'unsafe_changed_files'});continue;
  }
  const filename=files[0].filename;
  const safePath=filename.split('/').map(encodeURIComponent).join('/');
  const [baseBlob,headBlob,checkData]=await Promise.all([
   api(API+'/contents/'+safePath+'?ref='+base),
   api(API+'/contents/'+safePath+'?ref='+head),
   api(API+'/commits/'+head+'/check-runs?per_page=100')
  ]);
  const decode=b=>b.encoding==='base64'?Buffer.from(b.content.replace(/\s/g,''),'base64').toString('utf8'):'';
  const reason=checkData.total_count>100?'checks_paginated_unverified':eligibleRepair({pr,files,baseSource:decode(baseBlob),headSource:decode(headBlob),checks:checkData.check_runs,mainSha});
  if(reason){result.items.push({number:pr.number,status:'blocked',reason});continue;}
  // Exact expected-head lease: no forced or unchecked merges.
  try{
   const merged=await api(API+'/pulls/'+pr.number+'/merge',{method:'PUT',body:JSON.stringify({sha:head,merge_method:'squash',commit_title:'Fix verified literal HTML escape in '+filename+' (#'+pr.number+')'})});
   result.items.push({number:pr.number,status:merged.merged===true?'source_merged_deployment_pending':'merge_unverified',mergeSha:merged.sha||null});
  }catch(error){result.items.push({number:pr.number,status:'merge_blocked',reason:String(error.message).slice(0,160)});}
 }
 console.log(JSON.stringify(result));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1});
