// Native function schemas for the existing owner-authenticated GitHub executor.
// Descriptions guide model planning; githubOperation remains the authority.
const object=(properties={},required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const string=(maxLength,description)=>({type:'string',minLength:1,maxLength,description});
const definitions=[
 ['read_repository','Read the selected repository default branch and immutable head SHA.',object(),'read'],
 ['read_file','Read a file at the inspected immutable head SHA. Missing files return exists:false.',object({path:string(240,'Repository-relative file path'),ref:{type:'string',pattern:'^[a-f0-9]{40}$',description:'Head SHA returned by read_repository'}}),'read'],
 ['list_runs','Read actual recent workflow runs, including status and conclusion.',object(),'read'],
 ['list_workflows','Discover actual workflow filenames before a requested dispatch.',object(),'read'],
 ['commit_files','Stage reviewed complete files on the server-selected task branch. Does not prove tests, merge, or deployment.',object({baseSha:{type:'string',pattern:'^[a-f0-9]{40}$'},message:string(300,'Commit message'),files:{type:'array',minItems:1,maxItems:12,items:object({path:string(240,'Previously inspected repository-relative path'),content:{type:'string',maxLength:100000}})}}),'write'],
 ['create_pr','Open a pull request for the reviewed task branch so target CI can run.',object({base:string(140,'Inspected default branch'),title:string(180,'Pull request title'),body:{type:'string',maxLength:5000}},['base','title']),'write'],
 ['dispatch_workflow','Dispatch only a workflow explicitly requested by the owner and discovered in this repository. Acceptance is not successful execution.',object({workflow:{type:'string',pattern:'^[A-Za-z0-9_.-]+\\.ya?ml$'},ref:string(140,'Explicit branch or tag'),inputs:{type:'object',maxProperties:10,additionalProperties:{type:'string',maxLength:2000}}},['workflow','ref']),'actions'],
 ['finish','Finish with a concise evidence-based summary. Never invent work or deployment.',object({summary:string(2000,'Verified outcome and actual remaining blockers')}),'read']
];
export function directGithubTools(mode='read'){
 return definitions.filter(([, , ,scope])=>scope==='read'||scope===mode)
  .map(([name,description,parameters])=>({type:'function',function:{name,description,parameters}}));
}
export function decodeGithubStep(answer){
 const calls=answer?.choices?.[0]?.message?.tool_calls??answer?.tool_calls??answer?.output?.filter?.(item=>item.type==='function_call');
 if(calls?.length){
  if(!Array.isArray(calls)||calls.length!==1)throw Error('direct_engineer_single_tool_required');
  const call=calls[0],name=call.function?.name||call.name;
  if(!definitions.some(([known])=>known===name))throw Error('direct_engineer_unknown_tool');
  let args=call.function?.arguments??call.arguments??{};
  if(typeof args==='string'){try{args=JSON.parse(args)}catch{throw Error('direct_engineer_invalid_arguments')}}
  if(!args||typeof args!=='object'||Array.isArray(args))throw Error('direct_engineer_invalid_arguments');
  return {action:name,args,...(name==='finish'?{summary:args.summary}:{})};
 }
 // Compatibility for providers still returning the old JSON envelope.
 const raw=answer?.response||answer?.choices?.[0]?.message?.content||'';
 let step;try{step=JSON.parse(raw.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''))}catch{throw Error('direct_engineer_invalid_json')}
 if(!step||typeof step!=='object'||Array.isArray(step))throw Error('direct_engineer_invalid_json');
 return step;
}
