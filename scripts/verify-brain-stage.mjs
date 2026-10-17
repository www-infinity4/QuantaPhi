// Cloudflare Brain zero-traffic staging preflight and postflight.
// This script NEVER uploads, deploys or changes a Worker or any secret.
// It compares binding identities in memory, and records only safe metadata.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const mode=process.argv[2];
const worker='infinity-brain-clock';
const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const token=process.env.CLOUDFLARE_API_TOKEN;
const receiptPath='repository-receipts/brain-clock-staged-version.json';
const statePath='/tmp/brain-clock-version-before.json';
const REQUIRED={
 WORK_DB:'d1',CLOCK:'durable_object_namespace',BOT_WALLET:'service',
 MODELS:'service',WRITER_AI:'ai',BOT_WORK_SECRET:'secret_text',
 WRITER_OWNER_HASH:'plain_text'
};
if(!['before','after'].includes(mode))throw Error('stage_validation_mode_invalid');
if(!/^[a-f0-9]{32}$/.test(account||'')||!token)
 throw Error('cloudflare_staging_account_or_token_missing');
const base='/accounts/'+account+'/workers/scripts/'+worker;
async function api(path){
 const res=await fetch('https://api.cloudflare.com/client/v4'+path,{
  headers:{Authorization:'Bearer '+token,Accept:'application/json'},
  redirect:'error',signal:AbortSignal.timeout(15000)
 });
 if(!res.ok)throw Error('cloudflare_read_failed_'+res.status+'_'+path.split('/').at(-1));
 const body=await res.json();
 if(body?.success!==true)throw Error('cloudflare_response_unsuccessful');
 return body.result;
}
function deployment(list){
 const current=(list?.deployments||list||[])[0];
 if(!current?.id||current.versions?.length!==1||current.versions[0]?.percentage!==100||
  !/^[a-f0-9-]{36}$/.test(current.versions[0]?.version_id||''))
  throw Error('expected_exactly_one_100_percent_deployed_version');
 return {id:current.id,versionId:current.versions[0].version_id};
}
function bindings(version){
 const list=version?.resources?.bindings;
 if(!Array.isArray(list))throw Error('script_version_binding_list_unavailable');
 const map=new Map(list.map(v=>[v.name,v]));
 for(const [name,type] of Object.entries(REQUIRED))
  if(map.get(name)?.type!==type)throw Error('required_binding_absent_or_wrong_type: '+name);
 return Object.fromEntries([...map].sort(([a],[b])=>a.localeCompare(b)));
}
function compareBindings(a,b){
 const names=Object.keys(a);
 if(JSON.stringify(names)!==JSON.stringify(Object.keys(b)))throw Error('candidate_binding_names_changed');
 for(const name of names){
  const prior=a[name],candidate=b[name];
  // Never print binding values or decrypted owner identifiers. Verify all
  // identities and routing config, not merely binding labels or types.
  if(JSON.stringify(prior)!==JSON.stringify(candidate))
   throw Error('candidate_binding_identity_changed: '+name);
 }
}
if(mode==='before'){
 const active=deployment(await api(base+'/deployments'));
 const current=await api(base+'/versions/'+active.versionId);
 const bound=bindings(current);
 // Keep this temporary file on the short-lived GitHub runner only.
 writeFileSync(statePath,JSON.stringify({active,bindings:bound,at:Date.now()}));
 console.log('Cloudflare baseline saved: single active production version; all required binding types present.');
}else{
 const prior=JSON.parse(readFileSync(statePath,'utf8'));
 const active=deployment(await api(base+'/deployments'));
 if(active.id!==prior.active.id||active.versionId!==prior.active.versionId)
  throw Error('production_worker_traffic_changed_during_stage');
 const versions=await api(base+'/versions?per_page=5');
 const list=versions?.items||versions||[];
 if(!Array.isArray(list)||!list.length)throw Error('candidate_version_list_missing');
 const candidateId=list[0].id;
 if(candidateId===prior.active.versionId||!/^[a-f0-9-]{36}$/.test(candidateId||''))
  throw Error('no_new_immutable_stage_version');
 const candidate=await api(base+'/versions/'+candidateId);
 compareBindings(prior.bindings,bindings(candidate));
 const message=String(candidate.annotations?.['workers/message']||'');
 if(!message.includes(String(process.env.GITHUB_SHA||''))||!message.includes('recovery'))
  throw Error('staged_source_commit_provenance_missing');
 mkdirSync('repository-receipts',{recursive:true});
 const receipt={status:'staged_zero_traffic',stagedVersionId:candidateId,
  previousActiveVersionId:prior.active.versionId,
  productionDeploymentId:active.id,productionUnchanged:true,
  allBindingIdentitiesMatched:true,
  githubSha:process.env.GITHUB_SHA,canaryPromoted:false,
  verifiedAt:new Date().toISOString()};
 writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
 console.log('Staging VERIFIED: code and binding identities match baseline; Cloudflare active traffic remains unchanged.');
}
