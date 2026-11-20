/* Read-only public D1 episode API for QuantaPhi's nonsexual family channel.
 * No changes to existing account settings, wallets, ads or adult catalog. */
const origins=new Set(['https://quantaphi.org','https://www.quantaphi.org']);
const json=(data,status,origin)=>new Response(JSON.stringify(data),{
 status,headers:{'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff',
  'Vary':'Origin',...(origins.has(origin)?{'Access-Control-Allow-Origin':origin}: {})}
});
export async function handleFamilyTvRequest(request,env){
 const url=new URL(request.url);
 const origin=request.headers.get('origin')||'';
 if(url.pathname!=='/episodes')return json({error:'not_found'},404,origin);
 if(request.method==='OPTIONS'){
  return new Response(null,{status:204,headers:{
   'Access-Control-Allow-Methods':'GET, OPTIONS',
   'Access-Control-Allow-Headers':'Accept',
   'Vary':'Origin',
   ...(origins.has(origin)?{'Access-Control-Allow-Origin':origin}:{})
  }});
 }
 if(request.method!=='GET')return json({error:'method_not_allowed'},405,origin);
 if(!env?.CATALOG)return json({error:'database_unavailable'},503,origin);
 try{
  const query="SELECT video_id,channel_key,title,publisher,publisher_url,source_url,topic,observed_at,published_at,content_boundary FROM family_parenting_videos WHERE content_boundary = 'family-education' ORDER BY publisher ASC, observed_at DESC, video_id ASC LIMIT 100";
  const rows=await env.CATALOG.prepare(query).all();
  return json({channel:'family-parenting-tv',partial:true,checkedAt:new Date().toISOString(),videos:rows.results||[]},200,origin);
 }catch{return json({error:'database_unavailable'},503,origin);}
}
export default {fetch:handleFamilyTvRequest};
