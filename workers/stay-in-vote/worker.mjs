/* Infinity Stay In & Vote: nonbinding community polls, not government election administration.
 * Uses a separate D1 database. No public route to create polls, editorial endorsements,
 * official results or tally overrides. Users' votes never elect public officials. */
const ORIGINS=new Set(['https://quantaphi.org','https://www.quantaphi.org']);
const STATE='https://starquest-ledger.marvaseater.workers.dev/v1/state';
const json=(req,value,status=200)=>{
 const h=new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','vary':'Origin'});
 const origin=req.headers.get('origin')||'';
 if(ORIGINS.has(origin)){
  h.set('access-control-allow-origin',origin);
  h.set('access-control-allow-headers','authorization,content-type');
  h.set('access-control-allow-methods','GET,POST,OPTIONS');
 }
 return new Response(JSON.stringify(value),{status,headers:h});
};
export const allowsOrigin=value=>ORIGINS.has(value);
const error=(req,code,status)=>json(req,{ok:false,error:code},status);
const key=s=>typeof s==='string'&&/^[a-z0-9][a-z0-9-]{2,78}$/.test(s);
export const validatePublicPoll=p=>Boolean(p&&key(p.id)&&p.kind==='community'&&p.status==='open'&&typeof p.title==='string'&&p.title.length>=3);
export function communityLead(options){
 if(!Array.isArray(options)||!options.length)return null;
 const sorted=[...options].sort((a,b)=>(Number(b.votes)||0)-(Number(a.votes)||0));
 return (Number(sorted[0].votes)>0&&(!sorted[1]||Number(sorted[0].votes)>Number(sorted[1].votes)))?sorted[0].id:null;
}
async function userFromStarQuest(req,fetcher=fetch){
 const authorization=req.headers.get('authorization')||'';
 if(!/^Bearer sq_[A-Za-z0-9_-]{32,}$/.test(authorization))throw Error('signin_required');
 const response=await fetcher(STATE,{headers:{authorization,accept:'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(6000)});
 if(!response.ok)throw Error('signin_required');
 const value=await response.json();
 const username=String(value?.state?.username||'').toLowerCase().trim();
 if(!value?.ok||!value?.state||!/^[a-z0-9_.-]{2,64}$/.test(username))throw Error('signin_required');
 return username;
}
async function anonID(username,pepper){
 const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pepper),'HMAC',{hash:'SHA-256'},false,['sign']);
 const signed=await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(username));
 return [...new Uint8Array(signed)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
async function readPolls(db,now){
 const [published,choices,tallies,editorial]=await Promise.all([
  db.prepare("SELECT id,kind,title,details,source_url,open_at,closes_at FROM vote_polls WHERE status='open' AND kind='community' AND open_at <= ? AND closes_at > ? ORDER BY open_at DESC LIMIT 12").bind(now,now).all(),
  db.prepare('SELECT poll_id,id,label FROM vote_choices ORDER BY position ASC').all(),
  db.prepare('SELECT poll_id,choice_id,COUNT(*) AS n FROM vote_ballots GROUP BY poll_id,choice_id').all(),
  db.prepare('SELECT poll_id,voice,choice_id,summary,evidence_url,reviewed_at FROM vote_editorial WHERE published=1').all()
 ]);
 if([published,choices,tallies,editorial].some(x=>!Array.isArray(x?.results)))throw Error('invalid_database_result');
 const items=published.results.filter(validatePublicPoll).map(p=>{
  const options=choices.results.filter(x=>x.poll_id===p.id).map(x=>({
   id:x.id,label:x.label,votes:Number(tallies.results.find(t=>t.poll_id===p.id&&t.choice_id===x.id)?.n||0)
  }));
  const recommendations=editorial.results.filter(x=>x.poll_id===p.id&&options.some(y=>y.id===x.choice_id)).map(x=>({
   voice:x.voice,choiceId:x.choice_id,summary:x.summary,evidenceUrl:x.evidence_url,reviewedAt:x.reviewed_at
  })).filter(x=>['infinity','bubbles'].includes(x.voice)&&typeof x.evidenceUrl==='string'&&x.evidenceUrl.startsWith('https://'));
  const total=options.reduce((a,x)=>a+x.votes,0);
  return {id:p.id,kind:'community',title:p.title,details:p.details,sourceUrl:p.source_url,closesAt:p.closes_at,
   options,totalVotes:total,communityLead:communityLead(options),recommendations,officialResult:null,
   disclaimer:'Independent QuantaPhi community poll. Not an official ballot, electoral vote, or certified result.'};
 });
 return items;
}
async function cast(req,env,now){
 if(!env?.VOTES_DB||typeof env.VOTER_PEPPER!=='string'||env.VOTER_PEPPER.length<32)
  return error(req,'voting_not_configured',503);
 let data;
 try{const body=await req.text();if(body.length>800)throw Error();data=JSON.parse(body);}
 catch{return error(req,'invalid_ballot',400)}
 if(!data||!key(data.pollId)||!key(data.choiceId))return error(req,'invalid_ballot',400);
 let username;
 try{username=await userFromStarQuest(req)}
 catch{return error(req,'signin_required',401)}
 const voter=await anonID(username,env.VOTER_PEPPER);
 const db=env.VOTES_DB;
 const poll=await db.prepare("SELECT id FROM vote_polls WHERE id=? AND kind='community' AND status='open' AND open_at <= ? AND closes_at > ?").bind(data.pollId,now,now).first();
 if(!poll)return error(req,'poll_closed_or_not_found',409);
 const valid=await db.prepare('SELECT 1 AS yes FROM vote_choices WHERE poll_id=? AND id=?').bind(data.pollId,data.choiceId).first();
 if(!valid)return error(req,'invalid_choice',400);
 // Rate guard supplements the primary key. A repeat click updates one row, never adds another vote.
 const minute=Math.floor(Date.parse(now)/60000);
 const throttled=await db.prepare('INSERT INTO vote_rates (voter_hash,minute,count) VALUES(?,?,1) ON CONFLICT(voter_hash,minute) DO UPDATE SET count=count+1 WHERE count < 6').bind(voter,minute).run();
 if(!throttled?.success||!throttled?.meta?.changes)return error(req,'slow_down',429);
 const result=await db.prepare('INSERT INTO vote_ballots(poll_id,voter_hash,choice_id,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(poll_id,voter_hash) DO UPDATE SET choice_id=excluded.choice_id,updated_at=excluded.updated_at').bind(data.pollId,voter,data.choiceId,now,now).run();
 if(!result?.success||!result?.meta?.changes)return error(req,'ballot_unverified',503);
 return json(req,{ok:true,accepted:true,pollId:data.pollId,choiceId:data.choiceId,scope:'community_nonbinding',updatedAt:now});
}
export default {
 async fetch(req,env){
  const path=new URL(req.url).pathname,now=new Date().toISOString();
  if(req.method==='OPTIONS')return allowsOrigin(req.headers.get('origin')||'')?json(req,{ok:true}):error(req,'origin_not_allowed',403);
  if(req.method==='POST'&&!allowsOrigin(req.headers.get('origin')||''))return error(req,'origin_not_allowed',403);
  if(path==='/api/stay-in-vote'&&req.method==='GET'){
   if(!env?.VOTES_DB)return error(req,'poll_database_unavailable',503);
   try{return json(req,{ok:true,scope:'community_nonbinding',asOf:now,polls:await readPolls(env.VOTES_DB,now)});}
   catch{return error(req,'poll_database_unavailable',503)}
  }
  if(path==='/api/stay-in-vote/ballot'&&req.method==='POST'){
   try{return await cast(req,env,now);}
   catch{return error(req,'ballot_unverified',503)}
  }
  return error(req,'not_found',404);
 }
};
