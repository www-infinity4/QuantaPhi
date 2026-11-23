// Synthetic account fixtures only; no production credentials or provider calls.
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd();
const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/bubbles-auth.css"></head><body class="bubbles-auth-page"><main id="accounts" class="bubbles-auth-shell"></main><script type="module">import {mountConnections} from '/bubbles-connections.mjs';window.panel=mountConnections(document.getElementById('accounts'),{token:async()=>'sq_'+'A'.repeat(43)});await panel.refresh();window.fixtureReady=true;</script></body></html>`;
const server=http.createServer((req,res)=>{const rel=new URL(req.url,'http://fixture.test').pathname;if(rel==='/fixture'){res.writeHead(200,{'Content-Type':'text/html'});res.end(html);return;}const file=path.join(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{res.writeHead(200,{'Content-Type':rel.endsWith('.css')?'text/css':'text/javascript'});res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;try{
 browser=await chromium.launch({headless:true,...(process.env.QA_CHROMIUM_EXECUTABLE?{executablePath:process.env.QA_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 const origin='http://127.0.0.1:'+server.address().port;
 const {globalUserIdentity}=await import(path.join(root,'workers/unified-wallet/device-number-core.mjs'));
 const ids=[await globalUserIdentity('account-a'),await globalUserIdentity('account-b')];
 for(const width of [360,393,1280]){
  const context=await browser.newContext({viewport:{width,height:844},permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage();let account=0,providerFailure=false,holdFirst=false,heldReply;
  await page.route('**/api/bubbles/connections/**',async route=>{const name=new URL(route.request().url()).pathname.split('/connections')[1];let data;
   if(name==='/session'){
    const current=account;
    if(holdFirst){holdFirst=false;await new Promise(resolve=>heldReply=resolve);}
    data=current>=0?{ok:true,walletVerified:true,globalIdentity:ids[current]}:{ok:false,error:'verified_wallet_required'};
    await route.fulfill({status:current>=0?200:401,json:data});return;
   }
   if(name==='/catalog')data={ok:true,providers:[]};
   else if(name==='/accounts')data=providerFailure?{ok:false,error:'temporary_provider_failure'}:{ok:true,accounts:[]};
   else if(name==='/wallet-email/preferences')data={ok:true,enabled:false};
   else if(name==='/handoff/cloudflare/resume')data={ok:true,status:'missing'};
   else throw Error('Unexpected endpoint '+name);
   await route.fulfill({status:data.ok?200:503,json:data});
  });
  await page.goto(origin+'/fixture');await page.waitForFunction(()=>window.fixtureReady);
  assert.equal(await page.locator('#bubblesGlobalUserId').textContent(),ids[0].number);
  const copy=page.getByRole('button',{name:'Copy account number',exact:true});await copy.click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),ids[0].number);
  const layout=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,width:innerWidth,copy:document.querySelector('#bubblesGlobalUserId').getBoundingClientRect().width}));
  assert.ok(layout.doc<=width+1,JSON.stringify(layout));
  assert.ok(await copy.evaluate(n=>n.getBoundingClientRect().height)>=44);
  if(width===393)await page.screenshot({path:'/tmp/new-world-id-mobile.png',fullPage:true});
  providerFailure=true;await page.evaluate(()=>panel.refresh());
  assert.equal(await page.locator('#bubblesGlobalUserId').textContent(),ids[0].number);
  providerFailure=false;holdFirst=true;
  await page.evaluate(()=>{window.oldRefresh=panel.refresh();});
  await page.waitForFunction(()=>document.getElementById('bubblesGlobalUserId').textContent==='');
  for(let i=0;i<25&&!heldReply;i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(typeof heldReply,'function');account=1;
  await page.evaluate(()=>panel.refresh());heldReply();await page.evaluate(()=>window.oldRefresh);
  assert.equal(await page.locator('#bubblesGlobalUserId').textContent(),ids[1].number,'stale account A response cannot replace account B');
  account=-1;await page.evaluate(()=>panel.refresh());
  assert.equal(await page.locator('#bubblesGlobalUserId').textContent(),'');assert.equal(await copy.isDisabled(),true);
  console.log(JSON.stringify({width,checks:['verified-id','exact-copy','no-horizontal-overflow','44px-tap','optional-provider-outage','stale-response-rejected','logout-cleared'],passed:true}));
  await context.close();
 }
}finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
