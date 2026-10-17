import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const handoffUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/technical-handoff.mjs',import.meta.url))).toString('base64');
const credentialUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/github-credential.mjs',import.meta.url))).toString('base64');
const mergeUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/merge-receipt.mjs',import.meta.url))).toString('base64');
const directGithubUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/direct-github.mjs',import.meta.url))).toString('base64');
const queueUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/queue-order.mjs',import.meta.url))).toString('base64');
const ticketStatusUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/ticket-status.mjs',import.meta.url))).toString('base64');
const authUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/runner-auth.mjs',import.meta.url))).toString('base64');
const previewUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/preview-contract.mjs',import.meta.url))).toString('base64');
const quantUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/job-quant.mjs',import.meta.url))).toString('base64');
const policyUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/bot-work-policy.mjs',import.meta.url))).toString('base64');
const episodicUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/brain-rag-memory.mjs',import.meta.url))).toString('base64');
const evidenceUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/evidence-store.mjs',import.meta.url))).toString('base64');
const evidenceDbUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/evidence-db.mjs',import.meta.url))).toString('base64');
const arbitrationUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/arbitration-evidence.mjs',import.meta.url))).toString('base64');
const resonanceUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/bubbles-tools/resonance.mjs',import.meta.url))).toString('base64');
const conversationUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/conversation-memory.mjs',import.meta.url))).toString('base64');
const phoneUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/phone-tool.mjs',import.meta.url))).toString('base64');
const redUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/red-sectors.mjs',import.meta.url))).toString('base64');
const alarmUrl='data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL('../workers/infinity-brain-clock/alarm-retry.mjs',import.meta.url))).toString('base64');
const source=(await fs.readFile(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8')).replace("./technical-handoff.mjs",handoffUrl).replace("./phone-tool.mjs",phoneUrl).replace("./conversation-memory.mjs",conversationUrl).replace("./red-sectors.mjs",redUrl).replace("./alarm-retry.mjs",alarmUrl).replace("import { DurableObject } from 'cloudflare:workers';","class DurableObject { constructor() {} }").replace("./runner-auth.mjs",authUrl).replace("./preview-contract.mjs",previewUrl).replace('./job-quant.mjs',quantUrl).replace('./bot-work-policy.mjs',policyUrl).replace('./brain-rag-memory.mjs',episodicUrl).replace('./evidence-store.mjs',evidenceUrl).replace('./evidence-db.mjs',evidenceDbUrl).replace('./queue-order.mjs',queueUrl).replace('./ticket-status.mjs',ticketStatusUrl).replace('./arbitration-evidence.mjs',arbitrationUrl).replace('../bubbles-tools/resonance.mjs',resonanceUrl);
const {default:brainWorker,BrainClock,validateInstruction,readRunnerBody,ownerTickets}=await import('data:text/javascript;base64,'+Buffer.from(source.replace('./direct-github.mjs',directGithubUrl).replace('./github-credential.mjs',credentialUrl).replace('./merge-receipt.mjs',mergeUrl)).toString('base64'));
test('owner wallet connection stores verified identity but never a device token and cannot switch recipients',async()=>{
 const memory=new Map(),token='sq_'+'a'.repeat(40);let userId='owner';
 const clock=new BrainClock({storage:{get:async k=>memory.get(k),put:async(k,v)=>memory.set(k,v)}},{BOT_WALLET:{fetch:async()=>Response.json({ok:true,user:{id:userId,username:'fixture-owner'}})}});
 const request=()=>new Request('https://clock.internal/earnings-connect',{method:'POST',body:JSON.stringify({walletToken:token})});
 const connected=await clock.fetch(request());assert.equal((await connected.json()).connected,true);assert.equal(memory.get('bot-work-recipient').userId,'owner');assert.ok(!JSON.stringify([...memory]).includes(token));
 userId='other';assert.equal((await clock.fetch(request())).status,409);assert.equal(memory.get('bot-work-recipient').userId,'owner');
});
test('reader receives verified runtime capabilities rather than stale adapter blockers',async()=>{
 const memory=new Map([['key',{key:'key',leaseId:'lease',runId:'42',engine:true,leaseUntil:Date.now()+60000,job:{instructions:'Repair page',progress:{blocker:'repository_adapter_not_connected'}}}]]);
 let messages;
 const clock=new BrainClock({storage:{get:async k=>memory.get(k),put:async(k,v)=>memory.set(k,v)}},{WRITER_AI:{run:async(model,input)=>{messages=input.messages;return {response:JSON.stringify({summary:'Inspect source',files:['index.html'],subtasks:[],blockers:[]})};}}});
 const runtime={repositoryCloned:true,reportedPushPermission:true,excludedPaths:['.github/']};
 await clock.runner(new Request('https://clock/runner/plan',{method:'POST',body:JSON.stringify({runId:'42',runnerRepository:'www-infinity4/Moltnook',key:'key',leaseId:'lease',evidence:{runtime}})}));
 const input=JSON.parse(messages[1].content);
 assert.equal(input.job.progress,undefined);assert.deepEqual(input.evidence.runtime,runtime);
 assert.match(messages[0].content,/There is no central adapter registry/);
 assert.match(messages[0].content,/specific writer policy limitation/);
});
test('gate rejects executable, extra and misdirected actions',()=>{
 assert.throws(()=>validateInstruction({target_element:'robotDirections',action:'eval',payload:{reason:'x'}}));
 assert.throws(()=>validateInstruction({target_element:'other',action:'idle',payload:{reason:'x'}}));
 assert.throws(()=>validateInstruction({target_element:'robotDirections',action:'inspect_repository',payload:{reason:'x',code:'alert(1)'}}));
 assert.equal(validateInstruction({target_element:'robotDirections',action:'idle',payload:{reason:'unchanged'}}).action,'idle');
});
test('stable state avoids repeated inference; provider failure backs off Gemini while the mechanical clock keeps working',async()=>{
 const oldFetch=globalThis.fetch,memory=new Map();let alarm=0,modelCalls=0;
 const storage={get:async k=>memory.get(k),put:async(k,v)=>{memory.set(k,v)},getAlarm:async()=>alarm,setAlarm:async v=>{alarm=v}};
 globalThis.fetch=async()=>new Response('<section id="quantaAgentIterations"></section><section id="robotDirections"></section>');
 const env={WORK_DB:{prepare:()=>({bind(){return this},all:async()=>({results:[]})})},MODELS:{plan:async()=>{modelCalls++;return {provider:'gemini',model:'mock',instruction:{target_element:'robotDirections',action:'idle',payload:{reason:'unchanged'}}}}}};
 try{
  const clock=new BrainClock({storage},env);await clock.alarm();await clock.alarm();
  assert.equal(modelCalls,1);assert.equal(memory.get('state').status,'idle');assert.ok(alarm>Date.now());
  env.MODELS.plan=async()=>{throw Error('quota')};memory.delete('state');await clock.alarm();
  assert.equal(memory.get('state').status,'watching');assert.ok(memory.get('geminiRetryAt')>Date.now()+800000);assert.ok(alarm>Date.now());
 }finally{globalThis.fetch=oldFetch}
});

test('queued owner job gets real inspection and Purple review once without fabricated completion',async()=>{
 const oldFetch=globalThis.fetch,memory=new Map();let alarm=0,reviews=0,updated=null;
 const context={kind:'robot-directions',color_jobs:[{id:'TASK-1',repository:'www-infinity4/QuantaPhi',instructions:'Fix brain input',acceptance:['Input clears'],status:'queued'}]};
 const initial=JSON.stringify(context),ticket={id:'test-ticket',context_json:initial,request:'Fix brain input'};
 const db={prepare:sql=>({all:async()=>({results:[ticket]}),bind(...args){this.args=args;return this},first:async()=>({context_json:initial}),async run(){updated=this.args;return {success:true}}})};
 const storage={get:async k=>memory.get(k),put:async(k,v)=>{memory.set(k,v)},getAlarm:async()=>alarm,setAlarm:async v=>{alarm=v}};
 globalThis.fetch=async()=>new Response('<section id="quantaAgentIterations"></section>source evidence');
 const env={WORK_DB:db,MODELS:{plan:async()=>{throw Error('429')},review:async evidence=>{reviews++;assert.ok(evidence.receipts.length);return {provider:'cloudflare-workers-ai',model:'mock-review',review:{approved:true,summary:'Source inspected; repair not implemented',next:'Connect repository writer'}}}}};
 try{
  const clock=new BrainClock({storage},env);await clock.alarm();
  assert.equal(reviews,1);assert.ok(updated);
  assert.equal(JSON.parse(updated[0]).color_jobs[0].status,'queued');
  assert.equal(updated[1],'ready','source inspection queues work; only an execution claim marks it working');
  assert.ok([...memory.keys()].some(k=>k.startsWith('receipt:')));
  await clock.alarm();assert.equal(reviews,1);
  assert.ok(!JSON.stringify(updated).includes('"status":"complete"'));
 }finally{globalThis.fetch=oldFetch}
});

test('repository engine claims any owner repository while honoring leases and job dependencies',async()=>{
 const memory=new Map();const context={color_jobs:[
  {id:'dependent',repository:'www-infinity4/Project401',instructions:'Build page',dependencies:['base'],status:'queued'},
  {id:'base',repository:'www-infinity4/Project401',instructions:'Build new component',dependencies:[],status:'queued'},
  {id:'outside',repository:'other/Project401',instructions:'Build',status:'queued'}
 ]};
 const storage={get:async k=>memory.get(k),put:async(k,v)=>memory.set(k,v)};
 const clock=new BrainClock({storage},{WORK_DB:{prepare:()=>({bind(){return this},all:async()=>({results:[{id:'ticket',request:'Build my project',context_json:JSON.stringify(context)}]}),run:async()=>({meta:{changes:1}})})}});
 const request=()=>new Request('https://clock/runner/claim',{method:'POST',body:JSON.stringify({runId:'42',runnerRepository:'www-infinity4/Moltnook'})});
 const first=await (await clock.runner(request())).json();assert.equal(first.lease.jobId,'base');assert.equal(first.lease.job.ownerRequest,'Build my project');
 const second=await (await clock.runner(request())).json();assert.equal(second.lease,null);
 const feedback={baseSha:'a'.repeat(40),stage:'test',reason:'describe is not defined'};
 memory.delete('repository-lease:www-infinity4/Project401');
 memory.set(first.lease.key,{...first.lease,leaseUntil:0,retryAt:0,repairFeedback:feedback});
 const retried=await (await clock.runner(request())).json();assert.deepEqual(retried.lease.job.runtimeFeedback,feedback);
});

test('GPT Purple cannot approve absent tests and immutable patch evidence',async()=>{
 const memory=new Map([['key',{key:'key',leaseId:'lease',runId:'42',engine:true,leaseUntil:Date.now()+60000,job:{instructions:'Build'}}]]);
 let messages;
 const clock=new BrainClock({storage:{get:async k=>memory.get(k),put:async(k,v)=>memory.set(k,v)}},{WRITER_AI:{run:async(model,input)=>{messages=input.messages;return {response:JSON.stringify({decision:'approve',reason:'looks good'})};}}});
 const pins=[{sourcePath:'index.html',selector:'#buy',existingLabel:'Buy Item',existingHref:'/item',sourceEvidence:true,ownerSpecified:false}];
 const request=new Request('https://clock/runner/arbitrate',{method:'POST',body:JSON.stringify({runId:'42',runnerRepository:'www-infinity4/Moltnook',key:'key',leaseId:'lease',evidence:{tests:{passed:false},review:{approved:true},baseSha:'a'.repeat(40),patched:{'index.html':'hello'},source:{'index.html':'<a id="buy" href="/item">Buy Item</a>'},pinnedControls:pins}})});
 await assert.rejects(clock.runner(request),/arbitration_evidence_required/);assert.equal(memory.has('engine-review:key'),false);
 assert.match(messages[0].content,/preserves an existing, verified button label/);
 assert.match(messages[0].content,/Reject invented or changed text/);
 assert.deepEqual(JSON.parse(messages[1].content).evidence.pinnedControls,pins);
});


test('capability and private preview publish without a repair lease and preserve verification boundaries',async()=>{
 const memory=new Map(),oldFetch=globalThis.fetch,objects=new Map();
 const bucket={head:async k=>objects.has(k)?{}:null,put:async(k,v)=>objects.set(k,v),get:async k=>({arrayBuffer:async()=>objects.get(k).buffer})};
 const clock=new BrainClock({storage:{get:async k=>memory.get(k),put:async(k,v)=>memory.set(k,v),delete:async k=>memory.delete(k)}},{EVIDENCE:bucket});
 const request=(step,body)=>new Request('https://clock/runner/'+step,{method:'POST',body:JSON.stringify({runId:'42',runnerRepository:'www-infinity4/QuantaPhi',...body})});
 const preview={repository:'www-infinity4/QuantaPhi',baseSha:'a'.repeat(40),commitSha:'b'.repeat(40),paths:['robot-directions.js'],summary:'Clear draft',status:'deployed_verified',before:'data:image/jpeg;base64,/9j/AA==',after:'data:image/jpeg;base64,/9j/AA=='};
 try{
  const capability=(await (await clock.runner(request('capability',{runnerRepository:'www-infinity4/Moltnook',status:'credential_missing'}))).json());
  assert.equal(capability.ok,true);
  assert.equal(capability.sourceWindowsV2,true);
  assert.equal(capability.arbitrationDigestValidation,true);
  assert.equal(memory.get('engine-capability').status,'credential_missing');
  globalThis.fetch=async(url,options)=>{assert.ok(url.endsWith(preview.commitSha));assert.equal(options.headers.Authorization,'Bearer fixture-token');return Response.json({parents:[{sha:preview.baseSha}],commit:{author:{name:'infinity-brain[bot]'},message:'Repair ticket/TASK-1 after GPT review and tests'},files:[{filename:'robot-directions.js'}]});};
  const result=await (await clock.runner(request('preview',{preview,verificationToken:'fixture-token'}))).json();
  assert.equal(result.status,'source_preview');assert.equal(memory.get('previews').length,1);assert.ok(!JSON.stringify([...memory.values()]).includes('fixture-token'));
  await assert.rejects(clock.runner(request('preview',{preview:{...preview,repository:'www-infinity4/Other'}})),/preview_repository_identity_mismatch/);
 }finally{globalThis.fetch=oldFetch}
});

test('authenticated source handoff accepts files above the old 160 KB ceiling',async()=>{
 const body=JSON.stringify({evidence:{source:{'worker.js':'a'.repeat(180000),'tests.mjs':'b'.repeat(180000)}}});
 for(const stage of ['build','engine-review','arbitrate'])assert.equal(await readRunnerBody(new Request('https://clock.internal/runner/'+stage,{method:'POST',body}),'/runner/'+stage),body);
});
test('routine messages and source handoffs retain separate byte ceilings',async()=>{
 await assert.rejects(readRunnerBody(new Request('https://clock.internal/runner/event',{method:'POST',body:'é'.repeat(80001)}),'/runner/event'),e=>e.status===413);
 await assert.rejects(readRunnerBody(new Request('https://clock.internal/runner/build',{method:'POST',body:'a'.repeat(3*1024*1024+1)}),'/runner/build'),e=>e.status===413);
 await assert.rejects(readRunnerBody(new Request('https://clock.internal/runner/build',{method:'POST',headers:{'Content-Length':String(3*1024*1024+1)},body:'small'}),'/runner/build'),e=>e.status===413);
});
test('oversized streamed handoff is cancelled without reading the remainder',async()=>{
 let cancelled=false;
 const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(3*1024*1024+1));},cancel(){cancelled=true;}});
 await assert.rejects(readRunnerBody({headers:new Headers(),body:stream},'/runner/build'),e=>e.status===413);
 assert.equal(cancelled,true);
});

