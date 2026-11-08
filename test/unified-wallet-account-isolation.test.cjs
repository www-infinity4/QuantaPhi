const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto').webcrypto;

async function fixture(){
 const {readBubbleBits}=await import('../workers/unified-wallet/bubble-bit-credit.mjs');
 const {readGitAsset,readGptCoinAsset,importGptCoin,readGitSerialReceipts}=await import('../workers/unified-wallet/engineering-assets.mjs');
 const accounts=[
  {id:'account-a',username:'alice',star_coins:7,pending_share_credits:0,share_count:0,quant:11,infinity:13,music:17},
  {id:'account-b',username:'bob',star_coins:19,pending_share_credits:0,share_count:0,quant:23,infinity:29,music:31}
 ];
 const hash=async value=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))).toString('hex');
 const tokens=['sq_'+'A'.repeat(43),'sq_'+'B'.repeat(43)];
 const byToken=new Map(await Promise.all(tokens.map(async(token,i)=>[await hash(token),accounts[i]])));
 const reads=[];
 const db={prepare(sql){return{bind(...args){return{
  async first(){
   reads.push({sql,args});
   if(sql.startsWith('SELECT a.id'))return byToken.get(args[0])||null;
   if(sql.includes('FROM gitcoin_awards')){
    const n=accounts.findIndex(a=>'wallet-'+a.id===args[0]);assert.ok(n>=0,'GIT queries use the verified wallet ID');
    return {credited:n+4,pending:n};
   }
   const account=accounts.find(a=>a.id===args[0]);assert.ok(account,'queries must use an authenticated account');
   if(sql.startsWith('SELECT * FROM unified_wallet_state'))return{user_id:account.id,infinity_balance:account.infinity,music_quant_balance:account.music,updated_at:1};
   if(sql.startsWith('SELECT w.wallet_id'))return{wallet_id:'wallet-'+account.id,balance:account.quant};
   if(sql.startsWith('SELECT COUNT(*) AS balance'))return{balance:account.music};
   throw Error('Unexpected first query');
  },
  async all(){
   reads.push({sql,args});
   const account=accounts.find(a=>a.id===args[0]);assert.ok(account);
   if(sql.includes('FROM gitcoin_serials')){
    const n=accounts.findIndex(a=>'wallet-'+a.id===args[0]);
    assert.ok(n>=0,'GIT serial query uses server-resolved wallet');
    return {results:[{serial_no:n+10,receipt_id:'receipt-'+n,git_type:'git:app',issued_at:'2026-11-08 00:00:00'}]};
   }
   if(sql.includes('FROM unified_token_records'))return{results:[{token_id:'token-'+account.id,token_type:'INFINITY_SEARCH',data_json:'{}'}]};
   if(sql.includes('FROM unified_wallet_events'))return{results:[{event_id:'event-'+account.id,asset_code:'INFINITY',amount:1,balance_after:account.infinity,created_at:1,metadata_json:'{}'}]};
   throw Error('Unexpected all query');
  },
  async run(){assert.ok(sql.startsWith('INSERT OR IGNORE INTO unified_wallet_state'));assert.ok(accounts.some(a=>a.id===args[0]));return{meta:{changes:0}};}
 }}}}};
 const source=fs.readFileSync('workers/unified-wallet/worker.js','utf8').replace(/^import .*\n/gm,'').replace('export default','globalThis.worker =');
 let keyFetches=0;
 const worker=vm.runInNewContext(source+';worker',{readBubbleBits,readGitAsset,readGptCoinAsset,importGptCoin,readGitSerialReceipts,crypto,TextEncoder,TextDecoder,Request,Response,URL,Uint8Array,btoa,atob,AbortSignal,console,fetch:async()=>{keyFetches++;throw Error('Ordinary wallet routes must not request Access keys');}});
 const env={DB:db,IDENTITY_DB:db,GIT_DB:db};
 const request=(path,token)=>new Request('https://wallet.example.test'+path,{headers:{Origin:'https://quantaphi.org',...(token?{Authorization:'Bearer '+token}:{})}});
 return{accounts,tokens,reads,env,request,worker,keyFetches:()=>keyFetches};
}

test('both existing users can read their own balances without Access configuration or signing keys',async()=>{
 const f=await fixture();
 for(let i=0;i<2;i++){
  const response=await f.worker.fetch(f.request('/v1/wallet/state',f.tokens[i]),f.env,{});
  assert.equal(response.status,200);
  const payload=await response.json(),account=f.accounts[i];
  assert.equal(payload.user.id,account.id);
  assert.deepEqual(payload.balances,{GIT:i+4,STARCOIN:account.star_coins,QUANT:account.quant,MUSIC_QUANT:account.music,INFINITY:account.infinity});
  assert.equal(payload.workAssets.GIT.pending,i);
  assert.equal(payload.workAssets.GPT_COIN.status,'issuer_not_connected');
  assert.equal(payload.workAssets.BUBBLE_BIT.credited,null);
  assert.equal(payload.tokens[0].token_id,'token-'+account.id);
 }
 assert.equal(f.keyFetches(),0);
});

test('missing and unknown device credentials cannot read any account',async()=>{
 const f=await fixture();
 for(const token of [null,'sq_'+'Z'.repeat(43)]){
  const response=await f.worker.fetch(f.request('/v1/wallet/state',token),f.env,{});
  assert.equal(response.status,401);
  const payload=await response.json();assert.equal(payload.balances,undefined);assert.equal(payload.user,undefined);
 }
 assert.ok(f.reads.every(({sql})=>sql.startsWith('SELECT a.id')));
 assert.equal(f.keyFetches(),0);
});

test('another account ID in the history query never changes the authenticated owner',async()=>{
 const f=await fixture();
 const response=await f.worker.fetch(f.request('/v1/wallet/infinity-history?userId=account-b',f.tokens[0]),f.env,{});
 assert.equal(response.status,200);
 const payload=await response.json();
 assert.equal(payload.items[0].event_id,'event-account-a');
 assert.equal(f.keyFetches(),0);
});

test('GIT serial receipts are read-only, authenticated and account scoped even if a different wallet is requested',async()=>{
 const f=await fixture();
 const unauth=await f.worker.fetch(f.request('/v1/wallet/git-serials?walletId=wallet-account-b',null),f.env,{});
 assert.equal(unauth.status,401);
 for(let i=0;i<2;i++){
  const response=await f.worker.fetch(f.request('/v1/wallet/git-serials?walletId=wallet-account-b',f.tokens[i]),f.env,{});
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.asset,'GIT');
  assert.equal(data.available,true);
  assert.equal(data.items.length,1);
  assert.equal(data.items[0].serial,'GIT-'+String(i+10).padStart(12,'0'));
 }
 assert.equal((await f.worker.fetch(f.request('/v1/wallet/git-serials?beforeSerial=-100',f.tokens[0]),f.env,{})).status,400);
 assert.equal(f.keyFetches(),0);
});
