const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto').webcrypto;

async function fixture(){
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
   const account=accounts.find(a=>a.id===args[0]);assert.ok(account,'queries must use an authenticated account');
   if(sql.startsWith('SELECT * FROM unified_wallet_state'))return{user_id:account.id,infinity_balance:account.infinity,music_quant_balance:account.music,updated_at:1};
   if(sql.startsWith('SELECT w.wallet_id'))return{wallet_id:'wallet-'+account.id,balance:account.quant};
   if(sql.startsWith('SELECT COUNT(*) AS balance'))return{balance:account.music};
   throw Error('Unexpected first query');
  },
  async all(){
   reads.push({sql,args});
   const account=accounts.find(a=>a.id===args[0]);assert.ok(account);
   if(sql.includes('FROM unified_token_records'))return{results:[{token_id:'token-'+account.id,token_type:'INFINITY_SEARCH',data_json:'{}'}]};
   if(sql.includes('FROM unified_wallet_events'))return{results:[{event_id:'event-'+account.id,asset_code:'INFINITY',amount:1,balance_after:account.infinity,created_at:1,metadata_json:'{}'}]};
   throw Error('Unexpected all query');
  },
  async run(){assert.ok(sql.startsWith('INSERT OR IGNORE INTO unified_wallet_state'));assert.ok(accounts.some(a=>a.id===args[0]));return{meta:{changes:0}};}
 }}}}};
 const source=fs.readFileSync('workers/unified-wallet/worker.js','utf8').replace(/^import .*\n/,'').replace('export default','globalThis.worker =');
 let keyFetches=0;
 const worker=vm.runInNewContext(source+';worker',{crypto,TextEncoder,TextDecoder,Request,Response,URL,Uint8Array,btoa,atob,AbortSignal,console,fetch:async()=>{keyFetches++;throw Error('Ordinary wallet routes must not request Access keys');}});
 const env={DB:db,IDENTITY_DB:db};
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
  assert.deepEqual(payload.balances,{STARCOIN:account.star_coins,QUANT:account.quant,MUSIC_QUANT:account.music,INFINITY:account.infinity});
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
