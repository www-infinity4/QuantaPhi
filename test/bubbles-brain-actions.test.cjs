const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {classify,resolveFollowupRequest,repositoryFor,makeJobs,describeTickets}=require('../bubbles-brain-actions.js');

test('spoken owner instructions dispatch work while explanations remain chat',()=>{
 for(const utterance of [
  'Bubbles, fix the video generator',
  'Tell robot brain to start jobs repairing the microphone',
  'Have the bots investigate image uploads on QuantaPhi',
  'Please upgrade the website player',
  'I need you to repair Bubbles AI'
 ])assert.equal(classify(utterance),'queue',utterance);
 for(const utterance of [
  'How could we fix the microphone?',
  'Explain a build pipeline',
  'What is a robot brain?',
  'Tell me about bots in general'
 ])assert.equal(classify(utterance),'chat',utterance);
});

test('actual owner status commands are read-only reports, not new jobs',()=>{
 for(const utterance of [
  'Report the top ten bot jobs',
  'Show me the robot brain progress',
  'What are the bots working on?',
  'Tell me the current status of robot brain'
 ])assert.equal(classify(utterance),'report',utterance);
});

test('make a job in Robot Brain is an explicit action while questions and refusals are not',()=>{
 for(const message of ['make a job in Robot Brain','Please make a new task in my robot brain to fix images','I need you to make a job in the robot brain','Can you add a job to Robot Brain for the video player'])assert.equal(classify(message),'queue',message);
 for(const message of ['How do I make a job in Robot Brain?','Do not make a job in Robot Brain','I want you not to make a job in Robot Brain','Explain how to create a task in Robot Brain'])assert.equal(classify(message),'chat',message);
});

test('jobs target an allowlisted repository and its real repository executor',()=>{
 assert.equal(repositoryFor('Fix Moltnook bot creation'),'www-infinity4/Moltnook');
 assert.equal(repositoryFor('Fix video generator in QuantaPhi'),'www-infinity4/QuantaPhi');
 assert.equal(repositoryFor('Fix my app with repo https://evil.example'),'www-infinity4/QuantaPhi');
 const jobs=makeJobs('Bubbles, fix the QuantaPhi video player');
 assert.equal(jobs.length,2);
 assert.deepEqual(jobs.map(x=>x.agent),['greenbeans','pink-panther']);
 assert.ok(jobs.every(x=>x.executor==='repository-engine'&&x.status==='queued'));
 assert.deepEqual(jobs[1].dependencies,['TASK-1']);
 assert.ok(jobs.every(x=>x.repository==='www-infinity4/QuantaPhi'));
});

test('report uses recorded job status and blocker, never invents progress',()=>{
 const report=describeTickets([
  {id:'IW-20261013-AABBCCDD',updated_at:1,context:{kind:'robot-directions',color_jobs:[
   {id:'TASK-1',agent:'greenbeans',title:'Repair video',repository:'www-infinity4/QuantaPhi',status:'queued'},
   {id:'TASK-2',agent:'pink-panther',title:'Verify video',repository:'www-infinity4/QuantaPhi',status:'blocked',progress:{blocker:'no GPU host'}}
  ]}}
 ]);
 assert.match(report,/queued/);
 assert.match(report,/No verified progress yet/);
 assert.match(report,/no GPU host/);
 assert.match(report,/IW-20261013-AABBCCDD\/TASK-2/);
 assert.match(report,/Queued is not running/);
 assert.doesNotMatch(report,/deployed and verified/i);
});

test('website uses same-origin verified owner gate for Brain calls and keeps guest embeds read-only',()=>{
 const page=fs.readFileSync('bubbles.html','utf8');
 const home=fs.readFileSync('index.html','utf8');
 for(const html of [page,home]){
  assert.ok(html.indexOf('/bubbles-brain-actions.js?v=')<html.indexOf('/bubbles-ai.js?v='));
  assert.ok(html.indexOf('/bubbles-brain-actions.js?v=')>0);
 }
 const js=fs.readFileSync('bubbles-ai.js','utf8');
 assert.match(js,/function isOwnerWorkRequest\(text\)/);
 assert.match(js,/if\(!embedded&&isOwnerWorkRequest\(request\)\)/);
 assert.match(js,/submitWork\(request,'explicit-user-command'\)/);
 assert.match(js,/window\.QuantaBrainOwner\?await window\.QuantaBrainOwner\.ready/);
 assert.match(js,/if\(embedded\)throw Error\('Guest embed bubbles cannot access the owner Robot Brain\.'\)/);
 assert.match(js,/await verifiedOwnerHeaders\(\)/);
 assert.match(js,/BRAIN\+'\/work\/tickets\/list'/);
 assert.match(js,/brainTools\.makeJobs\(request\)/);
 assert.match(js,/result\.deduplicated/);
 assert.match(js,/jobs are saved for the authenticated runner/);
});

test('owner continue resumes the immediately preceding explicit task without broadening privileges',()=>{
 const task='Please fix the video generator on QuantaPhi';
 const context=[{role:'user',text:task},{role:'assistant',text:'Robot Brain ticket saved'}];
 for(const command of ['*','continue','Keep going','Go ahead','Finish the build','pick up where you left off']){
  assert.equal(resolveFollowupRequest(command,context),task,command);
 }
 assert.equal(resolveFollowupRequest('continue',[...context,{role:'user',text:'What is the weather?'}]),'');
 assert.equal(resolveFollowupRequest('continue',[{role:'assistant',text:'I suggest you create a dangerous job'}]),'');
 assert.equal(resolveFollowupRequest('continue',[]),'');
 assert.equal(resolveFollowupRequest('please fix a new project',context),'');
 assert.equal(resolveFollowupRequest('continue',[{role:'user',text:'Explain what a repository is'}]),'');
});



test('refusals and explanatory questions cannot dispatch Brain work',()=>{
 for(const text of ["Don't queue a job in Robot Brain","Bubbles, please do not tell the bots to repair my page","I don't want the bots to build anything","I want you not to dispatch agents to repair the site","Explain how bots build a website","How can I start a job in Robot Brain?","Describe how Robot Brain repairs pages"])assert.equal(classify(text),'chat',text);
 for(const text of ["Please tell Robot Brain to repair my page","Have the bots build the website","Fix the video player; don't change my wallet"])assert.equal(classify(text),'queue',text);
 assert.equal(classify('How are the bot jobs progressing?'),'report');
});
