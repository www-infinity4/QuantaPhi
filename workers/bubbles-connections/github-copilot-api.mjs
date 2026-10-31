/* Per-user GitHub API adapter. No browser tokens, owner credential, scraping or website iframe. */
const repoPattern=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
export async function githubCopilotRequest({accessToken,repository,action,prompt='',prNumber,confirmation},request=globalThis.fetch){
 if(typeof accessToken!=='string'||!accessToken)throw Error('connection_not_verified');
 if(typeof repository!=='string'||!repoPattern.test(repository)||repository.includes('..'))throw Error('repository_invalid');
 const base='https://api.github.com/repos/'+repository;
 const headers={Authorization:'Bearer '+accessToken,Accept:'application/vnd.github+json',
  'X-GitHub-Api-Version':'2022-11-28','User-Agent':'QuantaPhi-Copilot-Card'};
 const call=async(path,method='GET',payload)=>{
  const response=await request(base+path,{method,headers:{...headers,...(payload?{'Content-Type':'application/json'}:{})},
   ...(payload?{body:JSON.stringify(payload)}:{}),redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('github_copilot_http_'+response.status);
  const value=await response.json();
  if(!value||typeof value!=='object')throw Error('github_copilot_response_invalid');
  return value;
 };
 if(action==='prs'){
  const items=await call('/pulls?state=open&per_page=30&sort=updated&direction=desc');
  if(!Array.isArray(items))throw Error('github_copilot_response_invalid');
  return {prs:items.slice(0,30).map(pr=>({number:pr.number,title:String(pr.title||'').slice(0,200),
   draft:pr.draft===true,headSha:pr.head?.sha||null,updatedAt:pr.updated_at||null,
   url:pr.html_url||null})).filter(pr=>Number.isSafeInteger(pr.number)&&pr.number>0)};
 }
 if(action==='build'){
  const clean=String(prompt||'').trim();
  if(clean.length<12||clean.length>4000)throw Error('copilot_prompt_invalid');
  const title=clean.split(/[\r\n.!?]/)[0].slice(0,100).trim()||'Build requested website';
  const metadata=await call('');
  const baseBranch=String(metadata.default_branch||'');
  if(!/^[A-Za-z0-9_.\/-]{1,160}$/.test(baseBranch)||baseBranch.includes('..'))throw Error('repository_branch_invalid');
  const created=await call('/issues','POST',{title:'Infinity Copilot: '+title,
   body:'Requested through QuantaPhi Infinity Copilot Quick Card.\n\n'+clean+
     '\n\nMake changes in a reviewable pull request. Include tests and evidence. Never merge or deploy automatically.',
   assignees:['copilot-swe-agent[bot]'],
   agent_assignment:{target_repo:repository,base_branch:baseBranch,custom_instructions:'Create a PR and include test evidence; do not merge or deploy without review.'}});
  if(!Number.isSafeInteger(created.number))throw Error('github_copilot_response_invalid');
  const assigned=Array.isArray(created.assignees)&&created.assignees.some(a=>a.login==='copilot-swe-agent[bot]'||a.login==='copilot-swe-agent');
  return {status:assigned?'copilot_assigned':'issue_created_not_assigned',issue:created.number,
    url:created.html_url||null,notice:assigned?'Copilot was assigned; a PR is not yet verified.':'Issue created but Copilot assignment was not confirmed.'};
 }
 const number=Number(prNumber);
 if(!Number.isSafeInteger(number)||number<1||number>100000000)throw Error('pull_request_invalid');
 if(action==='details'){
  const [files,comments]=await Promise.all([
   call('/pulls/'+number+'/files?per_page=100'),
   call('/issues/'+number+'/comments?per_page=30')]);
  if(!Array.isArray(files)||!Array.isArray(comments))throw Error('github_copilot_response_invalid');
  return {pr:number,
   files:files.slice(0,100).map(f=>({path:String(f.filename||'').slice(0,300),
    status:String(f.status||'').slice(0,30),additions:Number(f.additions)||0,
    deletions:Number(f.deletions)||0,patch:String(f.patch||'').slice(0,2400)})),
   messages:comments.slice(-20).map(c=>({author:String(c.user?.login||'unknown').slice(0,80),
    body:String(c.body||'').slice(0,3000),createdAt:c.created_at||null}))};
 }
 if(action==='feedback'){
  const body=String(prompt||'').trim();
  if(body.length<3||body.length>4000)throw Error('copilot_prompt_invalid');
  const posted=await call('/issues/'+number+'/comments','POST',{body:'@copilot '+body});
  if(!Number.isSafeInteger(posted.id))throw Error('github_copilot_response_invalid');
  return {status:'comment_posted',pr:number,commentId:posted.id,url:posted.html_url||null};
 }
 if(action==='merge'){
  if(confirmation!=='MERGE '+repository+'#'+number)throw Error('merge_confirmation_required');
  const pr=await call('/pulls/'+number);
  if(pr.state!=='open'||pr.draft===true||pr.mergeable!==true||!/^[a-f0-9]{40}$/.test(pr.head?.sha||''))
   throw Error('merge_pr_not_ready');
  const [combined,checks,reviews]=await Promise.all([
   call('/commits/'+pr.head.sha+'/status'),
   call('/commits/'+pr.head.sha+'/check-runs?per_page=100'),
   call('/pulls/'+number+'/reviews?per_page=100')]);
  const runs=checks.check_runs;
  if(!Array.isArray(reviews)||!reviews.some(r=>r.state==='APPROVED'&&r.user?.login!==pr.user?.login))
   throw Error('merge_independent_review_required');
  if(!Array.isArray(runs)||runs.length<1||Number(checks.total_count)>100||
     runs.some(r=>r.status!=='completed'||r.conclusion!=='success')||
     !['success','pending'].includes(combined.state)||
     (Number(combined.total_count)>0&&combined.state!=='success'))
   throw Error('merge_checks_not_passed');
  const done=await call('/pulls/'+number+'/merge','PUT',{sha:pr.head.sha,merge_method:'squash'});
  if(done.merged!==true||!/^[a-f0-9]{40}$/.test(done.sha||''))throw Error('merge_not_verified');
  return {status:'merged',pr:number,commit:done.sha,url:base.replace('api.github.com/repos','github.com')+'/pull/'+number};
 }
 throw Error('unsupported_action');
}
