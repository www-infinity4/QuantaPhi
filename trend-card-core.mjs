/* Infinity Trend-to-Card · pure, fail-closed rules. No wallet or private identity access.
 * Source registration and publish authorization must also be checked server-side.
 */
export const BOT_ROLES=Object.freeze([
 {id:'gpt',name:'GPT · Task Director',job:'Read owner intent, deduplicate tickets and dispatch sourced work'},
 {id:'yellow',name:'Yellow · Source Research',job:'Import permitted feeds, provenance, relationships and freshness into D1'},
 {id:'orange',name:'Orange · Quant Decision',job:'Compare candidate placements using real Quant-AI receipts and approve or decline public cards'},
 {id:'blue',name:'Blue · Card Composer',job:'Convert Orange-approved data into independent Oracle Octaves cards'},
 {id:'green',name:'Green · Working Controls',job:'Build/test tap-to-play, search, buy, post, follow and back controls'},
 {id:'red',name:'Red · Independent Verification',job:'Review rights, security, sources, Android UI, regressions and publication gate'},
 {id:'purple',name:'Purple · Continuity Keeper',job:'Retain leases, checkpoints, retries and unmerged work until verified'},
 {id:'silver',name:'Silver · Release and Monitoring',job:'Check CI, merge, deployment and real production receipts; roll back failed cards'}
]);
const HANDOFF=Object.freeze({gpt:'yellow',yellow:'orange',orange:'blue',blue:'green',green:'red',red:'silver',purple:null,silver:null});
export const nextBotHandoff=role=>Object.hasOwn(HANDOFF,String(role))?HANDOFF[role]:null;
const HOSTS=Object.freeze({
 'www.pinkfloyd.com':'artist',
 'pinkfloyd.com':'artist',
 'shop.us.pinkfloyd.com':'artist-store'
});
const ageExcluded=new Set(['adult','21+','gambling','cannabis','nicotine','weapons']);
const clean=x=>String(x??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const safeHttps=value=>{
 try{
  const u=new URL(String(value));
  if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.'))return null;
  return u;
 }catch{return null}
};
export function validateSourceItem(item,clock=Date.now()){
 if(!item||typeof item!=='object'||!/^[-a-z0-9]{6,100}$/.test(String(item.id??'')))return false;
 if(!clean(item.title)||!clean(item.artist)||!clean(item.category)||ageExcluded.has(clean(item.category)))return false;
 if(item.kind!=='organic'||item.state!=='source_verified'||item.rights!=='source-linked')return false;
 const source=safeHttps(item.source_url),target=safeHttps(item.destination_url);
 if(!source||!target||HOSTS[source.hostname]!==item.source_authority||!HOSTS[target.hostname])return false;
 const checked=Date.parse(item.checked_at),now=Number(clock);
 if(!Number.isFinite(checked)||!Number.isFinite(now)||checked>now+300000||now-checked>7*86400000)return false;
 if(!Array.isArray(item.tags)||item.tags.length>30||item.tags.some(t=>clean(t).length>80))return false;
 return true;
}
export function rankRelatedCards(items,context={},seenIds=[],clock=Date.now()){
 const query=clean(context.title),tags=new Set((context.tags||[]).map(clean).filter(Boolean));
 const seen=new Set(seenIds.map(String)),unique=new Set();
 const results=[];
 for(const item of (Array.isArray(items)?items:[]).slice(0,200)){
  if(!validateSourceItem(item,clock)||seen.has(item.id)||unique.has(item.id))continue;
  unique.add(item.id);
  const artist=clean(item.artist),terms=[artist,...item.tags.map(clean)].filter(Boolean);
  let score=0;
  if(query&&(query.includes(artist)||artist.includes(query)))score+=12;
  for(const term of terms){
   if(tags.has(term))score+=8;
   else if(query&&term.length>=5&&query.includes(term))score+=3;
  }
  if(clean(item.category)===clean(context.category))score+=2;
  const label=(terms.find(t=>tags.has(t))||artist);
  const reason=score>=8?`Related to ${item.artist} · ${label}`:`Source-verified ${item.category} discovery`;
  results.push({item,score,why:reason,decision:'orange_review_pending'});
 }
 return results.sort((a,b)=>b.score-a.score||a.item.id.localeCompare(b.item.id)).slice(0,12);
}
// This is a display-level guard. The D1 Worker must authenticate Orange and
// reject client-provided approvals; a row field alone does not confer authority.
export function canPublishCard(item,decision,clock=Date.now()){
 if(!validateSourceItem(item,clock)||item.media_rights_verified!==true||item.card_tests_passed!==true)return false;
 if(!decision||decision.role!=='orange'||decision.status!=='approved'||decision.source_id!==item.id)return false;
 if(typeof decision.quant_ai_receipt!=='string'||decision.quant_ai_receipt.length<3)return false;
 const time=Date.parse(decision.approved_at);
 return Number.isFinite(time)&&time<=clock+300000&&clock-time<=7*86400000;
}
