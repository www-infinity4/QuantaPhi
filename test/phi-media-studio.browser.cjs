const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:360,height:800}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const home=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');const card=home.slice(home.indexOf('<section id="phiMediaBuilder"'),home.indexOf('<section id="fredSpacesRadio"'));
 // Mount the actual shared home card with a real blue image form, no provider calls.
 await page.setContent('<body class="oracle-quanta">'+card+'</body>');
 await page.addStyleTag({path:path.resolve(__dirname,'../oracle-video-studio.css')});
 await page.addStyleTag({path:path.resolve(__dirname,'../phi-image-builder.css')});
 await page.evaluate(()=>{window.PhiVisualRender={asBlob:async src=>(await fetch(src)).blob(),validate:async()=>({width:200,height:120})}});
 await page.addScriptTag({path:path.resolve(__dirname,'../phi-image-builder.js')});
 await page.addScriptTag({path:path.resolve(__dirname,'../cinema-reel-core.js')});
 await page.addScriptTag({path:path.resolve(__dirname,'../phi-video-builder.js')});
 await page.addScriptTag({path:path.resolve(__dirname,'../phi-media-studio.js')});
 await page.locator('#pi-prompt').fill('My retained image idea');
 await page.getByRole('tab',{name:'Video',exact:true}).click();assert.equal(await page.locator('#phiImagePanel').isVisible(),false);
 assert.equal(await page.locator('#pv-prompt').inputValue(),'My retained image idea');
 await page.locator('#pv-prompt').fill('My video idea');await page.getByRole('tab',{name:'Image',exact:true}).click();
 assert.equal(await page.locator('#pi-prompt').inputValue(),'My retained image idea');await page.getByRole('tab',{name:'Image',exact:true}).press('ArrowRight');
 assert.equal(await page.locator('#pv-prompt').inputValue(),'My video idea');
 const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=200;canvas.height=120;const ctx=canvas.getContext('2d');ctx.fillStyle='#82c5ff';ctx.fillRect(0,0,200,120);return canvas.toDataURL().split(',')[1]});
 await page.locator('#pv-duration').selectOption('9');await page.locator('#phiVideoBuilder input[type=file]').first().setInputFiles({name:'scene.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await page.waitForFunction(()=>!PhiVideoBuilder.get().busy);
 await page.getByRole('button',{name:'Create video',exact:true}).click();await page.waitForFunction(()=>PhiVideoBuilder.get().plan&&!PhiVideoBuilder.get().busy);
 assert.equal(await page.locator('canvas.pv-canvas').isVisible(),true);
 await page.getByRole('button',{name:'Export video',exact:true}).click();await page.getByRole('button',{name:'Stop',exact:true}).click();await page.waitForFunction(()=>!PhiVideoBuilder.get().busy);
 assert.equal(await page.getByRole('link',{name:'Save video',exact:true}).isVisible(),false,'Cancelled export is not falsely ready');
 await page.getByRole('button',{name:'Export video',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.pv-result').hidden,{timeout:20000});
 const receipt=await page.evaluate(async()=>{const video=document.querySelector('.pv-result');await new Promise((resolve,reject)=>{if(video.readyState>=1)resolve();else{video.onloadedmetadata=resolve;video.onerror=reject}});const blob=await(await fetch(video.src)).blob();return {duration:video.duration,bytes:blob.size,type:blob.type,overflow:document.documentElement.scrollWidth>innerWidth}});
 assert.ok(receipt.duration>=8.8&&receipt.duration<=9.5,'Actual encoded video duration');assert.ok(receipt.bytes>1000);assert.match(receipt.type,/video/);assert.equal(receipt.overflow,false);
 await page.getByRole('tab',{name:'Image',exact:true}).click();assert.equal(await page.locator('#pi-prompt').inputValue(),'My retained image idea');
 assert.deepEqual(errors,[]);console.log('PASS: retained drafts, keyboard tabs, real 9-second export, cancellation, 360px layout',receipt);
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
