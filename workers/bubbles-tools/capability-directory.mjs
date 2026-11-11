import {isCapabilityDiscoveryQuestion} from '../../bubbles-capability-intent.mjs';
/**
 * Source-grounded Bubbles capability locator.
 *
 * These names map to existing Worker, website or authenticated Brain adapters.
 * A listed capability is not a completed tool invocation, a provider entitlement,
 * permission, installation or proof of a healthy upstream service.
 * Never return credentials, wallet records, owner sessions or tool call arguments.
 */
const ITEMS=Object.freeze([
 {id:'oracle.chat',title:'Bubbles conversation · Cloudflare GPT-OSS',scope:'public-chat',model:true,
  description:'Normal Bubbles chat through its existing Cloudflare Workers AI binding.'},
 {id:'web.search',title:'Web source search',scope:'public-read',
  description:'Search for source excerpts using the existing configured search adapter.'},
 {id:'web.read_page',title:'Public page reader',scope:'public-read',
  description:'Read a permitted public HTML page without a logged-in browser or site writes.'},
 {id:'news.headlines',title:'Dated news headlines',scope:'public-read',
  description:'Read current dated headlines; unverified or stale results are not facts.'},
 {id:'weather.current',title:'Town weather',scope:'public-read',
  description:'Ask for weather with a named town; the adapter supplies the observed result.'},
 {id:'github.read_repository',title:'Public GitHub repository reader',scope:'public-read',
  description:'Inspect publicly accessible repositories, not private GitHub permissions.'},
 {id:'github.read_file',title:'Public GitHub source-file reader',scope:'public-read',
  description:'Read a permitted repository source file with its actual source URL.'},
 {id:'github.read_commit',title:'Public GitHub commit reader',scope:'public-read',
  description:'Inspect the commit details available to this read-only adapter.'},
 {id:'resonance.calculate',title:'Resonance calculator',scope:'public-read',
  description:'Calculate ideal LC frequency from explicit inductance/capacitance values and units.'},
 {id:'organic.memory_benchmark',title:'Organic Computation digital recall test',scope:'public-read',
  description:'Run the registered software-only memory simulation; no hardware claims.'},
 {id:'public_x.read',title:'Public X source reader',scope:'public-read',
  description:'Read the existing bounded public X feed; not authenticated X account access.'},
 {id:'bubbles.image_read',title:'Gemma image understanding',scope:'public-read',model:true,
  description:'Analyze a user-provided image through the existing Cloudflare Gemma reader.'},
 {id:'bubbles.transcribe',title:'Bubbles voice transcription',scope:'public-read',model:true,
  description:'Transcribe explicitly supplied audio with the existing Cloudflare AI adapter.'},
 {id:'bubbles.cloud_browser',title:'Owner-scoped Cloudflare Chrome inspection',scope:'owner-only',brain:true,
  description:'Existing BROWSER-bound Cloudflare Chrome can inspect public pages with fresh sessions. Actual media playback requires a measured player state, not a screenshot alone.'},
 {id:'wallet.account_receipts',title:'Account-scoped Cloudflare D1 wallet receipts',scope:'client-only',
  description:'QuantaPhi first-party wallet client reads the signed account ledger; public chat cannot read private balances and no blockchain explorer is assumed.'},
 {id:'quick_card.open',title:'Existing Quick Card selection',scope:'client-only',
  description:'Open or play registered cards in the website/Android interface; not a server action.'},
 {id:'github.create_repository',title:'Signed GitHub repository creation',scope:'owner-only',brain:true,
  description:'Requires independently authenticated owner Brain authorization and a verified work receipt.'},
 {id:'robot_brain.owner_work',title:'Robot Brain source engineering',scope:'owner-only',brain:true,
  description:'Signed owner jobs, test/review and GitHub writes live in the existing Brain executor, not in this public chat.'},
 {id:'bubbles.memory.owner',title:'Signed owner conversation memory',scope:'owner-only',brain:true,
  description:'Private owner context requires verified session and account scoping, never a public search.'}
]);

