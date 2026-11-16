// Local-only browser regression. Synthetic RSA identity and an in-memory grant
// fixture; never contacts Cloudflare or a production wallet/database.
const fs=require('node:fs'),http=require('node:http'),vm=require('node:vm');
const assert=require('node:assert/strict');
const crypto=require('node:crypto').webcrypto;
const {chromium}=require('playwright');

(async()=>{
 const source=fs.readFileSync('workers/unified-wallet/worker.js','utf8');
 const start=source.indexOf('async function verifiedAccessEmail(request,env,diagnostics={}){');
 const end=source.indexOf('async function redeemRecovery(request,env){',start);
 assert.ok(start>=0&&end>start);
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const pub=await crypto.subtle.exportKey('jwk',pair.publicKey);pub.kid='synthetic-key';pub.alg='RS256';
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const issuer='https://test-access.cloudflareaccess.com';
 const input=encode({alg:'RS256',kid:pub.kid})+'.'+encode({iss:issuer,aud:['fixture'],exp:Math.floor(Date.now()/1000)+300,email:'owner@example.test'});
 const jwt=input+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,Buffer.from(input))).toString('base64url');
 const writes=[];
 const db={prepare(sql){
  return{bind(...args){
   return{async first(){
    if(sql.startsWith('SELECT id,username'))return{id:'original-fixture',username:'device_fixture'};
    if(sql.startsWith('INSERT INTO wallet_recovery_grants')){writes.push({sql,args});return{claim_hash:args[0]};}
    throw Error('Unexpected SQL');
   }};
  }};
 }};
 const env={RECOVERY_ACCESS_ISSUER:issuer,RECOVERY_ACCESS_AUD:'fixture',RECOVERY_OWNER_EMAIL:'owner@example.test',RECOVERY_OWNER_ACCOUNT_ID:'original-fixture',IDENTITY_DB:db};
 const digest=async value=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))).toString('hex');
 const issue=vm.runInNewContext(source.slice(start,end)+';issueOwnerRecovery',{crypto,TextEncoder,TextDecoder,Response,URL,Request,btoa,atob,Uint8Array,digest,AbortSignal,fetch:async()=>Response.json({keys:[pub]}),console:{warn(){}}});
 const requests=[];
 const server=http.createServer(async(req,res)=>{
  try{
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const headers=new Headers(req.headers);headers.set('Cf-Access-Jwt-Assertion',jwt);
   const request=new Request('http://127.0.0.1:'+server.address().port+req.url,{method:req.method,headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});
   const response=await issue(request,env,{});
   requests.push({method:req.method,origin:req.headers.origin||null,site:req.headers['sec-fetch-site']||null,status:response.status,policy:response.headers.get('Referrer-Policy')});
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
  }catch(error){res.writeHead(500);res.end('Fixture error');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.QA_CHROMIUM_EXECUTABLE?{executablePath:process.env.QA_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  const endpoint='http://127.0.0.1:'+server.address().port+'/v1/wallet/issue-recovery';
  for(const mobile of [false,true]){
   requests.length=0;writes.length=0;
   const context=await browser.newContext({viewport:{width:mobile?390:1280,height:844},isMobile:mobile,hasTouch:mobile});
   try{
    const page=await context.newPage();
    const form=await page.goto(endpoint);
    assert.equal(form.status(),200);assert.equal(form.headers()['referrer-policy'],'same-origin');assert.equal(writes.length,0);
    const postResponse=page.waitForResponse(r=>r.url()===endpoint&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Generate one-time recovery code'}).click();
    const result=await postResponse;await page.waitForLoadState('load');
    const post=requests.find(x=>x.method==='POST');
    assert.equal(result.status(),200);assert.equal(post.origin,new URL(endpoint).origin);assert.equal(post.site,'same-origin');
    assert.equal(post.policy,'no-referrer');assert.equal(writes.length,1);assert.equal(writes[0].args[1],'original-fixture');
    assert.match(await page.locator('code').innerText(),/^wrc_[A-Za-z0-9_-]{43}$/);
    console.log(JSON.stringify({browser:await browser.version(),mobile,formStatus:form.status(),postStatus:result.status(),sameOrigin:post.origin===new URL(endpoint).origin,grantWrites:writes.length,codePagePolicy:post.policy}));
   }finally{await context.close();}
  }
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
