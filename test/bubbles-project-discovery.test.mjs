import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {discoverProject,discoveryTerms,sourceQueryFor,cardWorkTargetFor,recordProjectView,relevantProjectViews,hasActionDraft} from '../bubbles-project-discovery.mjs';
import worker,{hasModelToolLeak} from '../workers/bubbles-tools/worker.mjs';
const catalog=['www-infinity4/QuantaPhi','www-infinity4/ShopLC'];
const hit={repository:catalog[0],path:'walmart-card.mjs',excerpt:'Walmart products'};
const search={ok:true,status:'code_search_results',results:[hit]};
const repo={ok:true,headSha:'b'.repeat(40)};
const file={ok:true,sha:'a'.repeat(40),content:'Walmart product catalog'};
test('Walmart request searches owner source then reads the observed file before selecting',async()=>{
 const calls=[];const found=await discoverProject({request:'Fix the Walmart card',catalog,invoke:async cmd=>{calls.push(cmd);return cmd.action==='search_github_code'?search:cmd.action==='read_repository'?repo:file}});
 assert.deepEqual(calls.map(x=>x.action),['search_github_code','read_repository','read_file']);
 assert.equal(calls[0].query,'walmart');assert.equal(calls[0].scope,'owner');
 assert.equal(found.repository,catalog[0]);assert.equal(found.path,hit.path);assert.equal(found.writeAuthorized,false);
});

test('retired Gary and Grant Cardone names no longer resolve as registered work targets',()=>{
 for(const q of ['Fix the Gary Cardone Church of I AM card','Repair Cardone Capital','Move the Gary Cardone card to the carousel']){
  assert.equal(cardWorkTargetFor(q),null,q);
 }
});


test('a natural follow-up reuses an existing card but not a retired card',()=>{
 const history=[{role:'user',text:'The Pixie Stories card needs attention.'},{role:'assistant',text:'I will inspect the source.'}];
 assert.match(sourceQueryFor('Fix that card',history),/Pixie Stories/);
 assert.equal(sourceQueryFor('Fix the Walmart card',history),'Fix the Walmart card');
 const retired=[{role:'user',text:'The Gary Cardone card needs attention.'}];
 assert.equal(sourceQueryFor('Fix that card',retired),'Fix that card');
});


test('ordinary repair instructions recognize existing cards, not retired ones',()=>{
 assert.equal(cardWorkTargetFor('Fix the Pixie Stories card')?.id,'pixie-stories');
 for(const q of ['Fix the Gary Cardone Sunday promotion','Please repair Gary Cardone','Repair Cardone Capital']){
  assert.equal(cardWorkTargetFor(q),null,q);
 }
 for(const q of ['What is Church of I AM?','Do not fix Gary Cardone','Explain Cardone Capital'])assert.equal(cardWorkTargetFor(q),null,q);
});

