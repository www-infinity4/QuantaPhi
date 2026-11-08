/* Durable, bounded and readback-verified evidence of an authenticated
 * GitHub branch read. This is a tool observation, not execution of a runner
 * job or a wallet credit. Only owner-authorized Brain code invokes it. */
const KEY='owner-github-branch-read-receipts-v1';
const ID=/^branch_[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const REPOSITORY=/^www-infinity4\/[A-Za-z0-9_.-]{1,80}$/;
const BRANCH=/^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/;
const valid=result=>result?.ok===true&&
 ['branch_found','branch_not_found'].includes(result.status)&&
 REPOSITORY.test(result.repository||'')&&Number.isSafeInteger(result.repositoryId)&&result.repositoryId>0&&
 BRANCH.test(result.branch||'')&&!result.branch.includes('..')&&!result.branch.includes('//')&&
 !result.branch.endsWith('/')&&!result.branch.startsWith('refs/')&&
 result.branch.split('/').every(x=>!x.startsWith('.')&&!x.endsWith('.'))&&
 ((result.status==='branch_found'&&result.exists===true&&SHA.test(result.headSha||''))||
  (result.status==='branch_not_found'&&result.exists===false&&result.headSha===null))&&
 result.jobExecutionVerified===false&&result.deploymentVerified===false&&
 typeof result.observedAt==='string'&&Number.isFinite(Date.parse(result.observedAt));
export async function storeAndVerifyBranchReadReceipt(storage,result){
 if(!valid(result))throw Error('invalid_branch_read_result');
 if(!storage||typeof storage.get!=='function'||typeof storage.put!=='function')
  throw Error('branch_receipt_storage_missing');
 const proof={
  id:'branch_'+crypto.randomUUID().replaceAll('-','').toLowerCase(),
  tool:'github.read_branch_status',status:'complete',persisted:true,
  repository:result.repository,repositoryId:result.repositoryId,
  branch:result.branch,exists:result.exists,headSha:result.headSha,
  observedAt:result.observedAt,jobExecutionVerified:false,deploymentVerified:false
 };
 const previous=await storage.get(KEY);
 const entries=Array.isArray(previous)?previous.filter(x=>x&&ID.test(x.id||'')):[];
 await storage.put(KEY,[...entries,proof].slice(-32));
 const saved=await storage.get(KEY);
 if(!Array.isArray(saved)||!saved.some(x=>x?.id===proof.id&&x.repository===result.repository&&
  x.branch===result.branch&&x.exists===result.exists&&x.headSha===result.headSha&&
  x.tool==='github.read_branch_status'&&x.status==='complete'))
  throw Error('branch_receipt_readback_unverified');
 return proof;
}
