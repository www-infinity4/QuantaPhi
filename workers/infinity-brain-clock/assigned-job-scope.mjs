/** Keep independent ticket subtasks separate for GPT review. */
export function scopedRepositoryJob(job,{ticketId='',jobId='',repository=''}={}){
 if(!job||typeof job.instructions!=='string'||!job.instructions.trim())throw Error('assigned_job_instructions_missing');
 return {id:jobId||job.id||'',ticketId,repository:repository||job.repository||'',title:job.title||'',agent:job.agent||'',instructions:job.instructions,acceptance:Array.isArray(job.acceptance)?job.acceptance:[],scope:'assigned_job_only'};
}
