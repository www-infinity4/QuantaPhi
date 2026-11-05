import {validateGallerySubmission} from '../../media-star-gallery-core.mjs';
const allowed=new Set(['https://quantaphi.org','https://www.quantaphi.org','https://www-infinity4.github.io','http://localhost:8000','http://127.0.0.1:8000']);
const fail=(code,status=400)=>Object.assign(new Error(code),{status});
const cors=req=>{
 const origin=req.headers.get('Origin')||'';
 return {...(allowed.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),
  'Access-Control-Allow-Headers':'Authorization,Content-Type',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
};
const json=(req,body,status=200)=>Response.json(body,{status,headers:cors(req)});
async function owner(req,env){
 const token=/^Bearer (sq_[A-Za-z0-9_-]{32,})$/.exec(req.headers.get('Authorization')||'');
 if(!token)throw fail('wallet_login_required',401);
 if(!env.IDENTITY_DB)throw fail('identity_db_unavailable',503);
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token[1]));
 const hash=Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
 const account=await env.IDENTITY_DB.prepare(
  'SELECT a.id FROM accounts a JOIN account_devices d ON a.id=d.account_id WHERE d.token_hash=?1'
 ).bind(hash).first();
 if(!account?.id)throw fail('invalid_wallet_session',401);
 return account.id;
}
async function cards(req,env){
 if(!env.DB)throw fail('gallery_db_unavailable',503);
 const result=await env.DB.prepare(
  "SELECT id,title,description,source_url,image_url,topics_json,review_receipt,media_mode,created_at,owner_id FROM media_star_gallery_submissions WHERE status='approved' AND rights_verified=1 AND image_verified=1 AND review_receipt IS NOT NULL ORDER BY created_at DESC LIMIT 150"
 ).all();
 const entries=(result.results||[]).flatMap(item=>{
  try{
   const topics=JSON.parse(item.topics_json);
   if(!Array.isArray(topics))return [];
   // Reviewed records only. Owner ID stays private; no publisher wallet or
   // personally identifying internal account fields are exposed.
   return [{id:item.id,title:item.title,description:item.description,
    sourceUrl:item.source_url,imageUrl:item.image_url,topics,reviewReceipt:item.review_receipt,
    mediaMode:item.media_mode,status:'approved',rightsVerified:true,imageVerified:true}];
  }catch{return []}
 });
 return json(req,{ok:true,source:'rights_reviewed_gallery',cards:entries,coverage:'most_recent_150',dataComplete:entries.length<150,
  walletPayoutsIncluded:false});
}
async function submit(req,env){
 if(!allowed.has(req.headers.get('Origin')||''))throw fail('origin_not_allowed',403);
 if(!env.DB)throw fail('gallery_db_unavailable',503);
 const ownerId=await owner(req,env);
 if(!req.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))throw fail('json_required',415);
 if(Number(req.headers.get('Content-Length')||0)>3072)throw fail('submission_too_large',413);
 const raw=await req.text();if(raw.length>3072)throw fail('submission_too_large',413);
 let data;try{data=validateGallerySubmission(JSON.parse(raw))}
 catch(e){throw fail(e.message==='invalid_submission'?'invalid_submission':e.message||'invalid_submission')}
 const idBytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ownerId+'\0'+data.sourceUrl));
 const id='ms-'+Array.from(new Uint8Array(idBytes),b=>b.toString(16).padStart(2,'0')).join('').slice(0,32);
 const existing=await env.DB.prepare('SELECT id,status FROM media_star_gallery_submissions WHERE id=?1 AND owner_id=?2').bind(id,ownerId).first();
 if(existing)return json(req,{ok:true,submissionId:id,submitted:false,status:existing.status,
  paid:false,spendableAward:false});
 const cutoff=Date.now()-86400000;
 const quota=await env.DB.prepare('SELECT COUNT(*) AS n FROM media_star_gallery_submissions WHERE owner_id=?1 AND created_at>=?2').bind(ownerId,cutoff).first();
 if(Number(quota?.n||0)>=3)throw fail('daily_review_queue_limit',429);
 // This is ONLY a request for independent review, not a public card or a
 // grant of streaming/distribution rights. Never auto-approve self-claims.
 const ts=Date.now();
 await env.DB.prepare(
  "INSERT OR IGNORE INTO media_star_gallery_submissions (id,owner_id,title,description,source_url,image_url,topics_json,rights_declared,status,created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,1,'pending_review',?8)"
 ).bind(id,ownerId,data.title,data.description,data.sourceUrl,data.imageUrl,
  JSON.stringify(data.topics),ts).run();
 return json(req,{ok:true,submissionId:id,submitted:true,status:'pending_review',
  public:false,paid:false,spendableAward:false},202);
}
export default {async fetch(req,env){
 try{
  const path=new URL(req.url).pathname;
  if(req.method==='OPTIONS'&&allowed.has(req.headers.get('Origin')||''))return new Response(null,{status:204,headers:cors(req)});
  if(path==='/health'&&req.method==='GET')return json(req,{ok:true,service:'media-star-gallery',
   configured:Boolean(env.DB&&env.IDENTITY_DB),publicationsRequireReview:true,payments:false});
  if(path==='/v1/cards'&&req.method==='GET')return await cards(req,env);
  if(path==='/v1/submissions'&&req.method==='POST')return await submit(req,env);
  return json(req,{ok:false,error:'not_found'},404);
 }catch(e){return json(req,{ok:false,error:e.message||'service_error'},e.status||500)}
}};
