export const rewardSchema="CREATE TABLE IF NOT EXISTS bot_work_rewards(reward_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,asset TEXT NOT NULL CHECK(asset IN ('QUANT','STARCOIN')),amount INTEGER NOT NULL CHECK(amount=1),metadata_json TEXT NOT NULL,paid INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL)";
export function creditStatements({id,userId,asset,metadata,now,walletId}){
 const common=[{sql:'INSERT OR IGNORE INTO bot_work_rewards(reward_id,user_id,asset,amount,metadata_json,created_at) VALUES(?1,?2,?3,1,?4,?5)',params:[id,userId,asset,metadata,now]}];
 if(asset==='STARCOIN')return [...common,
  {sql:'UPDATE accounts SET star_coins=star_coins+1,updated_at=?3 WHERE id=?2 AND EXISTS(SELECT 1 FROM bot_work_rewards WHERE reward_id=?1 AND user_id=?2 AND paid=0)',params:[id,userId,now]},
  {sql:"INSERT OR IGNORE INTO ledger_events(id,account_id,event_type,amount,balance,progress_to_next_coin,reference_id,content_id,payout_status,created_at) SELECT ?1,id,'BOT_WORK',1,star_coins,pending_share_credits,?1,?1,'paid',?3 FROM accounts WHERE id=?2 AND EXISTS(SELECT 1 FROM bot_work_rewards WHERE reward_id=?1 AND user_id=?2 AND paid=0)",params:[id,userId,now]},
  {sql:'UPDATE bot_work_rewards SET paid=1 WHERE reward_id=?1 AND user_id=?2',params:[id,userId]}];
 return [...common,
  {sql:'INSERT OR IGNORE INTO quant_wallets(wallet_id,user_id) VALUES(?1,?2)',params:[walletId,userId]},
  {sql:"INSERT OR IGNORE INTO quant_ledger_entries(entry_id,reference_id,entry_type,wallet_id,delta) SELECT ?1,?1,'mint',wallet_id,1 FROM quant_wallets WHERE user_id=?2 AND status='active'",params:[id,userId]},
  {sql:"INSERT OR IGNORE INTO unified_token_records(token_id,user_id,token_type,source,data_json,provenance_hash,created_at) VALUES(?1,?2,'QUANT_DATA','Infinity bot work',?3,?1,?4)",params:[id,userId,metadata,now]},
  {sql:"INSERT OR IGNORE INTO unified_wallet_events(event_id,idempotency_key,user_id,asset_code,event_type,amount,balance_after,reference_id,metadata_json,created_at) SELECT ?1,?1,?2,'QUANT','MINT',1,balance,?1,?3,?4 FROM quant_wallet_balances WHERE wallet_id=(SELECT wallet_id FROM quant_wallets WHERE user_id=?2)",params:[id,userId,metadata,now]},
  {sql:'UPDATE bot_work_rewards SET paid=1 WHERE reward_id=?1 AND user_id=?2',params:[id,userId]}];
}
export async function payBotWork(env,input){
 if(!input||!['QUANT','STARCOIN'].includes(input.asset)||!/^www-infinity4\/[\w.-]+$/.test(input.repository||'')||!/^[a-f0-9]{40}$/.test(input.commitSha||'')||typeof input.quantId!=='string'||!input.quantId.startsWith('job-quant:'))throw Error('bot_work_credit_schema_rejected');
 const userId=String(input.userId||'');if(!userId||!await env.IDENTITY_DB.prepare('SELECT id FROM accounts WHERE id=?').bind(userId).first())throw Error('bot_work_recipient_unknown');
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input.repository+':'+input.commitSha));
 const id='botwork_'+[...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
 const db=input.asset==='STARCOIN'?env.IDENTITY_DB:env.DB;
 const prior=await db.prepare('SELECT * FROM bot_work_rewards WHERE reward_id=?').bind(id).first();
 if(prior&&(prior.user_id!==userId||prior.asset!==input.asset))throw Error('bot_work_recipient_or_asset_conflict');
 const metadata=JSON.stringify({quantId:input.quantId,repository:input.repository,commitSha:input.commitSha,summary:String(input.summary||'').slice(0,500),policy:'bot-work-v1',amount:1,asset:input.asset});
 if(input.asset==='QUANT'){const existing=await env.DB.prepare('SELECT status FROM quant_wallets WHERE user_id=?').bind(userId).first();if(existing&&existing.status!=='active')throw Error('quant_wallet_disabled');}
 await db.batch(creditStatements({id,userId,asset:input.asset,metadata,now:Date.now(),walletId:'qw_bot_'+userId}).map(s=>db.prepare(s.sql).bind(...s.params)));
 if(input.asset==='STARCOIN')await env.DB.prepare("INSERT OR IGNORE INTO unified_token_records(token_id,user_id,token_type,source,data_json,provenance_hash,created_at) VALUES(?1,?2,'QUANT_DATA','Infinity bot work',?3,?1,?4)").bind(id,userId,metadata,Date.now()).run();
 const reward=await db.prepare('SELECT reward_id,asset,amount,paid FROM bot_work_rewards WHERE reward_id=? AND user_id=?').bind(id,userId).first();
 if(reward?.paid!==1)throw Error('bot_work_credit_readback_failed');
 return {ok:true,rewardId:id,asset:reward.asset,amount:reward.amount,replayed:prior?.paid===1};
}
