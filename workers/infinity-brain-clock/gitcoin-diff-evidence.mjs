// GitHub-verified, *candidate-only* code-line attribution for Bubbles.
// No file body, personal prompt, token or executable source is sent to wallet.
// Gitcoin's independent reviewer (and Quant AI review) decides issuance.
const sha40=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
const stepReceipt=x=>typeof x==='string'&&/^bb_[a-f0-9]{64}$/.test(x);
const pathOk=x=>typeof x==='string'&&x.length<250&&!!x&&
 !x.startsWith('/')&&!/[\\\x00-\x1f]/.test(x)&&
 !x.split('/').some(p=>!p||p==='.'||p==='..'||p==='.git')&&
 !/(?:^|\/)(?:dist|build|vendor|node_modules|coverage|\.next)(?:\/|$)/.test(x)&&
 !/\.min\./i.test(x);
const langs=Object.freeze({
 js:'javascript',mjs:'javascript',cjs:'javascript',jsx:'javascript',
 ts:'typescript',tsx:'typescript',py:'python',html:'html',css:'css',
 go:'go',rs:'rust',java:'java',sol:'solidity',sh:'shell',
 c:'c',cc:'cpp',cpp:'cpp',h:'c',hpp:'cpp',swift:'swift',kt:'kotlin'
});
const digest=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',
 new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const invalid=(reason='invalid_github_commit')=>({status:'blocked',items:[],reason});
const manual=(reason='manual_diff_review_required')=>({status:'manual_review_required',items:[],reason});
function contextOk(context){
 return /^www-infinity4\/[A-Za-z0-9_.-]{2,80}$/.test(context?.repo||'')&&
  sha40(context?.commitSha)&&stepReceipt(context?.sourceReceiptId)&&
  typeof context?.userId==='string'&&context.userId.length>0&&context.userId.length<=200;
}
export async function extractGitLineCandidates(commit,context){
 if(!contextOk(context)||!commit||commit.sha!==context.commitSha||
    !Array.isArray(commit.parents)||commit.parents.length!==1||!sha40(commit.parents[0]?.sha))
  return invalid('signed_commit_identity_unverified');
 if(!Array.isArray(commit.files)||commit.files.length>12)
  return manual('large_or_missing_git_diff');
 const items=[];
 for(const file of commit.files){
  const path=file?.filename;
  if(!pathOk(path)||!['modified','added'].includes(file.status))continue;
  const extension=path.split('.').pop().toLowerCase(),language=langs[extension];
  if(!language)continue;
  if(typeof file.patch!=='string'||file.patch.length>50000||
     !Number.isSafeInteger(file.additions)||file.additions<0)
   return manual('github_diff_incomplete');
  const patch=file.patch.split('\n');
  let oldCursor=null,newCursor=null,oldEnd=null,newEnd=null,rawAdded=0,hasHunk=false;
  const endHunk=()=>{
   if(oldCursor===null)return true;
   return oldCursor===oldEnd&&newCursor===newEnd;
  };
  for(const line of patch){
   const hunk=/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
   if(hunk){
    if(!endHunk())return manual('github_hunk_incomplete');
    const os=Number(hunk[1]),oc=Number(hunk[2]??1),ns=Number(hunk[3]),nc=Number(hunk[4]??1);
    if([os,oc,ns,nc].some(n=>!Number.isSafeInteger(n)||n<0||n>2000000))
     return manual('invalid_github_hunk_range');
    oldCursor=os;newCursor=ns;oldEnd=os+oc;newEnd=ns+nc;hasHunk=true;
   }else if(oldCursor!==null){
    if(line.startsWith('+')){
     rawAdded++;
     const text=line.slice(1);
     if(text.trim()){
      if(items.length>=25)return manual('more_than_25_code_lines_review_required');
      items.push({version:1,source:'brain_verified_github_commit_v1',
       sourceReceiptId:context.sourceReceiptId,userId:context.userId,
       repo:context.repo,commitSha:context.commitSha,filePath:path,lineNumber:newCursor,
       contentSha256:await digest(text),language,intent:'generated_code'});
     }
     newCursor++;
    }else if(line.startsWith('-'))oldCursor++;
    else if(line.startsWith(' ')){oldCursor++;newCursor++}
    else if(line.startsWith('\\ No newline at end of file')){/* metadata, not code */}
    else return manual('github_hunk_unrecognized');
    if(newCursor>newEnd||oldCursor>oldEnd)return manual('github_hunk_out_of_bounds');
   }else if(line.trim())return manual('github_patch_header_unexpected');
  }
  if(!hasHunk||!endHunk()||rawAdded!==file.additions)
   return manual('github_diff_addition_count_mismatch');
 }
 return {status:'candidates',items,reviewRequired:false};
}
// Only a real signed Brain commit with an actual GitHub commit API response
// may submit candidates. Wallet's second active executor/identity check protects
// the recipient; all claims remain pending independent rights/diff review.
export async function queueGitHubCommitCandidates(env,context,request=fetch){
 if(env.GITCOIN_CLAIMS_ENABLED!=='1')return {status:'disabled',submittedPending:0,mintedGitCoins:0};
 if(!contextOk(context)||!env.GITHUB_TOKEN||!env.BOT_WORK_SECRET||!env.BOT_WALLET?.fetch)
  return {status:'blocked',reason:'signed_gitcoin_dependencies_missing',submittedPending:0,mintedGitCoins:0};
 let response,commit;
 try{
  response=await request('https://api.github.com/repos/'+context.repo+'/commits/'+context.commitSha,
   {method:'GET',redirect:'manual',
    headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json',
     'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Bubbles-Gitcoin-Evidence'},
    signal:AbortSignal.timeout(12000)});
  if(!response.ok||response.status!==200)return invalid('github_commit_read_failed');
  commit=await response.json();
 }catch{return invalid('github_commit_read_failed')}
 const candidates=await extractGitLineCandidates(commit,context);
 if(candidates.status!=='candidates')
  return {...candidates,submittedPending:0,mintedGitCoins:0};
 if(!candidates.items.length)
  return {status:'no_eligible_new_code_lines',submittedPending:0,mintedGitCoins:0};
 let count=0;
 for(const claim of candidates.items){
  try{
   const r=await env.BOT_WALLET.fetch('https://wallet.internal/internal/gitcoin-line-claim',{
    method:'POST',headers:{'Content-Type':'application/json',
     'X-Bot-Work-Key':env.BOT_WORK_SECRET},body:JSON.stringify(claim),
    signal:AbortSignal.timeout(9000)});
   const data=await r.json();
   if(!r.ok||data?.ok!==true||data.status!=='pending_independent_line_and_rights_review'||
      data.mintedGitCoins!==0||data.spendableGitCoins!==0)
    return {status:'partially_submitted_or_blocked',submittedPending:count,mintedGitCoins:0,
     reason:'wallet_pending_claim_not_confirmed'};
   count++;
  }catch{return {status:'partially_submitted_or_blocked',submittedPending:count,
    mintedGitCoins:0,reason:'wallet_pending_claim_not_confirmed'}}
 }
 return {status:'pending_review',submittedPending:count,mintedGitCoins:0,
  spendableGitCoins:0,source:'verified_github_commit_diff_pending_independent_review'};
}
