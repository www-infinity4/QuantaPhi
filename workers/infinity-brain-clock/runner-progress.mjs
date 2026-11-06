const RUN=/^https:\/\/github\.com\/www-infinity4\/Moltnook\/actions\/runs\/[0-9]+$/;
const labels={
 source_read:'Read pinned repository source',
 patch_prepared:'Prepared an exact source patch',
 checks_started:'Applied the patch and started repository checks',
 checks_passed:'Repository checks passed',
 attempt_failed:'Repair attempt failed',
 pr_opened:'Opened the pull request'
};
const failureStages=new Set(['build','review','test','arbitration']);

// Only accept typed observations from the signed runner. Terminal output is
// useful to the next build attempt, but does not belong in the ticket feed.
export function appendRunnerStep(progress,step,repository,runUrl){
 if(progress?.runUrl!==runUrl||!RUN.test(runUrl)||!step||
  !Object.hasOwn(labels,step.phase)||!Number.isInteger(step.attempt)||
  (step.phase==='source_read'?step.attempt!==0:step.attempt<1||step.attempt>3))return null;
 const {phase,attempt}=step;
 if(phase==='checks_passed'&&step.exitCode!==0)return null;
 if(phase==='attempt_failed'&&!failureStages.has(step.stage))return null;
 const id=runUrl.split('/').at(-1)+'-'+attempt+'-'+phase;
 const rows=Array.isArray(progress.runnerSteps)?progress.runnerSteps:[];
 if(rows.some(row=>row?.id===id))return null;
 const prefix='https://github.com/'+repository+'/pull/';
 const prUrl=phase==='pr_opened'&&typeof step.prUrl==='string'&&
  step.prUrl.startsWith(prefix)&&/^\d+$/.test(step.prUrl.slice(prefix.length))?step.prUrl:'';
 if(phase==='pr_opened'&&!prUrl)return null;
 const exitCode=phase==='attempt_failed'&&Number.isInteger(step.exitCode)&&step.exitCode>0&&step.exitCode<=255
  ?step.exitCode:null;
 const summary=phase==='attempt_failed'?'Failed during '+step.stage+(exitCode===null?'.':' with exit code '+exitCode+'.')+
  (attempt<3?' The runner will retry.':' The retry limit was reached.'):'';
 const row={id,phase,attempt,label:labels[phase],summary,runUrl,prUrl};
 return {...progress,runnerSteps:[...rows.slice(-19),row]};
}
