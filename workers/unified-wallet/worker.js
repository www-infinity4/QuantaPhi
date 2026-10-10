import {payBotWork} from './bot-work-credit.mjs';
const CLIENT_SCRIPT = "(function(global){\n'use strict';\nconst ENDPOINT='https://unified-wallet.marvaseater.workers.dev';\nconst DEVICE_PREFIX='starquest_ledger_device_v1:';\nconst read=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};\nfunction storedToken(key){const raw=localStorage.getItem(key)||'';if(/^sq_[A-Za-z0-9_-]{32,}$/.test(raw))return raw;const value=read(key,null);return /^sq_[A-Za-z0-9_-]{32,}$/.test(value?.deviceToken||'')?value.deviceToken:''}\nfunction findDeviceToken(){const session=read('starquest_session',null),username=String(session?.username||session?.key||'').toLowerCase(),exact=username&&storedToken(DEVICE_PREFIX+username);if(exact)return exact;for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i)||'';if(!key.startsWith(DEVICE_PREFIX))continue;const token=storedToken(key);if(token)return token}return ''}\nclass InfinityUnifiedWallet{\n constructor(options={}){this.endpoint=options.endpoint||ENDPOINT;this.appName=options.appName||document.title||location.hostname;this.state=null;this.listeners=new Set()}\n token(){const token=findDeviceToken();if(!/^sq_[A-Za-z0-9_-]{32,}$/.test(token))throw new Error('Connect the same StarQuest account before using the unified wallet.');return token}\n async request(path,options={}){const response=await fetch(this.endpoint+path,{...options,headers:{'content-type':'application/json','authorization':'Bearer '+this.token(),...(options.headers||{})}});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'unified_wallet_request_failed');return result}\n async connect(){return this.refresh()}\n async refresh(){this.state=await this.request('/v1/wallet/state',{cache:'no-store'});this.listeners.forEach(fn=>fn(this.state));global.dispatchEvent(new CustomEvent('infinity:wallet-state',{detail:this.state}));return this.state}\n async importLegacy({importKey='browser-v1',balances={},tokens=[]}={}){const result=await this.request('/v1/wallet/import',{method:'POST',body:JSON.stringify({importKey,source:this.appName,balances,tokens})});await this.refresh();return result}\n async mintToken(type,data,idempotencyKey){const result=await this.request('/v1/tokens/mint',{method:'POST',body:JSON.stringify({type,data,idempotencyKey,source:this.appName})});await this.refresh();return result}\n async spendInfinity(amount,referenceId,idempotencyKey,metadata={}){const result=await this.request('/v1/wallet/spend',{method:'POST',body:JSON.stringify({asset:'INFINITY',amount,referenceId,idempotencyKey,metadata})});await this.refresh();return result}\n subscribe(listener){this.listeners.add(listener);if(this.state)listener(this.state);return()=>this.listeners.delete(listener)}\n}\nglobal.InfinityUnifiedWallet=InfinityUnifiedWallet;\n})(window);\n";
const ALLOWED_ORIGINS = new Set(['https://quantaphi.org','https://www.quantaphi.org','https://quantaphi.net','https://www.quantaphi.net','https://www-infinity4.github.io','http://localhost:8000','http://127.0.0.1:8000']);
const TOKEN_TYPES = new Set(['MUSIC_QUANT','LISTENING_QUANT','QUANT_DATA','INFINITY_SEARCH']);
const enc = new TextEncoder();
const clean = (value, max=200) => String(value ?? '').trim().slice(0,max);
const integer = (value, min=0, max=Number.MAX_SAFE_INTEGER) => Math.min(max,Math.max(min,Math.trunc(Number(value)||0)));
const cors = request => { const origin=request.headers.get('Origin')||''; return {'Access-Control-Allow-Origin':ALLOWED_ORIGINS.has(origin)?origin:'https://www-infinity4.github.io','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Max-Age':'86400','Vary':'Origin'} };
const json = (request,body,status=200) => Response.json(body,{status,headers:{...cors(request),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const digest = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
async function body(request){ if(!request.headers.get('content-type')?.includes('application/json')) throw Object.assign(new Error('json_required'),{status:415}); return request.json().catch(()=>{throw Object.assign(new Error('invalid_json'),{status:400})}) }
async function identity(request,env){
  const match=/^Bearer\s+(sq_[A-Za-z0-9_-]{32,})$/.exec(request.headers.get('Authorization')||'');
  if(!match) throw Object.assign(new Error('authorization_required'),{status:401});
  const tokenHash=await digest(match[1]);
  const account=await env.IDENTITY_DB.prepare('SELECT a.id,a.username,a.star_coins,a.pending_share_credits,a.share_count FROM accounts a JOIN account_devices d ON d.account_id=a.id WHERE d.token_hash=?1').bind(tokenHash).first();
  if(!account) throw Object.assign(new Error('invalid_device_token'),{status:401});
  return account;
}
async function ensureState(env,userId){ const now=Date.now(); await env.DB.prepare('INSERT OR IGNORE INTO unified_wallet_state(user_id,created_at,updated_at) VALUES(?1,?2,?2)').bind(userId,now).run(); return env.DB.prepare('SELECT * FROM unified_wallet_state WHERE user_id=?1').bind(userId).first() }
async function quantState(env,userId){
  const db=env.QUANT_DB||env.DB;
  if(!db) return {walletId:null,balance:0};
  const row=await db.prepare(`SELECT w.wallet_id,COALESCE(b.balance,0) balance FROM quant_wallets w LEFT JOIN quant_wallet_balances b ON b.wallet_id=w.wallet_id WHERE w.user_id=?1`).bind(userId).first();
  return {walletId:row?.wallet_id||null,balance:Number(row?.balance||0)};
}
async function tokenCounts(env,userId){ const result=await env.DB.prepare('SELECT token_type,COUNT(*) count FROM unified_token_records WHERE user_id=?1 GROUP BY token_type').bind(userId).all(); return Object.fromEntries(result.results.map(x=>[x.token_type,Number(x.count)])) }
async function musicState(env,userId){
  const row=await env.DB.prepare("SELECT COUNT(*) AS balance FROM music_quants m JOIN quant_wallets w ON w.wallet_id=m.owner_wallet_id WHERE w.user_id=?1 AND m.status='active'").bind(userId).first();
  return Number(row?.balance||0);
}
async function state(env,account){
  const [wallet,quant,music,tokens,events]=await Promise.all([ensureState(env,account.id),quantState(env,account.id),musicState(env,account.id),env.DB.prepare('SELECT token_id,token_type,source,data_json,provenance_hash,created_at FROM unified_token_records WHERE user_id=?1 ORDER BY created_at DESC LIMIT 500').bind(account.id).all(),env.DB.prepare('SELECT event_id,asset_code,event_type,amount,balance_after,reference_id,metadata_json,created_at FROM unified_wallet_events WHERE user_id=?1 ORDER BY created_at DESC LIMIT 500').bind(account.id).all()]);
  const musicBalance=Math.max(Number(wallet.music_quant_balance||0),music);
  return {ok:true,user:{id:account.id,username:account.username},balances:{STARCOIN:Number(account.star_coins||0)+Number(account.pending_share_credits||0)/10,QUANT:quant.balance,MUSIC_QUANT:musicBalance,INFINITY:Number(wallet.infinity_balance||0)},tokens:tokens.results.map(x=>({...x,data:JSON.parse(x.data_json)})),history:events.results.map(x=>({...x,metadata:JSON.parse(x.metadata_json)})),updatedAt:Number(wallet.updated_at||Date.now())};
}
async function importLegacy(request,env,account){
  const input=await body(request),importKey=clean(input.importKey,120); if(!/^[A-Za-z0-9:_-]{8,120}$/.test(importKey)) throw Object.assign(new Error('invalid_import_key'),{status:400});
  const prior=await env.DB.prepare('SELECT imported_json,created_at FROM unified_imports WHERE user_id=?1 AND import_key=?2').bind(account.id,importKey).first(); if(prior) return {ok:true,replayed:true,imported:JSON.parse(prior.imported_json)};
  await ensureState(env,account.id); const infinity=integer(input.balances?.INFINITY,0,1000000000),musicQuant=integer(input.balances?.MUSIC_QUANT,0,1000000000),now=Date.now();
  const existing=await env.DB.prepare('SELECT infinity_balance,music_quant_balance FROM unified_wallet_state WHERE user_id=?1').bind(account.id).first();
  const next=Math.max(Number(existing?.infinity_balance||0),infinity),nextMusic=Math.max(Number(existing?.music_quant_balance||0),musicQuant),imported={INFINITY:next,MUSIC_QUANT:nextMusic};
  await env.DB.batch([
    env.DB.prepare('UPDATE unified_wallet_state SET infinity_balance=?2,music_quant_balance=?3,updated_at=?4 WHERE user_id=?1').bind(account.id,next,nextMusic,now),
    env.DB.prepare("INSERT INTO unified_wallet_events(event_id,idempotency_key,user_id,asset_code,event_type,amount,balance_after,reference_id,metadata_json,created_at) VALUES(?1,?2,?3,'INFINITY','IMPORT',?4,?5,?6,?7,?8)").bind('uwe_'+crypto.randomUUID(),'import:'+account.id+':'+importKey,account.id,Math.max(0,next-Number(existing?.infinity_balance||0)),next,importKey,JSON.stringify({source:clean(input.source,120)}),now),
    env.DB.prepare("INSERT INTO unified_wallet_events(event_id,idempotency_key,user_id,asset_code,event_type,amount,balance_after,reference_id,metadata_json,created_at) VALUES(?1,?2,?3,'MUSIC_QUANT','IMPORT',?4,?5,?6,?7,?8)").bind('uwe_'+crypto.randomUUID(),'music-import:'+account.id+':'+importKey,account.id,Math.max(0,nextMusic-Number(existing?.music_quant_balance||0)),nextMusic,importKey,JSON.stringify({source:clean(input.source,120),reason:'legacy_music_quant_floor'}),now),
    env.DB.prepare('INSERT INTO unified_imports(user_id,import_key,imported_json,created_at) VALUES(?1,?2,?3,?4)').bind(account.id,importKey,JSON.stringify(imported),now)
  ]);
  const tokens=Array.isArray(input.tokens)?input.tokens.slice(0,500):[]; for(const token of tokens){const type=clean(token.type,30);if(!TOKEN_TYPES.has(type))continue;const data=token.data&&typeof token.data==='object'?token.data:{},canonical=JSON.stringify({type,source:clean(token.source||input.source,120),data}),hash=clean(token.provenanceHash,64)||await digest(canonical);await env.DB.prepare('INSERT OR IGNORE INTO unified_token_records(token_id,user_id,token_type,source,data_json,provenance_hash,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7)').bind(clean(token.id,120)||'ut_'+crypto.randomUUID(),account.id,type,clean(token.source||input.source,120),JSON.stringify(data),hash,integer(token.createdAt||now,0)).run()}
  // Infinity search history is migrated as individually identified records.
  // Reconcile the balance to the larger of the trusted legacy snapshot and the
  // number of unique imported Infinity search tokens, never by adding both.
  const infinitySearches=await env.DB.prepare("SELECT COUNT(*) AS n FROM unified_token_records WHERE user_id=?1 AND token_type='INFINITY_SEARCH'").bind(account.id).first();
  const reconciled=Math.max(next,Number(infinitySearches?.n||0));
  if(reconciled!==next){
    await env.DB.batch([
      env.DB.prepare('UPDATE unified_wallet_state SET infinity_balance=?2,updated_at=?3 WHERE user_id=?1').bind(account.id,reconciled,now),
      env.DB.prepare("INSERT OR IGNORE INTO unified_wallet_events(event_id,idempotency_key,user_id,asset_code,event_type,amount,balance_after,reference_id,metadata_json,created_at) VALUES(?1,?2,?3,'INFINITY','IMPORT',?4,?5,?6,?7,?8)").bind('uwe_'+crypto.randomUUID(),'history-reconcile:'+account.id+':'+importKey,account.id,reconciled-next,reconciled,importKey,JSON.stringify({source:clean(input.source,120),reason:'unique_infinity_search_history'}),now)
    ]);
    imported.INFINITY=reconciled;
  }
  return {ok:true,replayed:false,imported};
}
async function mintToken(request,env,account){
  const input=await body(request),type=clean(input.type,30),idempotencyKey=clean(input.idempotencyKey,160),source=clean(input.source,120); if(!TOKEN_TYPES.has(type)||!idempotencyKey||!source) throw Object.assign(new Error('invalid_token'),{status:400});
  const data=input.data&&typeof input.data==='object'?input.data:{},canonical=JSON.stringify({userId:account.id,type,source,idempotencyKey,data}),hash=await digest(canonical),tokenId='ut_'+hash.slice(0,32),now=Date.now();
  const prior=await env.DB.prepare('SELECT token_id FROM unified_token_records WHERE token_id=?1 AND user_id=?2').bind(tokenId,account.id).first();
  if(prior){
    const wallet=await ensureState(env,account.id);
    return {ok:true,replayed:true,tokenId,provenanceHash:hash,balance:Number(wallet.infinity_balance||0)};
  }
  await ensureState(env,account.id);
  if(type==='INFINITY_SEARCH'){
    const wallet=await env.DB.prepare('SELECT infinity_balance FROM unified_wallet_state WHERE user_id=?1').bind(account.id).first(),balance=Number(wallet?.infinity_balance||0),next=balance+1;
    await env.DB.batch([
      env.DB.prepare('INSERT INTO unified_token_records(token_id,user_id,token_type,source,data_json,provenance_hash,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7)').bind(tokenId,account.id,type,source,JSON.stringify(data),hash,now),
      env.DB.prepare('UPDATE unified_wallet_state SET infinity_balance=?2,updated_at=?3 WHERE user_id=?1').bind(account.id,next,now),
      env.DB.prepare("INSERT INTO unified_wallet_events(event_id,idempotency_key,user_id,asset_code,event_type,amount,balance_after,reference_id,metadata_json,created_at) VALUES(?1,?2,?3,'INFINITY','MINT',1,?4,?5,?6,?7)").bind('uwe_'+crypto.randomUUID(),'mint:'+account.id+':'+idempotencyKey,account.id,next,tokenId,JSON.stringify({source,type,search_id:clean(data.search_id,160),query:clean(data.query,200)}),now)
    ]);
    return {ok:true,replayed:false,tokenId,provenanceHash:hash,balance:next};
  }
  await env.DB.prepare('INSERT INTO unified_token_records(token_id,user_id,token_type,source,data_json,provenance_hash,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7)').bind(tokenId,account.id,type,source,JSON.stringify(data),hash,now).run();
  return {ok:true,replayed:false,tokenId,provenanceHash:hash};
}
async function spend(request,env,account){
  const input=await body(request),asset=clean(input.asset,30),amount=integer(input.amount,1,1000000),key=clean(input.idempotencyKey,160),now=Date.now(); if(asset!=='INFINITY'||!key) throw Object.assign(new Error('unsupported_spend'),{status:400}); await ensureState(env,account.id);
  const prior=await env.DB.prepare('SELECT * FROM unified_wallet_events WHERE idempotency_key=?1').bind(key).first(); if(prior)return {ok:true,replayed:true,balance:Number(prior.balance_after)};
  const row=await env.DB.prepare('SELECT infinity_balance FROM unified_wallet_state WHERE user_id=?1').bind(account.id).first(); const balance=Number(row?.infinity_balance||0); if(balance<amount)throw Object.assign(new Error('insufficient_balance'),{status:409}); const next=balance-amount;
  await env.DB.batch([env.DB.prepare('UPDATE unified_wallet_state SET infinity_balance=?2,updated_at=?3 WHERE user_id=?1').bind(account.id,next,now),env.DB.prepare("INSERT INTO unified_wallet_events(event_id,idempotency_key,user_id,asset_code,event_type,amount,balance_after,reference_id,metadata_json,created_at) VALUES(?1,?2,?3,'INFINITY','SPEND',?4,?5,?6,?7,?8)").bind('uwe_'+crypto.randomUUID(),key,account.id,-amount,next,clean(input.referenceId,160),JSON.stringify(input.metadata||{}),now)]); return {ok:true,replayed:false,balance:next};
}
export default {async fetch(request,env){ if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(request)}); const url=new URL(request.url); if(url.pathname==='/health')return json(request,{ok:true,service:'unified-wallet',version:1}); if(url.pathname==='/unified-wallet.js')return new Response(CLIENT_SCRIPT,{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff',...cors(request)}}); try{if(url.pathname==='/internal/bot-work-credit'&&request.method==='POST'){const key=request.headers.get('X-Bot-Work-Key')||'';if(!env.BOT_WORK_SECRET||await digest(key)!==await digest(env.BOT_WORK_SECRET))return json(request,{ok:false,error:'bot_work_authorization_required'},401);const raw=await request.text();if(raw.length>8000)return json(request,{ok:false,error:'credit_payload_too_large'},413);return json(request,await payBotWork(env,JSON.parse(raw)));}const account=await identity(request,env); if(url.pathname==='/v1/wallet/state'&&request.method==='GET')return json(request,await state(env,account)); if(url.pathname==='/v1/wallet/import'&&request.method==='POST')return json(request,await importLegacy(request,env,account)); if(url.pathname==='/v1/tokens/mint'&&request.method==='POST')return json(request,await mintToken(request,env,account),201); if(url.pathname==='/v1/wallet/spend'&&request.method==='POST')return json(request,await spend(request,env,account)); return json(request,{error:'not_found'},404)}catch(error){return json(request,{error:error.message||'internal_error'},error.status||500)}}};