test('chat dispatcher treats recognized card work as a direct owner engineering task',()=>{
 const ui=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 assert.match(ui,/const namedCardWork=projectContextModule\?\.cardWorkTargetFor/);
 assert.match(ui,/const codeTask=\//);
 assert.match(ui,/if\(namedCardWork&&!ownerGithubNonAction&&!requestsAgents&&!namedRecordBIssue\)directCoding=true/);
 assert.match(ui,/\|move\|(?:put\|)?place\|relocate\)/);
 assert.match(ui,/unexecuted GitHub search instructions/);
});
test('missing source and genuinely ambiguous matches never silently select a repository',async()=>{
 for(const result of [{...search,results:[hit,{...hit,repository:catalog[1]}]}, {...search,results:[{...hit,repository:'attacker/project'}]}]){
  assert.equal(await discoverProject({request:'Fix Walmart card',catalog,invoke:async()=>result}),null);
 }
 assert.equal(await discoverProject({request:'Fix Walmart card',catalog,invoke:async c=>c.action==='search_github_code'?search:c.action==='read_repository'?repo:{ok:false}}),null);
});
test('a stale search excerpt cannot substitute for a real source read',async()=>{
 assert.equal(await discoverProject({request:'Fix Walmart card',catalog,invoke:async c=>c.action==='search_github_code'?search:c.action==='read_repository'?repo:{...file,content:'Unrelated radio controls'}}),null);
});
test('recent first-party card evidence is bounded, strips query secrets and expires',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 recordProjectView({title:'Walmart',cardId:'walmart-shopping',url:'https://quantaphi.org/?token=private#card'},storage,1000);
 recordProjectView({title:'Other',cardId:'external',url:'https://attacker.test/'},storage,1001);
 const rows=relevantProjectViews('Fix Walmart card',storage,1200);
 assert.equal(rows.length,1);assert.equal(rows[0].url,'https://quantaphi.org/');assert.ok(!JSON.stringify(rows).includes('private'));
 assert.equal(relevantProjectViews('Fix Walmart',storage,1900000).length,0);
 assert.equal(relevantProjectViews('Fix radio player',storage,1200).length,0);
});
test('pasted read_repo/search action envelopes are rejected as replies without being executed',()=>{
 const leaked='{"action":"read_repo","parameters":{"owner":"www-infinity4","repo":"QuantaPhi","path":"cards","depth":2}}\nStatus pending';
 assert.equal(hasActionDraft(leaked),true);assert.equal(hasModelToolLeak(leaked),true);
 assert.equal(hasModelToolLeak('{"action":"search","parameters":{"query":"Walmart","top_n":10}}'),true);
 assert.equal(hasActionDraft('{"action":"github.searchCode","parameters":{"query":"Gary org:www-infinity4"}}'),true);
 assert.equal(hasModelToolLeak('{"action":"github.searchCode","parameters":{"query":"cardone org:www-infinity4"}}'),true);
 assert.equal(hasActionDraft('I found the Walmart card and read its source.'),false);
});

const leakedSearches=['Gary','cardone'].map(term=>JSON.stringify({action:'github.searchCode',
 parameters:{query:term+' org:www-infinity4',per_page:20}},null,2)).join('\n')+
 '\nI’m searching the organization’s code. I’ll report the exact files once the results are returned.';
test('the reported namespaced search drafts are blocked at both chat boundaries',()=>{
 const ui=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 const begin=ui.indexOf('function normalizeOwnerAssistantReply('),end=ui.indexOf('function isOwnerWorkRequest(',begin);
 const normalize=new Function(ui.slice(begin,end)+'\nreturn normalizeOwnerAssistantReply;')();
 assert.equal(hasActionDraft(leakedSearches),true);
 assert.equal(hasModelToolLeak(leakedSearches),true);
 for(const owner of [false,true]){
  const reply=normalize(leakedSearches,'Move the Gary Cardone card to the carousel',owner);
  assert.doesNotMatch(reply,/github\.searchCode|per_page|I’m searching/);
  assert.match(reply,/not (?:been )?verified/);
 }
 assert.equal(hasModelToolLeak('{"action":"collect","parameters":{"card":"gary"}}'),false);
});
test('the gateway corrects the reported draft without treating its JSON as execution',async()=>{
 let modelCalls=0;
 const result=await worker.fetch(new Request('https://tools.test/v1/assist',{method:'POST',
  headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},
  body:JSON.stringify({request:'Move the Gary Cardone card to the carousel'})}),{
  AI:{run:async()=>{modelCalls++;return {response:leakedSearches};}}
 });
 const body=await result.json();
 assert.equal(modelCalls,2,'one bounded correction attempt');
 assert.doesNotMatch(body.output,/github\.searchCode|per_page|I’m searching/);
 assert.equal(body.answerStatus,'partial');
 assert.equal(body.receipt.repositoryActionsVerified,false);
});

