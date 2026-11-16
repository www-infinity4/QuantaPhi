'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),vm=require('node:vm');
const source=readFileSync('bubbles-ai.js','utf8');

const segment=source.slice(source.indexOf(' const ownerGithubNonAction='),source.indexOf(' if(!embedded&&articleResearch)',source.indexOf(' const ownerGithubNonAction=')));
assert.ok(segment.length>500,'work classifier must be found in Bubbles chat');
const classify=new Function('request','coderIntent',segment+
 '\nreturn {ownerGithubNonAction,codeTask,pairedRepoWork,githubInventoryRequested,directCoding};');

test('hydrogen paired-repository command is owner work, not model-only conversation',()=>{
 const user='Populate bubbles hydrogen repo with files and it has one electron that is identical. The two repos will watch each other like an electron of the other one. Please build files and gpt plan to get this project rolling.';
 const result=classify(user,()=>null);
 assert.equal(result.ownerGithubNonAction,false);
 assert.equal(result.codeTask,true);
 assert.equal(result.pairedRepoWork,true);
 const pair=source.indexOf('else if(!embedded&&pairedRepoWork)');
 const direct=source.indexOf('else if(!embedded&&!ownerGithubNonAction&&(directRequest');
 assert.ok(pair>0&&pair<direct,'paired work is routed before single-repository writing');
 assert.match(source.slice(pair,direct),/repositorySelection.size!==2/);
 assert.match(source.slice(pair,direct),/submitWork\(request,'explicit-user-command'\)/);
 assert.match(source.slice(pair,direct),/No job or GitHub write has started/);
});

test('single-repository populate and scaffold are code writes',()=>{
 for(const user of ['Populate www-infinity4/QuantaPhi with files',
                    'Please scaffold files in www-infinity4/QuantaPhi']){
  const result=classify(user,()=>null);
  assert.equal(result.codeTask,true,user);
  assert.equal(result.pairedRepoWork,false,user);
  assert.equal(result.directCoding,true,user);
 }
 assert.match(source,/refactor\|populate\|scaffold/,'write-mode tool choice includes populate and scaffold');
});

test('repository listing is a real read-only tool request',()=>{
 const result=classify('Please list my GitHub repositories',()=>null);
 assert.equal(result.githubInventoryRequested,true);
 const branch=source.slice(source.indexOf('else if(!embedded&&githubInventoryRequested)'),source.indexOf('else if(!embedded&&!ownerGithubNonAction&&(directRequest'));
 assert.match(branch,/directGithubOperation\(\{action:'list_repositories',mode:'read'\}\)/);
 assert.match(branch,/result\.complete/);
 assert.match(branch,/No repository was changed/);
});

test('questions and prohibitions never authorize paired repository writes',()=>{
 for(const prompt of [
  'How do I populate two repos with files?',
  "Don't populate two repos with files",
  'Explain how both repos watch each other'
 ]){
  const result=classify(prompt,()=>null);
  assert.equal(result.ownerGithubNonAction,true,prompt);
  assert.equal(result.pairedRepoWork,false,prompt);
  assert.equal(result.directCoding,false,prompt);
 }
});

test('a model-shaped GitHub request becomes a truthful English explanation',()=>{
 const start=source.indexOf('function normalizeOwnerAssistantReply('),end=source.indexOf('function isOwnerWorkRequest(',start);
 const normalize=vm.runInNewContext(source.slice(start,end)+'\nnormalizeOwnerAssistantReply;',Object.create(null));
 const fake='We need to issue a tool call.\n{"tool":"github","action":"list_repos","parameters":{}}';
 const result=normalize(fake,'Populate two repos with files',true);
 assert.match(result,/instead of running it/);
 assert.match(result,/No repository was listed or changed/);
 assert.doesNotMatch(result,/\{"tool"|parameters/);
 assert.equal(normalize('I read the actual GitHub commit.', 'Check my repo', true),
              'I read the actual GitHub commit.');
});
