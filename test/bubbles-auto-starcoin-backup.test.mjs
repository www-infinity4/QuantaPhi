import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ConsentService} from '../workers/bubbles-connections/consent.mjs';
import {TokenVault,randomToken} from '../workers/bubbles-connections/vault.mjs';
import {githubAdapter} from '../workers/bubbles-connections/providers.mjs';

function store(){
 const rows=new Map();let queue=Promise.resolve();
 return {rows,get:async key=>rows.get(key),put:async(key,value)=>rows.set(key,value),
  list:async({prefix,limit=100})=>new Map([...rows].filter(([k])=>k.startsWith(prefix)).slice(0,limit)),
  transaction(fn){
   const task=queue.then(async()=>{
    const draft=new Map(rows),tx={get:async k=>draft.get(k),put:async(k,v)=>draft.set(k,v),
     delete:async k=>draft.delete(k),list:async({prefix,limit=100})=>
      new Map([...draft].filter(([k])=>k.startsWith(prefix)).slice(0,limit))};
    const result=await fn(tx);rows.clear();for(const [k,v] of draft)rows.set(k,v);return result;
   });queue=task.catch(()=>{});return task;
  }};
}
async function setup({cloudflareGranted=true,installed=true}={}){
 const storage=store(),vault=new TokenVault({v1:randomToken()},'v1'),userId='alice';
 const githubId='g'.repeat(43),cloudflareId='c'.repeat(43),now=Date.now();
 const repository='sample-owner/infinity-wallet-backup-abcdef0123456789';
 let creates=0,writes=0;
 const adapters={github:{
  createOwnedPrivateLedgerRepository:async({expectedSubject,repositoryName,accessToken})=>{
   creates++;
   assert.equal(accessToken,'private-github-token');
   assert.equal(expectedSubject,'12345');
   assert.match(repositoryName,/^infinity-wallet-backup-[a-f0-9]{16}$/);
   return {repository,repositoryId:431,status:'created_private',private:true};
  }
 }};
 const service=new ConsentService({storage,vault,adapters,now:()=>now});
 const prefix=await service.namespace(userId);
 const github={id:githubId,userId,provider:'github',providerSubject:'12345',
  credentialRef:prefix+'github-credential',status:'connected',
  expiresAt:now+3600000,grantedActions:[],revision:'rev-g'};
 const cloudflare={id:cloudflareId,userId,provider:'cloudflare',providerSubject:'cfx',
  credentialRef:prefix+'cf-credential',status:'connected',expiresAt:now+3600000,
  grantedActions:cloudflareGranted?['account.read','projects.build','ledger.read']:['account.read'],
  revision:'rev-c'};
 await storage.put(prefix+'connection:'+githubId,github);
 await storage.put(prefix+'connection:'+cloudflareId,cloudflare);
 await storage.put(github.credentialRef,await vault.seal({accessToken:'private-github-token',refreshToken:'refresh'},github.credentialRef));
 service.gateStatus=async()=>[github,cloudflare];
 service.githubRepositories=async()=>({repositories:installed?[{
  name:repository,private:true,permissions:{write:true}}]:[]});
 service.starCoinBackup=async({userId:uid,id,repository:repo,snapshot})=>{
  writes++;
  assert.equal(uid,userId);assert.equal(id,githubId);assert.equal(repo,repository);
  assert.equal(snapshot.data.balanceTenths,560);
  const commit='a'.repeat(40);
  await storage.put(prefix+'starcoin:last-backup',{repository:repo,hash:snapshot.hash,commit,status:'committed',at:now});
  return {status:'committed',commit,repository:repo};
 };
 return {service,storage,prefix,github,cloudflare,userId,repository,
  snapshot:{hash:'b'.repeat(64),data:{balanceTenths:560,receipts:[{id:'receipt-one'}]}},
  get creates(){return creates},get writes(){return writes},setInstalled:x=>{installed=x}};
}
test('auto bootstrap refuses to create a repo without both linked, scoped accounts',async()=>{
 const f=await setup({cloudflareGranted:false});
 await assert.rejects(f.service.autoStarCoinBootstrap({userId:f.userId,snapshot:f.snapshot}),
  /backup_both_provider_authorizations_required/);
 assert.equal(f.creates,0);
 assert.equal(await f.service.autoStarCoinStatus({userId:f.userId}).then(x=>x.status),'not_created');
});
test('creates one private per-account repo, waits for installed write, then backs up exactly once per setup',async()=>{
 const f=await setup({installed:false});
 let result=await f.service.autoStarCoinBootstrap({userId:f.userId,snapshot:f.snapshot});
 assert.equal(result.status,'needs_github_app_repository_installation');
 assert.equal(result.private,true);
 assert.equal(f.creates,1);assert.equal(f.writes,0);
 assert.equal((await f.service.autoStarCoinStatus({userId:f.userId})).status,'repository_created');
 f.setInstalled(true);
 result=await f.service.autoStarCoinBootstrap({userId:f.userId,snapshot:f.snapshot});
 assert.equal(result.status,'committed');assert.equal(result.commit,'a'.repeat(40));
 assert.equal(result.coverage,'starcoins_pilot');
 assert.equal(f.creates,1);assert.equal(f.writes,1);
 const saved=await f.service.autoStarCoinStatus({userId:f.userId});
 assert.equal(saved.status,'committed');assert.equal(saved.commit,'a'.repeat(40));
 assert.equal(JSON.stringify(saved).includes('private-github-token'),false);
});
test('does not adopt a repo belonging to another linked GitHub identity',async()=>{
 const f=await setup();
 await f.storage.put(f.prefix+'starcoin:auto-repository',{
  repository:f.repository,githubSubject:'an-unrelated-github-user',createdAt:Date.now()});
 await assert.rejects(f.service.autoStarCoinBootstrap({userId:f.userId,snapshot:f.snapshot}),
  /backup_account_mismatch_review_required/);
 assert.equal(f.creates,0);assert.equal(f.writes,0);
});
test('wrong verified user cannot access original backup state',async()=>{
 const f=await setup();
 assert.equal((await f.service.autoStarCoinStatus({userId:'bob'})).status,'not_created');
 await assert.rejects(f.service.autoStarCoinBootstrap({userId:'bob',snapshot:f.snapshot}),
  /backup_both_provider_authorizations_required/);
 assert.equal(f.creates,0);
});
test('GitHub creation fails before any POST when its account identity differs',async()=>{
 let posts=0;
 const adapter=githubAdapter({clientId:'client',clientSecret:'private',redirectUri:'https://quantaphi.org/api/bubbles/connections/github/callback'},
  async(url,options)=>{
   if(options.method==='POST')posts++;
   if(url==='https://api.github.com/user')return Response.json({id:88,login:'not-original-owner'});
   throw Error('Unexpected write');
  });
 await assert.rejects(adapter.createOwnedPrivateLedgerRepository({
  accessToken:'token',expectedSubject:'12345',repositoryName:'infinity-wallet-backup-abcdef0123456789'}),
  /github_account_identity_mismatch/);
 assert.equal(posts,0);
});
test('GitHub collision never overwrites an existing private repository',async()=>{
 let posts=0;
 const adapter=githubAdapter({clientId:'client',clientSecret:'private',redirectUri:'https://quantaphi.org/api/bubbles/connections/github/callback'},
  async(url,options)=>{
   if(url==='https://api.github.com/user')return Response.json({id:12345,login:'sample-owner'});
   if(url==='https://api.github.com/user/repos'){posts++;return Response.json({message:'already exists'},{status:422});}
   throw Error('Unrecognized endpoint');
  });
 await assert.rejects(adapter.createOwnedPrivateLedgerRepository({
  accessToken:'token',expectedSubject:'12345',repositoryName:'infinity-wallet-backup-abcdef0123456789'}),
  /github_repository_name_collision_review_required/);
 assert.equal(posts,1);
});
