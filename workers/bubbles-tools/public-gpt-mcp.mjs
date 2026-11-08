/* Public, zero-credential MCP plugin for verified QuantaPhi builder discovery.
 * No database reads, model calls, browser actions, account data, wallet operations
 * or GitHub/deploy permissions. The original /mcp bearer-gated tool bridge stays separate. */
import {MCP_VERSION} from './mcp.mjs';
import {cleanPublicCardDraft,encodePublicCardDraft} from '../../quick-card-gpt-draft.mjs';

const input={type:'object',properties:{},additionalProperties:false};
const draftProperties={
 title:{type:'string',minLength:3,maxLength:85},
 website:{type:'string',description:'Original public HTTPS website URL'},
 description:{type:'string',minLength:12,maxLength:600},
 interactionRequest:{type:'string',minLength:10,maxLength:500},
 kind:{type:'string',enum:['visit','search','video']}
};
export const PUBLIC_MCP_TOOLS=Object.freeze([
 Object.freeze({
  name:'quanta_public_builders',title:'QuantaPhi public builders',
  description:'Find verified first-party Bubbles and Quick Card website entry points. Read-only catalog; neither GPT sign-in nor account tools are connected.',
  inputSchema:input,securitySchemes:[{type:'noauth'}],
  annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}
 }),
 Object.freeze({
  name:'quanta_prepare_card_draft',title:'Prepare a QuantaPhi Quick Card draft',
  description:'Validate a user-provided public website and create a private-fragment prefilled original Quick Card form. This DOES NOT publish, run scripts, edit repositories, create accounts or approve a creator card.',
  inputSchema:{type:'object',properties:draftProperties,required:['title','website','description','interactionRequest'],additionalProperties:false},
  securitySchemes:[{type:'noauth'}],annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}
 })
]);
const builders=Object.freeze([
 Object.freeze({name:'Quick Card Builder',url:'https://quantaphi.org/quick-card-builder.html',scope:'Explicit original-site draft and moderated shareable publish; currently no GPT session inside the card'}),
 Object.freeze({name:'Bubbles Chat',url:'https://quantaphi.org/bubbles.html',scope:'First-party Cloudflare GPT-OSS chat with separately verified tools; not a ChatGPT subscription'}),
 Object.freeze({name:'Quick Card Source Study',url:'https://quantaphi.org/quick-card-wiring.html',scope:'Read-only original-site source capability and rights study'})
]);
const reply=(id,key,value,status=200)=>new Response(JSON.stringify({jsonrpc:'2.0',id,[key]:value}),{
 status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
});
const error=(id,code,message,status=400)=>reply(id,'error',{code,message},status);
const success=(id,data,text)=>reply(id,'result',{
 content:[{type:'text',text}],
 structuredContent:data,isError:false
});
export async function handlePublicQuickCardMcp(request){
 if(request.method!=='POST')return new Response('Use POST',{status:405,headers:{Allow:'POST','Cache-Control':'no-store'}});
 if(!/^application\/json\b/i.test(request.headers.get('Content-Type')||''))return error(null,-32600,'JSON required',415);
 const accept=request.headers.get('Accept')||'';
 if(!accept.includes('application/json')||!accept.includes('text/event-stream'))return error(null,-32600,'MCP JSON and stream accept required',406);
 if(Number(request.headers.get('Content-Length')||0)>12000)return error(null,-32600,'Request too large',413);
 let body;
 try{const raw=await request.text();if(raw.length>12000)throw Error('too_large');body=JSON.parse(raw)}catch{return error(null,-32700,'Invalid JSON')}
 if(!body||typeof body!=='object'||Array.isArray(body)||body.jsonrpc!=='2.0'||typeof body.method!=='string')return error(null,-32600,'Invalid Request');
 const id=typeof body.id==='string'&&body.id.length<=128||Number.isSafeInteger(body.id)?body.id:null;
 if(body.method==='notifications/initialized'&&id===null)return new Response(null,{status:202,headers:{'Cache-Control':'no-store'}});
 if(id===null)return error(null,-32600,'Request id required');
 if(body.method==='initialize'){
  if(body.params?.protocolVersion!==MCP_VERSION)return error(id,-32602,'Unsupported protocol version');
  return reply(id,'result',{protocolVersion:MCP_VERSION,capabilities:{tools:{listChanged:false}},serverInfo:{name:'quantaphi-public-quick-cards',version:'1.0.0'},instructions:'Read-only first-party Quick Card discovery and draft preparation. No site sign-in, model inference, GitHub writes, wallet, public auto-publish or account access.'});
 }
 if(request.headers.get('MCP-Protocol-Version')!==MCP_VERSION)return error(id,-32600,'MCP protocol version mismatch');
 if(body.method==='ping')return reply(id,'result',{});
 if(body.method==='tools/list')return reply(id,'result',{tools:PUBLIC_MCP_TOOLS});
 if(body.method!=='tools/call')return error(id,-32601,'Method not found',404);
 const name=body.params?.name,args=body.params?.arguments||{};
 if(!args||typeof args!=='object'||Array.isArray(args))return error(id,-32602,'Invalid tool arguments');
 if(name==='quanta_public_builders'){
  if(Object.keys(args).length)return error(id,-32602,'Invalid tool arguments');
  return success(id,{builders,chatgptWebsiteSignInConnected:false,privilegedActionsAvailable:false},
   builders.map(x=>x.name+': '+x.url+' — '+x.scope).join('\n'));
 }
 if(name==='quanta_prepare_card_draft'){
  try{
   const draft=cleanPublicCardDraft(args);
   const openOnQuantaPhi=encodePublicCardDraft(draft);
   return success(id,{draft,openOnQuantaPhi,published:false,reviewRequired:true,privilegedActionsAvailable:false},
    'Draft prepared, NOT published. Open the QuantaPhi original builder to review all prefilled fields and choose Publish yourself: '+openOnQuantaPhi);
  }catch{return error(id,-32602,'Invalid public card draft')}
 }
 return error(id,-32602,'Unknown or unauthorized tool');
}