export {isCapabilityDiscoveryQuestion};

export function capabilityDirectory(env={}){
 return ITEMS.map(item=>{
  const status=item.brain?(env.BRAIN?'owner_authorization_required':'owner_adapter_not_configured')
   :item.model?(env.AI?'ai_binding_present_unverified':'ai_binding_missing')
   :item.scope==='client-only'?'client_runtime_unverified':'registered_execution_unverified';
  return {id:item.id,title:item.title,scope:item.scope,description:item.description,
   status,executionVerified:false};
 });
}

/**
 * Return the most useful existing adapters for a tool-finding question.
 * Deterministic routing avoids paid model calls and never grants permission.
 * Each suggested entry is the same source-grounded catalog record returned to
 * the owner, not a made-up tool name or an execution claim.
 */
export function recommendCapabilities(question,env={}){
 const q=String(question||'').toLowerCase().slice(0,600);
 // Remove excluded operations from recommendations, never from the user's request.
 // A later independent clause ("and which tool can merge?") remains actionable.
 const actionable=q.replace(/\b(?:without|do not|don't|never|no need to|not to)\b[\s\S]*?(?=(?:(?:,\s*|\s+)(?:(?:and|but)\s+)?(?:which|what|how|can|could|would)\b)|[.!?;]|$)/gi,' ');
 // A literal owner/repo reference is a GitHub source, but arbitrary URL paths are not.
 const namedRepository=/\b[a-z0-9][a-z0-9_.-]{0,38}\/[a-z0-9_][a-z0-9_.-]{0,99}\b/i.test(q.replace(/https?:\/\/\S+/gi,''));
 const ids=[];
 const add=(...values)=>{for(const id of values)if(!ids.includes(id))ids.push(id);};
 // The requested *operation* wins over generic discovery verbs such as "show".
 const commitWrite=/\bcommit(?:ting)?\s+(?:the|these|those)\s+(?:json|html|index|files?|patch|changes?|code)\b/i.test(actionable)||
  /\bcommit(?:ting)?\s+(?:to\b|(?:a|an|the|my|this|that|some|new)\s+(?:file|files|change|changes|code|patch|source)\b|(?:file|files|change|changes|code|patch|source|work)\b|with\s+git\b)|\bmake\s+(?:a\s+)?commit\b/i.test(actionable);
 const commitRead=!commitWrite&&/\bcommits?\b/.test(actionable)&&
  /\b(?:read|view|inspect|show|list|fetch|explain|find)\b/.test(actionable);
 const privateMemory=/\b(?:saved|private|personal|owner|conversation)\b.{0,55}\b(?:memory|memories|recall|context)\b|\bmy\b.{0,55}\b(?:saved|private|owner|conversation)\b.{0,55}\b(?:memory|recall|context)\b/i.test(q);
 const publicMemoryTest=!privateMemory&&
  (/\borganic\s+computation\b/.test(q)||/\b(?:software(?:-only)?|digital)\b.{0,55}\b(?:memory|recall|benchmark)\b/.test(q))&&
  /\b(?:benchmark|simulat(?:e|ion)|trials?|digital|software(?:-only)?)\b/.test(q);
 if(commitWrite)add('robot_brain.owner_work');
 else if(commitRead)add('github.read_commit');
 if(privateMemory)add('bubbles.memory.owner');
 else if(publicMemoryTest)add('organic.memory_benchmark');
 if(/\b(?:deploy|deployment|code changes?|modif(?:y|ication)|edit|write|repair|fix|build|merge|push)\b/.test(actionable))
  add('robot_brain.owner_work');
 if(/\b(?:create|make|start)\b/.test(actionable)&&/\b(?:git(?:hub)?|repositor(?:y|ies)|repos?)\b/.test(actionable))
  add('github.create_repository');
 if((namedRepository||/\b(?:git(?:hub)?|repositor(?:y|ies)|repos?|source)\b/.test(actionable))&&/\b(?:read|view|inspect|open|source|file|browse|search|access|find)\b/.test(q))
  add('github.read_repository','github.read_file');
 if(/\b(?:images?|photos?|pictures?|screenshots?|vision|visual|ocr)\b/.test(q))
  add('bubbles.image_read');
 if(/\b(?:voice|speech|audio|microphone|transcrib|dictat|recording)\w*\b/.test(q))
  add('bubbles.transcribe');
 if(/\b(?:web|online|internet|search|sources?|research|browse|browser)\b/.test(q))
  add('web.search','web.read_page');
 if(/\b(?:weather|forecast|temperature|rain)\b/.test(q))add('weather.current');
 if(/\b(?:news|headlines?)\b/.test(q))add('news.headlines');
 if(/\b(?:quick cards?|cards?|carousel|media player)\b/.test(q))add('quick_card.open');
 if(/\b(?:playable|playback|video|tv|starquest|omni tv|chiller|shoplc)\b/.test(q))add('bubbles.cloud_browser','quick_card.open');
 if(/\b(?:starcoin|quants?|wallet|ledger)\b/.test(q)&&/\b(?:verify|read|check|receipts?|balances?)\b/.test(q))add('wallet.account_receipts');
 if(!privateMemory&&!publicMemoryTest&&/\b(?:memory|memories|context|remember|recall)\b/.test(q))
  add('bubbles.memory.owner');
 if(/\b(?:resonance|calculator|frequency|inductance)\b/.test(q))
  add('resonance.calculate');
 if(/\b(?:social|public x|twitter|tweets?)\b/.test(q))
  add('public_x.read');
 if(!ids.length)add('oracle.chat','web.search','github.read_repository');
 const lookup=new Map(capabilityDirectory(env).map(item=>[item.id,item]));
 return ids.slice(0,6).map(id=>lookup.get(id)).filter(Boolean);
}

export function capabilityDirectoryReply(env={},question=''){
 const matched=recommendCapabilities(question,env);
 const items=capabilityDirectory(env);
 const publicItems=items.filter(x=>x.scope==='public-read').map(x=>x.id);
 const ownerItems=items.filter(x=>x.scope==='owner-only').map(x=>x.id);
 return 'Suggested existing tools for this request: '+matched.map(x=>x.id+' ('+x.scope+')').join(', ')+'. '+
  'Bubbles can locate these registered read tools: '+publicItems.join(', ')+
  '. Ordinary chat uses oracle.chat; Quick Cards operate through their existing page/Android interface. '+
  'Separate, signed owner adapters: '+ownerItems.join(', ')+
  '. Owner sign-in and per-action authorization are required for GitHub writes or Robot Brain work. '+
  'Wallet balances and receipts are held in account-scoped Cloudflare D1 / first-party ledger adapters, not assumed to be a public blockchain. '+
  'Cloudflare Browser is an owner-approved Chrome inspection route; actual TV playback requires independent player-state and stream evidence. '+
  'This is a directory, not a completed tool invocation. A real tool receipt must confirm each action.';
}

/** Bounded model guidance. No extra model call is needed to retrieve it. */
export function capabilityContextFor(question,env={}){
 const q=String(question||'');
 if(!/\b(?:tool|skill|capabilit|github|repository|robot brain|browser|search|cloudflare|code|repair|integrat)\w*\b/i.test(q))return '';
 return 'Bubbles existing capability locator: '+capabilityDirectory(env)
  .map(x=>x.id+' ['+x.scope+', '+x.status+']').join('; ')+
  '. Public read functions cannot authorize owner writes. Registered means available in source, not executed; use authenticated adapters and return only their actual receipts. Preserve original Bubbles voice, memory, Quick Cards and signed Brain tools.';
}
