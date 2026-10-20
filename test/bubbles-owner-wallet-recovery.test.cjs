const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const worker=fs.readFileSync('workers/unified-wallet/worker.js','utf8');
const page=fs.readFileSync('wallet-recovery.html','utf8');
const sql=fs.readFileSync('workers/unified-wallet/wallet-recovery-schema.sql','utf8');
test('single-use grant never mints or transfers records',()=>{
 assert.match(worker,/async function redeemRecovery\(request,env\)/);
 assert.match(worker,/UPDATE wallet_recovery_grants SET consumed_at=\?1 WHERE claim_hash=\?2 AND consumed_at IS NULL AND expires_at>\?1 RETURNING account_id/);
 assert.match(worker,/INSERT INTO account_devices\(token_hash,account_id,created_at,last_seen_at\)/);
 assert.match(worker,/INSERT INTO wallet_recovery_audit/);
 assert.match(worker,/SELECT id,username FROM accounts WHERE id=\?1/);
 assert.match(worker,/if\(!ALLOWED_ORIGINS\.has\(origin\)\)/);
 assert.doesNotMatch(worker.slice(worker.indexOf('async function redeemRecovery'),worker.indexOf('async function importLegacy')),/UPDATE accounts|UPDATE unified_wallet_state|INSERT INTO unified_wallet_events|UPDATE quant_wallet_balances|request\.cf|CF-Connecting-IP/);
});
test('claim redeems only once and cannot be created by public caller',()=>{
 assert.match(sql,/claim_hash TEXT PRIMARY KEY/);
 assert.match(sql,/consumed_at INTEGER/);
 assert.match(worker,/if\(url\.pathname==='\/v1\/wallet\/redeem-recovery'&&request\.method==='POST'\)/);
 assert.doesNotMatch(worker,/\/v1\/wallet\/create-recovery/);
});
test('web and APK recovery preserves other accounts and proves new enrollment before selecting it',()=>{
 assert.match(page,/id="ownerRecoveryCode"/);
 assert.match(page,/wallet\/redeem-recovery/);
 assert.match(page,/crypto\.getRandomValues/);
 assert.match(page,/api\(STAR,'\/v1\/state',deviceToken\)/);
 assert.match(page,/localStorage\.setItem\(prefix\+username,deviceToken\)/);
 assert.match(page,/history\.replaceState\(history\.state/);
 assert.doesNotMatch(page,/localStorage\.clear\(\)/);
});

test('recovery uses Android 12 compatible AbortController with response-body timeout',()=>{
 assert.match(page,/async function timedJson\(url,options,timeoutMs\)/);
 assert.match(page,/new AbortController\(\)/);
 assert.match(page,/await response\.json\(\)\.catch/);
 assert.doesNotMatch(page,/AbortSignal\.timeout\(/);
});

// Direct Bubbles recovery must reveal the verification panel without issuing grants.
test('Bubbles opens the Cloudflare verification form directly',()=>{
 const brain=fs.readFileSync('robot-brain-owner.js','utf8');
 const bubbles=fs.readFileSync('bubbles.html','utf8');
 assert.match(brain,/wallet-recovery\.html\?return=robot-brain&verify=1/);
 assert.match(bubbles,/wallet-recovery\.html\?verify=1/);
 assert.match(page,/OPEN_VERIFICATION/);
 assert.match(page,/No new code was issued/);
 assert.doesNotMatch(worker,/\/v1\/wallet\/create-recovery/);
});


test('Access issuer checks signed RSA JWT, owner, expiry and audience before writing one grant',async()=>{
 const vm=require('node:vm'),crypto=require('node:crypto').webcrypto;
 const source=fs.readFileSync('workers/unified-wallet/worker.js','utf8');
 const start=source.indexOf('async function verifiedAccessEmail(request,env){');
 const end=source.indexOf('async function redeemRecovery(request,env){',start);
 assert.ok(start>=0&&end>start);
 const issuer=source.slice(start,end);
 const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const pub=await crypto.subtle.exportKey('jwk',keys.publicKey);pub.kid='key-test';pub.alg='RS256';
 const encode=obj=>Buffer.from(JSON.stringify(obj)).toString('base64url');
 const sign=async claims=>{
  const input=encode({alg:'RS256',kid:'key-test',typ:'JWT'})+'.'+encode(claims);
  const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,Buffer.from(input));
  return input+'.'+Buffer.from(sig).toString('base64url');
 };
 const now=Math.floor(Date.now()/1000),issuerURL='https://test-access.cloudflareaccess.com';
 const standard={iss:issuerURL,aud:['aud-test'],exp:now+3600,iat:now-30,email:'owner@example.test'};
 const inserts=[];
 const db={prepare(sql){return {bind(...args){return {async first(){
  if(sql.startsWith('SELECT id,username'))return {id:'original-123',username:'device_original'};
  if(sql.startsWith('INSERT INTO wallet_recovery_grants')){inserts.push({sql,args});return {claim_hash:args[0]};}
  throw Error('Unexpected query');
 }}}}}};
 const env={IDENTITY_DB:db,RECOVERY_ACCESS_AUD:'aud-test',RECOVERY_ACCESS_ISSUER:issuerURL,RECOVERY_OWNER_EMAIL:'owner@example.test',RECOVERY_OWNER_ACCOUNT_ID:'original-123'};
 const digest=async code=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const getCerts=async url=>{assert.equal(url,issuerURL+'/cdn-cgi/access/certs');return Response.json({keys:[pub]})};
 const issue=vm.runInNewContext(issuer+';issueOwnerRecovery',{crypto,TextEncoder,TextDecoder,Response,URL,Request,btoa,atob,Uint8Array,fetch:getCerts,digest});
 const endpoint='https://unified-wallet.marvaseater.workers.dev/v1/wallet/issue-recovery';
 const request=(jwt='',method='GET',origin=endpoint)=>new Request(endpoint,{method,headers:{...(jwt?{'Cf-Access-Jwt-Assertion':jwt}:{}),...(method==='POST'?{Origin:new URL(origin).origin,'Sec-Fetch-Site':'same-origin'}:{})}});
 assert.equal((await issue(request(),env,{})).status,403);
 assert.match(await (await issue(request(),env,{})).text(),/session was not forwarded/);
 const forged=new Request(endpoint,{headers:{'Cf-Access-Authenticated-User-Email':'owner@example.test'}});
 assert.equal((await issue(forged,env,{})).status,403);
 assert.equal((await issue(request(await sign({...standard,aud:['another-audience']})),env,{})).status,403);
 assert.equal((await issue(request(await sign({...standard,iss:'https://other.cloudflareaccess.com'})),env,{})).status,403);
 assert.equal((await issue(request(await sign({...standard,exp:now-10})),env,{})).status,403);
 assert.equal((await issue(request(await sign({...standard,email:'other@example.test'})),env,{})).status,403);
 const valid=await sign(standard);
 assert.equal((await issue(request(valid.slice(0,-1)+(valid.at(-1)==='A'?'B':'A')),env,{})).status,403);
 assert.equal((await issue(request(valid),env,{})).status,200);
 // Access app cookie and assertion header have equal cryptographic proof.
 const cookieRequest=new Request(endpoint,{headers:{Cookie:'CF_Authorization='+valid}});
 assert.equal((await issue(cookieRequest,env,{})).status,200);
 assert.equal(inserts.length,0);
 assert.equal((await issue(request(valid,'POST','https://attacker.example'),env,{})).status,403);
 assert.equal(inserts.length,0);
 const response=await issue(request(valid,'POST'),env,{});
 assert.equal(response.status,200);
 assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
 assert.equal(response.headers.get('Cache-Control'),'no-store, private');
 const text=await response.text();
 assert.match(text,/wrc_[A-Za-z0-9_-]{43}/);
 assert.match(text,/quantaphi\.org\/wallet-recovery\.html#ownerRecovery=/);
 assert.equal(inserts.length,1);
 assert.equal(inserts[0].args[1],'original-123');
 assert.equal(inserts[0].args[3]-inserts[0].args[2],15*60*1000);
 assert.match(inserts[0].sql,/RETURNING claim_hash/);
 assert.match(inserts[0].sql,/NOT EXISTS/);
 assert.doesNotMatch(issuer,/input\.accountId|request\.json\(\)|getIdentity\(\)/);
 assert.match(issuer,/crypto\.subtle\.verify/);
 assert.match(issuer,/Cf-Access-Jwt-Assertion/);
});