test('retired cards are not eligible for new carousel repairs, including follow-ups',()=>{
 const history=[{role:'user',text:'Gary Cardone Church of I AM is above the carousel.'}];
 for(const q of ['Move the Gary Cardone card to the carousel','Please place Gary Cardone in the carousel','Put that card into the carousel','Move that card to the carousel']){
  assert.equal(cardWorkTargetFor(q,history),null,q);
 }
 for(const q of ['Do not move the Gary Cardone card','Why move the Gary Cardone card?'])assert.equal(cardWorkTargetFor(q,history),null,q);
});


test('Cardonay alias stays retired and resolved work does not reopen',()=>{
 assert.equal(cardWorkTargetFor('Please fix Cardonay'),null);
 assert.equal(cardWorkTargetFor('Check Cardonay new broken button'),null);
 assert.equal(cardWorkTargetFor('Do not fix Cardonay again'),null);
 const history=[{role:'user',text:'Fix Gary Cardone carousel; it is broken'},
  {role:'user',text:'We already fixed the Cardone card. Stop reopening it.'}];
 assert.equal(cardWorkTargetFor('Fix that card',history),null);
 assert.equal(cardWorkTargetFor('Fix that card',[{role:'user',text:'The Infinity Radio card navigation is broken now'}])?.id,'infinity-radio');
});

