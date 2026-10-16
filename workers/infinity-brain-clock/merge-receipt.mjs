export async function reconcileMergedJob(env,body,request=fetch){
 const repository=body.repository,number=Number(body.number);
 if(!/^www-infinity4\/[\w.-]+$/.test(repository||'')||!Number.isSafeInteger(number)||number<1)throw Error('invalid_merge_receipt');
 if(!env.GITHUB_TOKEN)throw Error('github_credential_not_connected');
 const api=async route=>{const r=await request('https://api.github.com/repos/'+repository+route,{headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json','User-Agent':'Bubbles-Merge-Receipt'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('merge_verification_http_'+r.status);return r.json();};
 const pr=await api('/pulls/'+number);
 if(pr.merged!==true||pr.base?.repo?.full_name!==repository||pr.head?.repo?.full_name!==repository||!/^www-infinity4$/i.test(pr.user?.login||'')||!/^([a-f0-9]{40})$/.test(pr.head?.sha||'')||!/^([a-f0-9]{40})$/.test(pr.merge_commit_sha||''))throw Error('merged_pull_request_not_verified');
 if(body.headSha&&body.headSha!==pr.head.sha)throw Error('merged_head_mismatch');
 const [checks,status]=await Promise.all([api('/commits/'+pr.head.sha+'/check-runs?per_page=100'),api('/commits/'+pr.head.sha+'/status')]);
 if(!checks.check_runs?.some(c=>c.conclusion==='success')||checks.total_count>100||checks.check_runs.some(c=>c.status!=='completed'||!['success','neutral','skipped'].includes(c.conclusion))||(status.statuses||[]).some(s=>s.state!=='success'))throw Error('merged_target_checks_not_verified');
 const rows=await env.WORK_DB.prepare("SELECT id,context_json FROM work_tickets WHERE owner_hash=? AND json_extract(context_json,'$.kind')='robot-directions' AND status!='complete' LIMIT 100").bind(env.WRITER_OWNER_HASH).all();
 let matched=0;
 for(const row of rows.results||[]){
  const context=JSON.parse(row.context_json);let changed=false;
  for(const job of context.color_jobs||[]){
   if(job.repository!==repository||job.progress?.commitSha!==pr.head.sha||job.status==='complete')continue;
   job.status='merged_verified';job.progress={...job.progress,summary:'Code merged after target checks passed.',mergeSha:pr.merge_commit_sha,prUrl:pr.html_url,testsPassed:true,blocker:'deployment_not_verified',next:'Code is merged. Deployment and feature acceptance remain separate.',mergedAt:pr.merged_at};changed=true;matched++;
  }
  if(changed)await env.WORK_DB.prepare('UPDATE work_tickets SET context_json=?,updated_at=? WHERE id=? AND context_json=?').bind(JSON.stringify(context),Date.now(),row.id,row.context_json).run();
 }
 return {ok:true,status:'merged_verified',repository,number,headSha:pr.head.sha,mergeSha:pr.merge_commit_sha,url:pr.html_url,testsPassed:true,deployed:false,matchedJobs:matched};
}
