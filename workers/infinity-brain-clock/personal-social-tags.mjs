/* Per-user Bubbles social instructions; no public hashtag confers ownership.
 * An individual X numeric author ID must be bound to a wallet-scoped profile
 * with a fresh proof-of-control post before we ingest commands.
 */
const ID=/^[0-9]{1,24}$/;
export function bubbleTag(name){
 const word=String(name||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
   .toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,32);
 return word.length>=2?'#'+word:null;
}
export function parsePersonalPost(post,profile){
 if(!profile||profile.verified!==1||!profile.command_tag)return null;
 const provider=profile.provider,tag=profile.command_tag.toLowerCase();
 if(!/^#[a-z0-9]{2,32}$/.test(tag))return null;
 const id=String(post?.id||''),owner=String(profile.social_account_id||'');
 const from=provider==='x'?String(post?.author_id||''):provider==='facebook_page'?String(post?.from?.id||''):'';
 const body=provider==='x'?post?.text:post?.message;
 if(!ID.test(owner)||!ID.test(id)||from!==owner||typeof body!=='string'||body.length>2200)return null;
 if(provider==='x'&&Array.isArray(post.referenced_tweets)&&post.referenced_tweets.some(r=>r?.type==='retweeted'))return null;
 if(provider==='facebook_page'&&post.is_shared_story===true)return null;
 // Hashtag is a token, never a substring of #alberta or an HTTPS URL fragment.
 const pattern=new RegExp('(^|[\\s([{])'+tag+'(?=$|[\\s\\])}:,.!?;])','i');
 if(!pattern.test(body))return null;
 const command=body.replace(pattern,(_,prefix)=>prefix).trim();
 if(command.length<10||/^(verify|connect) [0-9a-f]{32}$/i.test(command))return null;
 return {provider,sourceId:provider+':'+id,sourceUrl:provider==='x'?'https://x.com/i/status/'+id:'https://www.facebook.com/'+id,
   authorId:owner,command,tag,verifiedSource:true,privileged:false,automaticExecution:false};
}
export async function resolveXAccount(username,{token,fetchImpl=fetch}={}){
 const name=String(username||'').replace(/^@/,'').trim();
 if(!/^[a-zA-Z0-9_]{1,15}$/.test(name)||typeof token!=='string'||token.length<12)
  return {ok:false,error:'x_username_or_api_unavailable'};
 let result;try{
  result=await fetchImpl('https://api.x.com/2/users/by/username/'+encodeURIComponent(name),{
   method:'GET',redirect:'error',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
   signal:AbortSignal.timeout(12000)
  });
 }catch{return {ok:false,error:'x_lookup_unreachable'}}
 if(!result.ok)return {ok:false,error:'x_lookup_http_'+result.status};
 let data;try{data=await result.json()}catch{return {ok:false,error:'x_lookup_bad_response'}}
 if(!ID.test(String(data?.data?.id||'')))return {ok:false,error:'x_account_not_found'};
 return {ok:true,accountId:String(data.data.id),username:String(data.data.username||name)};
}
export async function fetchOwnedXPosts({accountId,token,fetchImpl=fetch,maxPages=2}){
 if(!ID.test(String(accountId||''))||typeof token!=='string'||token.length<12||/[\r\n]/.test(token))
  return {ok:false,error:'x_api_not_configured',posts:[]};
 let next='',posts=[];
 for(let p=0;p<Math.max(1,Math.min(maxPages,3));p++){
  const url=new URL('https://api.x.com/2/users/'+accountId+'/tweets');
  url.searchParams.set('max_results','100');url.searchParams.set('exclude','retweets');
  url.searchParams.set('tweet.fields','author_id,created_at,referenced_tweets');
  if(next)url.searchParams.set('pagination_token',next);
  let res;try{res=await fetchImpl(url.toString(),{method:'GET',redirect:'error',
   headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(12000)})}
  catch{return {ok:false,error:'x_api_unreachable',posts:[]};}
  if(!res.ok)return {ok:false,error:'x_api_http_'+res.status,posts:[]};
  let data;try{data=await res.json()}catch{return {ok:false,error:'x_api_bad_json',posts:[]}}
  if(!data||!Array.isArray(data.data)&&data.data!==undefined)return {ok:false,error:'x_api_invalid_response',posts:[]};
  posts.push(...(data.data||[]).filter(v=>v&&String(v.author_id||'')===accountId&&ID.test(String(v.id||''))));
  next=data.meta?.next_token||'';
  if(!/^[A-Za-z0-9_-]{1,512}$/.test(next))break;
 }
 return {ok:true,posts:posts.slice(0,250),mayHaveMore:Boolean(next)};
}
export function verificationTokenFromPost(post,tag,accountId,issuedAt){
 if(!post||String(post.author_id)!==String(accountId)||!ID.test(String(post.id||'')))return null;
 const at=Date.parse(post.created_at||'');
 if(!Number.isFinite(at)||at<issuedAt-60000||at>Date.now()+120000)return null;
 const text=String(post.text||'');
 const match=new RegExp('(?:^|\\s)'+tag+'\\s+verify\\s+([0-9a-f]{32})(?:\\s|$)','i').exec(text);
 return match?.[1]?.toLowerCase()||null;
}

/* Public #bubbles is an ideas channel; source ID is provenance, never authority. */
export function parseCommunityBubblesPost(post){
 const id=String(post?.id||''),authorId=String(post?.author_id||'');
 if(!ID.test(id)||!ID.test(authorId)||typeof post.text!=='string'||post.text.length>2200)return null;
 if(Array.isArray(post.referenced_tweets)&&post.referenced_tweets.some(x=>x?.type==='retweeted'))return null;
 const pattern=/(^|[\\s([{])#bubbles(?=$|[\\s\\])}:,.!?;])/i;
 if(!pattern.test(post.text))return null;
 const suggestion=post.text.replace(pattern,(_,prefix)=>prefix).trim();
 if(suggestion.length<8)return null;
 return {sourceId:'x:'+id,sourceUrl:'https://x.com/i/status/'+id,authorId,
   suggestion,verifiedOwner:false,ownerPrivilege:false,execute:false};
}
export async function searchPublicBubblesX({token,fetchImpl=fetch}={}){
 if(typeof token!=='string'||token.length<12||/[\\r\\n]/.test(token))
  return {ok:false,error:'x_public_search_not_configured',posts:[]};
 const url=new URL('https://api.x.com/2/tweets/search/recent');
 url.searchParams.set('query','#bubbles -is:retweet');
 url.searchParams.set('max_results','25');
 url.searchParams.set('tweet.fields','author_id,created_at,referenced_tweets');
 let r;try{r=await fetchImpl(url.toString(),{method:'GET',redirect:'error',
   headers:{Authorization:'Bearer '+token,Accept:'application/json'},
   signal:AbortSignal.timeout(12000)})}
 catch{return {ok:false,error:'x_public_search_unreachable',posts:[]};}
 if(!r.ok)return {ok:false,error:'x_public_search_http_'+r.status,posts:[]};
 let response;try{response=await r.json()}catch{return {ok:false,error:'x_public_search_bad_json',posts:[]}}
 if(!response||response.data!==undefined&&!Array.isArray(response.data))
  return {ok:false,error:'x_public_search_invalid_response',posts:[]};
 return {ok:true,posts:(response.data||[]).map(parseCommunityBubblesPost).filter(Boolean).slice(0,25),
   note:'A bounded public X search, not a search of every website, post or social network.'};
}
