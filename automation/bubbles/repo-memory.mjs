/** Deterministic source-linked proposal for the EXISTING repository runner.
 * Never git-pushes notes, interprets text as commands, or creates repos.
 */
const allowedTopics=new Set(['electronics','computer-science','media','automation','research','other']);
export function stageRepoMemory({topic,text,sourceUrl,sourceSha,approvedRepos=[]}={}){
 if(!allowedTopics.has(topic))throw Error('memory_topic_invalid');
 if(typeof text!=='string'||!text.trim()||text.length>10000)throw Error('memory_text_invalid');
 if(!/^https:\/\/github\.com\/www-infinity4\/[A-Za-z0-9_.-]+\/(?:issues|pull|commit)\/\d+[A-Za-z0-9/_-]*$/.test(sourceUrl||''))throw Error('memory_source_unverified');
 if(!/^[0-9a-f]{40}$/.test(sourceSha||''))throw Error('memory_source_sha_required');
 const repository='www-infinity4/QuantaPhi';
 if(!approvedRepos.includes(repository))throw Error('memory_repository_not_approved');
 return Object.freeze({repository,path:'work/imports/'+topic+'/'+sourceSha.slice(0,12)+'.md',
  sourceUrl,sourceSha,body:text.trim(),status:'proposed_patch',committed:false,merged:false,
  requiresIndependentReview:true});
}
