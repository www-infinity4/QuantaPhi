/**
 * Code Accelerator: pure, evidence-only prioritization for existing Test Ground AI.
 * This does not fetch click data, see private users, train language models, execute
 * code, approve a PR, deploy a Worker, read AI-account conversations or mint coins.
 *
 * The caller MUST verify CI evidence and authorized aggregate D1 receipts before
 * setting sourceVerified. This module checks only their bounded shape.
 */
const ID=/^[a-z0-9][a-z0-9_.-]{2,79}$/;
const SRC=/^https:\/\/github\.com\/www-infinity4\/QuantaPhi\/actions\/runs\/([0-9]{6,24})$/;
const D1=/^cloudflare-d1-aggregate:[a-zA-Z0-9_-]{4,100}$/;
const PATH=/^(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+\.(?:mjs|js|cjs|jsx|ts|tsx|css|html|json|py)$/;
const PRIVATE=/(?:^|\/)(?:private|secrets?|credentials?|\.env|node_modules)(?:\/|\.|$)/i;
const integer=v=>Number.isSafeInteger(v)&&v>=0&&v<=1_000_000;
const keys=(value,allowed)=>Object.keys(value).every(key=>allowed.includes(key));
const goodCI=s=>s.sourceVerified===true&&s.type==='ci_failure'&&
 keys(s,['type','signature','path','count','receipt','sourceVerified'])&&
 ID.test(s.signature||'')&&typeof s.path==='string'&&PATH.test(s.path)&&!PRIVATE.test(s.path)&&
 integer(s.count)&&s.count>0&&SRC.test(s.receipt||'');
const goodCard=s=>s.sourceVerified===true&&s.type==='card_aggregate'&&
 keys(s,['type','id','views','clicks','receipt','sourceVerified'])&&
 ID.test(s.id||'')&&integer(s.views)&&integer(s.clicks)&&s.clicks<=s.views&&D1.test(s.receipt||'');
const goodOutcome=s=>s&&typeof s==='object'&&!Array.isArray(s)&&
 keys(s,['signature','outcome','run','receipt','sourceVerified'])&&
 s.sourceVerified===true&&ID.test(s.signature||'')&&
 ['passed','failed'].includes(s.outcome)&&/^[0-9]{6,24}$/.test(String(s.run||''))&&
 SRC.exec(String(s.receipt||''))?.[1]===String(s.run);
export function learnRepairOutcome(prior,outcome){
 const old=Array.isArray(prior)?prior.filter(goodOutcome).slice(-200):[];
 if(!goodOutcome(outcome))return old;
 // One CI run is one observation per signature; retries cannot teach twice.
 if(old.some(x=>x.signature===outcome.signature&&x.run===outcome.run))return old;
 return [...old,outcome].slice(-200).map(x=>({
  signature:x.signature,outcome:x.outcome,run:String(x.run),receipt:x.receipt,sourceVerified:true
 }));
}
export function rankRepairCandidates({signals=[],outcomes=[]}={}){
 const rows=new Map();
 for(const s of (Array.isArray(signals)?signals:[]).slice(0,300)){
  if(goodCI(s)){
   const key='ci:'+s.signature,prior=rows.get(key);
   const next=prior||{key,type:'ci_failure',target:s.path,count:0,receipts:new Set()};
   next.count=Math.min(1_000_000,next.count+s.count);next.receipts.add(s.receipt);rows.set(key,next);
  }else if(goodCard(s)){
   const key='card:'+s.id,prior=rows.get(key);
   const next=prior||{key,type:'card_engagement',target:s.id,views:0,clicks:0,receipts:new Set()};
   next.views=Math.min(1_000_000,next.views+s.views);
   next.clicks=Math.min(1_000_000,next.clicks+s.clicks);
   next.receipts.add(s.receipt);rows.set(key,next);
  }
 }
 const safeOutcomes=(Array.isArray(outcomes)?outcomes:[]).filter(goodOutcome).slice(-200);
 const result=[];
 for(const row of rows.values()){
  if(row.type==='card_engagement'&&(row.views<100||row.clicks/row.views>=.01))continue;
  const signature=row.type==='ci_failure'?row.key.slice(3):row.key;
  const seen=new Set();let passed=0,failed=0;
  for(const outcome of safeOutcomes){
   if(outcome.signature!==signature||seen.has(outcome.run))continue;
   seen.add(outcome.run);if(outcome.outcome==='passed')passed++;else failed++;
  }
  const score=row.type==='ci_failure'?
   100+Math.min(40,row.count)*6+Math.min(10,failed)*4:
   10+Math.min(30,Math.floor(row.views/100))+(row.clicks===0?4:0);
  result.push({
   key:row.key,type:row.type,target:row.target,score,count:row.count??0,
   ...(row.type==='card_engagement'?{views:row.views,clicks:row.clicks}:{}),
   history:{passed,failed,observations:passed+failed},
   sourceRefs:[...row.receipts].sort().slice(0,12),
   suggestedPlaybook:passed>0?'inspect_previous_successful_test':null,
   nextStep:row.type==='ci_failure'?'inspect_source_and_reproduce':'review_card_visibility_and_relevance',
   verification:'source_references_only',patch:null,completed:false,productionVerified:false,walletRewards:0
  });
 }
 return result.sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key)).slice(0,50);
}
