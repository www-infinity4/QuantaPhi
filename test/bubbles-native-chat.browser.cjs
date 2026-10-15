const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {chromium}=require('playwright');

test('Android chat: one scroll surface, reachable composer, visible pairing results and ordinary links',async()=>{
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const allowed=['/bubbles.html','/bubbles-ai.js','/bubbles-ai.css','/bubbles-native-chat.css','/oracle-octaves.css','/bubbles-introduction.css'];
  if(!allowed.includes(pathname)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',pathname.endsWith('.js')?'text/javascript':pathname.endsWith('.css')?'text/css':'text/html');
  res.end(fs.readFileSync('.'+pathname));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:336,height:480},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let aiCalls=0;
  await page.route('https://**/*',async route=>{
   const url=route.request().url();
   if(url.includes('/v1/assist')){aiCalls++;return route.fulfill({json:{ok:true,output:'Received your link.'}});}
   return route.fulfill({json:{ok:true,messages:[],capabilities:[],active:'android'}});
  });
  await page.addInitScript(()=>{
   localStorage.setItem('quantaphi:bubbles:history:v1',JSON.stringify(Array.from({length:45},(_,i)=>({role:i%2?'user':'assistant',text:'Message '+i+' '+('Readable conversation. '.repeat(12))}))));
   window.QuantaBrainOwner={ready:Promise.resolve(null),connectWithCode:async code=>{
    window.pairedCode=code;
    if(code==='f'.repeat(64))return {state:'unreachable'};
    window.QuantaBrainOwner.ready=Promise.resolve({Authorization:'Bearer fixture-owner'});
    return {state:'verified'};
   }};
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/bubbles.html?nativeOverlay=1`);
  await page.waitForFunction(()=>window.QuantaBubbles?.isNativeOverlay);
  const field=page.getByRole('textbox',{name:'Message Bubbles',exact:true});
  const send=page.getByRole('button',{name:'Send',exact:true});
  const metrics=()=>page.evaluate(()=>{
   const thread=document.querySelector('.ba-thread'),composer=document.querySelector('.ba-composer');
   const scrollables=[...document.querySelectorAll('.ba-panel *')].filter(e=>e.getClientRects().length&&e.clientHeight>0&&getComputedStyle(e).display!=='none'&&['auto','scroll'].includes(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight+1);
   return {scrollables:scrollables.map(e=>e.className),height:thread.clientHeight,overflow:thread.scrollHeight>thread.clientHeight,composerBottom:composer.getBoundingClientRect().bottom,viewport:visualViewport.height};
  });
  let m=await metrics();assert.deepEqual(m.scrollables,['ba-thread']);assert.ok(m.height>100&&m.overflow);assert.ok(m.composerBottom<=m.viewport);
  await page.locator('.ba-thread').evaluate(e=>e.scrollTop=0);
  await page.locator('.ba-thread').hover();await page.mouse.wheel(0,600);
  await page.waitForFunction(()=>document.querySelector('.ba-thread').scrollTop>0);
  await page.locator('.ba-thread').evaluate(e=>e.scrollTop=0);
  await field.fill('pairing code: short');await send.click();
  assert.match(await page.locator('.ba-status').innerText(),/exactly 64/);
  assert.equal(await page.locator('.ba-status').isVisible(),true);assert.equal(aiCalls,0);
  await field.fill('f'.repeat(64));await send.click();
  await page.waitForFunction(()=>document.querySelector('.ba-status').textContent.includes('Pairing not completed'));
  assert.equal(await page.locator('.ba-status').isVisible(),true);
  const code='a1'.repeat(32);await field.fill(code);await send.click();
  await page.waitForFunction(()=>document.querySelector('.ba-messages').textContent.includes('Robot Brain connected'));
  assert.equal(await page.evaluate(()=>window.pairedCode),code);
  assert.equal(await page.locator('.ba-messages').innerText().then(s=>s.includes(code)),false);
  assert.equal(await page.evaluate(c=>JSON.stringify(localStorage).includes(c),code),false);
  assert.equal(aiCalls,0);
  await field.fill('https://example.org/Bubbles.apk');await send.click();
  await page.waitForFunction(()=>document.querySelector('.ba-messages').textContent.includes('Received your link.'));
  assert.equal(aiCalls,1);
  await page.setViewportSize({width:320,height:300});
  await page.waitForFunction(()=>document.querySelector('.ba-composer').getBoundingClientRect().bottom<=visualViewport.height+1);
  m=await metrics();assert.ok(m.height>0);assert.ok(m.composerBottom<=m.viewport+1,JSON.stringify(m));
  await page.getByText('Options',{exact:true}).click();
  m=await metrics();assert.deepEqual(m.scrollables,['ba-thread']);
  await page.screenshot({path:'/tmp/bubbles-native-chat20.png'});
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
