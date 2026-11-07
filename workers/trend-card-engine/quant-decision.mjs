/* Orange's on-demand Quant AI evidence adapter.
 * All queries are scoped to the currently authenticated user's identity/wallet,
 * read only, bounded and never exposed as raw queries to the card client.
 * Choosing a card is NOT permission to publish that card as an advertisement.
 */
const VALID_ID=/^[a-z0-9][a-z0-9-]{1,99}$/;
const PRIVATE_TOPICS=/\b(?:health|medical|disease|diagnosis|religion|politics|sexual|ssn|social security|password|credit card|bank account|ethnicity|race|disability)\b/i;
const RESTRICTED_CARD=/\b(?:adult|21\+|cannabis|marijuana|tobacco|nicotine|gambling|weapon|firearm|prescription)\b/i;
const IGNORED=new Set(['about','above','after','again','album','already','before','between','build','cards','card','created','different','discover','follow','from','into','more','next','original','page','product','search','some','source','that','their','these','this','those','very','what','when','where','which','with','your','youtube','website']);
const tokens=value=>[...new Set(String(value??'').toLowerCase().match(/[a-z0-9]{4,}/g)||[])]
 .filter(w=>!IGNORED.has(w)&&!PRIVATE_TOPICS.test(w)).slice(0,38);
