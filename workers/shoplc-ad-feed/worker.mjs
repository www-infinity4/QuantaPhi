/* Cloudflare Shop LC permitted-feed adapter. Never scrape shoplc.com or infer
 * feed rights from a browser request. No visitor identities, payments or coins.
 * Merchant-approved credentials are server secrets, not committed source. */
const MAX_AGE_MS=15*60*1000;
const MAX_ITEMS=24;
const MAX_RESPONSE_BYTES=1000000;
const EMPTY_HEADERS={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Type':'application/json; charset=utf-8'};

const txt=(value,n=180)=>typeof value==='string'?value.replace(/\s+/g,' ').trim().slice(0,n):'';
function productUrl(value){
 try{
  const u=new URL(String(value||''));
  return u.protocol==='https:'&&!u.username&&!u.password&&
   ['shoplc.com','www.shoplc.com'].includes(u.hostname.toLowerCase())&&
   u.pathname.startsWith('/products/')?u.href:'';
 }catch{return ''}
}
function imageUrl(value){
 try{
  const u=new URL(String(value||''));
  const h=u.hostname.toLowerCase();
  return u.protocol==='https:'&&!u.username&&!u.password&&
   (h==='cdn.shopify.com'||h==='shoplc.com'||h.endsWith('.shoplc.com'))?u.href:'';
 }catch{return ''}
}
export function partnerApproved(env){
 return !!env&&env.SHOPLC_PARTNER_APPROVED==='yes'&&
  env.SHOPLC_PRODUCT_FEED_APPROVED==='yes'&&
  env.SHOPLC_MEDIA_LICENSE_APPROVED==='yes'&&
  txt(env.SHOPLC_APPROVAL_REFERENCE,180).length>=8;
}
const numberTime=v=>{const n=Number(v);return Number.isFinite(n)?n:NaN};
function normalizeRecord(raw,now){
 if(!raw||typeof raw!=='object')return null;
 const code=txt(raw.productCode||raw.product_code,12);
 const id=txt(raw.itemId||raw.id,40);
 const href=productUrl(raw.href),image=imageUrl(raw.image||raw.imageUrl);
 const title=txt(raw.title,240),expiresAt=numberTime(raw.expiresAt||raw.expires_at);
 if(!/^[0-9]{6,9}$/.test(code)||id!=='product:'+code||!href||!image||
    title.length<14||/^Shop LC item \d+/i.test(title)||
    raw.available===false||raw.inStock===false||
    !Number.isFinite(expiresAt)||expiresAt<=now)return null;
 const priceRaw=raw.price;
 const numericPrice=Number(priceRaw);
 const price=priceRaw!==null&&priceRaw!==''&&priceRaw!==undefined&&
  Number.isFinite(numericPrice)&&numericPrice>0&&numericPrice<1000000?
   Math.round(numericPrice*100)/100:null;
 const categoryText=[raw.category,title].map(s=>txt(s,300)).join(' ').toLowerCase();
 const category=/ring|gemstone|jewel|garnet|diamond|necklace|bracelet|earring|gold|platinum|tanzanite/.test(categoryText)?
  'jewelry':/furniture|cookware|kitchen|bedding|home/.test(categoryText)?
  'home':/fashion|dress|shoe|apparel|shirt/.test(categoryText)?'fashion':'other';
 return {id,itemId:id,productCode:code,title,href,image,price,
  category,checkedAt:now,expiresAt:Math.min(expiresAt,now+MAX_AGE_MS),
  onAir:raw.onAir===true, // only provider-reported; never infer TV appearance
  saleVerified:raw.saleVerified===true&&Number(raw.saleEndsAt)>now,
  purchaseVerified:false};
}
export function normalizePartnerProducts(rows,now=Date.now()){
 if(!Array.isArray(rows)||!Number.isFinite(now))return [];
 const seen=new Set(),items=[];
 for(const raw of rows.slice(0,100)){
  const item=normalizeRecord(raw,now);
  if(!item||seen.has(item.id))continue;
  items.push(item);seen.add(item.id);
  if(items.length>=MAX_ITEMS)break;
 }
 return items;
}
function response(body,status=200){
 return new Response(JSON.stringify(body),{status,headers:EMPTY_HEADERS});
}
function unavailable(code){
 return response({ok:false,items:[],error:code},503);
}
export async function readPublishedProducts(env,now=Date.now()){
 if(!partnerApproved(env))return unavailable('merchant_approval_missing');
 if(!env.DB)return unavailable('database_not_configured');
 try{
  const last=await env.DB.prepare('SELECT synced_at FROM shoplc_sync_status WHERE id = 1').bind().first();
  const checkedAt=Number(last?.synced_at);
  if(!Number.isFinite(checkedAt)||checkedAt>now||now-checkedAt>MAX_AGE_MS)
   return unavailable('feed_unverified_or_stale');
  const rows=await env.DB.prepare('SELECT id,product_code AS productCode,title,href,image,price,category,checked_at AS checkedAt,expires_at AS expiresAt,on_air AS onAir,sale_verified AS saleVerified FROM shoplc_ads WHERE expires_at > ?1 ORDER BY on_air DESC, checked_at DESC LIMIT 24').bind(now).all();
  const items=(rows?.results||[]).map(row=>normalizeRecord({
   ...row,itemId:row.id,available:true,expiresAt:row.expiresAt,
   onAir:row.onAir===1||row.onAir===true,
   saleVerified:row.saleVerified===1||row.saleVerified===true,
   saleEndsAt:row.expiresAt
  },Number(row.checkedAt))).filter(item=>item&&item.expiresAt>now);
  return response({ok:true,items,checkedAt,
   rights:{provider:'Shop LC',productFeedApproved:true,productImagesApproved:true},
   note:'Merchant-authorized product feed. Not evidence of on-air appearance or purchase.'});
 }catch{
  return unavailable('database_read_unavailable');
 }
}
function partnerFeedUrl(env){
 try{
  const url=new URL(String(env.SHOPLC_PARTNER_FEED_URL||''));
  const host=txt(env.SHOPLC_PARTNER_FEED_HOST,180).toLowerCase();
  if(url.protocol!=='https:'||url.username||url.password||url.hostname.toLowerCase()!==host||!host)return null;
  return url.href;
 }catch{return null}
}
export async function refreshFromApprovedFeed(env,now=Date.now(),fetcher=fetch){
 if(!partnerApproved(env))return {ok:false,error:'merchant_approval_missing'};
 if(!env.DB)return {ok:false,error:'database_not_configured'};
 const url=partnerFeedUrl(env);
 if(!url||!txt(env.SHOPLC_PARTNER_FEED_TOKEN,2048))return {ok:false,error:'approved_feed_not_configured'};
 try{
  const result=await fetcher(url,{
   method:'GET',redirect:'manual',cache:'no-store',
   headers:{Accept:'application/json',Authorization:'Bearer '+env.SHOPLC_PARTNER_FEED_TOKEN},
   signal:AbortSignal.timeout(10000)
  });
  if(result.status!==200||!result.ok)return {ok:false,error:'authorized_feed_http_unavailable'};
  const length=Number(result.headers?.get?.('content-length')||0);
  if(length>MAX_RESPONSE_BYTES)return {ok:false,error:'feed_exceeds_size_limit'};
  const body=await result.text();
  if(body.length>MAX_RESPONSE_BYTES)return {ok:false,error:'feed_exceeds_size_limit'};
  const data=JSON.parse(body);
  if(!data||!Array.isArray(data.items)||data.items.length>100)
   return {ok:false,error:'authorized_feed_schema_invalid'};
  const items=normalizePartnerProducts(data.items,now);
  if(data.items.length&&!items.length)return {ok:false,error:'no_valid_authorized_products'};
  const statements=[env.DB.prepare('DELETE FROM shoplc_ads').bind()];
  for(const item of items){
   statements.push(env.DB.prepare(
    'INSERT INTO shoplc_ads (id, product_code, title, href, image, price, category, checked_at, expires_at, on_air, sale_verified) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)'
   ).bind(item.id,item.productCode,item.title,item.href,item.image,item.price,item.category,now,item.expiresAt,item.onAir?1:0,item.saleVerified?1:0));
  }
  statements.push(env.DB.prepare(
   'INSERT INTO shoplc_sync_status (id,synced_at,count) VALUES (1,?1,?2) ON CONFLICT(id) DO UPDATE SET synced_at=excluded.synced_at,count=excluded.count'
  ).bind(now,items.length));
  await env.DB.batch(statements);
  return {ok:true,count:items.length,checkedAt:now};
 }catch{
  // Fail closed. Old public records cease to qualify once last sync expires.
  return {ok:false,error:'feed_refresh_failed'};
 }
}
export default {
 async fetch(request,env){
  const u=new URL(request.url);
  if(u.pathname!=='/api/shoplc/authorized-sale-feed')return response({ok:false,error:'not_found'},404);
  if(request.method!=='GET'&&request.method!=='HEAD')return response({ok:false,error:'method_not_allowed'},405);
  const result=await readPublishedProducts(env);
  if(request.method==='HEAD')return new Response(null,{status:result.status,headers:result.headers});
  return result;
 },
 async scheduled(_event,env,ctx){
  ctx.waitUntil(refreshFromApprovedFeed(env).then(r=>{
   if(!r.ok)console.warn('shoplc_approved_feed_sync_unavailable',r.error);
  }));
 }
};
