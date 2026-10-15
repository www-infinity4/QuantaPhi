const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {chromium}=require('playwright');
test('website chat scrolls without hiding composer and pairing requests bypass AI',async()=>{
 const server=http.createServer((req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(!/^\/[a-zA-Z0-9.-]+$/.test(path)||!fs.existsSync('.'+path)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html');
  res.end(fs.readFileSync('.'+path));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:360,height:640},isMobile:true,hasTouch:true});
  let aiCalls=0,pairCalls=0;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',route=>{
   const url=route.request().url();
   if(url.includes('/v1/assist'))aiCalls++;
   if(url.endsWith('/owner/pair/create')){pairCalls++;return route.fulfill({json:{ok:true,code:'a'.repeat(64)}});}
   return route.fulfill({json:{ok:true,messages:[],capabilities:[]}});
  });
  await page.addInitScript(()=>{
   localStorage.setItem('quantaphi:bubbles:history:v1',JSON.stringify(Array.from({length:30},(_,i)=>({role:'assistant',text:'Message '+i+' '+('Readable text. '.repeat(20))}))));
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/bubbles.html`);
  await page.waitForFunction(()=>window.QuantaBubbles);
  await page.evaluate(()=>{
   window.QuantaBrainOwner={ready:Promise.resolve({Authorization:'Bearer fixture'})};
  });
  await page.locator('.ba-launcher').click();
  const metrics=await page.evaluate(()=>{
   const thread=document.querySelector('.ba-thread'),composer=document.querySelector('.ba-composer');
   return {overflow:thread.scrollHeight>thread.clientHeight,height:thread.clientHeight,bottom:composer.getBoundingClientRect().bottom};
  });
  assert.ok(metrics.overflow&&metrics.height>60);assert.ok(metrics.bottom<=640);
  await page.locator('.ba-thread').evaluate(e=>e.scrollTop=100);
  assert.ok(await page.locator('.ba-thread').evaluate(e=>e.scrollTop>0));
  const field=page.locator('.ba-composer textarea');
  for(const phrase of ['One time code brain link','one-time code','link my APK']){
   await field.fill(phrase);await page.getByRole('button',{name:'Send',exact:true}).click();
   await page.waitForFunction(()=>!document.querySelector('.ba-send').disabled);
  }
  assert.equal(aiCalls,0);
  assert.equal(pairCalls,3);
  assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
});