const json=(payload,status=200)=>Response.json(payload,{status,headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':'https://quantaphi.org','Vary':'Origin'}});
const strictString=(value,max=150)=>typeof value==='string'?value.trim().slice(0,max):'';

export function permittedPacketTags(rows,clock=Date.now()){
 const out=[];
 for(const item of (Array.isArray(rows)?rows:[]).slice(0,200)){
  let permission={};try{permission=JSON.parse(item.permissions_json||'{}')}catch{continue}
  if(!Array.isArray(permission.purposes)||!permission.purposes.includes('personalized_discovery'))continue;
  if(permission.expires_at&&(!Number.isFinite(Date.parse(permission.expires_at))||Date.parse(permission.expires_at)<=clock))continue;
  if(PRIVATE_TOPICS.test(item.tag_key)||!strictString(item.tag_key,100))continue;
  const confidence=Number(item.confidence);
  if(!Number.isFinite(confidence)||confidence<0||confidence>1)continue;
  out.push({tag_key:strictString(item.tag_key,100),confidence});
 }
 return out;
}
function candidateRows(items){
 const unique=new Set(),out=[];
 for(const c of (Array.isArray(items)?items:[]).slice(0,40)){
  if(!c||!VALID_ID.test(c.id)||unique.has(c.id))continue;
  const cat=strictString(c.category),title=strictString(c.title);
  if(!title||!cat||RESTRICTED_CARD.test(cat+' '+title))continue;
  unique.add(c.id);
  out.push({id:c.id,category:cat,title,artist:strictString(c.artist),tags:(Array.isArray(c.tags)?c.tags:[]).slice(0,18).map(x=>strictString(x,80))});
 }
 return out;
}
function match(haystack,text){
 const words=tokens(text);
 if(!words.length)return 0;
 return words.reduce((score,word)=>score+(haystack.has(word)?1:0),0);
}
export function rankQuantCandidates(candidates,signals={},context={},seenIds=[]){
 const seen=new Set((Array.isArray(seenIds)?seenIds:[]).slice(0,150).map(String));
 const items=candidateRows(candidates).filter(c=>!seen.has(c.id));
 const searches=Array.isArray(signals.searches)?signals.searches.slice(0,200):[];
 const interactions=Array.isArray(signals.interactions)?signals.interactions.slice(0,200):[];
 const collects=Array.isArray(signals.collects)?signals.collects.slice(0,100):[];
 const tags=Array.isArray(signals.tags)?signals.tags.slice(0,200):[];
 return items.map(c=>{
  const haystack=new Set(tokens([c.title,c.artist,c.category,...c.tags].join(' ')));
  let personal=0,contextScore=match(haystack,context.title)*5;
  for(const s of searches)if(!PRIVATE_TOPICS.test(s.query_text||''))personal+=Math.min(5,match(haystack,s.query_text))*3;
  for(const s of interactions)if(!PRIVATE_TOPICS.test([s.title,s.index_terms].join(' ')))personal+=Math.min(5,match(haystack,[s.title,s.index_terms].join(' ')))*(s.action==='open'||s.action==='follow'?5:2);
  for(const s of collects)if(!PRIVATE_TOPICS.test(s.title||''))personal+=Math.min(5,match(haystack,s.title))*4;
  for(const t of tags)personal+=Math.min(5,match(haystack,t.tag_key))*Math.round(Math.max(0,Math.min(1,Number(t.confidence)||0))*8);
  personal=Math.min(100,personal);
  contextScore=Math.min(30,contextScore);
  const score=personal+contextScore;
  return {id:c.id,score,reason:personal>0?'Matched to your QuantaPhi activity':contextScore>0?'Related to this card':'Available source-verified choice'};
 }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}

async function identityForToken(request,env){
 const token=/^Bearer (sq_[A-Za-z0-9_-]{32,})$/.exec(request.headers.get('Authorization')||'');
 if(!token)return {error:'authorization_required',status:401};
 if(!env.IDENTITY_DB?.prepare||!env.QUANTA_DB?.prepare||!env.QUANT_AI_DB?.prepare)return {error:'quant_data_bindings_unavailable',status:503};
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token[1]));
 const digest=[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
 const row=await env.IDENTITY_DB.prepare('SELECT a.id AS user_id FROM accounts a JOIN account_devices d ON d.account_id=a.id WHERE d.token_hash=?').bind(digest).first();
 if(!row?.user_id)return {error:'invalid_device_token',status:401};
 const wallet=await env.QUANTA_DB.prepare('SELECT wallet_id,status FROM quant_wallets WHERE user_id=?').bind(row.user_id).first();
 if(!wallet?.wallet_id||wallet.status!=='active')return {error:'wallet_not_available',status:403};
 return {userId:row.user_id,walletId:wallet.wallet_id};
}

async function signalsForUser(env,identity){
 const [searches,interactions,collects,tags]=await Promise.all([
  env.QUANTA_DB.prepare("SELECT query_text FROM quanta_search_journal WHERE user_id=? AND wallet_id=? AND status='COMMITTED' ORDER BY created_at DESC LIMIT 200").bind(identity.userId,identity.walletId).all(),
  env.QUANTA_DB.prepare('SELECT title,index_terms,kind,action FROM quanta_card_interactions WHERE user_id=? ORDER BY created_at DESC LIMIT 200').bind(identity.userId).all(),
  env.QUANTA_DB.prepare('SELECT title,type FROM quant_collects WHERE wallet_id=? ORDER BY collected_at DESC LIMIT 100').bind(identity.walletId).all(),
  env.QUANT_AI_DB.prepare('SELECT t.tag_key,t.confidence,p.permissions_json FROM quant_tags t JOIN quant_packets p ON p.quant_id=t.quant_id WHERE p.ingested_by_wallet=? ORDER BY t.confidence DESC LIMIT 200').bind(identity.walletId).all()
 ]);
 return {searches:searches.results||[],interactions:interactions.results||[],collects:collects.results||[],tags:permittedPacketTags(tags.results||[])};
}

export async function fetchQuantDecision(request,env){
 if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
 const origin=request.headers.get('Origin');
 if(origin&&origin!=='https://quantaphi.org')return json({ok:false,error:'origin_not_allowed'},403);
 let body;try{body=await request.json()}catch{return json({ok:false,error:'invalid_json'},400)}
 if(!body||body.consent!==true)return json({ok:false,error:'personalized_discovery_consent_required'},403);
 if(!Array.isArray(body.candidates)||body.candidates.length<1||body.candidates.length>40)return json({ok:false,error:'invalid_candidates'},400);
 try{
  const identity=await identityForToken(request,env);
  if(identity.error)return json({ok:false,error:identity.error},identity.status);
  const signals=await signalsForUser(env,identity);
  const ranked=rankQuantCandidates(body.candidates,signals,{title:strictString(body.context?.title,160)},body.seen_ids);
  return json({
   ok:true,mode:'authenticated_own_quant_data',engine:'Quant AI + existing Quanta ledger',
   ranked,placement_authorized:false,sponsored:false,
   evidence_counts:{searches:signals.searches.length,interactions:signals.interactions.length,collects:signals.collects.length,consented_packet_tags:signals.tags.length}
  });
 }catch(e){
  console.error('Quant AI card decision unavailable',e?.name||'unknown_error');
  return json({ok:false,error:'quant_data_unavailable'},503);
 }
}
