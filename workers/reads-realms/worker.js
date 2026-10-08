/* Infinity Reads & Realms | isolated staging Worker.
 * Binding: RR_INDEX (D1 infinity-reads-realms-index).
 * Keep off the existing QuantaPhi route until tests + data thresholds pass.
 */
const ORIGINS=new Set(['https://quantaphi.org','https://www.quantaphi.org']);
const MIN_TOPICS=100;
const LIMIT_EVIDENCE=20;
const FILTER=/^(list of|category:|outline of|timeline of|index of)\b/i;
function reply(body,status=200,origin=''){
 const headers={'content-type':'application/json;charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
 if(ORIGINS.has(origin)){headers['access-control-allow-origin']=origin;headers.vary='Origin'}
 return new Response(JSON.stringify(body),{status,headers});
}
const tidy=x=>String(x||'').replace(/\s+/g,' ').trim();
const pageDomain=u=>{try{let p=new URL(u);return p.protocol==='https:'?p.hostname.replace(/^www\./,''):''}catch{return ''}};
const canonical=u=>{try{let p=new URL(u);if(p.protocol!=='https:')return '';p.hash='';for(const k of [...p.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(k))p.searchParams.delete(k);return p.href}catch{return ''}};
const stableKey=t=>tidy(t).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim().slice(0,160);
const bounded=(n,min,max)=>Number.isInteger(Number(n))&&Number(n)>=min&&Number(n)<=max?Number(n):0;
const pick=(a)=>a[Math.floor(Math.random()*a.length)]||null;
async function jsonOrNull(response){try{return await response.json()}catch{return null}}
async function all(db,sql,...args){const r=await db.prepare(sql).bind(...args).all();return r.results||[]}
async function one(db,sql,...args){return await db.prepare(sql).bind(...args).first()}
async function counts(db){
 return all(db,'SELECT s.id,s.name,COUNT(t.id) AS topics FROM rr_sectors s LEFT JOIN rr_topics t ON t.sector_id=s.id AND t.reviewed=1 WHERE s.enabled=1 GROUP BY s.id ORDER BY s.id');
}
async function draw(db,{sectorId=0,term='',minimum=MIN_TOPICS}={}){
 const sectors=(await counts(db)).filter(s=>Number(s.topics)>=minimum);
 const sector=sectorId?sectors.find(s=>s.id===sectorId):pick(sectors);
 if(!sector)return {ok:false,error:sectorId?'sector_index_incomplete':'index_not_ready',readySectors:sectors.length};
 const topic=term?await one(db,'SELECT id,term FROM rr_topics WHERE sector_id=? AND reviewed=1 AND normalized=?',sector.id,stableKey(term)):
  await one(db,'SELECT id,term FROM rr_topics WHERE sector_id=? AND reviewed=1 ORDER BY RANDOM() LIMIT 1',sector.id);
 if(!topic)return {ok:false,error:'topic_unavailable'};
 const [refinement,genre]=await Promise.all([
  one(db,'SELECT id,label FROM rr_refinements ORDER BY RANDOM() LIMIT 1'),
  one(db,'SELECT id,label,directive FROM rr_genres ORDER BY RANDOM() LIMIT 1')
 ]);
 if(!refinement||!genre)return {ok:false,error:'bracket_configuration_missing'};
 const sourceClass=1+Math.floor(Math.random()*10);
 return {ok:true,bracket:{
  sector:{id:sector.id,name:sector.name},
  topic:{id:topic.id,term:topic.term},
  research:{id:refinement.id,name:refinement.label},
  realm:{id:genre.id,name:genre.label,directive:genre.directive},
  sourceClass,firstQuery:topic.term+' '+refinement.label
 }};
}
async function research(searchBase,bracket){
 const topic=bracket.topic.term,angle=bracket.research.name;
 const queries=[
  topic+' '+angle,
  topic+' '+angle+' unusual discovery historical incident',
  topic+' '+angle+' archive museum historical event',
  topic+' '+angle+' original records experiment origin'
 ];
 const seen=new Set(),allSources=[];
 const settled=await Promise.allSettled(queries.map(async q=>{
  const u=new URL(searchBase);
  u.search=new URLSearchParams({q,format:'json',categories:'general',safesearch:'1'});
  const res=await fetch(u,{signal:AbortSignal.timeout(8500)});
  if(!res.ok)throw new Error('search_http_'+res.status);
  return jsonOrNull(res);
 }));
 for(const result of settled){
  if(result.status!=='fulfilled')continue;
  for(const raw of result.value?.results||[]){
   const url=canonical(raw.url),title=tidy(raw.title),excerpt=tidy(raw.content||raw.description);
   if(!url||!title||excerpt.length<70||FILTER.test(title)||seen.has(url))continue;
   seen.add(url);allSources.push({title,excerpt:excerpt.slice(0,750),url,domain:pageDomain(url)});
   if(allSources.length>=LIMIT_EVIDENCE)break;
  }
  if(allSources.length>=LIMIT_EVIDENCE)break;
 }
 return allSources;
}
function validateNarrative(data,sources){
 if(!data||data.insufficient)return null;
 const title=tidy(data.title),summary=tidy(data.summary),body=String(data.full||'').trim();
 if(title.length<16||summary.length<90||body.length<230||body.length>3200||FILTER.test(title))return null;
 if(!Array.isArray(data.evidence_urls))return null;
 const citations=[...new Set(data.evidence_urls.map(canonical).filter(Boolean))];
 const cited=sources.filter(x=>citations.includes(x.url));
 if(new Set(cited.map(x=>x.domain)).size<2)return null;
 const detail=tidy(data.detail);
 const terms=stableKey(detail).split(' ').filter(x=>x.length>4);
 if(terms.length<2)return null;
 const corpus=cited.map(x=>stableKey(x.title+' '+x.excerpt)).join(' ');
 if(terms.filter(t=>corpus.includes(t)).length<2)return null;
 return {title,summary,full:body,detail,sourceUrl:cited[0].url,sources:cited};
}
async function writeStory(url,bracket,sources){
 if(new Set(sources.map(x=>x.domain)).size<2)return null;
 const prompt=[
  'You are Infinity Reads & Realms. Write ONE original nonfiction story card based on the evidence below.',
  'Topic '+bracket.topic.term+'. Research refinement '+bracket.research.name+'. Storytelling atmosphere '+bracket.realm.name+'.',
  'Mystery, adventure or suspense may shape pacing but NEVER permit fabricated dialogue, facts, dates, motives, or conclusions.',
  'Consider all available source excerpts (up to 20), choose the best specific, surprising, source-corroborated event or object.',
  'Both cited sources must support the SAME precise event, not merely the same broad topic.',
  'If enough evidence for one specific event is missing, answer {"insufficient":true}.',
  'Return JSON ONLY: {"title":"event-specific title","summary":"40-85 words","full":"100-210 words in two paragraphs","detail":"a supported unexpected detail","evidence_urls":["source URL","different-domain source URL"]}.',
  'Source excerpts (not full-page reading): '+JSON.stringify(sources)
 ].join('\n');
 const res=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
  input:prompt,context:{application:'Infinity Reads & Realms',task:'infinite-book-deep-story',requireCloudflare:true}}),
  signal:AbortSignal.timeout(20000)});
 if(!res.ok)return null;
 const result=await jsonOrNull(res);
 let raw=result?.output_text||result?.output||result?.answer||'';
 if(typeof raw!=='string')return null;
 let data;try{data=JSON.parse(raw)}catch{
  const a=raw.indexOf('{'),b=raw.lastIndexOf('}');try{data=JSON.parse(raw.slice(a,b+1))}catch{return null}
 }
 return validateNarrative(data,sources);
}
async function recordStory(db,bracket,draft){
 const key=stableKey(draft.title);
 const existing=await one(db,'SELECT id,title,summary,body,evidence_json FROM rr_stories WHERE canonical_event_key=?',key);
 if(existing)return {ok:true,alreadyPublished:true,story:existing};
 const id=crypto.randomUUID();
 const values=[id,bracket.sector.id,bracket.topic.id,bracket.research.id,bracket.realm.id,
  draft.title,draft.summary,draft.full,JSON.stringify(draft.sources),key];
 await db.prepare('INSERT OR IGNORE INTO rr_stories(id,sector_id,topic_id,refinement_id,genre_id,title,summary,body,evidence_json,canonical_event_key,status) VALUES (?,?,?,?,?,?,?,?,?,?,"published")').bind(...values).run();
 return {ok:true,alreadyPublished:false,story:{id,title:draft.title,summary:draft.summary,full:draft.full,sourceUrl:draft.sourceUrl,sources:draft.sources,bracket}};
}
export default {
 async fetch(request,env){
  const url=new URL(request.url),origin=request.headers.get('origin')||'',db=env.RR_INDEX;
  if(!db)return reply({ok:false,error:'index_binding_missing'},503,origin);
  if(request.method==='OPTIONS'&&ORIGINS.has(origin))return new Response(null,{status:204,headers:{
    'access-control-allow-origin':origin,'access-control-allow-methods':'GET,POST,OPTIONS',
    'access-control-allow-headers':'content-type','access-control-max-age':'3600'}});
  if(request.method==='GET'&&url.pathname==='/health'){
   const list=await counts(db);return reply({ok:true,totalSectors:list.length,readySectors:list.filter(s=>s.topics>=MIN_TOPICS).length,
    topics:list.reduce((n,s)=>n+Number(s.topics),0)},200,origin);
  }
  if(request.method==='GET'&&url.pathname==='/v1/counts')return reply({ok:true,sectors:await counts(db)},200,origin);
  if(request.method==='GET'&&url.pathname==='/v1/draw'){
   const selected=bounded(url.searchParams.get('sector'),1,30);
   const result=await draw(db,{sectorId:selected,term:tidy(url.searchParams.get('topic')).slice(0,100)});
   return reply(result,result.ok?200:409,origin);
  }
  // Production page must call via a trusted same-origin server bridge:
  // a public browser MUST NOT be given the RR_WRITER_TOKEN secret.
  if(request.method==='POST'&&url.pathname==='/v1/story'){
   if(!env.RR_WRITER_TOKEN||request.headers.get('authorization')!=='Bearer '+env.RR_WRITER_TOKEN)
    return reply({ok:false,error:'forbidden'},403,origin);
   const body=await request.json().catch(()=>({}));
   const sectorId=bounded(body.sector,1,30);
   const chosen=await draw(db,{sectorId,term:tidy(body.topic).slice(0,100)});
   if(!chosen.ok)return reply(chosen,409,origin);
   const bracket=chosen.bracket;
   const sources=await research(env.RR_SEARCH_URL||'https://orange-brook-a2ac.marvaseater.workers.dev/search',bracket);
   if(sources.length<2)return reply({ok:false,error:'insufficient_research',bracket},503,origin);
   const draft=await writeStory(env.RR_AI_URL||'https://infinity-rogers.marvaseater.workers.dev/v1/chat',bracket,sources);
   if(!draft)return reply({ok:false,error:'source_or_writer_failed',bracket},503,origin);
   return reply(await recordStory(db,bracket,draft),200,origin);
  }
  return reply({ok:false,error:'not_found'},404,origin);
 }
};
