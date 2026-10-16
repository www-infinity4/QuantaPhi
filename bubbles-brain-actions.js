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
 'omni tv':'www-infinity4/Omni-TV',
 'omni-tv':'www-infinity4/Omni-TV',
 'quanta phi':'www-infinity4/QuantaPhi',
 'quantaphi':'www-infinity4/QuantaPhi',
 'channel-creatir':'www-infinity4/Channel-Creatir',
 'hbo':'www-infinity4/HBO',
 'tv-database':'www-infinity4/TV-Database',
 'widgetphi':'www-infinity4/WidgetPhi',
 'widget phi':'www-infinity4/WidgetPhi'
};
function classify(utterance){
 const text=String(utterance||'').trim().slice(0,4001);
 if(!text||text.length>4000)return 'chat';
 const addressed=text.replace(/^(?:(?:please|hey\s+bubbles|bubbles)[\s,:]+)+/i,'');
 if(/^(?:do\s+not|don['’]t|never|i\s+(?:do\s+not|don['’]t)\s+(?:want|need)|i\s+(?:want|need)\s+(?:you\s+)?not\s+to)\b/i.test(addressed))return 'chat';
 // Capability questions verify the actual owner endpoint without inventing a job.
 if(/^(?:can|could) you (?:actually )?(?:start|create|submit|queue) (?:new |a |the )?(?:work )?tickets?[?.!]*$/i.test(addressed))return 'connection';
 if(/^(?:(?:can|could|would) you |please )?(?:start|create|submit|queue|add) (?:new |a |the )?(?:work )?tickets? (?:to|for|about) .+/i.test(addressed))return 'queue';
 // A follow-up asking if an existing ticket is really running is a read-only
 // status query, not a new work request or an AI-only conversational answer.
 const ticketQuestion=/\b(?:tickets?|jobs?|tasks?)\b/i.test(addressed)
  && /\b(?:check|show|tell|report|verify|confirm|look up|find out|make sure|whether|if|is|are|has|have|did|does|what|how)\b/i.test(addressed)
  && /\b(?:doing|done|work(?:ing|ed)?|run(?:ning)?|start(?:ed)?|finish(?:ed)?|complet(?:e|ed)|progress|status|state|queued?|dispatch(?:ed)?|assigned|active|happened|result|receipt|actually|still)\b/i.test(addressed);
 if(ticketQuestion)return 'report';
 const report=/\b(?:status|report|progress(?:ing)?|activity|top\s*(?:ten|10)|running\s+(?:jobs|tasks)|queued\s+(?:jobs|tasks)|what(?:'s| is| are)\s+(?:the\s+)?(?:bots?|robot brain|pink panther|agents?))\b/i;
 const ask=/\b(?:show|give|read|tell|check|list|summari[sz]e|what|how|which|report)\b/i;
 const target=/\b(?:bots?|robot\s*brain|brain|jobs?|tasks?|tickets?|pink\s*panther|color\s*bots?|agents?|work\s*report)\b/i;
 if(report.test(text)&&ask.test(text)&&target.test(text))return 'report';
 // "Contact Robot Brain and ask it to give Bubbles the missing abilities"
 // is an explicit engineering instruction, not a verified permission grant.
 // Only an authenticated owner session can create the work ticket.
 const repairMissingTools=/\b(?:contact|talk to|speak to|communicate with|connect to|reach out to|ask|tell)\b.{0,90}\b(?:robot\s*brain|brain|bots?)\b.{0,180}\b(?:tell|ask|give|provide|grant|install|wire|build|fix|repair|add|restore|enable)\b.{0,150}\b(?:tools?|abilities|capabilit(?:y|ies)|connections?|integrations?|permissions?|access|functions?|features?)\b/i;
 if(repairMissingTools.test(text))return 'queue';
 const dispatch=/\b(?:send|assign|instruct|dispatch|queue|start|launch|submit)\b.{0,100}\b(?:bots?|robot\s*brain|brain|agents?|pink\s*panther|jobs?|tasks?)\b/i;
 const dispatchByName=/\b(?:tell|ask|have|give)\b.{0,70}\b(?:bots?|robot\s*brain|brain|agents?|pink\s*panther)\b.{0,90}\b(?:to\s+)?(?:fix|repair|build|create|start|run|update|upgrade|investigate|verify|implement)\b/i;
 const dispatchReverse=/\b(?:bots?|robot\s*brain|brain|agents?|pink\s*panther)\b.{0,80}\b(?:fix|repair|build|create|start|run|update|upgrade|investigate|verify|implement)\b/i;
 const change=/\b(?:fix|repair|restore|debug|update|upgrade|build|create|wire|connect|replace|correct|implement|investigate|verify|check)\b/i;
 const subject=/\b(?:quantaphi|quanta\s*phi|website|site|page|card|widget|bubbles|bot|robot|brain|studio|image|video|player|upload|wallet|search|gallery|repository|github|store|radio|microphone|app|code\s*phi|infinity\s*phi|omni\s*phi|omni\s*tv|moltnook|widgetphi|widget\s*phi|channel-creatir|hbo|tv-database)\b/i;
 const imperative=/^(?:(?:please|hey\s+bubbles|bubbles)[\s,:]+)*(?:fix|repair|restore|debug|update|upgrade|build|create|wire|connect|replace|correct|implement|investigate|verify|check|start|queue|assign|dispatch|send|tell|ask|have|launch|search|scan|inspect|combine|pull together|edit)\b/i;
 const directive=/^(?:(?:bubbles)[\s,:]+)?(?:please\s+)?(?:i\s+(?:need|want)\s+(?:you\s+)?to|you\s+(?:need|have)\s+to|can\s+you|could\s+you|would\s+you|we\s+need\s+to)\b/i;
 const makeJob=/\b(?:make|create|add)\s+(?:(?:a|an|the|new)\s+)*(?:job|task)\b.{0,70}\b(?:in|for|to|on)\s+(?:(?:my|the)\s+)?(?:robot\s*brain|brain)\b/i;
 const makeDirective=/^(?:(?:please|hey\s+bubbles|bubbles)[\s,:]+)*(?:make|create|add)\b/i;
 if(makeJob.test(text)&&(makeDirective.test(text)||directive.test(text))&&!/\b(?:do\s+not|don't|never|not\s+to)\b/i.test(text))return 'queue';
 if(/^(?:explain|describe|how\s+(?:do|does|did|can|could|would)|why\s+(?:do|does|did)|what\s+(?:is|are|would))\b/i.test(addressed))return 'chat';
 if(dispatch.test(text)||dispatchByName.test(text)||dispatchReverse.test(text))return 'queue';
 if((imperative.test(text)||directive.test(text))&&/\b(?:create|start|build|edit|update|search|scan|inspect|combine|pull together)\b/i.test(text)&&/\b(?:repos?|repositories|repository)\b/i.test(text))return 'queue';
 if(change.test(text)&&subject.test(text)&&(imperative.test(text)||directive.test(text)))return 'queue';
 return 'chat';
}
// Continue an OWNER'S last explicit work command, not an assistant suggestion.
 // No older browsing context or model-authored instruction can create a job.
function resolveFollowupRequest(utterance, history=[]){
 const latest=String(utterance||'').trim().toLowerCase();
 if(!/^(?:\*|continue(?: (?:building|working|the build|that|where you left off))?|keep (?:going|building|working)(?: on (?:it|that))?|go ahead|go on|carry on|proceed|yes[, ]*(?:do it|go ahead|continue)|finish (?:it|that|the build)|pick up (?:the work|where you left off))\s*[.!*]*$/.test(latest))return '';
 if(!Array.isArray(history))return '';
 // Only the *most recent* user command is eligible. Earlier, unrelated requests
 // cannot be revived by a one-word "continue" after an intervening topic.
 const last=[...history].reverse().find(item=>item?.role==='user'&&typeof item.text==='string');
 if(!last)return '';
 const previous=last.text.trim().slice(0,4000);
 if(previous.length<12||classify(previous)!=='queue')return '';
 return previous;
}
// Resolve a deictic repair command only against the owner's latest message.
function resolveRepairRequest(utterance, history=[]){
 const command=String(utterance||'').trim();
 if(!/^(?:(?:please|bubbles)[\s,:]+)*(?:fix|repair|correct|restore)\s+(?:it|that|this|these(?: things| problems| issues)?|those(?: things| problems| issues)?)[.!]*$/i.test(command))return '';
 const last=Array.isArray(history)?[...history].reverse().find(item=>item?.role==='user'&&typeof item.text==='string'):null;
 const context=String(last?.text||'').trim();
 if(context.length<12||context.length>3500||!(/\b(?:broken|fail|error|problem|issue|not working|doesn['’]t|cannot|can['’]t|won['’]t|missing)\b/i.test(context)||classify(context)==='queue'))return '';
 return 'Repair the problems in this owner message: '+context;
}
function repositoryFor(text){
  const source=String(text||'');
  // 1️⃣ Detect an explicit www‑infinity4/Owner/Repo token.
  const explicitMatch = /www-infinity4\/[A-Za-z0-9_-]+/i.exec(source);
  if (explicitMatch) {
    const token = explicitMatch[0];
    // Normalise for case‑insensitive comparison against the allow‑list values.
    const allowed = Object.values(OWNER_REPOS).map(v => v.toLowerCase());
    if (allowed.includes(token.toLowerCase())) {
      // Exact allowed repository – precedence over any incidental aliases.
      return token;
    }
    // Explicit token present but not on the allow‑list → reject.
    const err = new Error('unsupported_repository');
    err.code = 'unsupported_repository';
    throw err;
  }
  // 2️⃣ No explicit token – fall back to the historic alias‑scanning logic.
  const lowered = source.toLowerCase();
  for (const [name, repo] of Object.entries(OWNER_REPOS)) {
    if (new RegExp('\\b' + name.replace(/ /g, '\\s+') + '\\b').test(lowered)) return repo;
  }
  // Default repository when nothing matches.
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
   'Run focused tests and record commit/PR evidence, noting missing credentials or services.',
   'Carry the tested repair through the authorized review, merge and deployment pipeline. Record the actual live result; stop and report blockers when authorization or checks are missing.'],
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
function readableReport(text) {
 return String(text||'').replace(/\\b[0-9a-f]{8}-[0-9a-f-]{27,}\\b/gi,'[internal reference]')
  .replace(/\\b[0-9a-f]{32,}\\b/gi,'[internal reference]')
  .replace(/\\b[A-Za-z0-9+/_=-]{48,}\\b/g,'[internal reference]');
}
function describeTickets(tickets,limit=10){
 if(!Array.isArray(tickets))return 'Robot Brain returned no verifiable ticket list.';
 const totals={};
 const entries=[];
 for(const ticket of tickets){
  if(!ticket||typeof ticket!=='object')continue;
  const status=String(ticket.status||'unknown').slice(0,36);
  totals[status]=(totals[status]||0)+1;
  const updated=Number(ticket.updated_at)||Date.parse(ticket.updated_at||'')||0;
  const title=String(ticket.title||ticket.request||'Unnamed task').replace(/\s+/g,' ').slice(0,125);
  const jobs=Array.isArray(ticket.context?.color_jobs)?ticket.context.color_jobs:[];
  const jobInfo=jobs.length?' Team: '+jobs.slice(0,5).map(j=>String(j.agent||'bot').replace(/-/g,' ')+': '+String(j.status||'queued')+(j.progress?.blocker?' Blocker: '+readableReport(j.progress.blocker).slice(0,140):'')).join('; ')+'.':'';
  const receipt=readableReport(ticket.result_summary).trim().slice(0,185);
  const outcome=receipt?' Recorded result: '+receipt+'.':' No verified progress yet; no authenticated code or deployment receipt recorded here.';
  entries.push({updated,description:readableReport(title+' — '+status+'.'+jobInfo+outcome)});
 }
 entries.sort((a,b)=>b.updated-a.updated);
 const total=Object.values(totals).reduce((a,b)=>a+b,0);
 const statuses=Object.entries(totals).sort((a,b)=>b[1]-a[1]).map(([status,count])=>count+' '+status).join(', ');
 if(!total)return 'Robot Brain has no saved owner tickets yet. No jobs are claimed running.';
 const selected=entries.slice(0,Math.max(1,Math.min(10,Number(limit)||10)));
 return 'Robot Brain: '+total+' saved owner tickets ('+statuses+'). Showing '+selected.length+' most recently updated. Queued is not running; status “working” does not prove a bot is actively executing; only authenticated commits, tests and live receipts prove delivery.\n'
  +selected.map((e,i)=>(i+1)+'. '+e.description).join('\n');
}
/**
 * Answer a natural ticket follow-up from the authenticated owner's actual list.
 * A stored status is a database observation, never proof that GitHub work ran.
 * When a user does not identify a ticket, say which record was selected.
 */
function describeTicketCheck(tickets, request='') {
 if(!Array.isArray(tickets))return 'Robot Brain did not return a verifiable ticket list.';
 if(!tickets.length)return 'Robot Brain has no saved owner tickets. Nothing is confirmed running.';
 const valid=tickets.filter(ticket=>ticket&&typeof ticket==='object')
  .sort((a,b)=>{
   const date=v=>Number(v?.updated_at)||Date.parse(v?.updated_at||'')||0;
   return date(b)-date(a);
  });
 if(!valid.length)return 'Robot Brain returned no verifiable ticket records.';
 const query=String(request||'');
 const explicitId=query.match(/\bIW-[A-Z0-9-]{6,}\b/i)?.[0]||'';
 let chosen=explicitId?valid.find(ticket=>String(ticket.id||'').toLowerCase()===explicitId.toLowerCase()):null;
 if(explicitId&&!chosen)return 'Robot Brain returned '+valid.length+' tickets, but none matched the requested ticket reference. No active work can be confirmed for that reference.';
 const testing=/\btest\s+(?:work\s+)?ticket\b/i.test(query);
 if(!chosen&&testing)chosen=valid.find(ticket=>/\btest\b/i.test(String(ticket.title||ticket.request||'')));
 const selection=chosen?'Matching ticket':'Most recently updated ticket (not necessarily the one you mean)';
 chosen=chosen||valid[0];
 const title=readableReport(String(chosen.title||chosen.request||'Unnamed task').replace(/\s+/g,' ').slice(0,160));
 const id=String(chosen.id||'').slice(0,90);
 const state=String(chosen.status||'unknown').slice(0,48);
 const jobs=Array.isArray(chosen.context?.color_jobs)?chosen.context.color_jobs:[];
 const recordedJobs=jobs.slice(0,5).map(j=>String(j.agent||'bot').replace(/-/g,' ')+': '+String(j.status||'queued')
  +(j.progress?.blocker?' (blocked: '+readableReport(j.progress.blocker).slice(0,150)+')':'')).join('; ');
 const result=readableReport(chosen.result_summary||'').trim().slice(0,260);
 let verification='No independent code, test, merge or deployment receipt was returned in this ticket summary.';
 if(result)verification='Recorded outcome (not independently verified by this check): '+result+'.';
 const stateMeaning=/^(?:ready|draft|queued|pending|blocked)$/i.test(state)
  ?'This does not confirm a runner has started.'
  : /^(?:working|in_progress|running)$/i.test(state)
  ?'This is a stored work label, not proof an agent is actively executing.'
  : /^(?:complete|completed|done|deployed)$/i.test(state)
  ?'Completion is recorded, but delivery still needs verifiable evidence.'
  :'The stored state alone does not establish execution.';
 const at=Number(chosen.updated_at)||Date.parse(chosen.updated_at||'')||0;
 const updated=at&&Number.isFinite(at)?' Last updated: '+new Date(at).toISOString()+'.':'';
 return selection+': '+title+'.'+(id?' Ticket reference: '+readableReport(id)+'.':'')
  +' Stored status: '+state+'. '+stateMeaning+updated
  +(recordedJobs?' Agent records: '+recordedJobs+'.':' No agent execution records in this ticket.')
  +' '+verification;
}

const api={classify,resolveRepairRequest,resolveFollowupRequest,repositoryFor,makeJobs,describeTickets,describeTicketCheck};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.BubblesBrainActions=api;
})(typeof window!=='undefined'?window:globalThis);

