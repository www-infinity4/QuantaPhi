/* Meta Graph API adapter for verified Bubbles connections. Facebook Pages and
 * Page-linked Instagram professional accounts only. Server-side tokens only. */
const API='https://graph.facebook.com/v26.0';
const SCOPES=Object.freeze({
 'pages.read':['pages_show_list','pages_read_engagement'],
 'pages.publish':['pages_show_list','pages_manage_posts'],
 'instagram.read':['pages_show_list','pages_read_engagement','instagram_basic'],
 'instagram.publish':['pages_show_list','pages_read_engagement','instagram_basic','instagram_content_publish']
});
const numberId=value=>typeof value==='string'&&/^\d{1,40}$/.test(value);
const clean=value=>typeof value==='string'?value.slice(0,2000):'';
const fail=()=>{throw Error('provider_response_invalid')};
async function graph(request,url,token,{method='GET',fields}={}){
 const headers={Accept:'application/json',...(token?{Authorization:'Bearer '+token}:{})};
 const response=await request(url,{method,headers,redirect:'error',signal:AbortSignal.timeout(15000),
  ...(fields?{body:new URLSearchParams(fields)}:{})});
 if(!response.ok)throw Error('meta_http_'+response.status);
 if(Number(response.headers.get('Content-Length'))>500000)throw Error('provider_response_too_large');
 const body=await response.text();if(body.length>500000)throw Error('provider_response_too_large');
 let data;try{data=JSON.parse(body)}catch{fail()}
 if(!data||typeof data!=='object'||data.error)fail();return data;
}
export function metaAdapter(config,request=fetch){
 const redirect=new URL(config.redirectUri||'');
 if(redirect.protocol!=='https:'||redirect.search||redirect.hash||!config.clientId||!config.clientSecret)throw Error('provider_not_configured');
 return {
  id:'meta',
  authorization({state,actions}){
   if(!Array.isArray(actions)||!actions.length||actions.some(a=>!Object.hasOwn(SCOPES,a)))throw Error('unsupported_action');
   const scopes=[...new Set(actions.flatMap(a=>SCOPES[a]))];
   const url=new URL('https://www.facebook.com/v26.0/dialog/oauth');
   url.search=new URLSearchParams({client_id:config.clientId,redirect_uri:redirect.href,
    response_type:'code',state,scope:scopes.join(',')}).toString();
   return url.href;
  },
  async exchange({code,actions}){
   const short=new URL(API+'/oauth/access_token');short.search=new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,redirect_uri:redirect.href,code}).toString();
   const first=await graph(request,short.href,'');if(!first.access_token)fail();
   const long=new URL(API+'/oauth/access_token');long.search=new URLSearchParams({grant_type:'fb_exchange_token',client_id:config.clientId,client_secret:config.clientSecret,fb_exchange_token:first.access_token}).toString();
   const tokens=await graph(request,long.href,'');if(typeof tokens.access_token!=='string'||!Number.isFinite(tokens.expires_in)||tokens.expires_in<=0)fail();
   const identity=await graph(request,API+'/me?fields=id,name',tokens.access_token);
   if(!numberId(identity.id))fail();
   const permissions=await graph(request,API+'/me/permissions?limit=100',tokens.access_token);
   if(!Array.isArray(permissions.data))fail();
   const granted=new Set(permissions.data.filter(p=>p.status==='granted').map(p=>p.permission));
   return {accessToken:tokens.access_token,refreshToken:null,expiresIn:tokens.expires_in,
    subject:identity.id,label:clean(identity.name)||'Meta account',
    grantedActions:actions.filter(a=>SCOPES[a].every(p=>granted.has(p)))};
  },
  async refresh(){throw Error('reconnect_required')},
  async revoke({accessToken}){await graph(request,API+'/me/permissions',accessToken,{method:'DELETE'})}
 };
}
async function managedPages(request,token){
 const data=await graph(request,API+'/me/accounts?fields=id,name,access_token,tasks,instagram_business_account%7Bid,username%7D&limit=100',token);
 if(!Array.isArray(data.data))fail();return data.data.filter(p=>numberId(p.id)&&typeof p.access_token==='string');
}
function pageList(pages){return pages.map(p=>({id:p.id,name:clean(p.name),instagram:p.instagram_business_account&&numberId(p.instagram_business_account.id)?{id:p.instagram_business_account.id,username:clean(p.instagram_business_account.username)}:null,
 canPublish:Array.isArray(p.tasks)&&p.tasks.includes('CREATE_CONTENT')}))}
