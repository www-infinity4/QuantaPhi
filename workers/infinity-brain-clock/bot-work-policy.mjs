export function earnedWork(quant,commit){
 const attempt=quant?.attempts?.findLast(a=>['committed_unverified','deployed_verified'].includes(a.status)&&a.testsPassed===true&&/^[a-f0-9]{40}$/.test(a.commitSha||''));
 if(!attempt||commit?.sha!==attempt.commitSha||!commit.files?.length||commit.files.length>12||!/^www-infinity4\/[\w.-]+$/.test(quant.repository||''))return null;
 const large=commit.files.some(f=>f.status==='added'&&/(?:^|\/)index\.html$/.test(f.filename)&&f.additions>=20&&/<html\b/i.test(f.patch||'')&&/<title\b/i.test(f.patch||'')&&/<body\b/i.test(f.patch||''));
 return {asset:large?'STARCOIN':'QUANT',amount:1,quantId:quant.id,repository:quant.repository,commitSha:attempt.commitSha,summary:attempt.summary||'',kind:large?'complete-page-build':'repair'};
}
