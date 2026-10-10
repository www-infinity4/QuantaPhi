const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const js=fs.readFileSync('wallet-runtime.js','utf8');
const start=js.indexOf('  let cloudStarState=null;');
const end=js.indexOf('  let cloudBalances={};',start);
assert.ok(start>0&&end>start,'extract deployed StarQuest wallet refresh');
const implementation=js.slice(start,end);
const token='sq_'+'b'.repeat(40);
function harness(username='device_example',remoteName=username,hasLocalToken=false){
 const messages=[],calls=[];
 const session={key:username,username};
 const profile={tokens:47,pendingShareCredits:9,shareCount:100,ledger:[]};
 const state={username:remoteName,starCoins:49,pendingShareCredits:5,shareCount:120,ledger:[]};
 const ctx={
   console,Date,Number,String,Map,Array,AbortSignal:{timeout:()=>undefined},
   document:{querySelectorAll:()=>[{set textContent(v){messages.push(v)},dataset:{}}]},
   window:{QuantaCloudConnection:{resolveDeviceToken:async()=>token},QuantaStarCoinCloud:null},
   read:()=>session, WALLET_SESSION_KEY:'starquest_session',
   walletStore:()=>({profile,save:next=>Object.assign(profile,next)}),
   normalizeWallet:next=>next,
   starQuestDeviceToken:()=>hasLocalToken?token:'',
   fetch:async(url,opts)=>{
     calls.push({url,token:opts.headers.authorization});
     return{ok:true,status:200,json:async()=>({ok:true,state})};
   },
   refreshWalletUI:()=>{}
 };
 vm.createContext(ctx);
 vm.runInContext("const STARQUEST_ENDPOINT='https://starquest-ledger.marvaseater.workers.dev';\n"+implementation+"\nglobalThis.api={refreshStarCoinCloud,refreshWalletOnOpen};",ctx);
 return{profile,calls,messages,api:ctx.api};
}
test('opening a stale wallet can retrieve the enrolled StarQuest balance after token recovery',async()=>{
 const h=harness();
 const result=await h.api.refreshStarCoinCloud();
 assert.equal(result.starCoins,49);
 assert.equal(result.pendingShareCredits,5);
 assert.equal(h.profile.tokens,49);
 assert.equal(h.profile.pendingShareCredits,5);
 assert.equal(h.calls.length,1);
 assert.equal(h.calls[0].token,'Bearer '+token);
 assert.match(h.messages.at(-1),/^StarQuest confirmed/);
});
test('a different authenticated identity never overwrites the displayed wallet',async()=>{
 const h=harness('device_example','device_other');
 const result=await h.api.refreshStarCoinCloud();
 assert.equal(result,null);
 assert.equal(h.profile.tokens,47);
 assert.equal(h.profile.pendingShareCredits,9);
 assert.match(h.messages.at(-1),/Cached balance/);
});
test('both popup opening handlers recheck the server rather than repaint the cache',()=>{
 assert.match(js,/if\(!prebuiltPanel\.hidden\)refreshWalletOnOpen\(\)/);
 assert.match(js,/if\(!panel\.hidden\)refreshWalletOnOpen\(\)/);
 assert.match(js,/await window\.QuantaStarCoinCloud\?\.reconcile\?\.\(\)/);
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/wallet-runtime\.js\?v=20261010-starquest-modal-sync2/);
});
