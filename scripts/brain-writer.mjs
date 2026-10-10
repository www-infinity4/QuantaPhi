import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {allowedFiles,applyEdits,clearButtonPatch} from './brain-patch.mjs';
import {capturePair} from './brain-preview.mjs';
const API='https://infinity-brain-clock.marvaseater.workers.dev';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
let lease,commitSha,testsPassed=false,reviewApproved=false;
const report={when:new Date().toISOString(),events:[],status:'starting'};
async function call(path,body){
 const identityUrl=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);identityUrl.searchParams.set('audience','infinity-brain-writer');
 const identity=await fetch(identityUrl,{headers:{Authorization:'Bearer '+process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},signal:AbortSignal.timeout(15000)});
 if(!identity.ok)throw Error('GitHub runner identity HTTP '+identity.status);
 const token=(await identity.json()).value;
 const response=await fetch(API+'/runner/'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({...body,key:lease?.key,leaseId:lease?.leaseId}),signal:AbortSignal.timeout(120000)});
 const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'Runner HTTP '+response.status);return data;
}
async function event(agent,message,receipt={}){report.events.push({agent,message,when:new Date().toISOString()});await call('event',{agent,message,...receipt});}
async function browserCheck(){
 const {chromium}=await import('playwright');
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://quantaphi.org/?brainRepair='+commitSha,{waitUntil:'domcontentloaded',timeout:60000});
  const input=page.locator('#robotDirections textarea');await input.waitFor();
  const clear=page.locator('#robotDirections [data-clear]');await clear.waitFor({timeout:30000});
  await input.fill('temporary browser verification draft');await page.waitForTimeout(500);
  await clear.click();await page.waitForTimeout(500);
  if(await input.inputValue()!=='')throw Error('Clear text did not empty input');
  await page.reload({waitUntil:'domcontentloaded'});await input.waitFor();await page.waitForTimeout(1200);
  if(await input.inputValue()!=='')throw Error('Cleared draft returned after reload');
  if(await clear.evaluate(e=>e.getBoundingClientRect().height)<44)throw Error('Android target below 44px');
  await page.locator('#robotDirections').screenshot({path:'brain-receipts/android-after.png'});
  report.browser={passed:true,viewport:'360x800',checks:['clear empties text','cleared draft stays empty after reload','44px touch target'],pageErrors:errors};
 }finally{await browser.close()}
}
try{
 await fs.mkdir('brain-receipts',{recursive:true});
 lease=(await call('claim',{})).lease;
 if(!lease){
  report.status='idle';console.log('No eligible brain-interface job.');
  const last=git('log','-1','--author=infinity-brain','--grep=^Repair .* after GPT review and tests$','--format=%H');
  if(/^[a-f0-9]{40}$/.test(last)){
   const baseSha=git('rev-parse',last+'^'),paths=git('diff-tree','--no-commit-id','--name-only','-r',last).split('\n').filter(Boolean);
   const pair=await capturePair({baseSha,commitSha:last,paths,summary:git('show','-s','--format=%s',last)});
   await fs.writeFile('brain-receipts/work-preview.json',JSON.stringify(pair));
   await call('preview',{preview:pair});report.previewCommit=last;
  }
 }
 else{
  report.jobId=lease.ticketId+'/'+lease.jobId;report.baseSha=git('rev-parse','HEAD');
  await event('greenbeans','Claimed '+report.jobId+'. Reading exact repository files before editing.');
  const original={};for(const path of allowedFiles)original[path]=await fs.readFile(path,'utf8');
  const clearJob=/clear\s+(?:text|input)/i.test(lease.job.instructions);
  let edits=clearJob?clearButtonPatch(original):(await call('propose',{source:original})).edits;
  const resume=!edits.length && clearJob && /^[a-f0-9]{40}$/.test(lease.job.progress?.commitSha||'');
  if(!edits.length&&!resume)throw Error('Requested change is already present; no recorded source commit to resume');
  const patched=resume?original:applyEdits(original,edits);report.edits=edits;
  const reviewedSource=Object.fromEntries(Object.entries(patched).filter(([path])=>resume?path==='robot-directions.js':edits.some(e=>e.path===path)));
  const review=await call('review',{job:lease.job,edits,source:reviewedSource});
  if(review.approved!==true)throw Error('GPT patch review rejected: '+review.reason);
  reviewApproved=true;report.review=review;
  await event('pink-panther','Separate GPT review accepted the bounded source patch. Running repository regressions before commit.');
  const paths=Object.keys(patched).filter(p=>patched[p]!==original[p]);
  for(const path of paths)await fs.writeFile(path,patched[path]);
  try{
   for(const path of paths.filter(p=>p.endsWith('.js')))execFileSync(process.execPath,['--check',path],{stdio:'pipe'});
   execFileSync(process.execPath,['--test','test/brain-writer.test.mjs','test/brain-clock.test.mjs','test/agent-iteration-card.test.cjs'],{stdio:'pipe'});
  }catch(e){for(const path of paths)await fs.writeFile(path,original[path]);throw Error('Regression failure: '+String(e.stderr||e.message).slice(-1400));}
  testsPassed=true;
  if(resume){commitSha=lease.job.progress.commitSha;}else{
  git('fetch','origin','main');if(git('rev-parse','origin/main')!==report.baseSha)throw Error('Main changed; retry against the new head');
  git('config','user.name','infinity-brain[bot]');git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com');
  git('add','--',...paths);git('commit','-m','Repair '+report.jobId+' after GPT review and tests');commitSha=git('rev-parse','HEAD');
  git('push','origin','HEAD:main');
  }
  report.preview={baseSha:git('rev-parse',commitSha+'^'),commitSha,paths:git('diff-tree','--no-commit-id','--name-only','-r',commitSha).split('\n').filter(Boolean),summary:'Bot repair: '+report.jobId,jobId:report.jobId};
  await event('greenbeans','Committed '+commitSha.slice(0,9)+' for '+report.jobId+'. Waiting for the deployed source, then opening the hosted Android browser.',{commitSha});
  // The existing .org edge serves source from main. Verify exact deployed bytes, not HTTP alone.
  let matched=false;
  const deployedPaths=resume?['robot-directions.js']:paths;
  for(let attempt=0;attempt<18&&!matched;attempt++){
   matched=true;
   for(const path of deployedPaths){const r=await fetch('https://quantaphi.org/'+path+'?brainCommit='+commitSha+'&attempt='+attempt,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok||await r.text()!==patched[path])matched=false;}
   if(!matched)await new Promise(resolve=>setTimeout(resolve,10000));
  }
  if(!matched)throw Error('Committed source has not reached the .org deployment');
  if(!clearJob)throw Error('Committed patch requires a job-specific browser acceptance adapter');
  await browserCheck();
  await call('result',{status:'deployed_verified',commitSha,testsPassed,browserPassed:true,deployedFilesMatched:true,reviewApproved,message:'Fixed '+report.jobId+'. GPT reviewed the patch; tests passed; exact source is live on .org. Hosted Android browser verified Clear text, draft persistence after reload, and the touch target. Screenshot and logs are in this run.'});
  report.status='deployed_verified';
 }
}catch(e){
 report.status=commitSha?'committed_unverified':'blocked';report.error=e.message;
 console.error(report.status,e.message);
 if(lease)try{await call('result',{status:report.status,commitSha,testsPassed,reviewApproved,message:report.error});}catch(resultError){report.receiptError=resultError.message;}
 process.exitCode=1;
}finally{
 if(report.preview){try{
  const pair=await capturePair({...report.preview,status:report.status==='deployed_verified'?'deployed_verified':'committed_unverified'});
  await fs.writeFile('brain-receipts/work-preview.json',JSON.stringify(pair));
  await call('preview',{preview:pair});report.previewPublished=true;
 }catch(e){report.previewError=e.message;}}
 report.commitSha=commitSha||null;report.testsPassed=testsPassed;
 await fs.mkdir('brain-receipts',{recursive:true});await fs.writeFile('brain-receipts/report.json',JSON.stringify(report,null,2));
}

