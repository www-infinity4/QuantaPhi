// Magoo PhD recording catalog. X Space replays and guest appearances are identified separately.
const ALLOWED_ORIGINS=new Set(["https://quantaphi.org","https://www.quantaphi.org","https://www-infinity4.github.io"]);
function json(data,status,origin){
 const headers={"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=60","vary":"Origin","x-content-type-options":"nosniff"};
 if(ALLOWED_ORIGINS.has(origin))headers["access-control-allow-origin"]=origin;
 return new Response(JSON.stringify(data),{status,headers});
}
function tags(value){try{const result=JSON.parse(value||"[]");return Array.isArray(result)?result.slice(0,12).map(String):[];}catch{return[];}}
export default {
 async fetch(request,env){
  const path=new URL(request.url).pathname,origin=request.headers.get("origin")||"";
  if(request.method!=="GET")return json({ok:false,error:"Read-only catalog"},405,origin);
  try{
   if(path==="/health")return json({ok:true,service:"magoo-phd-spaces",readOnly:true},200,origin);
   if(path==="/v1/hosts"){
    const result=await env.DB.prepare("SELECT host_id AS hostId,display_name AS name,handle,profile_url AS profileUrl FROM hosts ORDER BY host_id").all();
    return json({ok:true,hosts:result.results},200,origin);
   }
   if(["/v1/episodes","/v1/spaces","/v1/recordings"].includes(path)){
    let episodes=[],recordings=[];
    if(path!=="/v1/recordings"){
     const rows=await env.DB.prepare("SELECT episode_id AS id,host_id AS hostId,space_id AS spaceId,title,source_url AS source,episode_date AS date,duration,topics_json AS topics,availability FROM episodes WHERE host_id='hodlmagoo' AND availability IN ('verified','public') ORDER BY episode_date DESC,added_at DESC LIMIT 2000").all();
     episodes=rows.results.map(({topics,...entry})=>({...entry,tags:tags(topics),kind:"space",platform:"X"}));
    }
    if(path!=="/v1/spaces"){
     const rows=await env.DB.prepare("SELECT recording_id AS id,host_id AS hostId,title,source_url AS source,recorded_date AS date,duration,topics_json AS topics,platform,content_kind AS kind FROM recordings WHERE host_id='hodlmagoo' AND status='verified' ORDER BY recorded_date DESC,added_at DESC LIMIT 2000").all();
     recordings=rows.results.map(({topics,...entry})=>({...entry,tags:tags(topics)}));
    }
    const combined=[...episodes,...recordings].sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
    return json({ok:true,hostId:"hodlmagoo",episodes:combined,count:combined.length,spaceCount:episodes.length,recordingCount:recordings.length},200,origin);
   }
   return json({ok:false,error:"Not found"},404,origin);
  }catch(_){return json({ok:false,error:"Catalog temporarily unavailable"},503,origin);}
 }
};
