/* Bubbles -> authenticated Robot Brain routing.
 * Pure, deterministic intent and job helpers. Never accepts model-generated
 * tool commands, tokens, URLs, or arbitrary repository names. */
(function(root){
'use strict';
const OWNER_REPOS={
 'moltnook':'www-infinity4/Moltnook',
 'infinity phi':'www-infinity4/Infinity-Phi',
 'omni phi':'www-infinity4/Omni-Phi',
 'code phi':'www-infinity4/Code-Phi',
 'quanta phi':'www-infinity4/QuantaPhi',
 'quantaphi':'www-infinity4/QuantaPhi'
};
function classify(utterance){
 const text=String(utterance||'').trim().slice(0,4001);
 if(!text||text.length>4000)return 'chat';
 const report=/\b(?:status|report|progress|activity|top\s*(?:ten|10)|running\s+(?:jobs|tasks)|queued\s+(?:jobs|tasks)|what(?:'s| is| are)\s+(?:the\s+)?(?:bots?|robot brain|pink panther|agents?))\b/i;
 const ask=/\b(?:show|give|read|tell|check|list|summari[sz]e|what|how|which|report)\b/i;
 const target=/\b(?:bots?|robot\s*brain|brain|jobs?|tasks?|pink\s*panther|color\s*bots?|agents?|work\s*report)\b/i;
 if(report.test(text)&&ask.test(text)&&target.test(text))return 'report';
 const dispatch=/\b(?:tell|ask|have|send|assign|instruct|dispatch|queue|start|launch|submit|give)\b.{0,100}\b(?:bots?|robot\s*brain|brain|agents?|pink\s*panther|jobs?|tasks?)\b/i;
 const dispatchReverse=/\b(?:bots?|robot\s*brain|brain|agents?|pink\s*panther)\b.{0,80}\b(?:fix|repair|build|create|start|run|update|upgrade|investigate|verify|implement)\b/i;
 const change=/\b(?:fix|repair|restore|debug|update|upgrade|build|create|wire|connect|replace|correct|implement|investigate|verify|check)\b/i;
 const subject=/\b(?:quantaphi|quanta\s*phi|website|site|page|card|widget|bubbles|bot|robot|brain|studio|image|video|player|upload|wallet|search|gallery|repository|github|store|radio|microphone|app|code\s*phi|infinity\s*phi|omni\s*phi|moltnook)\b/i;
 const imperative=/^(?:(?:please|hey\s+bubbles|bubbles)[\s,:]+)*(?:fix|repair|restore|debug|update|upgrade|build|create|wire|connect|replace|correct|implement|investigate|verify|check|start|queue|assign|dispatch|send|tell|ask|have|launch)\b/i;
 const directive=/^(?:(?:bubbles)[\s,:]+)?(?:please\s+)?(?:i\s+(?:need|want)\s+(?:you\s+)?to|you\s+(?:need|have)\s+to|can\s+you|could\s+you|would\s+you|we\s+need\s+to)\b/i;
 if(dispatch.test(text)||dispatchReverse.test(text))return 'queue';
 if(change.test(text)&&subject.test(text)&&(imperative.test(text)||directive.test(text)))return 'queue';
 return 'chat';
}
function repositoryFor(text){
 const source=String(text||'').toLowerCase();
 for(const [name,repo] of Object.entries(OWNER_REPOS)){
  if(new RegExp('\\b'+name.replace(/ /g,'\\s+')+'\\b').test(source))return repo;
 }
 return 'www-infinity4/QuantaPhi';
}
function makeJobs(request){
 const message=String(request||'').trim().slice(0,4000);
 if(!message)throw Error('request_required');
 const repository=repositoryFor(message),title=message.slice(0,180);
 return [{
  id:'TASK-1',agent:'greenbeans',color:'green',team:['yellow-jacket','greenbeans','purple-pearl'],
  repository,executor:'repository-engine',queue_priority:80,status:'queued',
  title,instructions:message,
  acceptance:['Inspect actual repository implementation and implement this owner request; never fabricate source changes.',
   'Run focused tests and record commit/PR evidence, noting missing credentials or services.'],
  dependencies:[],design:'Oracle Octaves · Android first'
 },{
  id:'TASK-2',agent:'pink-panther',color:'pink',team:['pink-panther','purple-pearl'],
  repository,executor:'repository-engine',queue_priority:70,status:'queued',
  title:'Verify: '+title.slice(0,160),
  instructions:'After TASK-1, independently verify the requested work: '+message+
   '. Inspect real code, checks and live behavior when available; document blockers, and do not claim deployment without evidence.',
  acceptance:['Review tests and source evidence from TASK-1.','Report honest live/deployment status and any remaining defect.'],
  dependencies:['TASK-1'],design:'Oracle Octaves · Android first'
 }];
}
function describeTickets(tickets,limit=10){
 if(!Array.isArray(tickets))return 'Robot Brain returned no verifiable ticket list.';
 const entries=[];
 for(const ticket of tickets){
  if(!ticket||ticket.context?.kind!=='robot-directions')continue;
  const jobs=Array.isArray(ticket.context.color_jobs)?ticket.context.color_jobs:[];
  for(const job of jobs){
   const status=String(job.status||ticket.status||'unknown').slice(0,40);
   const progress=job.progress&&typeof job.progress==='object'?job.progress:{};
   entries.push({updated:Number(ticket.updated_at)||0,description:
    String(job.agent||'Bot').replace(/-/g,' ')+' — '+String(job.title||'Untitled').slice(0,140)+
    ' ('+String(job.repository||'unassigned').slice(0,90)+'): '+status+
    (progress.summary?'. Evidence: '+String(progress.summary).slice(0,230):'. No verified progress yet')+
    (progress.blocker?'. Blocker: '+String(progress.blocker).slice(0,180):'')+
    '. Receipt '+String(ticket.id||'unknown').slice(0,50)+'/'+String(job.id||'').slice(0,20)});
  }
 }
 entries.sort((a,b)=>b.updated-a.updated);
 if(!entries.length)return 'Robot Brain has no verified color-bot jobs in the current owner ticket list. No activity was invented.';
 const selected=entries.slice(0,Math.max(1,Math.min(10,Number(limit)||10)));
 return 'Robot Brain report from '+tickets.length+' saved owner tickets; '+selected.length+' job updates. Queued is not running and no payment is implied.\n'+selected.map((e,i)=>(i+1)+'. '+e.description).join('\n');
}
const api={classify,repositoryFor,makeJobs,describeTickets};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.BubblesBrainActions=api;
})(typeof window!=='undefined'?window:globalThis);
