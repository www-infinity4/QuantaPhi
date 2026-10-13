// Infinity 2026® collector cards.
// Canonical StarQuest debit, serial and receipt live in ONE IDENTITY_DB transaction.
// Quant data is an idempotent projection; it never issues or charges a card.
const PRICE = 1;
const ART_PREFIX = 'collector-cards/';
const json = (payload,status=200)=>({payload,status});
const clean = (v,max=200)=>String(v||'').trim().slice(0,max);
const validId = v=>/^ic_[a-f0-9-]{36}$/.test(String(v||''));
const validKey = v=>/^[a-zA-Z0-9:_-]{16,160}$/.test(String(v||''));

export async function ensureCollectorSchema(env){
 const db=env.IDENTITY_DB;
 await db.batch([
  db.prepare("CREATE TABLE IF NOT EXISTS qp_collector_designs(design_id TEXT PRIMARY KEY,creator_account_id TEXT NOT NULL,title TEXT NOT NULL,art_key TEXT NOT NULL UNIQUE,art_mime TEXT NOT NULL,art_sha256 TEXT NOT NULL,render_id TEXT NOT NULL,prompt TEXT NOT NULL,created_at INTEGER NOT NULL,is_active INTEGER NOT NULL DEFAULT 1)"),
  db.prepare("CREATE TABLE IF NOT EXISTS qp_collector_copies(token_id TEXT PRIMARY KEY,receipt_id TEXT NOT NULL UNIQUE,design_id TEXT NOT NULL,account_id TEXT NOT NULL,serial_number INTEGER NOT NULL CHECK(serial_number>0),request_id TEXT NOT NULL,price_starcoins INTEGER NOT NULL DEFAULT 1 CHECK(price_starcoins=1),created_at INTEGER NOT NULL,UNIQUE(design_id,serial_number),UNIQUE(account_id,request_id),FOREIGN KEY(design_id) REFERENCES qp_collector_designs(design_id))"),
  db.prepare("CREATE INDEX IF NOT EXISTS qp_collector_owner_idx ON qp_collector_copies(account_id,created_at DESC)"),
  // If the account cannot be debited, the INSERT and all its effects roll back.
  db.prepare("CREATE TRIGGER IF NOT EXISTS qp_collector_charge_v1 AFTER INSERT ON qp_collector_copies BEGIN UPDATE accounts SET star_coins=star_coins-1,updated_at=NEW.created_at WHERE id=NEW.account_id AND star_coins>=1; SELECT RAISE(ABORT,'insufficient_star_coins') WHERE changes()!=1; INSERT INTO ledger_events(id,account_id,event_type,amount,balance,progress_to_next_coin,shares_per_coin,reference_id,content_id,company_id,actors_json,attribution_status,payout_status,created_at) SELECT 'ledger-' || NEW.receipt_id,NEW.account_id,'collector_purchase',-1,a.star_coins,a.pending_share_credits,10,NEW.receipt_id,NEW.design_id,'quanta-phi','[]','infinity_collector','settled',NEW.created_at FROM accounts a WHERE a.id=NEW.account_id; END")
 ]);
}
function artURL(request,id){return new URL('/v1/collector/art/'+id,request.url).toString();}
function receipt(row,request){
 return {receiptId:row.receipt_id,assetTokenId:row.token_id,designId:row.design_id,title:row.title,
  serialNumber:Number(row.serial_number),goldEdition:'1/'+Number(row.serial_number),purchasePriceStarCoins:PRICE,
  assetCostBasis:{unit:'StarCoin',amount:PRICE},marketResaleValue:null,
  artUrl:artURL(request,row.design_id),purchasedAt:new Date(Number(row.created_at)).toISOString()};
}
async function getCopy(env,account,requestId){
 return env.IDENTITY_DB.prepare('SELECT c.*,d.title FROM qp_collector_copies c JOIN qp_collector_designs d ON d.design_id=c.design_id WHERE c.account_id=? AND c.request_id=? LIMIT 1').bind(account,requestId).first();
}
async function quantProjection(env,wallet,row,request){
 try{
  const db=env.DB;
  await db.prepare("CREATE TABLE IF NOT EXISTS quant_collector_receipts(token_id TEXT PRIMARY KEY,wallet_id TEXT NOT NULL,design_id TEXT NOT NULL,serial_number INTEGER NOT NULL,receipt_json TEXT NOT NULL,created_at INTEGER NOT NULL)").run();
  const payload=receipt(row,request);
  await db.prepare('INSERT OR IGNORE INTO quant_collector_receipts(token_id,wallet_id,design_id,serial_number,receipt_json,created_at) VALUES(?,?,?,?,?,?)')
   .bind(row.token_id,wallet,row.design_id,row.serial_number,JSON.stringify(payload),row.created_at).run();
  return true;
 }catch(error){console.warn('Collector Quant projection deferred',error);return false;}
}
function checkImageData(image){
 const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(image||''));
 if(!match||match[2].length>11200000)throw Object.assign(new Error('invalid_card_artwork'),{status:400});
 const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
 if(bytes.length<1024||bytes.length>8000000)throw Object.assign(new Error('card_artwork_size'),{status:413});
 const mime=match[1],isPng=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
 const isJpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const isWebp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 if(!(mime==='image/png'&&isPng||mime==='image/jpeg'&&isJpeg||mime==='image/webp'&&isWebp))throw Object.assign(new Error('invalid_image_signature'),{status:400});
 return {bytes,mime};
}
export async function serveCollectorArt(request,env,designId){
 if(!validId(designId))return new Response('Not found',{status:404});
 if(!env.COLLECTOR_ART)return new Response('Collector storage not configured',{status:503});
 await ensureCollectorSchema(env);
 const row=await env.IDENTITY_DB.prepare('SELECT art_key,art_mime FROM qp_collector_designs WHERE design_id=? AND is_active=1').bind(designId).first();
 if(!row)return new Response('Not found',{status:404});
 const object=await env.COLLECTOR_ART.get(row.art_key);
 if(!object)return new Response('Not found',{status:404});
 return new Response(object.body,{headers:{'content-type':row.art_mime,'cache-control':'public,max-age=3600','x-content-type-options':'nosniff'}});
}
export async function handleCollectorRequest(request,env,identity,wallet){
 const url=new URL(request.url),path=url.pathname,account=identity.user_id;
 await ensureCollectorSchema(env);
 if(path==='/v1/collector/designs'&&request.method==='POST'){
  if(!env.COLLECTOR_ART)return json({ok:false,error:'collector_storage_not_configured'},503);
  const body=await request.json().catch(()=>({}));
  const title=clean(body.title,140),renderId=clean(body.renderId,140),prompt=clean(body.prompt,1000);
  if(title.length<3||!renderId)return json({ok:false,error:'missing_design_details'},400);
  let image;
  try{image=checkImageData(body.imageDataUrl);}catch(error){return json({ok:false,error:error.message},error.status||400);}
  const id='ic_'+crypto.randomUUID(),ext=image.mime==='image/png'?'png':image.mime==='image/jpeg'?'jpg':'webp';
  const key=ART_PREFIX+id+'.'+ext,now=Date.now();
  const digest=await crypto.subtle.digest('SHA-256',image.bytes);
  const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  await env.COLLECTOR_ART.put(key,image.bytes,{httpMetadata:{contentType:image.mime},customMetadata:{owner:account,renderId}});
  try{
   await env.IDENTITY_DB.prepare('INSERT INTO qp_collector_designs(design_id,creator_account_id,title,art_key,art_mime,art_sha256,render_id,prompt,created_at) VALUES(?,?,?,?,?,?,?,?,?)')
    .bind(id,account,title,key,image.mime,hash,renderId,prompt,now).run();
  }catch(error){
   await env.COLLECTOR_ART.delete(key).catch(()=>{});
   throw error;
  }
  return json({ok:true,designId:id,title,artUrl:artURL(request,id),costStarCoins:PRICE});
 }
 if(path==='/v1/collector/purchase'&&request.method==='POST'){
  const body=await request.json().catch(()=>({})),designId=clean(body.designId,90),requestId=clean(body.requestId,160);
  if(!validId(designId)||!validKey(requestId))return json({ok:false,error:'invalid_collector_request'},400);
  let prior=await getCopy(env,account,requestId);
  if(prior){
   if(prior.design_id!==designId)return json({ok:false,error:'request_id_reused_for_different_design'},409);
   const synced=await quantProjection(env,wallet,prior,request);
   return json({ok:true,replayed:true,quantDataSynced:synced,receipt:receipt(prior,request)});
  }
  const tokenId='ict_'+crypto.randomUUID(),receiptId='icr_'+crypto.randomUUID(),now=Date.now();
  // One SQLite statement, one database. Unique serial and request constraints
  // plus the debit trigger forbid two copies or two charges on a retry.
  const statement=env.IDENTITY_DB.prepare(
   'INSERT INTO qp_collector_copies(token_id,receipt_id,design_id,account_id,serial_number,request_id,price_starcoins,created_at) '+
   'SELECT ?,?,?,?,(SELECT COALESCE(MAX(serial_number),0)+1 FROM qp_collector_copies WHERE design_id=?),?,1,? '+
   'FROM qp_collector_designs WHERE design_id=? AND is_active=1'
  ).bind(tokenId,receiptId,designId,account,designId,requestId,now,designId);
  try{
   const inserted=await statement.run();
   if(!Number(inserted.meta?.changes||0))return json({ok:false,error:'design_not_found'},404);
  }catch(error){
   prior=await getCopy(env,account,requestId);
   if(prior){
    if(prior.design_id!==designId)return json({ok:false,error:'request_id_reused_for_different_design'},409);
    const synced=await quantProjection(env,wallet,prior,request);
    return json({ok:true,replayed:true,quantDataSynced:synced,receipt:receipt(prior,request)});
   }
   if(/insufficient_star_coins/i.test(String(error)))return json({ok:false,error:'insufficient_star_coins'},409);
   if(/unique constraint/i.test(String(error)))return json({ok:false,error:'serial_contention_retry_same_request_id'},409);
   throw error;
  }
  const issued=await getCopy(env,account,requestId);
  if(!issued)return json({ok:false,error:'receipt_pending_retry_same_request_id'},503);
  const synced=await quantProjection(env,wallet,issued,request);
  return json({ok:true,replayed:false,quantDataSynced:synced,receipt:receipt(issued,request)},201);
 }
 if(path==='/v1/collector/copies'&&request.method==='GET'){
  const rows=await env.IDENTITY_DB.prepare('SELECT c.*,d.title FROM qp_collector_copies c JOIN qp_collector_designs d ON d.design_id=c.design_id WHERE c.account_id=? ORDER BY c.created_at DESC LIMIT 100').bind(account).all();
  const copies=[];
  for(const row of rows.results||[]){
   copies.push({receipt:receipt(row,request),quantDataSynced:await quantProjection(env,wallet,row,request)});
  }
  return json({ok:true,copies});
 }
 return json({ok:false,error:'not_found'},404);
}
