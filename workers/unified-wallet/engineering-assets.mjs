const unavailable = status => ({available:false,credited:null,status});
const validAmount = value => Number.isSafeInteger(value) && value >= 0;

// The wallet ID comes from the authenticated account's existing ledger link.
// Award rows are the balance source. Pending line claims never enter it.
export async function readGitAsset(env,walletId){
 if(!walletId)return unavailable('wallet_link_required');
 if(!env.GIT_DB)return unavailable('ledger_unavailable');
 try{
  const row=await env.GIT_DB.prepare(`SELECT
   (SELECT COALESCE(SUM(amount),0) FROM gitcoin_awards WHERE wallet_id=?1) AS credited,
   (SELECT COUNT(*) FROM gitcoin_line_claims WHERE recipient_wallet_id=?1 AND status='pending') AS pending`).bind(walletId).first();
  if(!validAmount(row?.credited)||!validAmount(row?.pending))return unavailable('ledger_unavailable');
  return {available:true,status:'ledger_verified',credited:row.credited,pending:row.pending,spendAvailable:false};
 }catch{return unavailable('ledger_unavailable')}
}

// Read-only, account-scoped issued GIT serials. This never mints, transfers,
// estimates earnings, or treats local GIT-P receipts as settled.
export async function readGitSerialReceipts(env,walletId,{limit=20,beforeSerial=null}={}){
 if(!Number.isSafeInteger(limit)||limit<1||limit>100)
  throw Object.assign(new Error('invalid_git_limit'),{status:400});
 if(beforeSerial!==null&&(!Number.isSafeInteger(beforeSerial)||beforeSerial<1))
  throw Object.assign(new Error('invalid_git_cursor'),{status:400});
 const unavailableSerial=status=>({available:false,status,items:[],nextBeforeSerial:null});
 if(!walletId)return unavailableSerial('wallet_link_required');
 if(!env.GIT_DB)return unavailableSerial('ledger_unavailable');
 try{
  const result=await env.GIT_DB.prepare(`SELECT
   s.serial_no,s.receipt_id,s.git_type,s.issued_at
   FROM gitcoin_serials s
   JOIN gitcoin_awards a ON a.receipt_id=s.receipt_id
   WHERE s.wallet_id=?1 AND a.wallet_id=?1
    AND (?2 IS NULL OR s.serial_no<?2)
   ORDER BY s.serial_no DESC LIMIT ?3`).bind(walletId,beforeSerial,limit+1).all();
  const rows=result?.results;
  if(!Array.isArray(rows))return unavailableSerial('ledger_unavailable');
  if(rows.some(r=>!Number.isSafeInteger(r.serial_no)||r.serial_no<1||
    typeof r.receipt_id!=='string'||typeof r.git_type!=='string'))
   return unavailableSerial('ledger_unavailable');
  const more=rows.length>limit,shown=rows.slice(0,limit);
  return {available:true,status:'ledger_verified',items:shown.map(r=>({
   serial:'GIT-'+String(r.serial_no).padStart(12,'0'),
   receiptId:r.receipt_id,gitType:r.git_type,issuedAt:r.issued_at
  })),nextBeforeSerial:more?shown[shown.length-1].serial_no:null};
 }catch{return unavailableSerial('ledger_unavailable');}
}

const issuerId = value => typeof value==='string'&&/^[A-Za-z0-9._-]{3,80}$/.test(value);
const rawKey = value => typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value);
const decode = value => Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
const hasIssuer = env => issuerId(env.GPT_COIN_ISSUER)&&rawKey(env.GPT_COIN_ISSUER_PUBLIC_KEY);
const failure = (error,status) => Object.assign(Error(error),{status});

export async function readGptCoinAsset(env,accountId){
 try{
  const row=await env.DB.prepare('SELECT COALESCE(SUM(amount),0) AS credited FROM gpt_coin_imports WHERE user_id=?1').bind(accountId).first();
  if(!validAmount(row?.credited))return unavailable('ledger_unavailable');
  const importAvailable=hasIssuer(env);
  if(!importAvailable&&!row.credited)return unavailable('issuer_not_connected');
  return {available:true,status:'ledger_verified',credited:row.credited,importAvailable,spendAvailable:false};
 }catch{return unavailable(hasIssuer(env)?'ledger_unavailable':'issuer_not_connected')}
}

// Optional issuer-signed deposit. The signature covers the exact wallet
// account, receipt, currency and units. Clients cannot choose the issuer key
// or redirect a signed receipt from one account to another.
export async function importGptCoin(env,accountId,input,now=Date.now()){
 if(!hasIssuer(env))throw failure('gpt_coin_issuer_not_connected',503);
 const r=input?.receipt,signature=input?.signature;
 if(!r||r.version!==1||r.asset!=='GPT_COIN'||r.issuer!==env.GPT_COIN_ISSUER||
    typeof r.receiptId!=='string'||!/^[A-Za-z0-9_-]{12,120}$/.test(r.receiptId)||
    !validAmount(r.amount)||r.amount===0||r.amount>1_000_000_000||
    !Number.isSafeInteger(r.issuedAt)||r.issuedAt<1||r.issuedAt>now+300_000||
    !Number.isSafeInteger(r.expiresAt)||r.expiresAt<=r.issuedAt||r.expiresAt-r.issuedAt>90*86_400_000||
    typeof signature!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(signature))
  throw failure('gpt_coin_receipt_invalid',400);
 if(r.recipient!==accountId)throw failure('gpt_coin_recipient_mismatch',403);
 const payload=JSON.stringify(['quantaphi:gpt-coin:v1',r.issuer,r.receiptId,r.recipient,r.amount,r.issuedAt,r.expiresAt]);
 const key=await crypto.subtle.importKey('raw',decode(env.GPT_COIN_ISSUER_PUBLIC_KEY),'Ed25519',false,['verify']);
 if(!await crypto.subtle.verify('Ed25519',key,decode(signature),new TextEncoder().encode(payload)))
  throw failure('gpt_coin_signature_invalid',403);
 if(r.expiresAt<=now)throw failure('gpt_coin_receipt_expired',400);
 const write=await env.DB.prepare(`INSERT OR IGNORE INTO gpt_coin_imports
  (issuer,receipt_id,user_id,amount,signed_payload,imported_at) VALUES(?1,?2,?3,?4,?5,?6)`)
  .bind(r.issuer,r.receiptId,accountId,r.amount,payload,now).run();
 const saved=await env.DB.prepare('SELECT user_id,signed_payload FROM gpt_coin_imports WHERE issuer=?1 AND receipt_id=?2').bind(r.issuer,r.receiptId).first();
 if(saved?.user_id!==accountId||saved.signed_payload!==payload)throw failure('gpt_coin_receipt_conflict',409);
 return {ok:true,asset:'GPT_COIN',receiptId:r.receiptId,amount:r.amount,replayed:write.meta?.changes===0};
}
