/*
  Infinite Book D1 library - separate from wallet and mint endpoints.
  GETs expose reviewed stories only. Queued AI discoveries are drafts, never facts.
  Bind DB (D1), AI (optional Workers AI), BOOK_ADMIN_TOKEN (secret).
*/
const ORIGINS=new Set(["https://quantaphi.org","https://www.quantaphi.org","https://www-infinity4.github.io","http://localhost:8000"]);
const MAX_FEED=100;
const clean=(v,n=240)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const host=(u)=>{try{const x=new URL(u);return x.protocol==="https:"?x.hostname.replace(/^www\./,""):""}catch{return ""}};
function cors(request){
 const origin=request.headers.get("Origin")||"";
 return ORIGINS.has(origin)?{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization","Vary":"Origin"}:{};
}
function output(request,data,status=200){
 return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json;charset=UTF-8","cache-control":"no-store",...cors(request)}});
}
const sql=[
"CREATE TABLE IF NOT EXISTS book_sectors(id INTEGER PRIMARY KEY,name TEXT NOT NULL)",
"CREATE TABLE IF NOT EXISTS book_subjects(id INTEGER PRIMARY KEY,name TEXT NOT NULL,sector_ids_json TEXT NOT NULL)",
"CREATE TABLE IF NOT EXISTS book_angles(id INTEGER PRIMARY KEY,name TEXT NOT NULL)",
"CREATE TABLE IF NOT EXISTS book_directions(id INTEGER PRIMARY KEY,name TEXT NOT NULL)",
"CREATE TABLE IF NOT EXISTS book_stories(story_id TEXT PRIMARY KEY,event_key TEXT NOT NULL UNIQUE,source_url TEXT NOT NULL,title TEXT NOT NULL,story_json TEXT NOT NULL,publish_status TEXT NOT NULL CHECK(publish_status IN ('published','draft')),reviewed_by TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL)",
"CREATE TABLE IF NOT EXISTS book_story_paths(story_id TEXT NOT NULL,sector_id INTEGER NOT NULL,subject_id INTEGER NOT NULL,angle_id INTEGER NOT NULL,direction_id INTEGER NOT NULL,PRIMARY KEY(story_id,sector_id,subject_id,angle_id,direction_id))",
"CREATE INDEX IF NOT EXISTS idx_book_paths_route ON book_story_paths(sector_id,subject_id,angle_id,direction_id,story_id)",
"CREATE TABLE IF NOT EXISTS book_story_sources(story_id TEXT NOT NULL,source_url TEXT NOT NULL,source_host TEXT NOT NULL,source_title TEXT NOT NULL,PRIMARY KEY(story_id,source_url))",
"CREATE INDEX IF NOT EXISTS idx_book_source_host ON book_story_sources(source_host,story_id)",
"CREATE TABLE IF NOT EXISTS book_story_jobs(job_id TEXT PRIMARY KEY,route_key TEXT NOT NULL,query_text TEXT NOT NULL,sector_id INTEGER NOT NULL,subject_id INTEGER NOT NULL,angle_id INTEGER NOT NULL,direction_id INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,draft_json TEXT NOT NULL DEFAULT '',last_error TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,UNIQUE(route_key,query_text))",
"CREATE INDEX IF NOT EXISTS idx_book_jobs_status ON book_story_jobs(status,created_at)"
];
async function ensure(env){await env.DB.batch(sql.map(s=>env.DB.prepare(s)))}
function allowedAdmin(req,env){
 const secret=env.BOOK_ADMIN_TOKEN;
 return typeof secret==="string"&&secret.length>=24&&req.headers.get("Authorization")==="Bearer "+secret;
}
const positive=n=>Number.isSafeInteger(Number(n))&&Number(n)>0&&Number(n)<1000000;
const routeKey=p=>[p.sector_id,p.subject_id,p.angle_id,p.direction_id].join(":");
async function seedBanks(body,env){
 const types=[["sectors","book_sectors","name"],["subjects","book_subjects","word"],["angles","book_angles","name"],["directions","book_directions","name"]];
 let updated=0;
 for(const [key,table,field] of types){
  const values=Array.isArray(body[key])?body[key].slice(0,1000):[];
  for(let i=0;i<values.length;i+=60){
   const stmts=[];
   for(const w of values.slice(i,i+60)){
    if(!positive(w.id)||clean(w[field],120).length<2)continue;
    if(key==="subjects"){
     const sectors=(Array.isArray(w.sectors)?w.sectors:[w.sector]).filter(positive).map(Number);
     if(!sectors.length)continue;
     stmts.push(env.DB.prepare("INSERT INTO book_subjects(id,name,sector_ids_json) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,sector_ids_json=excluded.sector_ids_json")
      .bind(Number(w.id),clean(w[field],120),JSON.stringify([...new Set(sectors)])));
    } else {
     stmts.push(env.DB.prepare("INSERT INTO "+table+"(id,name) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name")
      .bind(Number(w.id),clean(w[field],120)));
    }
   }
   if(stmts.length){await env.DB.batch(stmts);updated+=stmts.length}
  }
 }
 return {ok:true,updated};
}
async function banks(req,env){
 const u=new URL(req.url);
 const sector=Number(u.searchParams.get("sector")||0);
 const [a,b,c,d]=await Promise.all(["book_sectors","book_subjects","book_angles","book_directions"].map(table=>env.DB.prepare("SELECT * FROM "+table+" ORDER BY id").all()));
 const sectors=a.results||[],angles=c.results||[],directions=d.results||[];
 const subjects=(b.results||[]).map(x=>({id:x.id,word:x.name,sectors:JSON.parse(x.sector_ids_json)}));
 // Carry forward the existing 4,280 reviewed terms in infinity-reads-realms-index
 // without changing or deleting the old rr_* schema. Namespace IDs to avoid
 // collisions with the local 112-word fallback catalog.
 try {
  const legacy=await env.DB.prepare("SELECT id,sector_id,term FROM rr_topics WHERE reviewed=1 ORDER BY id LIMIT 6000").all();
  for(const x of legacy.results||[])subjects.push({id:100000+Number(x.id),word:x.term,sectors:[Number(x.sector_id)]});
 }catch(_){} // new databases without the legacy index are also supported
 const filtered=sector>0?subjects.filter(x=>x.sectors.includes(sector)):subjects;
 return {ok:true,revision:4,sectors,subjects:filtered,angles,directions,total:filtered.length};
}

function storyCheck(story){
 if(!story||typeof story!=="object")return null;
 const id=clean(story.id,119),eventKey=clean(story.event_key,190).toLowerCase();
 if(!/^[a-z0-9][a-z0-9_-]{7,118}$/i.test(id)||!eventKey||eventKey.length<12)return null;
 if(clean(story.title).length<16||clean(story.summary,1500).length<90||clean(story.full,12000).length<210||!host(story.sourceUrl))return null;
 if(!Array.isArray(story.paths)||!story.paths.length||story.paths.length>80)return null;
 const paths=story.paths.filter(p=>[p.sector_id,p.subject_id,p.angle_id,p.direction_id].every(positive));
 if(!paths.length)return null;
 const cited=[{url:story.sourceUrl,title:story.sourceTitle||"Original source"},...(Array.isArray(story.sources)?story.sources:[])]
  .map(x=>({url:clean(x.url,1600),title:clean(x.title,200)})).filter(x=>host(x.url));
 const urls=[...new Map(cited.map(x=>[x.url,x])).values()];
 // A one-source researched article can be published only as explicitly reported,
 // and only after review; two independent hostnames are required for 'documented'.
 if(story.status==="documented"&&new Set(urls.map(x=>host(x.url))).size<2)return null;
 const state=["documented","reported","contested","corrected myth","folklore"].includes(story.status)?story.status:null;
 if(!state)return null;
 return {id,eventKey,paths,urls,state};
}
async function importStories(body,env){
 const reviewer=clean(body.reviewer,100);
 if(!body.editorial_reviewed||reviewer.length<3)return {ok:false,error:"editorial_review_required"};
 let saved=0,rejected=[];
 for(const story of (Array.isArray(body.stories)?body.stories:[]).slice(0,60)){
  const validated=storyCheck(story);
  if(!validated){rejected.push(clean(story?.id,100)||"invalid");continue}
  const now=Date.now(),source=clean(story.sourceUrl,1600);
  const asJson={...story,id:validated.id,status:validated.state,
   sourceUrl:source,paths:undefined,reviewedBy:reviewer,discoverySource:"library"};
  try{
   const tx=[
    env.DB.prepare("INSERT INTO book_stories(story_id,event_key,source_url,title,story_json,publish_status,reviewed_by,created_at,updated_at) VALUES(?,?,?,?,?,'published',?,?,?) ON CONFLICT(story_id) DO UPDATE SET story_json=excluded.story_json,title=excluded.title,updated_at=excluded.updated_at,reviewed_by=excluded.reviewed_by")
     .bind(validated.id,validated.eventKey,source,clean(story.title),JSON.stringify(asJson),reviewer,now,now),
    env.DB.prepare("DELETE FROM book_story_paths WHERE story_id=?").bind(validated.id),
    env.DB.prepare("DELETE FROM book_story_sources WHERE story_id=?").bind(validated.id)
   ];
   for(const p of validated.paths)tx.push(env.DB.prepare("INSERT OR IGNORE INTO book_story_paths(story_id,sector_id,subject_id,angle_id,direction_id) VALUES(?,?,?,?,?)")
    .bind(validated.id,Number(p.sector_id),Number(p.subject_id),Number(p.angle_id),Number(p.direction_id)));
   for(const x of validated.urls)tx.push(env.DB.prepare("INSERT OR IGNORE INTO book_story_sources(story_id,source_url,source_host,source_title) VALUES(?,?,?,?)")
    .bind(validated.id,x.url,host(x.url),x.title));
   await env.DB.batch(tx);saved++;
  }catch(error){rejected.push(validated.id+": "+clean(error.message,110))}
 }
 return {ok:true,saved,rejected};
}
async function queueJobs(body,env){
 const jobs=Array.isArray(body.jobs)?body.jobs.slice(0,100):[],now=Date.now();let queued=0;
 for(const job of jobs){
  if(![job?.sector_id,job?.subject_id,job?.angle_id,job?.direction_id].every(positive))continue;
  const key=routeKey(job),query=clean(job.query,250);
  if(query.length<15)continue;
  const stmt=env.DB.prepare("INSERT OR IGNORE INTO book_story_jobs(job_id,route_key,query_text,sector_id,subject_id,angle_id,direction_id,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'pending',?,?)")
   .bind(crypto.randomUUID(),key,query,Number(job.sector_id),Number(job.subject_id),Number(job.angle_id),Number(job.direction_id),now,now);
  const row=await stmt.run();if(row.meta?.changes)queued++;
 }
 return {ok:true,queued,submitted:jobs.length};
}
function rank(story,path){
 if(!path||!story.paths?.length)return 0;
 let best=0;
 for(const route of story.paths){
  let score=0;
  if(Number(route.sector_id)===path[0])score+=20;
  if(Number(route.subject_id)===path[1])score+=30;
  if(Number(route.angle_id)===path[2])score+=10;
  if(Number(route.direction_id)===path[3])score+=10;
  if(score>best)best=score;
 }
 return best;
}
async function feed(req,env){
 const u=new URL(req.url),limit=Math.max(1,Math.min(MAX_FEED,Number(u.searchParams.get("limit"))||80));
 const path=(u.searchParams.get("path")||"").split(":").map(Number);
 const matched=path.length===4&&path.every(positive)?path:null;
 const excluded=new Set((u.searchParams.get("exclude")||"").split(",").slice(0,70));
 const result=await env.DB.prepare("SELECT s.story_json,p.sector_id,p.subject_id,p.angle_id,p.direction_id FROM book_stories s JOIN book_story_paths p ON p.story_id=s.story_id WHERE s.publish_status='published' ORDER BY s.updated_at DESC LIMIT 1500").all();
 const seen=new Map();
 for(const row of result.results||[]){
  let entry;try{entry=JSON.parse(row.story_json)}catch{continue}
  if(!entry.id||excluded.has(entry.id))continue;
  const item=seen.get(entry.id)||{story:entry,paths:[]};
  item.paths.push(row);seen.set(entry.id,item);
 }
 const entries=[...seen.values()].map(item=>({story:item.story,score:rank(item,matched)}));
 // Stable daily shuffle prevents one subject from occupying the entire feed.
 const salt=Math.floor(Date.now()/86400000);
 const scramble=s=>{let h=2166136261;for(const ch of s){h=Math.imul(h^ch.charCodeAt(0),16777619)}return h>>>0};
 entries.sort((a,b)=>(b.score-a.score)||scramble(a.story.id+salt)-scramble(b.story.id+salt));
 return {ok:true,stories:entries.slice(0,limit).map(x=>x.story),total:entries.length,selection:"reviewed_catalog"};
}
async function retrieveSearch(job,env){
 const service=clean(env.SEARCH_ENDPOINT||"https://orange-brook-a2ac.marvaseater.workers.dev/search",350);
 const u=new URL(service);u.search=new URLSearchParams({q:job.query_text,format:"json",categories:"general",safesearch:"1"});
 const abort=AbortSignal.timeout(7500);
 const r=await fetch(u,{signal:abort});if(!r.ok)throw Error("search_http_"+r.status);
 const data=await r.json();
 const results=[],hosts=new Set();
 for(const x of Array.isArray(data.results)?data.results:[]){
  const link=clean(x.url,1500),title=clean(x.title,200),summary=clean(x.content||x.description,550);
  if(!host(link)||summary.length<65||title.length<12)continue;
  results.push({title,url:link,summary});hosts.add(host(link));
  if(results.length>=18)break;
 }
 if(hosts.size<2)return null;
 return results;
}
function parseAI(response){
 let text=response?.response||response?.output_text||"";
 if(Array.isArray(text))text=text.map(x=>x.text||"").join("");
 if(typeof text!=="string")return null;
 try{return JSON.parse(text)}catch{}
 const i=text.indexOf("{"),j=text.lastIndexOf("}");
 if(i<0||j<=i)return null;try{return JSON.parse(text.slice(i,j+1))}catch{return null}
}
async function draftJob(job,env){
 if(!env.AI||typeof env.AI.run!=="function")return {status:"pending",error:"AI_binding_not_configured"};
 const sources=await retrieveSearch(job,env);
 if(!sources)return {status:"needs_sources",error:"fewer_than_two_source_hosts"};
 const task=[
  "You are GPT, final editorial gate for a historical mystery and science story LIBRARY.",
  "Discover ONE concrete lesser-known independently corroborated event, not a person's general biography.",
  "Do not fabricate events, equations, dialogue, sources, dates or future results.",
  "Check that TWO separate hosts in the supplied search excerpts corroborate the SAME event, not merely share a topic.",
  "The requested research path is "+job.query_text+". You may find several independent story opportunities, but output a draft for ONE.",
  "For future technologies identify evidence-based bottlenecks and label projections as hypotheses.",
  "When mathematics is appropriate include a verified formula, correct units, explicit assumptions, and a worked example.",
  "Return JSON only: {\"title\":\"...\",\"summary\":\"at least 90 characters\",\"full\":\"two paragraphs at least 210 characters\",\"detail\":\"...\",\"status\":\"documented|reported|contested|corrected myth|folklore\",\"source_urls\":[\"exact first source URL\",\"exact second source URL\"]}.",
  "If evidence insufficient return {\"insufficient\":true}. Source summaries are search snippets, NOT full articles.",
  JSON.stringify(sources)
 ].join("\n");
 const answer=await env.AI.run("@cf/openai/gpt-oss-120b",{messages:[{role:"user",content:task}],max_tokens:1400});
 const draft=parseAI(answer);if(!draft||draft.insufficient)return {status:"needs_sources",error:"GPT_rejected_insufficient_evidence"};
 const corroborating=sources.filter(x=>(draft.source_urls||[]).includes(x.url));
 if(new Set(corroborating.map(x=>host(x.url))).size<2||clean(draft.title).length<16||clean(draft.full,7000).length<210)
  return {status:"needs_sources",error:"draft_not_corroborated"};
 return {status:"review",draft:{...draft,sourceUrl:corroborating[0].url,sources:corroborating,routeKey:job.route_key},error:""};
}
async function processJobs(env){
 if(!env.DB)return;
 const found=await env.DB.prepare("SELECT * FROM book_story_jobs WHERE status='pending' AND attempts<3 ORDER BY created_at LIMIT 2").all();
 for(const job of found.results||[]){
  let update;
  try{update=await draftJob(job,env)}
  catch(e){update={status:"pending",error:clean(e.message,170)}}
  await env.DB.prepare("UPDATE book_story_jobs SET attempts=attempts+1,status=?,draft_json=?,last_error=?,updated_at=? WHERE job_id=?")
   .bind(update.status,JSON.stringify(update.draft||{}),update.error||"",Date.now(),job.job_id).run();
 }
}
async function handle(req,env){
 const u=new URL(req.url),path=u.pathname;
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(req)});
 if(req.method==="GET"&&path==="/v1/book/health")return output(req,{ok:!!env.DB,service:"infinite-book-library",editorial:"reviewed-only"});
 if(!env.DB)return output(req,{error:"d1_binding_required"},503);
 if(req.method==="GET"&&path==="/v1/book/feed")return output(req,await feed(req,env));
 if(req.method==="GET"&&path==="/v1/book/banks")return output(req,await banks(req,env));
 if(!path.startsWith("/v1/book/admin/"))return output(req,{error:"not_found"},404);
 if(!allowedAdmin(req,env))return output(req,{error:"unauthorized"},401);
 if(req.method==="POST"&&path==="/v1/book/admin/bootstrap"){await ensure(env);return output(req,{ok:true,schemaVersion:1})}
 const body=req.method==="POST"?await req.json().catch(()=>({})):{};
 if(req.method==="POST"&&path==="/v1/book/admin/seed-banks")return output(req,await seedBanks(body,env));
 if(req.method==="POST"&&path==="/v1/book/admin/import-stories")return output(req,await importStories(body,env));
 if(req.method==="POST"&&path==="/v1/book/admin/queue")return output(req,await queueJobs(body,env));
 if(req.method==="GET"&&path==="/v1/book/admin/drafts"){
  const rows=await env.DB.prepare("SELECT job_id,route_key,query_text,status,draft_json,last_error,attempts FROM book_story_jobs WHERE status IN ('review','needs_sources') ORDER BY updated_at DESC LIMIT 100").all();
  return output(req,{ok:true,jobs:rows.results||[]});
 }
 return output(req,{error:"not_found"},404);
}
export default {
 async fetch(req,env){try{return await handle(req,env)}catch(e){return output(req,{ok:false,error:"book_request_failed",detail:clean(e.message,140)},500)}},
 async scheduled(event,env,ctx){ctx.waitUntil(processJobs(env))}
};
