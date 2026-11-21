const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const {chromium}=require('playwright');
test('media composer handles a full mixed batch, retries, video-only drafts and long text',async t=>{
 const server=http.createServer((req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(!/^\/[a-zA-Z0-9.-]+$/.test(path)||!fs.existsSync('.'+path)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',/\.m?js$/.test(path)?'text/javascript':path.endsWith('.css')?'text/css':'text/html');
  res.end(fs.readFileSync('.'+path));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));server.unref();
 const browser=await chromium.launch({headless:true,executablePath:process.env.BUBBLES_CHROMIUM_PATH||undefined});
 const page=await browser.newPage({viewport:{width:360,height:740},isMobile:true,hasTouch:true});
 let failNext=false,failTextNext=false;
 const vision=[],textRequests=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**/*',route=>{
  const body=route.request().postDataJSON();
  if(route.request().url().includes('/v1/assist')){
   if(body?.image){
    vision.push(body);
    if(failNext){failNext=false;return route.fulfill({status:503,json:{ok:false,error:'synthetic_vision_failure'}});}
    return route.fulfill({json:{ok:true,output:'A teal test frame is visible.'}});
   }
   textRequests.push(body);
   if(failTextNext){failTextNext=false;return route.fulfill({status:503,json:{ok:false,error:'synthetic_text_failure'}});}
   return route.fulfill({json:{ok:true,output:'The supplied passage was received.'}});
  }
  return route.fulfill({json:{ok:true,messages:[],capabilities:[]}});
 });
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/bubbles.html`);
  await page.waitForFunction(()=>window.QuantaBubbles);
  await page.locator('.ba-launcher').click();
  const field=page.getByRole('textbox',{name:'Message Bubbles',exact:true});
  const picker=page.locator('.ba-photo-file'),send=page.getByRole('button',{name:'Send',exact:true});
  const status=page.locator('.ba-status');
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=10;c.height=10;c.getContext('2d').fillRect(0,0,10,10);return c.toDataURL().split(',')[1];});
  const image=i=>({name:'image-'+i+'.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  const video=i=>({name:'clip-'+i+'.webm',mimeType:'video/webm',buffer:fs.readFileSync('test/fixtures/bubbles-media-clip.webm')});
  await t.test('textbox has no cap and oversize send keeps every character',async()=>{
   const draft='x'.repeat(100000)+'TAIL';
   assert.equal(await field.getAttribute('maxlength'),null);
   await field.fill(draft);assert.equal(await field.inputValue(),draft);
   await send.click();assert.equal(await field.inputValue(),draft);
   assert.match(await status.textContent(),/32,000/);
   assert.equal(textRequests.length,0);
   const message='Summarize the following passage. '+'word '.repeat(1800)+' END-OF-PASSAGE';
   await field.fill(message);
   const textResponse=page.waitForResponse(response=>response.url().includes('/v1/assist'));
   await send.click();await textResponse;
   await page.waitForFunction(()=>!document.querySelector('.ba-send').disabled);
   assert.equal(textRequests.at(-1)?.request,message);
   assert.equal(textRequests.at(-1)?.input,undefined,'long text is sent once, avoiding duplicate JSON-body growth');
   const escaped='Summarize this passage.\n'+'line\\n\n'.repeat(4300)+'END';
   await field.fill(escaped);failTextNext=true;await send.click();
   await page.waitForFunction(()=>document.querySelector('.ba-status').textContent.includes('synthetic_text_failure')&&!document.querySelector('.ba-send').disabled);
   assert.equal(await field.inputValue(),escaped,'a failed model reply restores the complete cleared draft');
   assert.equal(textRequests.at(-1)?.request,escaped);
   assert.equal(textRequests.at(-1)?.input,undefined);
   await field.fill('');
  });
  await t.test('16 images and 20 videos survive multiple selections; overflow is explicit',async()=>{
   await picker.setInputFiles([...Array.from({length:8},(_,i)=>image(i)),...Array.from({length:10},(_,i)=>video(i))]);
   await page.waitForFunction(()=>!document.querySelector('.ba-photo-file').disabled);
   await picker.setInputFiles([...Array.from({length:8},(_,i)=>image(i+8)),...Array.from({length:10},(_,i)=>video(i+10))]);
   await page.waitForFunction(()=>!document.querySelector('.ba-photo-file').disabled);
   assert.match(await page.locator('.ba-photo-preview span').textContent(),/16\/16 images · 20\/20 videos/);
   for(const file of [image(17),video(21)]){
    await picker.setInputFiles(file);
    await page.waitForFunction(()=>!document.querySelector('.ba-photo-file').disabled);
    assert.match(await status.textContent(),/16 images and 20 videos/);
    assert.match(await page.locator('.ba-photo-preview span').textContent(),/16\/16 images · 20\/20 videos/);
   }
   await field.fill('Describe the attached media.');failNext=true;await send.click();
   await page.waitForFunction(()=>document.querySelector('.ba-status').textContent.includes('synthetic_vision_failure')&&!document.querySelector('.ba-send').disabled);
   assert.match(await status.textContent(),/synthetic_vision_failure/);
   assert.equal(await field.inputValue(),'Describe the attached media.');
   assert.match(await page.locator('.ba-photo-preview span').textContent(),/20\/20 videos/);
   await send.click();
   await page.waitForFunction(()=>document.querySelector('.ba-photo-preview').hidden&&!document.querySelector('.ba-send').disabled,null,{timeout:60000});
   assert.equal(vision.length,77,'one failed call plus 16 images and three actual decoded frames for each of 20 clips');
   assert.equal(await field.inputValue(),'');
   assert.equal(await page.locator('.ba-photo-preview').isVisible(),false);
   assert.match(await status.textContent(),/sampled frames only; audio is not transcribed/);
   assert.ok(vision.every(body=>body.image.startsWith('data:image/jpeg;base64,')&&body.image.length<=440000));
   const saved=await page.evaluate(()=>Object.values(localStorage).join('\n'));
   assert.ok(!saved.includes('data:image/')&&!saved.includes('blob:'));
  });
  await t.test('video-only unsent work is preserved when a new-chat confirmation is declined',async()=>{
   await picker.setInputFiles(video(0));
   await page.waitForFunction(()=>!document.querySelector('.ba-photo-file').disabled);
   await page.locator('.ba-conversation-folders > summary').click();
   page.once('dialog',dialog=>dialog.dismiss());
   await page.getByRole('button',{name:'New chat',exact:true}).click();
   assert.match(await page.locator('.ba-photo-preview span').textContent(),/1\/20 videos/);
   await page.getByRole('button',{name:'Remove attachments',exact:true}).click();
   assert.equal(await page.locator('.ba-photo-preview').isVisible(),false);
  });
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
test('website chat scrolls without hiding composer and pairing requests bypass AI',async()=>{
 const server=http.createServer((req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(!/^\/[a-zA-Z0-9.-]+$/.test(path)||!fs.existsSync('.'+path)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',/\.m?js$/.test(path)?'text/javascript':path.endsWith('.css')?'text/css':'text/html');
  res.end(fs.readFileSync('.'+path));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.BUBBLES_CHROMIUM_PATH||undefined});
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
  const field=page.getByRole('textbox',{name:'Message Bubbles',exact:true});
  for(const phrase of ['One time code brain link','one-time code','link my APK']){
   const receipt=page.waitForResponse(response=>response.url().endsWith('/owner/pair/create'));
   await field.fill(phrase);await page.getByRole('button',{name:'Send',exact:true}).click();
   await receipt;
   await page.waitForFunction(()=>!document.querySelector('.ba-send').disabled);
  }
  assert.equal(aiCalls,0);
  assert.equal(pairCalls,3);
  assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
});

test('real inline chat sign-in settles at phone and desktop widths without granting provider access',async t=>{
 const server=http.createServer((req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(!/^\/[a-zA-Z0-9.-]+$/.test(path)||!fs.existsSync('.'+path)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',/\.m?js$/.test(path)?'text/javascript':path.endsWith('.css')?'text/css':'text/html');
  res.end(fs.readFileSync('.'+path));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.BUBBLES_CHROMIUM_PATH||undefined});
 try{
  for(const [width,walletVerified] of [[360,false],[1280,false],[360,true]]){
   await t.test(width+'px '+(walletVerified?'verified wallet':'missing wallet'),async()=>{
    const page=await browser.newPage({viewport:{width,height:760},isMobile:width===360,hasTouch:width===360});
    let oauthStarts=0;
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**/*',route=>route.fulfill({json:{ok:true,messages:[],capabilities:[]}}));
    await page.route('**/api/bubbles/connections/**',route=>{
     const path=new URL(route.request().url()).pathname;
     if(path.endsWith('/start'))oauthStarts++;
     return route.fulfill({json:{ok:true,walletVerified,ready:false,providers:{}}});
    });
    if(walletVerified)await page.addInitScript(()=>{
     localStorage.setItem('starquest_session',JSON.stringify({key:'fixture',username:'fixture'}));
     localStorage.setItem('starquest_ledger_device_v1:fixture','sq_'+'a'.repeat(43));
    });
    try{
     await page.goto(`http://127.0.0.1:${server.address().port}/bubbles.html`);
     await page.waitForFunction(()=>window.QuantaBubbles);
     await page.locator('.ba-launcher').click();
     const gate=page.locator('#chatBubblesSigninGate');
     if(walletVerified){
      await gate.waitFor({state:'hidden'});
      assert.equal(await gate.getAttribute('data-ready'),'false');
     }else{
      const github=page.locator('#chatBubblesGithubSignIn'),cloudflare=page.locator('#chatBubblesCloudflareSignIn');
      await page.waitForFunction(()=>document.getElementById('chatBubblesCloudflareSignIn')?.textContent==='Sign in with Cloudflare');
      assert.equal(await github.isEnabled(),true);
      assert.equal(await cloudflare.isEnabled(),true);
      const recovery=page.locator('#chatBubblesRecoverWallet');
      assert.equal(await recovery.isVisible(),true);
      assert.equal(await recovery.getAttribute('href'),'/wallet-recovery.html?signin=starquest&returnTo=/bubbles.html');
      await cloudflare.click();
      assert.match(await page.locator('#chatBubblesSigninStatus').textContent(),/Sign in with StarQuest/);
      assert.equal(await cloudflare.isEnabled(),true);
      assert.equal(await page.locator('#chatBubblesCancelSignIn').isVisible(),false);
     }
     assert.equal(oauthStarts,0,'Status checks cannot authorize a provider');
     assert.equal(await page.getByRole('textbox',{name:'Message Bubbles',exact:true}).isVisible(),true);
     assert.deepEqual(errors,[]);
    }finally{await page.close();}
   });
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
