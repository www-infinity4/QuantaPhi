export const rewardSchema="CREATE TABLE IF NOT EXISTS bot_work_rewards(reward_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,asset TEXT NOT NULL CHECK(asset IN ('QUANT','STARCOIN')),amount INTEGER NOT NULL CHECK(amount=1),metadata_json TEXT NOT NULL,paid INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL)";
export const siteRewardSchema="CREATE TABLE IF NOT EXISTS bot_site_rewards(reward_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount=1),metadata_json TEXT NOT NULL,paid INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL)";
export function siteCreditStatements({id,userId,metadata,now}){
 return [
  {sql:'INSERT OR IGNORE INTO bot_site_rewards(reward_id,user_id,amount,metadata_json,created_at) VALUES(?1,?2,1,?3,?4)',params:[id,userId,metadata,now]},
  {sql:'INSERT OR IGNORE INTO unified_wallet_state(user_id,created_at,updated_at) VALUES(?1,?2,?2)',params:[userId,now]},
  {sql:'UPDATE unified_wallet_state SET infinity_balance=infinity_balance+1,updated_at=?3 WHERE user_id=?2 AND EXISTS(SELECT 1 FROM bot_site_rewards WHERE reward_id=?1 AND user_id=?2 AND paid=0)',params:[id,userId,now]},
  {sql:"INSERT OR IGNORE INTO unified_token_records(token_id,user_id,token_type,source,data_json,provenance_hash,created_at) SELECT ?1,?2,'INFINITY_SEARCH','Verified bot site build',?3,?1,?4 WHERE EXISTS(SELECT 1 FROM bot_site_rewards WHERE reward_id=?1 AND user_id=?2 AND paid=0)",params:[id,userId,metadata,now]},
  {sql:"INSERT OR IGNORE INTO unified_wallet_events(event_id,idempotency_key,user_id,asset_code,event_type,amount,balance_after,reference_id,metadata_json,created_at) SELECT ?1,?1,?2,'INFINITY','MINT',1,infinity_balance,?1,?3,?4 FROM unified_wallet_state WHERE user_id=?2 AND EXISTS(SELECT 1 FROM bot_site_rewards WHERE reward_id=?1 AND user_id=?2 AND paid=0)",params:[id,userId,metadata,now]},
  {sql:'UPDATE bot_site_rewards SET paid=1 WHERE reward_id=?1 AND user_id=?2 AND paid=0',params:[id,userId]}
 ];
}
export function creditStatements({id,userId,asset,metadata,now,walletId}){
 const common=[{sql:'INSERT OR IGNORE INTO bot_work_rewards(reward_id,user_id,asset,amount,metadata_json,created_at) VALUES(?1,?2,?3,1,?4,?5)',params:[id,userId,asset,metadata,now]}];
 if(asset==='STARCOIN')return [...common,
  {sql:'UPDATE accounts SET star_coins=star_coins+1,updated_at=?3 WHERE id=?2 AND EXISTS(SELECT 1 FROM bot_work_rewards WHERE reward_id=?1 AND user_id=?2 AND paid=0)',params:[id,userId,now]},
  {sql:"INSERT OR IGNORE INTO ledger_events(id,account_id,event_type,amount,balance,progress_to_next_coin,reference_id,content_id,payout_status,created_at) SELECT ?1,id,'BOT_WORK',1,star_coins,pending_share_credits,?1,?1,'paid',?3 FROM accounts WHERE id=?2 AND EXISTS(SELECT 1 FROM bot_work_rewards WHERE reward_id=?1 AND user_id=?2 AND paid=0)",params:[id,userId,now]},
  {sql:'UPDATE bot_work_rewards SET paid=1 WHERE reward_id=?1 AND user_id=?2',params:[id,userId]}];
 return [...common,
  {sql:'INSERT OR IGNORE INTO quant_wallets(wallet_id,user_id) VALUES(?1,?2)',params:[walletId,userId]},
  // The live D1 Quant trigger requires an immutable matching mint record before a ledger credit.
  // Work receipt ID is stable per repository+commit; reruns cannot mint another Quant.
  {sql:"INSERT OR IGNORE INTO quant_mints(mint_id,wallet_id,provenance_hash,source_key,query_text,amount) SELECT ?1,wallet_id,?1,?1,?3,1 FROM quant_wallets WHERE user_id=?2 AND status='active'",params:[id,userId,metadata]},
  {sql:"INSERT OR IGNORE INTO quant_ledger_entries(entry_id,reference_id,entry_type,wallet_id,delta) SELECT ?1,?1,'mint',wallet_id,1 FROM quant_wallets WHERE user_id=?2 AND status='active'",params:[id,userId]},
  {sql:"INSERT OR IGNORE INTO unified_token_records(token_id,user_id,token_type,source,data_json,provenance_hash,created_at) VALUES(?1,?2,'STARCOIN_WORK','Verified bot repair',?3,?1,?4)",params:[id,userId,metadata,now]},
  {sql:"INSERT OR IGNORE INTO unified_wallet_events(event_id,idempotency_key,user_id,asset_code,event_type,amount,balance_after,reference_id,metadata_json,created_at) SELECT ?1,?1,?2,'QUANT','MINT',1,balance,?1,?3,?4 FROM quant_wallet_balances WHERE wallet_id=(SELECT wallet_id FROM quant_wallets WHERE user_id=?2)",params:[id,userId,metadata,now]},
  {sql:'UPDATE bot_work_rewards SET paid=1 WHERE reward_id=?1 AND user_id=?2',params:[id,userId]}];
}
export async function payBotWork(env,input){
 if(!input||!['QUANT','STARCOIN','INFINITY'].includes(input.asset)||!/^www-infinity4\/[\w.-]+$/.test(input.repository||'')||!/^[a-f0-9]{40}$/.test(input.commitSha||'')||typeof input.quantId!=='string'||!input.quantId.startsWith('job-quant:'))throw Error('bot_work_credit_schema_rejected');
 const userId=String(input.userId||'');if(!userId||!await env.IDENTITY_DB.prepare('SELECT id FROM accounts WHERE id=?').bind(userId).first())throw Error('bot_work_recipient_unknown');
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input.repository+':'+input.commitSha));
 const id='botwork_'+[...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
 if(input.asset==='INFINITY'){
  const check=input;
  if(check.kind!=='full-site-build'||check.sitePublishedVerified!==true||
     check.searchReceiptVerified!==true||typeof check.searchQuery!=='string'||
     check.searchQuery.trim().length<4||check.searchQuery.length>300||
     !/^[a-f0-9]{64}$/.test(check.htmlSha256||'')||
     !/^(?:[\w.-]+\/)*index\.html$/.test(check.htmlPath||'')||
     !/^https:\/\/(?:[\w.-]+\.)?quantaphi\.org\/|^https:\/\/www-infinity4\.github\.io\//.test(check.websiteUrl||''))
     throw Error('verified_site_build_required');
  // Keep the original rewards ledger and its immutable QUANT/STARCOIN check.
  // Site-build awards have an independent D1 table, protecting old histories.
  await env.DB.prepare(siteRewardSchema).run();
  const priorSite=await env.DB.prepare('SELECT user_id,paid FROM bot_site_rewards WHERE reward_id=?').bind(id).first();
  if(priorSite&&priorSite.user_id!==userId)throw Error('bot_work_recipient_conflict');
  // Legacy QUANT or STARCOIN work rewards must never be reminted as a
  // different asset without an explicit, audited reconciliation.
  for(const other of [env.DB,env.IDENTITY_DB]){
   const legacy=await other.prepare('SELECT user_id,asset,paid FROM bot_work_rewards WHERE reward_id=?').bind(id).first();
   if(legacy)throw Error('legacy_work_reward_requires_reconciliation');
  }
  const metadata=JSON.stringify({policy:'commit-rewards-v2',asset:'INFINITY',repository:input.repository,commitSha:input.commitSha,
   commitUrl:'https://github.com/'+input.repository+'/commit/'+input.commitSha,
   searchQuery:input.searchQuery.trim(),searchReceiptId:String(input.searchReceiptId||'').slice(0,130),
   websiteUrl:input.websiteUrl,htmlPath:input.htmlPath,htmlSha256:input.htmlSha256,
   htmlSourceUrl:'https://github.com/'+input.repository+'/blob/'+input.commitSha+'/'+input.htmlPath,
   summary:String(input.summary||'').slice(0,500),sitePublishedVerified:true});
  await env.DB.batch(siteCreditStatements({id,userId,metadata,now:Date.now()}).map(x=>env.DB.prepare(x.sql).bind(...x.params)));
  const reward=await env.DB.prepare('SELECT reward_id,amount,paid FROM bot_site_rewards WHERE reward_id=? AND user_id=?').bind(id,userId).first();
  if(reward?.paid!==1)throw Error('bot_site_credit_readback_failed');
  const token=await env.DB.prepare('SELECT token_type FROM unified_token_records WHERE token_id=? AND user_id=?').bind(id,userId).first();
  if(token?.token_type!=='INFINITY_SEARCH')throw Error('infinity_token_record_not_verified');
  return {ok:true,rewardId:id,asset:'INFINITY',amount:1,replayed:priorSite?.paid===1};
 }
 const db=input.asset==='STARCOIN'?env.IDENTITY_DB:env.DB;
 const prior=await db.prepare('SELECT * FROM bot_work_rewards WHERE reward_id=?').bind(id).first();
 if(prior&&(prior.user_id!==userId||prior.asset!==input.asset))throw Error('bot_work_recipient_or_asset_conflict');
 const metadata=JSON.stringify({quantId:input.quantId,repository:input.repository,commitSha:input.commitSha,commitUrl:'https://github.com/'+input.repository+'/commit/'+input.commitSha,summary:String(input.summary||'').slice(0,500),kind:input.kind||'repair',sourceFiles:Array.isArray(input.sourceFiles)?input.sourceFiles.slice(0,12):[],policy:'commit-rewards-v2',amount:1,asset:input.asset});
 if(input.asset==='QUANT'){const existing=await env.DB.prepare('SELECT status FROM quant_wallets WHERE user_id=?').bind(userId).first();if(existing&&existing.status!=='active')throw Error('quant_wallet_disabled');}
 await db.batch(creditStatements({id,userId,asset:input.asset,metadata,now:Date.now(),walletId:'qw_bot_'+userId}).map(s=>db.prepare(s.sql).bind(...s.params)));
 if(input.asset==='STARCOIN')await env.DB.prepare("INSERT OR IGNORE INTO unified_token_records(token_id,user_id,token_type,source,data_json,provenance_hash,created_at) VALUES(?1,?2,'QUANT_DATA','Infinity bot work',?3,?1,?4)").bind(id,userId,metadata,Date.now()).run();
 const reward=await db.prepare('SELECT reward_id,asset,amount,paid FROM bot_work_rewards WHERE reward_id=? AND user_id=?').bind(id,userId).first();
 if(reward?.paid!==1)throw Error('bot_work_credit_readback_failed');
 return {ok:true,rewardId:id,asset:reward.asset,amount:reward.amount,replayed:prior?.paid===1};
}
