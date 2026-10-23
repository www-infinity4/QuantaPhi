// Append-only source compensation proposals. No wallet debits or verified payouts.
const clean=(x,n)=>typeof x==='string'?x.trim().slice(0,n):'';
export function compensationRecord(body){
 const requestId=clean(body?.requestId,80),provider=clean(body?.provider,120),sourceUrl=clean(body?.sourceUrl,2000);
 if(!/^[A-Za-z0-9_-]{8,80}$/.test(requestId)||!provider)throw Error('invalid_source_record');
 let url;try{url=new URL(sourceUrl)}catch{throw Error('invalid_source_url')}
 if(url.protocol!=='https:'||url.username||url.password)throw Error('invalid_source_url');
 const amountMinor=body.amountMinor;
 if(!Number.isSafeInteger(amountMinor)||amountMinor<0||amountMinor>1000000000)throw Error('invalid_amount_minor');
 if(!['STARCOIN','USD'].includes(body.currency))throw Error('invalid_currency');
 if(!['link','excerpt','playback','recording','reaction'].includes(body.usage))throw Error('invalid_usage');
 if(Object.keys(body).some(k=>!['requestId','provider','sourceUrl','amountMinor','currency','usage','agreementRef','recipientRef','cardId'].includes(k)))throw Error('unsupported_record_field');
 return {requestId,provider,sourceUrl:url.href,amountMinor,currency:body.currency,usage:body.usage,
  agreementRef:clean(body.agreementRef,300),recipientRef:clean(body.recipientRef,180),cardId:clean(body.cardId,120),
  status:'proposed',agreementVerified:false,recipientVerified:false,usageVerified:false,paid:false};
}
export async function handleSourceCompensation(request,db,owner,headers={}){
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'content-type':'application/json','cache-control':'no-store'}});
 if(!owner)return reply({ok:false,error:'verified_owner_required'},401);
 try{
  await db.batch([
   db.prepare('CREATE TABLE IF NOT EXISTS phi_source_compensation(id TEXT PRIMARY KEY,owner TEXT NOT NULL,request_id TEXT NOT NULL,payload_json TEXT NOT NULL,created_ms INTEGER NOT NULL,UNIQUE(owner,request_id))'),
   db.prepare("CREATE TRIGGER IF NOT EXISTS phi_source_compensation_no_update BEFORE UPDATE ON phi_source_compensation BEGIN SELECT RAISE(ABORT,'immutable_source_compensation'); END"),
   db.prepare("CREATE TRIGGER IF NOT EXISTS phi_source_compensation_no_delete BEFORE DELETE ON phi_source_compensation BEGIN SELECT RAISE(ABORT,'immutable_source_compensation'); END")
  ]);
  if(request.method==='GET'){
   const rows=await db.prepare('SELECT id,payload_json,created_ms FROM phi_source_compensation WHERE owner=? ORDER BY created_ms DESC,id LIMIT 200').bind(owner).all();
   return reply({ok:true,entries:(rows.results||[]).map(r=>({id:r.id,...JSON.parse(r.payload_json),createdAt:r.created_ms})),limit:200,settlementConnected:false});
  }
  if(request.method!=='POST')return reply({ok:false,error:'method_not_allowed'},405);
  const raw=await request.text();if(raw.length>8000)return reply({ok:false,error:'request_too_large'},413);
  let record;try{record=compensationRecord(JSON.parse(raw))}catch(error){return reply({ok:false,error:error.message},400)}
  const payload=JSON.stringify(record);
  await db.prepare('INSERT OR IGNORE INTO phi_source_compensation(id,owner,request_id,payload_json,created_ms) VALUES(?,?,?,?,?)').bind('src_'+crypto.randomUUID(),owner,record.requestId,payload,Date.now()).run();
  const saved=await db.prepare('SELECT id,payload_json,created_ms FROM phi_source_compensation WHERE owner=? AND request_id=?').bind(owner,record.requestId).first();
  if(saved.payload_json!==payload)return reply({ok:false,error:'request_conflict'},409);
  return reply({ok:true,entry:{id:saved.id,...record,createdAt:saved.created_ms},settlementConnected:false});
 }catch{return reply({ok:false,error:'source_ledger_unavailable'},503)}
}
