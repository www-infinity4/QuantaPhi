/* QuantaPhi's same-origin public eBay Browse API adapter.
 * Secrets never enter browser JavaScript or a GitHub commit.
 * This does not implement eBay member checkout or bidding. */
const EBAY_API='https://api.ebay.com';
let bearer='',expiresAt=0;
const reply=(data,status=200)=>Response.json(data,{status,headers:{
 'Cache-Control':status===200?'public, max-age=20':'no-store',
 'X-Content-Type-Options':'nosniff'
}});
async function token(env,fetcher){
 if(bearer&&Date.now()<expiresAt)return bearer;
 const secret=btoa(env.EBAY_CLIENT_ID+':'+env.EBAY_CLIENT_SECRET);
 const response=await fetcher(EBAY_API+'/identity/v1/oauth2/token',{
  method:'POST',
  headers:{'Authorization':'Basic '+secret,'Content-Type':'application/x-www-form-urlencoded'},
  body:'grant_type=client_credentials&scope='+encodeURIComponent('https://api.ebay.com/oauth/api_scope'),
  signal:AbortSignal.timeout(7000)
 });
 if(!response.ok)throw Error('ebay_auth_failed');
 const data=await response.json();
 if(typeof data.access_token!=='string'||!data.access_token)throw Error('ebay_token_missing');
 bearer=data.access_token;
 expiresAt=Date.now()+Math.max(30,Number(data.expires_in||1800)-90)*1000;
 return bearer;
}
export async function ebayQuickCardsAPI(request,env,{fetcher=fetch}={}){
 if(request.method!=='GET')return reply({ok:false,error:'method_not_allowed'},405);
 if(!env.EBAY_CLIENT_ID||!env.EBAY_CLIENT_SECRET){
  return reply({ok:false,error:'ebay_browse_not_configured'},503);
 }
 const u=new URL(request.url);
 const mode=u.searchParams.get('mode');
 const q=(u.searchParams.get('q')||'').trim();
 const offset=Number(u.searchParams.get('offset')||0);
 if(!['auction','buy'].includes(mode)||q.length<2||q.length>85||
    !Number.isInteger(offset)||offset<0||offset>960)
  return reply({ok:false,error:'invalid_search'},400);
 const limit=20;
 const search=new URL(EBAY_API+'/buy/browse/v1/item_summary/search');
 search.searchParams.set('q',q);
 search.searchParams.set('limit',String(limit));
 search.searchParams.set('offset',String(offset));
 search.searchParams.set('filter',mode==='auction'?
  'buyingOptions:{AUCTION},bidCount:[3..]':'buyingOptions:{FIXED_PRICE}');
 if(mode==='auction')search.searchParams.set('sort','endingSoonest');
 try{
  const appToken=await token(env,fetcher);
  const response=await fetcher(search.href,{headers:{
   'Authorization':'Bearer '+appToken,'X-EBAY-C-MARKETPLACE-ID':'EBAY_US',
   'Accept':'application/json'},signal:AbortSignal.timeout(9500)});
  if(!response.ok)return reply({ok:false,error:'ebay_browse_unavailable'},502);
  const body=await response.json();
  const summaries=Array.isArray(body.itemSummaries)?body.itemSummaries.slice(0,limit):[];
  return reply({ok:true,provider:'eBay Browse API',mode,
   itemSummaries:summaries,offset,limit,
   total:Number.isFinite(body.total)?body.total:null,
   fetchedAt:new Date().toISOString()});
 }catch{
  return reply({ok:false,error:'ebay_browse_unavailable'},502);
 }
}
