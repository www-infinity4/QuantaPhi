// One read-only directory for the capabilities already implemented by Bubbles.
// A directory entry is NOT a tool invocation, owner grant, installed provider,
// current balance, or a verified live provider response.
const STATUS='registered_not_live_verified';
const CAPABILITIES=Object.freeze([
 {id:'cloudflare-chat',name:'Bubbles native conversation',source:'workers/bubbles-tools/worker.mjs',
  scope:'public-read',description:'Cloudflare Workers AI GPT-OSS 120B conversational answers with a GPT-OSS 20B fallback; no external GPT API key is implied.',
  terms:['bubbles','chat','conversation','gpt','model','respond','answer','cloudflare']},
 {id:'gemma-image',name:'Gemma image reader',source:'workers/bubbles-tools/worker.mjs',
  scope:'provider-gated',description:'Cloudflare Workers AI Gemma 4 image analysis through the existing image adapter; not a replacement for Bubbles chat.',
  terms:['gemma','image','photo','picture','screenshot','vision']},
 {id:'speech-transcription',name:'Bubbles speech transcription',source:'workers/bubbles-tools/worker.mjs',
  scope:'provider-gated',description:'The existing audio transcription adapter; microphone permissions and Android capture are separate.',
  terms:['speech','voice','microphone','transcribe','audio','dictate','listening']},
 {id:'web-search',name:'Web search and public source reading',source:'workers/bubbles-tools/search.mjs',
  scope:'public-read',description:'SearXNG source excerpts and public website reads, not privileged logged-in browser access.',
  terms:['web','webpage','internet','site','source','search','browse','research','lookup','read','html']},
 {id:'github-public-read',name:'Public GitHub source reads',source:'workers/bubbles-tools/worker.mjs',
  scope:'public-read',description:'Read a named public repository, file or commit; does not authorize GitHub edits.',
  terms:['github','repo','repository','source','file','read','inspect','code']},
 {id:'github-owner-work',name:'Owner-authenticated repository builder',source:'workers/infinity-brain-clock/direct-github.mjs',
  scope:'owner-gated',description:'Use existing signed Brain/owner GitHub adapter and repository runner for edits, tests and PRs. This public directory cannot execute it.',
  terms:['github','repo','repository','code','coding','repair','fix','build','implement','edit','test','merge','deploy','runner']},
 {id:'quick-cards',name:'Existing Quick Cards and in-page tools',source:'bubbles-ai.js',
  scope:'client-session',description:'Bubbles client inventory and selected card/player actions. Real mounted cards and user gestures determine what can open or play.',
  terms:['quick','card','cards','carousel','player','radio','media','music','games']},
 {id:'browser-owner',name:'Cloudflare owner browser adapter',source:'workers/bubbles-cloud-browser/browser-check.mjs',
  scope:'owner-gated',description:'Separately signed Cloudflare browser checks with fixed permitted destinations; not generic browser control in public chat.',
  terms:['browser','click','navigate','cloudflare','screen','website','browse','automation']},
 {id:'owner-memory',name:'Owner personal-context and conversation memory',source:'bubbles-ai.js',
  scope:'owner-gated',description:'Existing BRAIN owner conversation and memory lookups, subject to per-account identity and retention settings.',
  terms:['memory','remember','personal','context','conversations','history','recall','preferences']},
 {id:'weather',name:'Current weather',source:'workers/bubbles-tools/search.mjs',
  scope:'public-read',description:'Open-Meteo observations and forecasts with location grounding.',
  terms:['weather','forecast','temperature','rain','snow','outdoors']},
 {id:'news',name:'Dated current headlines',source:'workers/bubbles-tools/worker.mjs',
  scope:'public-read',description:'Fresh RSS and verified News Phi fallback, not recalled old headlines.',
  terms:['news','headlines','current','latest','breaking','articles']},
 {id:'claude-steward',name:'Claude source adviser',source:'workers/infinity-rogers/claude-steward.mjs',
  scope:'provider-gated',description:'Separately owner-verified Anthropic API advice and verified patch proposals; credentials/billing and reviewed execution are additional gates.',
  terms:['claude','anthropic','review','propose','patch','source','ai','train']},
 {id:'resonance-calculator',name:'Resonance Phi calculator',source:'workers/bubbles-tools/worker.mjs',
  scope:'public-read',description:'Deterministic LC frequency calculation, not hardware verification.',
  terms:['resonance','calculator','inductance','capacitance','lc','frequency']},
 {id:'organic-benchmark',name:'Organic Computation memory benchmark',source:'workers/bubbles-tools/organic-benchmark.mjs',
  scope:'public-read',description:'Bounded deterministic software-only recall simulation; not live hardware or biology.',
  terms:['organic','benchmark','memory','recall','simulation']}
].map(item=>Object.freeze({...item,status:STATUS,terms:Object.freeze(item.terms)})));
const words=s=>String(s||'').toLowerCase().match(/[a-z0-9_-]+/g)||[];
export function capabilityCatalog(){
 return CAPABILITIES.map(({terms,...entry})=>({...entry}));
}
export function findCapabilities(question,max=5){
 const terms=new Set(words(question).slice(0,250)),input=String(question||'').toLowerCase();
 const work=/\b(?:fix|repair|edit|build|implement|write|run tests?|merge|deploy)\b/i.test(input);
 const read=/\b(?:read|inspect|look up|summari[sz]e|check|find)\b/i.test(input);
 const scores=CAPABILITIES.map((entry,index)=>{
  const overlap=entry.terms.reduce((n,term)=>n+(terms.has(term)?2:0),0);
  const boost=entry.id==='github-owner-work'&&work&&/\b(?:github|repo|repository|code)\b/i.test(input)?10:
   entry.id==='github-public-read'&&read&&/\b(?:github|repo|repository)\b/i.test(input)?5:
   entry.id==='quick-cards'&&/\b(?:cards?|carousel)\b/i.test(input)?5:0;
  return {entry,index,score:overlap+boost};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.index-b.index);
 const limit=Number.isSafeInteger(max)?Math.min(8,Math.max(1,max)):5;
 return scores.slice(0,limit).map(({entry})=>{
  const {terms,...publicEntry}=entry;return {...publicEntry};
 });
}
export function isCapabilityQuestion(question){
 const q=String(question||'').trim().replace(/^(?:(?:hey|please|bubbles)[,:\s]+)*/i,'');
 return /^(?:(?:where|how)\s+(?:can|do|would)\s+(?:i|you|bubbles)\s+(?:find|locate|discover)\s+(?:your\s+|my\s+|the\s+|existing\s+)*tools?\b|what\s+(?:are\s+)?(?:your\s+|bubbles'?\s*)?(?:available\s+)?(?:tools?|capabilities)\b|(?:show|list|find)\s+(?:me\s+)?(?:your\s+|the\s+)?(?:available\s+|existing\s+)?(?:tools?|capabilities)\b)/i.test(q);
}
export function explainCapabilities(question){
 const hits=findCapabilities(question);
 const selected=hits.length?hits:capabilityCatalog();
 return 'Registered Bubbles capabilities (directory only; not a live execution receipt):\n'+
  selected.map(x=>'- '+x.name+' ['+x.id+'] · '+x.scope+' · '+x.source+' · '+x.description).join('\n')+
  '\nThese entries identify source and authorization boundaries; provider access and successful action require separate current receipts.';
}
export function capabilityGuidance(question){
 const hits=findCapabilities(question,4);
 return hits.length?'Bubbles existing tool directory, for accurate routing only. Each is registered, not live verified. An AI suggestion is not a tool call or approval.\n'+
  hits.map(x=>x.id+' ['+x.scope+'] source='+x.source+'; '+x.description).join('\n'):'';
}
