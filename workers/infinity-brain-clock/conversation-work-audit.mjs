/* Read-only owner-conversation work discovery; no ticket creation, credentials or export. */
const topics=[
 ['owner-delegation','ChatGPT–Bubbles owner connection','QuantaPhi',/\b(?:owner (?:mode|chat|access|session)|five.day (?:owner|session)|5.day session|connect (?:yourself|gpt|chatgpt) (?:to|with) bubbles|hook (?:in|into) (?:bubbles|owner)|robot brain access)\b/i],
 ['conversation-memory','Bubbles conversation retrieval and memory','QuantaPhi',/\b(?:memory|memories|synapse|conversation (?:history|archive|context|categor|fold)|parse (?:my |older |old )?(?:messages|conversations)|remember (?:my|previous)|grammarphi)\b/i],
 ['autonomous-building','Autonomous repository build and verification','QuantaPhi',/\b(?:self.build|build(?:ing)? (?:itself|on its own)|automatic(?:ally)? (?:build|upgrade|repair)|autonom(?:ous|ation)|repo(?:sitor(?:y|ies))? (?:not |in)?(?:fully )?built|unfinished (?:projects|repos|builds)|test ground ai|brain runner|github (?:commit|pr|repo|tools?))\b/i],
 ['apk-web-sync','Android APK and website shared chat/voice','QuantaPhi',/\b(?:apk|android|phone)\b[\s\S]{0,110}\b(?:sync|synch|website|webview|same (?:version|voice|chat)|not respond)|\b(?:sync|synch|same (?:version|voice|chat))\b[\s\S]{0,110}\b(?:apk|android)\b/i],
 ['voice','Natural continuous Bubbles voice','QuantaPhi',/\b(?:voice|speak|speech|microphone|mic|tts|sing|diaphragm|listening)\b/i],
 ['recorder','Bubbles native recording and capture','RecordB',/\b(?:record(?:ing|er)?|media.?projection|screen capture|xrecorder|recordb)\b/i],
 ['radio','Infinity Radio playback','Alien-Radio',/\b(?:infinity radio|radio (?:playback|player|stop|shut)|alien radio|music (?:plays?|stops?))\b/i],
 ['card-controls','Bubbles webpage/card interactions','QuantaPhi',/\b(?:tap (?:the |on |play)|play button|click (?:the |on )|card (?:viewer|into chat|control)|open (?:the )?page|inspec(?:t|tion) (?:the )?page)\b/i],
 ['wallet','Unified wallet and development receipts','QuantaPhi',/\b(?:wallet|starcoin|quants?|infinity token|mint|credits? (?:for|on) commits?)\b/i],
 ['site-building','Website builder and published interaction tests','Omni-Phi',/\b(?:website|webpage|code phi|publish(?:ed|ing)? (?:site|page)|site (?:build|builder|test))\b/i]
];
const DIRECT=/\b(?:fix|repair|build|create|add|implement|integrate|connect|hook|sync|synch|upgrade|test|verify|check|inspect|publish|deploy|import|restore|make|continue|read|find|teach|use|push|run|set up|set it up|need(?:s)? to|have to|must|should|want (?:you|bubbles|it) to)\b/i;
const FAILURE=/\b(?:broken|doesn.t work|not working|stuck|can.t|cannot|failed|failing|shuts? off|not (?:sync|respond|playing)|lost|missing|unfinished|not built)\b/i;
const CONSTRAINT=/\b(?:do not|don't|never|without|stop|only|must|should|prefer|no more|instead of|not (?:sing|chant|read))\b/i;
const validId=v=>/^[A-Za-z0-9_-]{8,100}$/.test(v||'');
const brief=(v,n)=>String(v||'').trim().replace(/\s+/g,' ').slice(0,n);
function actionable(t){return t.length>=8&&t.length<=6000&&!/^\s*(?:here is|example:|system prompt|sample code)/i.test(t)&&!(/^\s*(?:why|what|how|when|where|is there)\b/i.test(t)&&!DIRECT.test(t))&&(DIRECT.test(t)||FAILURE.test(t))}
function kind(t){
 if(/\b(?:test|verify|check|inspect)\b/i.test(t)&&!/\b(?:build|fix|repair|implement|integrate|add|create|sync|upgrade)\b/i.test(t))return 'verify';
 if(/\b(?:fix|repair|broken|failed|not working|stuck|shuts? off|not respond)\b/i.test(t))return 'repair';
 if(/\b(?:sync|synch|connect|integrate|hook)\b/i.test(t))return 'integrate';
 return 'implement';
}
export function auditWorkHistory(messages,{maxCandidates=30}={}){
 if(!Array.isArray(messages))throw TypeError('messages_array_required');
 const found=new Map();
 for(const message of messages.slice(0,250)){
  if(message?.role!=='user'||!validId(message.id)||typeof message.text!=='string')continue;
  const t=message.text.trim();if(!actionable(t))continue;
  for(const [id,title,repo,re] of topics.filter(v=>v[3].test(t)).slice(0,5)){
   let task=found.get(id);
   if(!task){task={id,title,repositorySuggestion:'www-infinity4/'+repo,repositoryVerified:false,status:'candidate_needs_repository_inspection',kind:kind(t),evidence:[],constraints:[],
    nextChecks:['read target repository and relevant issues/PRs','compare exact source against request','run appropriate tests','verify deployment and observable behavior'],mentions:0};found.set(id,task)}
   task.mentions++;
   if(task.evidence.length<12&&!task.evidence.some(e=>e.messageId===message.id))task.evidence.push({messageId:message.id,at:Number.isSafeInteger(message.at)?message.at:null,excerpt:brief(t,320)});
   if(CONSTRAINT.test(t)&&task.constraints.length<8){const c=brief(t,220);if(!task.constraints.includes(c))task.constraints.push(c)}
   if(kind(t)==='repair')task.kind='repair';
  }
 }
 return [...found.values()].sort((a,b)=>b.evidence.length-a.evidence.length||a.id.localeCompare(b.id)).slice(0,Math.max(0,Math.min(30,Number(maxCandidates)||30)));
}
// Compatibility helper for candidate rendering only. The old implementation
// promoted a self-asserted 'passed' flag and an arbitrary URL to 'tests_verified'.
// Model-provided claims are untrusted evidence; independent readback lives in
// work-receipt-readback.mjs and even that cannot certify completed features.
export function reconcileWorkEvidence(candidate,_untrustedClaim){
 if(!candidate||typeof candidate.id!=='string')throw TypeError('candidate_required');
 const copy={...candidate,status:'candidate_needs_repository_inspection',
  repositoryVerified:false};
 delete copy.receipt;
 return copy;
}
// Invoke only from existing wallet-verified /owner/conversation route. Owner is server-derived.
export async function auditOwnerConversation(db,owner,body={}){
 if(typeof owner!=='string'||!owner)throw Error('verified_owner_required');
 const limit=Math.max(1,Math.min(250,Number.isInteger(body.limit)?body.limit:100));
 const cursor=body.beforeAt!==undefined||body.beforeId!==undefined;
 if(cursor&&!(Number.isSafeInteger(body.beforeAt)&&body.beforeAt>0&&validId(body.beforeId)))throw Error('work_audit_cursor_invalid');
 const sql=cursor
  ?"SELECT id,role,text,at FROM bubbles_messages WHERE owner=? AND role='user' AND (at<? OR (at=? AND id<?)) ORDER BY at DESC,id DESC LIMIT ?"
  :"SELECT id,role,text,at FROM bubbles_messages WHERE owner=? AND role='user' ORDER BY at DESC,id DESC LIMIT ?";
 const args=cursor?[owner,body.beforeAt,body.beforeAt,body.beforeId,limit+1]:[owner,limit+1];
 const response=await db.prepare(sql).bind(...args).all();
 const rows=Array.isArray(response?.results)?response.results:[],page=rows.slice(0,limit),last=page.at(-1);
 return {ok:true,mode:'work-audit',readOnly:true,scanned:page.length,candidates:auditWorkHistory(page),
  nextCursor:rows.length>limit&&last?{beforeAt:last.at,beforeId:last.id}:null,
  candidateMeaning:'unverified request; inspect GitHub source and obtain CI/live evidence before marking complete',
  executionStarted:false,ownerApprovalInferred:false};
}