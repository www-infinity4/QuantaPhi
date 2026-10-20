/* Bubbles read-only MCP bridge. Server credentials never reach the WebView.
 * Supported HTTP transport: MCP 2025-06-18, stateless JSON-RPC over POST.
 * Owner-only Robot Brain and arbitrary remote MCP servers are NOT exposed. */
export const MCP_VERSION='2025-06-18';
const tools=[
 {name:'web_search',title:'Bubbles Web Search',description:'Read search-result excerpts, not full pages. No browser, writes or logins.',inputSchema:{type:'object',properties:{query:{type:'string',description:'Search words (max 1500 characters)'}},required:['query'],additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:true}},
 {name:'weather_current',title:'Current Weather',description:'Read town-level weather forecast from the existing Open-Meteo adapter.',inputSchema:{type:'object',properties:{location:{type:'string',description:'Town or city (max 150 characters)'}},required:['location'],additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:true}},
 {name:'resonance_calculate',title:'LC Resonance Calculator',description:'Calculate ideal LC resonant frequency from explicit inductance and capacitance units.',inputSchema:{type:'object',properties:{l:{type:'number'},lUnit:{type:'string',enum:['H','mH','uH'],description:'H, mH, or uH only'},c:{type:'number'},cUnit:{type:'string',enum:['F','uF','nF','pF'],description:'F, uF, nF, or pF only'}},required:['l','lUnit','c','cUnit'],additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false}},
 {name:'news_headlines',title:'Dated News Headlines',description:'Read dated news headlines or an explicitly labeled fallback. Not remembered headlines.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:true}}
];
export const mcpTools=Object.freeze(tools);
const clean=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const allowedOrigins=new Set(['https://quantaphi.org','https://www.quantaphi.org','https://www-infinity4.github.io']);
function authorized(request,env){
 const expected=clean(env.BUBBLES_MCP_TOKEN,2048),auth=request.headers.get('Authorization')||'';
 if(!expected||expected.length<32||!auth.startsWith('Bearer '))return false;
 const given=auth.slice(7);let bad=expected.length===given.length?0:1;
 for(let i=0;i<Math.max(expected.length,given.length);i++)bad|=(expected.charCodeAt(i)||0)^(given.charCodeAt(i)||0);
 return bad===0;
}
function rpc(id,key,value,status=200){
 return new Response(JSON.stringify({jsonrpc:'2.0',id,[key]:value}),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'}});
}
function rpcError(id,code,message,status=400){return rpc(id,'error',{code,message},status)}
// LLMs sometimes return spoken unit words even when their function schema asks for symbols.
// Normalize exact known synonyms, never guess the scale or silently replace an unknown unit.
function canonicalUnit(raw,kind){
 const text=String(raw||'').trim().replace(/\s+/g,'').replace(/[µμ]/g,'u').toLowerCase();
 const units=kind==='inductance'?{
  h:'H',henry:'H',henries:'H',
  mh:'mH',millihenry:'mH',millihenries:'mH',
  uh:'uH',microhenry:'uH',microhenries:'uH'
 }:{
  f:'F',farad:'F',farads:'F',
  uf:'uF',microfarad:'uF',microfarads:'uF',
  nf:'nF',nanofarad:'nF',nanofarads:'nF',
  pf:'pF',picofarad:'pF',picofarads:'pF'
 };
 if(!Object.hasOwn(units,text))throw Error('invalid_arguments');
 return units[text];
}
export function validateCall(name,args){
 if(!tools.some(t=>t.name===name))throw Error('unknown_tool');
 if(!args||typeof args!=='object'||Array.isArray(args))throw Error('invalid_arguments');
 if(Object.keys(args).some(k=>!tools.find(t=>t.name===name).inputSchema.properties.hasOwnProperty(k)))throw Error('invalid_arguments');
 if(name==='web_search')return {name,query:clean(args.query,1500)};
 if(name==='weather_current')return {name,location:clean(args.location,150)};
 if(name==='news_headlines')return {name};
 if(!Number.isFinite(args.l)||!Number.isFinite(args.c)||args.l<=0||args.c<=0||args.l>1e15||args.c>1e15||typeof args.lUnit!=='string'||typeof args.cUnit!=='string'||args.lUnit.length>24||args.cUnit.length>24)throw Error('invalid_arguments');
 return {name,l:args.l,lUnit:canonicalUnit(args.lUnit,'inductance'),c:args.c,cUnit:canonicalUnit(args.cUnit,'capacitance')};
}
export async function handleMcp(request,env,invoke){
 if(request.method!=='POST')return new Response('Use POST',{status:405,headers:{Allow:'POST','Cache-Control':'no-store'}});
 const origin=request.headers.get('Origin');
 if(origin&&!allowedOrigins.has(origin))return rpcError(null,-32000,'Forbidden origin',403);
 if(!env.BUBBLES_MCP_TOKEN)return rpcError(null,-32001,'MCP service not configured',503);
 if(!authorized(request,env))return rpcError(null,-32001,'Unauthorized',401);
 const ctype=request.headers.get('Content-Type')||'';
 if(!ctype.toLowerCase().startsWith('application/json'))return rpcError(null,-32600,'Expected JSON request',415);
 const accept=request.headers.get('Accept')||'';
 if(!accept.includes('application/json')||!accept.includes('text/event-stream'))return rpcError(null,-32600,'Accept must support JSON and event streams',406);
 if(Number(request.headers.get('Content-Length')||0)>12000)return rpcError(null,-32600,'Request too large',413);
 let body;
 try{const raw=await request.text();if(raw.length>12000)throw Error('too_large');body=JSON.parse(raw)}
 catch{return rpcError(null,-32700,'Parse error')}
 if(!body||Array.isArray(body)||body.jsonrpc!=='2.0'||typeof body.method!=='string')return rpcError(null,-32600,'Invalid Request');
 const id=(typeof body.id==='string'&&body.id.length<=128||Number.isSafeInteger(body.id))?body.id:null;
 if(body.method==='notifications/initialized'&&id===null)return new Response(null,{status:202,headers:{'Cache-Control':'no-store'}});
 if(id===null)return rpcError(null,-32600,'Request id required');
 const params=body.params&&typeof body.params==='object'&&!Array.isArray(body.params)?body.params:{};
 if(body.method==='initialize'){
  const version=params.protocolVersion;
  return rpc(id,'result',{protocolVersion:MCP_VERSION,capabilities:{tools:{listChanged:false}},serverInfo:{name:'bubbles-read-tools',version:'1.0.0'},instructions:'Read-only tools only. No GitHub, device control, account connection, Brain owner approval, edit or deployment actions.'});
 }
 const version=request.headers.get('MCP-Protocol-Version');
 if(version!==MCP_VERSION)return rpcError(id,-32600,'MCP protocol version mismatch');
 if(body.method==='ping')return rpc(id,'result',{});
 if(body.method==='tools/list')return rpc(id,'result',{tools});
 if(body.method!=='tools/call')return rpcError(id,-32601,'Method not found',404);
 const name=params.name;let args;
 try{args=validateCall(name,params.arguments||{})}
 catch{return rpcError(id,-32602,'Invalid tool name or arguments')}
 if((args.name==='web_search'&&!args.query)||(args.name==='weather_current'&&!args.location))return rpcError(id,-32602,'Missing query or location');
 try{
  const data=await invoke(args);
  const receipt=data&&typeof data.receipt==='object'?data.receipt:{status:'failed'};
  const message=clean(data?.output,6500)||'Tool returned no readable output.';
  return rpc(id,'result',{content:[{type:'text',text:message}],structuredContent:{receipt,output:message},isError:data?.ok!==true||receipt.status==='failed'||receipt.status==='blocked'});
 }catch{
  return rpc(id,'result',{content:[{type:'text',text:'Tool execution failed; no write or deployment occurred.'}],isError:true});
 }
}
// Optional single-step model selection. Treat only structured function_call envelopes
// as a call; raw LLM prose/JSON cannot initiate tool execution.
export async function selectMcpTool(env,question,invoke,context={}){
 if(!env.AI||!clean(question,2500))return null;
 // Destructive, privileged, or ambiguous engineering instructions must not
 // be reinterpreted as a read-only research action.
 if(/\b(?:delete|purchase|pay|transfer|approve|authorize|deploy|merge|commit|install|edit|modify|repair|fix|implement|build|create)\b/i.test(question))return null;
 const functions=tools.map(t=>({type:'function',function:{name:t.name,description:t.description,parameters:t.inputSchema}}));
 let result;
 try{result=await env.AI.run('@cf/openai/gpt-oss-120b',{
  messages:[{role:'system',content:'You are a read-only MCP tool selector for Bubbles. Interpret the meaning of natural conversational requests, not memorized commands. Select exactly one appropriate read-only tool only when the user actually needs live search, current weather, dated headlines, or an ideal LC calculation; otherwise use no tool. Do not invent locations, units, factual observations, URLs, permissions or parameters. When the weather location is unspecified, use an empty location rather than guessing. Ordinary discussion, site builds, approvals and repository work are NOT eligible tools. Never attempt account, code, file, shell, GitHub or Robot Brain writes.'},{role:'user',content:clean(question,2500)}],
  tools:functions,tool_choice:'auto',reasoning_effort:'medium',max_tokens:350
 })}catch{return null}
 const calls=result?.choices?.[0]?.message?.tool_calls||result?.tool_calls||
  result?.output?.filter?.(item=>item.type==='function_call')||[];
 if(!Array.isArray(calls)||calls.length!==1)return null;
 const call=calls[0],name=call?.function?.name||call?.name,raw=call?.function?.arguments??call?.arguments;
 let parsed;
 try{parsed=typeof raw==='string'?JSON.parse(raw):raw}catch{return null}
 let args;
 try{args=validateCall(name,parsed)}catch{return null}
 if(name==='web_search'&&!args.query)return null;
 if(name==='weather_current'){
  // A model-selected city is not evidence of the user's location.
  const place=args.location.trim().toLowerCase();
  const contextPlace=clean(typeof context.location==='string'?context.location:context.location?.city,150).toLowerCase();
  const city=place.split(',')[0].trim();
  const words=question.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const cityWords=city.split(/[^a-z]+/).filter(Boolean);
  const mentioned=cityWords.length>0&&cityWords.every(word=>word.length>=3&&words.includes(word));
  const contextual=contextPlace===place||(city.length>=3&&contextPlace.startsWith(city+','));
  if(!place||!city||( !mentioned&&!contextual)){
   return {ok:true,output:'Which town and state should I use for your weather?',
    receipt:{tool:'weather.current',status:'needs_input',provider:'Open-Meteo',repositoryActionsVerified:false}};
  }
 }
 try{return await invoke(args)}catch{return null}')+'\\\\b','i').test(query)))){
   return {ok:true,output:'Which town and state should I use for your weather?',receipt:{
    tool:'weather.current',status:'needs_input',provider:'Open-Meteo',repositoryActionsVerified:false}};
  }
 }
 try{return await invoke(args)}catch{return null}
}
