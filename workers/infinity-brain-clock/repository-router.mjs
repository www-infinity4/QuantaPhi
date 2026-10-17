/* Owner-scoped repository suggestions. No secrets, execution, or ticket creation. */
const FILLER=new Set('a an and are at be build can change check code create do for from help i in into is it me my of on or please repo repository repositories repair search site some the this to update use want we with you your'.split(' '));
const SUBJECTS=[
 {words:/\b(?:bubbles|floating (?:chat|overlay)|apk|microphone|voice|speech|screen recorder|screen capture|android overlay)\b/i,targets:['QuantaPhi']},
 {words:/\b(?:robot brain|brain runner|owner ticket|colou?r bots?|red brain|brain clock)\b/i,targets:['QuantaPhi','Moltnook']},
 {words:/\b(?:infinity radio|alien radio|radio player|radio station|radio stream)\b/i,targets:['Alien-Radio','QuantaPhi']},
 {words:/\b(?:widget|card catalog|card catalogue)\b/i,targets:['WidgetPhi','QuantaPhi']},
 {words:/\b(?:starcoin|wallet|mint|quants? tokens?)\b/i,targets:['QuantaPhi','Mint-For-Infinity']},
 {words:/\b(?:omni code|code phi|website builder)\b/i,targets:['Omni-Phi','QuantaPhi']},
 {words:/\b(?:moltnook|agent swarm|repository engine)\b/i,targets:['Moltnook']}
];
export function normalizeWords(value){
 return String(value||'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/([A-Z])([A-Z][a-z])/g,'$1 $2')
 .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);
}
function allowed(repo){return typeof repo==='string'&&/^www-infinity4\/[a-z0-9_.-]+$/i.test(repo);}
export function selectRepositories(request,catalog){
 const query=String(request||'').slice(0,2500),words=normalizeWords(query),q=' '+words.join(' ')+' ';
 const sources=Array.isArray(catalog)?catalog:[];
 const entries=[...new Map(sources.map(row=>typeof row==='string'?{repository:row}:row).filter(row=>allowed(row?.repository)&&row.archived!==true)
 .map(row=>[row.repository.toLowerCase(),{repository:row.repository,description:String(row.description||'').slice(0,180)}])).values()];
 const explicit=entries.filter(row=>query.toLowerCase().includes(row.repository.toLowerCase()));
 const allTargets=/\b(?:edit|fix|repair|update|apply|deploy|change|build)\b[\s\S]{0,80}\b(?:all|every)\s+(?:my\s+)?repositor(?:y|ies)\b/i.test(query)
 || /\b(?:all|every)\s+(?:my\s+)?repositor(?:y|ies)\b[\s\S]{0,80}\b(?:update|repair|fix|edit|change|apply)\b/i.test(query);
 // "Search all repositories to locate it" is discovery, NOT permission to edit everything.
 const scored=entries.map(row=>{
  const name=row.repository.split('/')[1],tokens=normalizeWords(name),joined=tokens.join(' ');
  let score=0;const reasons=[];
  if(explicit.some(x=>x.repository.toLowerCase()===row.repository.toLowerCase())){score+=100;reasons.push('named directly');}
  if(joined&&q.includes(' '+joined+' ')){score+=18;reasons.push('repository named');}
  for(const word of tokens)if(word.length>2&&!FILLER.has(word)&&words.includes(word))score+=6;
  const aliases=SUBJECTS.filter(rule=>rule.words.test(query));
  for(const rule of aliases){const idx=rule.targets.findIndex(t=>t.toLowerCase()===name.toLowerCase());if(idx>=0){score+=idx===0?13:5;reasons.push('matched project feature');}}
  const desc=normalizeWords(row.description);
  for(const word of new Set(words))if(word.length>=5&&!FILLER.has(word)&&desc.includes(word))score+=1;
  return {repository:row.repository,score,reason:reasons.join(', ')||'name or description similarity'};
 }).sort((a,b)=>b.score-a.score||a.repository.localeCompare(b.repository));
 let candidates=scored.filter(x=>x.score>0).slice(0,8);
 if(!candidates.length){const home=entries.find(x=>x.repository.toLowerCase()==='www-infinity4/quantaphi');
  if(home)candidates=[{repository:home.repository,score:1,reason:'default Bubbles home; no strong project match'}];}
 const primary=candidates[0],second=candidates[1];
 const subjectMatches=SUBJECTS.filter(rule=>rule.words.test(query));
 const distinctPrimary=[...new Set(subjectMatches.map(rule=>rule.targets[0]))];
 const multiRequested=/\b(?:and|both|between|across)\b/i.test(query)&&distinctPrimary.length>=2;
 const multiSelection=multiRequested?distinctPrimary.map(name=>candidates.find(entry=>entry.repository.split('/')[1].toLowerCase()===name.toLowerCase()))
   .filter(entry=>entry?.score>=13).map(entry=>entry.repository):[];
 const confidentMultiple=multiSelection.length>=2;
 const confidence=!primary?'none':primary.score>=100?'explicit':confidentMultiple?'high':primary.score>=13&&(!second||primary.score-second.score>=6)?'high':primary.score>=6?'medium':'low';
 const auto=allTargets?[]:confidence==='explicit'?explicit.map(x=>x.repository):confidentMultiple?multiSelection:confidence==='high'?[primary.repository]:[];
 return {candidates,selection:[...new Set(auto)],confidence,allTargets,requiresReview:allTargets||!auto.length,
  reason:allTargets?'All-repository edits require an explicit owner selection and approval.':
   confidence==='high'||confidence==='explicit'?'Strong match with repository names and owned project features.':
   'Suggested candidates only. Verify the target before sending a ticket.',
  catalogSize:entries.length};
}
