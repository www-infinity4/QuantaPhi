export function jobQuant(receipt,previous=null){
 const id='job-quant:'+receipt.revision+':'+receipt.ticketId+':'+receipt.jobId;
 const attempt={runUrl:receipt.runUrl,status:receipt.status,commitSha:receipt.commitSha,testsPassed:receipt.testsPassed===true,browserPassed:receipt.browserPassed===true,summary:receipt.summary,when:receipt.when};
 const attempts=[...(previous?.attempts||[]).filter(a=>a.runUrl!==attempt.runUrl),attempt].slice(-20);
 return {schemaVersion:1,id,type:'BOT_JOB_QUANT',currencyValue:null,ticketId:receipt.ticketId,jobId:receipt.jobId,repository:receipt.repository,revision:receipt.revision,instructions:receipt.job?.instructions||'',acceptance:receipt.job?.acceptance||[],status:receipt.status,createdAt:previous?.createdAt||receipt.when,updatedAt:receipt.when,attempts,repeatPolicy:'Read as evidence; obtain a new queued job, inspect current source, repeat checks and require GPT Purple approval before writing.'};
}