test('wallet-owner sessions require an existing verified payout owner, expire, and never persist bearer secrets',async()=>{
 const memory=new Map();
 const storage={get:async key=>memory.get(key),put:async(key,value)=>memory.set(key,value),delete:async key=>memory.delete(key)};
 const clock=new BrainClock({storage},{});
 const create=userId=>clock.fetch(new Request('https://clock.internal/owner/session-create',{method:'POST',body:JSON.stringify({userId})}));
 assert.equal((await create('owner')).status,404,'first random wallet cannot claim ownership');
 memory.set('bot-work-recipient',{userId:'owner',username:'fixture-owner'});
 assert.equal((await create('visitor')).status,404,'different wallet must remain locked out');
 const response=await create('owner');
 assert.equal(response.status,200);
 const {token,expiresAt}=await response.json();
 assert.match(token,/^rb_[a-f0-9]{64}$/);
 assert.ok(expiresAt>Date.now());
 assert.ok(!JSON.stringify([...memory]).includes(token),'raw wallet or Brain credentials may not enter durable storage');
 const check=t=>clock.fetch(new Request('https://clock.internal/owner/session-check',{method:'POST',body:JSON.stringify({token:t})}));
 assert.equal((await check(token)).status,200);
 assert.equal((await check('rb_'+'0'.repeat(64))).status,404);
 const key=memory.get('brain-owner-session-index')[0].key;
 memory.set(key,{...memory.get(key),expiresAt:Date.now()-1});
 assert.equal((await check(token)).status,404,'expired sessions must be rejected');
 // Revoking the wallet binding also revokes still-unexpired sessions.
 memory.set(key,{userId:'owner',expiresAt:Date.now()+60000});
 memory.set('bot-work-recipient',{userId:'different'});
 assert.equal((await check(token)).status,404);
});

