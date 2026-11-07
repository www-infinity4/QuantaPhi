const RUN=/^https:\/\/github\.com\/www-infinity4\/Moltnook\/actions\/runs\/[0-9]+$/;
const labels={
 discovery_started:'Looking up the repository and its source',
 planning_started:'Planning the repair from source evidence',
 source_read:'Read pinned repository source',
 patch_started:'Preparing a patch against the pinned source',
 patch_prepared:'Prepared an exact source patch',
 review_started:'Reviewing the proposed changes',
 checks_started:'Applied the patch and started repository checks',
 checks_passed:'Repository checks passed',
 arbitration_started:'Checking the patch against the request and test results',
 publication_started:'Preparing to publish the reviewed patch',
 pr_opened:'Opened the pull request',
 attempt_failed:'Repair attempt failed'
};
const phases=Object.keys(labels);
const failureStages=new Set(['build','review','test','arbitration']);
const sequenceOf=(phase,attempt)=>attempt*20+phases.indexOf(phase)+1;
const filePath=/^(?!.*(?:^|\/)(?:\.{1,2}|\.git|\.env(?:\.[^/]*)?|\.npmrc|\.netrc|\.ssh|\.aws|credentials|secrets)(?:\/|$))[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/i;

function describeFiles(step){
 const files=Array.isArray(step.files)?[...new Set(step.files.filter(file=>
  typeof file==='string'&&file.length<=100&&filePath.test(file)))].slice(0,3):[];
 return files.join(', ');
}

// Only accept typed observations from the signed runner. Terminal output is
// useful to the next build attempt, but does not belong in the ticket feed.
export function appendRunnerStep(progress,step,repository,runUrl,runAttempt=1){
 if(progress?.runUrl!==runUrl||!RUN.test(runUrl)||!step||
  !Number.isInteger(runAttempt)||runAttempt<1||runAttempt>9999||
  !Object.hasOwn(labels,step.phase)||!Number.isInteger(step.attempt)||
  (phases.indexOf(step.phase)<3?step.attempt!==0:step.attempt<1||step.attempt>3))return null;
 const {phase,attempt}=step;
 if(phase==='checks_passed'&&step.exitCode!==0)return null;
 if(phase==='attempt_failed'&&!failureStages.has(step.stage))return null;
 const id=runUrl.split('/').at(-1)+(runAttempt===1?'':'.'+runAttempt)+'-'+attempt+'-'+phase;
 const sequence=sequenceOf(phase,attempt);
 const rows=Array.isArray(progress.runnerSteps)?progress.runnerSteps:[];
 const runSteps=rows.filter(row=>row?.runUrl===runUrl&&(row.runAttempt||1)===runAttempt);
 const prior=runSteps.at(-1);
 if(prior&&(prior.phase==='pr_opened'||sequence<=sequenceOf(prior.phase,prior.attempt)))return null;
 const had=phase=>runSteps.some(row=>row.attempt===attempt&&row.phase===phase);
 if(phase==='checks_passed'&&!had('checks_started'))return null;
 if(['publication_started','pr_opened'].includes(phase)&&!had('checks_passed'))return null;
 const prefix='https://github.com/'+repository+'/pull/';
 const prUrl=phase==='pr_opened'&&typeof step.prUrl==='string'&&
  step.prUrl.startsWith(prefix)&&/^\d+$/.test(step.prUrl.slice(prefix.length))?step.prUrl:'';
 if(phase==='pr_opened'&&!prUrl)return null;
 const exitCode=phase==='attempt_failed'&&Number.isInteger(step.exitCode)&&step.exitCode>0&&step.exitCode<=255
  ?step.exitCode:null;
 let summary='';
 if(phase==='attempt_failed')summary='Failed during '+step.stage+(exitCode===null?'.':' with exit code '+exitCode+'.')+
  (attempt<3?' Another attempt is available.':' The retry limit was reached.');
 if(phase==='source_read'||phase==='patch_prepared'){
  const sha=phase==='source_read'&&/^[a-f0-9]{40}$/.test(step.baseSha||'')?step.baseSha.slice(0,12):'';
  const files=describeFiles(step);
  const count=Number.isInteger(step.fileCount)&&step.fileCount>=0&&step.fileCount<=12?step.fileCount:null;
  summary=[sha&&'Commit '+sha,count===null?'':count+' '+(count===1?'file':'files'),files].filter(Boolean).join(' · ').slice(0,180);
 }
 if(phase==='checks_passed'&&Number.isInteger(step.checkCount)&&step.checkCount>0&&step.checkCount<=100)
  summary=step.checkCount+' '+(step.checkCount===1?'check passed.':'checks passed.')+' Exit code 0.';
 const row={id,sequence,phase,attempt,label:labels[phase],summary,runUrl,runAttempt,prUrl};
 return {...progress,runnerSteps:[...rows.slice(-35),row]};
}