const validImage=url=>{
 try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='quantaphi.org'&&!u.username&&!u.password&&!u.port&&/\.(?:jpg|jpeg|png)(?:$|\?)/i.test(u.pathname)}catch{return false}
};
const compactPosts=(data,instagram)=>{
 if(!Array.isArray(data?.data))fail();
 return data.data.slice(0,20).filter(item=>numberId(item.id)||/^[A-Za-z0-9_]+$/.test(item.id||'')).map(item=>({
  id:item.id,caption:clean(item.caption||item.message),permalink:typeof item.permalink==='string'?item.permalink:typeof item.permalink_url==='string'?item.permalink_url:null,
  image:typeof item.media_url==='string'?item.media_url:typeof item.full_picture==='string'?item.full_picture:typeof item.thumbnail_url==='string'?item.thumbnail_url:null,
  at:typeof item.timestamp==='string'?item.timestamp:typeof item.created_time==='string'?item.created_time:null,
  type:instagram?clean(item.media_type):'POST',source:instagram?'Instagram':'Facebook'
 }))
};
export async function executeMeta(service,{userId,id,operation,pageId,message,imageUrl,confirmed},request=fetch){
 const action=({'pages':'pages.read','facebook.feed':'pages.read','facebook.publish':'pages.publish','instagram.feed':'instagram.read','instagram.publish':'instagram.publish'})[operation];
 if(!action)throw Error('unsupported_action');
 return service.withCredential({userId,id,provider:'meta',action},async token=>{
  const pages=await managedPages(request,token);
  if(operation==='pages')return {ok:true,pages:pageList(pages),source:'Meta Graph API'};
  const page=pages.find(p=>p.id===pageId);if(!page)throw Error('meta_page_not_authorized');
  if(operation==='facebook.feed'){
   const data=await graph(request,API+'/'+page.id+'/posts?fields=id,message,created_time,permalink_url,full_picture&limit=20',page.access_token);
   return {ok:true,posts:compactPosts(data,false),page:clean(page.name),source:'Meta Graph API'};
  }
  if(operation==='facebook.publish'){
   if(confirmed!==true||!Array.isArray(page.tasks)||!page.tasks.includes('CREATE_CONTENT'))throw Error('meta_publish_not_confirmed');
   if(typeof message!=='string'||!message.trim()||message.length>2000)throw Error('meta_content_invalid');
   const result=await graph(request,API+'/'+page.id+'/feed',page.access_token,{method:'POST',fields:{message:message.trim()}});
   if(!result.id)fail();return {ok:true,published:true,postId:String(result.id),source:'Meta Graph API'};
  }
  const ig=page.instagram_business_account?.id;if(!numberId(ig))throw Error('meta_instagram_not_linked');
  if(operation==='instagram.feed'){
   const data=await graph(request,API+'/'+ig+'/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink&limit=20',page.access_token);
   return {ok:true,posts:compactPosts(data,true),page:clean(page.name),source:'Meta Graph API'};
  }
  if(confirmed!==true||!validImage(imageUrl)||typeof message!=='string'||message.length>2000)throw Error('meta_content_invalid');
  const draft=await graph(request,API+'/'+ig+'/media',page.access_token,{method:'POST',fields:{image_url:imageUrl,caption:message}});
  if(!numberId(draft.id))fail();
  const published=await graph(request,API+'/'+ig+'/media_publish',page.access_token,{method:'POST',fields:{creation_id:draft.id}});
  if(!numberId(published.id))fail();return {ok:true,published:true,postId:published.id,source:'Meta Graph API'};
 });
}