test('the public Brain route never authorizes by displayed wallet balances or account names',()=>{
 assert.match(source,/BOT_WALLET\.fetch\('https:\/\/wallet\.internal\/v1\/wallet\/state'/);
 assert.match(source,/recipient\.userId!==body\.userId/);
 assert.match(source,/await ownerAuthorized\(env,token\)/);
 assert.match(source,/if\(origin&&!origins\.has\(origin\)\)/);
});

test('verified Brain tickets share the writer owner partition instead of an anonymous browser key',async()=>{
 const ownerHash='a'.repeat(64),otherHash='b'.repeat(64),rows=[];
 const db={prepare(sql){return{bind(...params){return{
  async first(){
   if(sql.includes("json_extract(context_json"))return rows.find(r=>r.owner_hash===params[0]&&JSON.parse(r.context_json).submission_id===params[1])||null;
   return rows.find(r=>r.id===params[0]&&r.owner_hash===params[1])||null;
  },
  async all(){return {results:rows.filter(r=>r.owner_hash===params[0])}},
  async run(){
   if(sql.startsWith('INSERT')){
    const [id,owner_hash,handoff_hash,source_app,source_url,repository,title,request,storyboard,context_json,created_at,updated_at,handoff_expires_at]=params;
    rows.push({id,owner_hash,handoff_hash,source_app,source_url,repository,title,request,storyboard,context_json,
     status:'draft',claimed_by:'',created_at,updated_at,handoff_expires_at,result_summary:'',result_url:''});
   }else if(sql.startsWith('UPDATE')){
    const [context_json,storyboard,status,updated_at,repository,id,owner_hash,oldContext]=params;
    const row=rows.find(r=>r.id===id&&r.owner_hash===owner_hash&&r.context_json===oldContext);
    if(!row)return {meta:{changes:0}};
    Object.assign(row,{context_json,storyboard,status,updated_at,repository});
   }
   return {meta:{changes:1}};
  }
 }}}}};
 const env={WORK_DB:db,WRITER_OWNER_HASH:ownerHash},request='Repair my existing image button';
 const context={kind:'robot-directions',submission_id:'fixed-request-1'};
 const created=await ownerTickets(env,'/work/tickets/create',{title:'Fix image',request,context});
 assert.equal(created.status,200);
 assert.equal(rows[0].owner_hash,ownerHash,'writer SELECT owner_hash partition must match');
 assert.equal(rows[0].status,'draft','new tickets cannot run before jobs are ready');
 assert.equal(JSON.stringify(rows).includes('sq_'),false);
 const id=created.result.ticket.id;
 const jobs=[{id:'TASK-1',repository:'www-infinity4/QuantaPhi',instructions:request,status:'queued'}];
 const updated=await ownerTickets(env,'/work/tickets/update',{id,status:'ready',storyboard:'checked',context:{...context,color_jobs:jobs}});
 assert.equal(updated.status,200);
 assert.equal(rows[0].status,'ready');
 assert.equal(updated.result.ticket.context.color_jobs[0].repository,'www-infinity4/QuantaPhi');
 const deduped=await ownerTickets(env,'/work/tickets/create',{title:'duplicate',request,context});
 assert.equal(deduped.result.deduplicated,true);
 assert.equal(rows.length,1);
 const visible=await ownerTickets(env,'/work/tickets/list',{});
 assert.equal(visible.result.tickets.length,1);
 assert.equal((await ownerTickets({...env,WRITER_OWNER_HASH:otherHash},'/work/tickets/list',{})).result.tickets.length,0);
 const forbidden=await ownerTickets(env,'/work/tickets/update',{id,status:'ready',context:{...context,color_jobs:[{id:'TASK-1',repository:'other/private',instructions:'wrong'}]}});
 assert.equal(forbidden.status,400);
});

test('the owner ticket router is authentication gated and the browser never generates a separate owner key',async()=>{
 const worker=await fs.readFile(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
 const client=await fs.readFile(new URL('../robot-directions.js',import.meta.url),'utf8');
 assert.match(worker,/if\(!await ownerAuthorized\(env,token\)\)return output\(request,\{ok:false,error:'owner_authorization_required'\},404\)/);
 assert.match(worker,/await ownerTickets\(env,path,body\)/);
 assert.match(client,/API='https:\/\/infinity-brain-clock\.marvaseater\.workers\.dev'/);
 assert.match(client,/delete payload\.owner_token/);
 assert.doesNotMatch(client,/ownerToken=crypto\.randomUUID\(\)/,'Brain must not create new anonymous identities');
 assert.match(client,/const d=await post\('\/v1\/tickets\/list',\{\}\)/);
});

test('untouched queued work advances ahead of an earlier blocked job, and owner selection is honored',async()=>{
 const memory=new Map(),jobs=[{id:'TASK-1',repository:'www-infinity4/QuantaPhi',instructions:'Old repair',status:'blocked',dependencies:[]},{id:'TASK-2',repository:'www-infinity4/QuantaPhi',instructions:'New repair',status:'queued',dependencies:[]}];
 const storage={get:async k=>memory.get(k),put:async(k,v)=>memory.set(k,v),delete:async k=>memory.delete(k)};
 const env={WORK_DB:{prepare:()=>({bind(){return this},all:async()=>({results:[{id:'ticket',request:'Fix my cards',context_json:JSON.stringify({color_jobs:jobs})}]}),run:async()=>({meta:{changes:1}})})}};
 const clock=new BrainClock({storage},env),request=()=>new Request('https://clock/runner/claim',{method:'POST',body:JSON.stringify({runId:'42',runnerRepository:'www-infinity4/Moltnook'})});
 const first=await(await clock.runner(request())).json();assert.equal(first.lease.jobId,'TASK-2');
 memory.clear();memory.set('requested-next-job',{ticketId:'ticket',jobId:'TASK-1'});const next=await(await clock.runner(request())).json();assert.equal(next.lease.jobId,'TASK-1');assert.equal(memory.has('requested-next-job'),false);
});


test('source inspection cannot overwrite a runner result arriving during the review',async()=>{
 const originalFetch=globalThis.fetch,memory=new Map();let writes=0;
 const job={id:'TASK-1',repository:'www-infinity4/QuantaPhi',instructions:'Repair the player',acceptance:['Player works'],status:'queued'};
 const initial=JSON.stringify({kind:'robot-directions',color_jobs:[job]});
 const result={...job,status:'blocked',progress:{attemptedAt:new Date().toISOString(),runUrl:'https://github.com/www-infinity4/Moltnook/actions/runs/1234',summary:'Deployment credential missing',blocker:'blocked'}};
 const fresh=JSON.stringify({kind:'robot-directions',color_jobs:[result]});
 const db={prepare:()=>({bind(){return this},all:async()=>({results:[{id:'IW-race',context_json:initial,request:'Repair the player'}]}),first:async()=>({context_json:fresh}),run:async()=>{writes++;return {success:true}}})};
 const storage={get:async k=>memory.get(k),put:async(k,v)=>memory.set(k,v),getAlarm:async()=>null,setAlarm:async()=>{}};
 globalThis.fetch=async()=>new Response('source evidence');
 try{
  const clock=new BrainClock({storage},{WORK_DB:db,MODELS:{plan:async()=>{throw Error('quota')},review:async()=>({model:'fixture',review:{approved:false,summary:'Static source cannot prove execution',next:'Wait for runner'}})}});
  await clock.alarm();
  assert.equal(writes,0,'Source observer must preserve actual runner blocker and run link');
  assert.ok([...memory.keys()].some(k=>k.startsWith('receipt:')),'Read-only inspection receipt is still retained');
 }finally{globalThis.fetch=originalFetch}
});


test('shared conversation endpoint rejects unverified callers before reading or writing memory',async()=>{
 let touched=false;
 const env={WORK_DB:{prepare(){touched=true;throw Error('must not access memory')}},WRITER_OWNER_HASH:'a'.repeat(64)};
 const response=await brainWorker.fetch(new Request('https://clock.example/owner/conversation',{method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},body:'{}'}),env);
 assert.equal(response.status,404);assert.equal(touched,false);
});


test('pairing is single-use, time-limited and remains bound to the verified owner',async()=>{
 const memory=new Map([['bot-work-recipient',{userId:'owner-one'}]]);let txQueue=Promise.resolve();
 const storage={get:async k=>memory.get(k),put:async(k,v)=>memory.set(k,v),delete:async k=>memory.delete(k)};
 storage.transaction=fn=>{const task=txQueue.then(()=>fn(storage));txQueue=task.catch(()=>{});return task;};
 const clock=new BrainClock({storage},{});
 const send=(route,body={})=>clock.fetch(new Request('https://clock.internal/owner/'+route,{method:'POST',body:JSON.stringify(body)}));
 const created=await (await send('pair-create')).json();assert.match(created.code,/^[a-f0-9]{64}$/);
 const attempts=await Promise.all([send('pair-redeem',{code:created.code}),send('pair-redeem',{code:created.code})]);
 assert.deepEqual(attempts.map(r=>r.status).sort(),[200,404]);
 const device=await attempts.find(r=>r.ok).json();assert.match(device.token,/^rd_/);
 assert.equal((await send('session-check',{token:device.token})).status,200);
 memory.set('bot-work-recipient',{userId:'other-owner'});
 assert.equal((await send('session-check',{token:device.token})).status,404);
 const expired=await (await send('pair-create')).json();
 const key=memory.get('brain-pair-latest');memory.set(key,{...memory.get(key),expiresAt:Date.now()-1});
 assert.equal((await send('pair-redeem',{code:expired.code})).status,404);
});

test('shared phone HTTP bridge separates owner commands from device delivery and receipts',async()=>{
 const token='owner-phone-test-credential';
 const ownerHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
 const map=new Map(),storage={get:async k=>structuredClone(map.get(k)),put:async(k,v)=>map.set(k,structuredClone(v)),delete:async k=>map.delete(k)};
 const clock=new BrainClock({storage,blockConcurrencyWhile:fn=>fn()},{});
 const env={WRITER_OWNER_HASH:ownerHash,CLOCK:{idFromName:()=>0,get:()=>({fetch:(url,init)=>clock.fetch(new Request(url,init))})}};
 const send=(op,body={},credential='')=>brainWorker.fetch(new Request('https://brain/tools/phone/'+op,{method:'POST',headers:{Origin:'https://quantaphi.org',...(credential?{Authorization:'Bearer '+credential}:{})},body:JSON.stringify(body)}),env);
 const generation=crypto.randomUUID();
 assert.equal((await send('open',{generation})).status,401);
 const opened=await (await send('open',{generation},token)).json();
 assert.equal(opened.ok,true);
 const id=crypto.randomUUID();
 assert.equal((await send('command',{sessionId:opened.sessionId,id,action:'read'},token)).status,200);
 assert.equal((await send('next',{generation},token)).status,401);
 const delivered=await (await send('next',{generation},opened.deviceToken)).json();
 assert.equal(delivered.command.id,id);
 assert.equal((await send('command',{sessionId:opened.sessionId,id:crypto.randomUUID(),action:'read'},opened.deviceToken)).status,401);
 assert.equal((await send('result',{generation,receipt:{id,ok:true,result:{nodes:[],untrusted:true}}},opened.deviceToken)).status,200);
 const reported=await (await send('status',{},token)).json();
 assert.equal(reported.receipt.id,id);assert.equal(reported.deviceToken,undefined);
 assert.equal((await send('close',{sessionId:opened.sessionId},token)).status,200);
 assert.equal((await send('next',{generation},opened.deviceToken)).status,409);
});