test('Cardone closure context filters stale complaints from unrelated owner work without deleting real history',async()=>{
 const {curateOwnerTaskContext}=await import('../bubbles-task-context.mjs');
 const prior=[
  {role:'user',text:'Cardonay card is broken. Repair it.'},
  {role:'assistant',text:'Old Cardone repair was urgent.'},
  {role:'user',text:'Please fix the microphone in Bubbles'}];
 const related=[{role:'user',text:'Cardone card failed yesterday'}, {role:'user',text:'Bubbles Android mic fails today'}];
 const unrelated=curateOwnerTaskContext('Fix my microphone',{related,recent:prior,indexedHistory:'Cardonay broken\nMicrophone issue in APK'});
 assert.equal(unrelated.related.length,1);
 assert.equal(unrelated.recent.length,1);
 assert.doesNotMatch(unrelated.indexedHistory,/cardonay/i);
 assert.match(unrelated.indexedHistory,/Microphone issue/);
 assert.equal(unrelated.note,'');
 const current=curateOwnerTaskContext('The Cardonay card has a new missing button',{related,recent:prior,indexedHistory:'Old Cardone discussion'});
 assert.equal(current.related.length,2);
 assert.match(current.note,/merged.*#964.*#1035.*#1079/i);
 assert.match(current.note,/current.*evidence/i);
 const summary=curateOwnerTaskContext('How is Bubbles doing?',{related:[],recent:[{role:'user',text:'I am unhappy with earlier Cardone repairs'}]});
 assert.equal(summary.recent.length,0);
 assert.deepEqual(prior[0],{role:'user',text:'Cardonay card is broken. Repair it.'},'no destructive history mutation');
});
test('Bubbles owner prompts use curated continuity and public embeds keep their own isolated conversations',()=>{
 const js=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 assert.match(js,/curateOwnerTaskContext/);
 assert.match(js,/continuity\.related/);
 assert.match(js,/continuity\.recent/);
 assert.match(js,/continuity\.indexedHistory/);
 assert.match(js,/continuity\.note/);
 assert.match(js,/embedded\|\|!ownerReady/);
});

test('owner closure phrased as "is fixed" or "we have fixed" stops stale Cardonay replay, without swallowing new defects',async()=>{
 for(const note of ['The Cardonay card is fixed now.',"We've fixed Gary Cardone already.",'Cardone has been repaired.']){
  assert.equal(cardWorkTargetFor('Fix that card',[{role:'user',text:'The Gary Cardone card was broken'},{role:'user',text:note}]),null,note);
 }
 const {curateOwnerTaskContext}=await import('../bubbles-task-context.mjs');
 const capital=curateOwnerTaskContext('Explain the Cardone Capital Westshore investment',{related:[],recent:[]});
 assert.match(capital.note,/Cardone Capital/i);
 assert.doesNotMatch(capital.note,/#1079/,'Gary Cardone carousel evidence is not Grant Cardone fund evidence');
 const owner=curateOwnerTaskContext("We've fixed Cardonay. Stop opening that repair.",{related:[],recent:[]});
 assert.match(owner.note,/do not dispatch a Cardone repair/);
});


test('two-feature repairs search individual owner code terms after a compound index miss',async()=>{
 const searches=[],reads=[],owner='www-infinity4/QuantaPhi';
 const result=await discoverProject({
  request:'Fix Bubbles login and microphone',
  catalog:[owner,'www-infinity4/Moltnook'],
  invoke:async command=>{
   if(command.action==='search_github_code'){
    searches.push(command.query);
    if(command.query==='login')return {ok:true,status:'code_search_results',results:[
     {repository:owner,path:'bubbles-login.mjs',excerpt:'Bubbles login callback state'}]};
    if(command.query==='microphone')return {ok:true,status:'code_search_results',results:[
     {repository:owner,path:'bubbles-microphone.mjs',excerpt:'Bubbles microphone permissions'}]};
    return {ok:true,status:'code_search_results',results:[]};
   }
   if(command.action==='read_repository')return {ok:true,headSha:'b'.repeat(40)};
   if(command.action==='read_file'){
    reads.push(command);
    return {ok:true,sha:'a'.repeat(40),content:'Bubbles login and microphone controls'};
   }
   throw Error('unexpected tool');
  }
 });
 assert.ok(searches.includes('login'), 'search login independently');
 assert.ok(searches.includes('microphone'), 'search microphone independently');
 assert.equal(result?.repository,owner);
 assert.ok(reads.length>0,'pin a real source read before choosing a writable target');
 assert.equal(result.writeAuthorized,false);
});

test('brief plural repair follow-up reuses latest owner defects for read-only discovery',()=>{
 const history=[{role:'user',text:'The Bubbles login is broken and the microphone cannot connect.'},
  {role:'assistant',text:'I will investigate.'}];
 const query=sourceQueryFor('Fix those two things',history);
 assert.match(query,/Bubbles login is broken/i);
 assert.match(query,/microphone cannot connect/i);
 assert.equal(sourceQueryFor('Explain those two things',history),'Explain those two things');
 assert.equal(sourceQueryFor('Fix those two things',[{role:'user',text:'The issue was fixed. Stop reopening it.'}]),'Fix those two things');
});


test('browser carries plural repair context to real owner source discovery and GitHub tool',()=>{
 const ui=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 assert.match(ui,/const contextualPluralRepair=pluralRepair&&contextualRepairQuery!==request/);
 assert.match(ui,/if\(contextualPluralRepair&&!ownerGithubNonAction&&!requestsAgents&&!namedRecordBIssue\)directCoding=true/);
 assert.match(ui,/const engineeringRequest=request\+\(contextualPluralRepair\?/);
 assert.match(ui,/await suggestRepositoryTargets\(request,false\)/);
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const bubbles=readFileSync(new URL('../bubbles.html',import.meta.url),'utf8');
 for(const page of [index,bubbles])assert.match(page,/bubbles-ai\.js\?v=20261111-zeus-terminal1/);
});


test('Bubbles waits for a real durable GitHub code-search receipt before deciding discovery failed',async()=>{
 const ui=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 const begin=ui.indexOf('async function settleGithubRead(');
 const end=ui.indexOf('async function suggestRepositoryTargets(',begin);
 assert.ok(begin>0&&end>begin,'shared receipt reader is defined');
 assert.doesNotMatch(ui,/readGithubReceipt\(/,'a nonexistent receipt helper must never stop GitHub inspection');
 const events=[];
 const settle=new Function('directGithubOperation','githubReceipt',ui.slice(begin,end)+'\nreturn settleGithubRead;')(
  async command=>{events.push('request:'+command.action);return {ok:true,status:'working',requestId:'verified-reader-1'};},
  async id=>{events.push('receipt:'+id);return events.length===2
   ?{ok:false,error:'receipt_not_found',requestId:id}
   :{ok:true,status:'code_search_results',requestId:id,results:[{repository:'www-infinity4/QuantaPhi',path:'bubbles-ai.js'}]};}
 );
 const result=await settle({action:'search_github_code',mode:'read'}, {pause:async()=>{},maxChecks:4});
 assert.equal(result.status,'code_search_results');
 assert.equal(result.results[0].path,'bubbles-ai.js');
 assert.deepEqual(events,['request:search_github_code','receipt:verified-reader-1','receipt:verified-reader-1']);
 assert.match(ui,/return settleGithubRead\(operation,\{showProgress:!preview\}\);/);
 assert.match(ui,/await settleGithubRead\(\{action:'list_repositories',mode:'read'\}\)/);
});

test('chat routes source repairs and explicit workflow operations to their own adapters',async()=>{
 const ui=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 const start=ui.indexOf(' else if(!embedded&&!ownerGithubNonAction&&(directRequest||githubCheck||createRepository||coderRequest||directCoding)){');
 const end=ui.indexOf(' else if(!embedded&&(isOwnerWorkRequest(request)',start);
 const intent=ui.slice(ui.indexOf(' const namedWorkflow='),ui.indexOf(' // Owner-named RecordB'));
 const calls=[];
 const run=new Function('submitRepositoryWork','directGithubOperation',
  `return async (request,directRequest=false)=>{
    const embedded=false,ownerGithubNonAction=false,githubCheck=false,createRepository=false,coderRequest=null;
    ${intent}
    const directCoding=codeTask;
    const repoCreateQualifiers=null,neuralCoding=false,repositoryAdvice=null,imageWorkEvidence='',activeCardEvidence=null,contextualPluralRepair=false;
    const status={};let workEvidence='';
    const humanReplies=async()=>({workReply:t=>t.status,githubReply:r=>r.status});
    const recordBrainNotice=()=>{},maybeDelegateDirectOverflow=async()=>null;
    if(false){} ${ui.slice(start,end)}
    return workEvidence;
  }`)(
  async (request,approval,repository)=>{calls.push(['runner',request,approval,repository]);return {status:'ready'};},
  async args=>{calls.push(['github',args.action,args.mode,args.repository,args.workflow]);return {ok:true,status:'inspected'};}
 );
 const repair='Fix the login route in www-infinity4/RecordB';
 assert.equal(await run(repair),'ready');
 assert.equal(await run('Inspect the source in www-infinity4/RecordB',true),'inspected');
 const workflowRepair='Fix the build.yml workflow in www-infinity4/RecordB so the check can execute';
 assert.equal(await run(workflowRepair),'ready');
 assert.equal(await run('Trigger build.yml in www-infinity4/RecordB'),'inspected');
 assert.equal(await run('Please execute deploy.yml workflow in www-infinity4/RecordB'),'inspected');
 assert.equal(await run('List the build.yml workflow in www-infinity4/RecordB'),'inspected');
 assert.deepEqual(calls,[
  ['runner',repair,'explicit-user-command','www-infinity4/RecordB'],
  ['github','assist','read','www-infinity4/RecordB',undefined],
  ['runner',workflowRepair,'explicit-user-command','www-infinity4/RecordB'],
  ['github','dispatch_workflow','actions','www-infinity4/RecordB','build.yml'],
  ['github','dispatch_workflow','actions','www-infinity4/RecordB','deploy.yml'],
  ['github','list_workflows','read','www-infinity4/RecordB',undefined]
 ]);
});
