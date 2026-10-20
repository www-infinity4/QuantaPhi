// Only read-only GitHub search. No repository selection, writes, or token exposure.
// The owner endpoint must authenticate the caller before invoking this module.
export async function searchGithubCode(env, body, request=fetch) {
 const query=String(body.query||'').trim().replace(/\s+/g,' ').slice(0,160);
 if(query.length<2||/[^\p{L}\p{N}\s._+@#/-]/u.test(query))
  return {ok:false,status:'blocked',error:'invalid_search_query'};
 const scope=body.scope==='owner'?'owner':'public';
 const scoped=scope==='owner'?query+' user:www-infinity4':query;
 const searchUrl='https://github.com/search?q='+encodeURIComponent(scoped)+'&type=code';
 const token=env.GITHUB_TOKEN;
 if(!token&&scope==='owner')
  return {ok:false,status:'blocked',error:'github_owner_search_requires_connection',scope,query,searchUrl,complete:false};
 if(token){
  const response=await request('https://api.github.com/search/code?q='+encodeURIComponent(scoped)+'&per_page=15',{
   redirect:'manual',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github.text-match+json',
    'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Bubbles-GitHub-Code-Research'},signal:AbortSignal.timeout(12000)});
  if(response.ok){
   const data=await response.json();if(!Array.isArray(data.items))throw Error('github_code_search_invalid');
   return {ok:true,status:'code_search_results',scope,query,searchUrl,total:data.total_count,
    complete:data.incomplete_results===false&&data.total_count<=data.items.length,
    coverage:'GitHub indexed code matches; first 15 matching files',
    results:data.items.map(item=>({repository:String(item.repository?.full_name||'').slice(0,160),
     path:String(item.path||'').slice(0,240),url:String(item.html_url||'').slice(0,700),
     sha:String(item.sha||'').slice(0,40),
     excerpt:Array.isArray(item.text_matches)?item.text_matches.map(m=>String(m.fragment||'').slice(0,220)).join(' ').slice(0,420):''}))
     .filter(item=>item.url.startsWith('https://github.com/'))};
  }
  if(scope==='owner')
   return {ok:false,status:'blocked',error:'github_code_search_http_'+response.status,scope,query,searchUrl,complete:false};
 }
 // GitHub repository search is public without a token. Name and description
 // results are useful, but NEVER claim this fallback searched GitHub files.
 const response=await request('https://api.github.com/search/repositories?q='+encodeURIComponent(query)+'&per_page=12',{
  redirect:'manual',headers:{Accept:'application/vnd.github+json','User-Agent':'Bubbles-Public-GitHub-Research'},
  signal:AbortSignal.timeout(12000)});
 if(!response.ok)return {ok:false,status:'blocked',error:'github_public_search_http_'+response.status,scope,query,searchUrl,complete:false};
 const data=await response.json();if(!Array.isArray(data.items))throw Error('github_repository_search_invalid');
 return {ok:true,status:'repository_search_fallback',scope,query,searchUrl,total:data.total_count,complete:false,
  coverage:'Public GitHub repository titles and descriptions only; GitHub code files were not searched.',
  results:data.items.map(item=>({repository:String(item.full_name||'').slice(0,160),path:'',url:String(item.html_url||'').slice(0,700),
   excerpt:String(item.description||'').slice(0,420)})).filter(item=>item.url.startsWith('https://github.com/'))};
}
