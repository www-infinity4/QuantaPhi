const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 try{
 const page=await browser.newPage({viewport:{width:360,height:800}});
 await page.setContent('<body class="oracle-quanta oracle-surface"><div id="phiImageBuilder"></div></body>');
 for(const file of ['phi-image-builder.css','phi-card-controls.css','phi-electric-theme.css'])await page.addStyleTag({path:path.resolve(__dirname,'..',file)});
 await page.evaluate(()=>{
  window.calls=[];window.nextScore=80;window.fail=false;
  const canvas=document.createElement('canvas');canvas.width=600;canvas.height=400;const c=canvas.getContext('2d');c.fillStyle='#eef';c.fillRect(0,0,600,400);const src=canvas.toDataURL();
  window.PhiVisualRender={modePrompt:()=>'',inspect:async()=>'',direct:async input=>{calls.push({type:'direct',input});return input.description},render:async input=>{calls.push({type:'render',description:input.description,exactText:input.exactText});if(window.fail)throw Error('provider unavailable');return {src,renderer:'test'}},validate:async()=>({width:600,height:400}),asBlob:async()=>new Blob(['pixels'],{type:'image/png'}),composeExactText:async(_,text)=>{calls.push({type:'compose',text});return src},review:async()=>({score:window.nextScore,status:'needs_work',issues:[{problem:'Gibberish text',fix:'Remove painted text'},{problem:'Unclear disc geometry',fix:'Replace disc geometry'}]})};
 });
 await page.addScriptTag({path:path.resolve(__dirname,'../phi-image-builder.js')});
 await page.screenshot({path:'/tmp/oracle-image-studio-mobile.png',fullPage:true});
 assert.equal(await page.locator('#pi-exact-text').isVisible(),false);
 assert.equal(await page.locator('#pi-text-mode').inputValue(),'none');
 await page.locator('#pi-prompt').fill('Preserve my mechanism artwork');await page.locator('[data-pi-action="build"]').click();
 await page.waitForFunction(()=>document.querySelector('#phiImageBuilder').dataset.stage==='finished');
 assert.equal(await page.locator('[data-pi-issue="0"]').isChecked(),true);assert.equal(await page.locator('[data-pi-issue="1"]').isChecked(),false);
 const original=await page.evaluate(()=>PhiImageBuilder.get().artifact.id);
 await page.locator('#pi-correct-text').fill('Centrifugal Spin-Dry');await page.locator('[data-pi-action="apply-lettering"]').click();
 await page.waitForFunction(()=>!PhiImageBuilder.get().busy);
 assert.equal(await page.evaluate(()=>calls.filter(x=>x.type==='render').length),1,'lettering edits do not call renderer');
 await page.locator('[data-pi-action="remove-lettering"]').click();await page.waitForFunction(()=>!PhiImageBuilder.get().busy);
 assert.equal(await page.locator('#pi-text-mode').inputValue(),'none');
 // Restore review selections by going through a new render after local text edits.
 await page.locator('[data-pi-action="edit"]').click();await page.locator('[data-pi-action="build"]').click();await page.waitForFunction(()=>!PhiImageBuilder.get().busy);
 const beforeRepair=await page.evaluate(()=>PhiImageBuilder.get().artifact.id);await page.evaluate(()=>window.nextScore=35);
 await page.locator('[data-pi-action="repair-lettering"]').click();await page.waitForFunction(()=>!PhiImageBuilder.get().busy&&document.querySelector('#phiImageBuilder').dataset.stage==='finished');
 assert.equal(await page.evaluate(()=>PhiImageBuilder.get().artifact.id),beforeRepair,'lower-scoring repair keeps original');
 const repair=await page.evaluate(()=>calls.filter(x=>x.type==='render').at(-1));assert.match(repair.description,/Preserve all objects/);assert.doesNotMatch(repair.description,/Replace disc geometry/);
 await page.evaluate(()=>window.fail=true);await page.locator('[data-pi-action="fix"]').click();await page.waitForFunction(()=>!PhiImageBuilder.get().busy&&document.querySelector('#phiImageBuilder').dataset.stage==='finished');
 assert.equal(await page.evaluate(()=>PhiImageBuilder.get().artifact.id),beforeRepair,'failed repair keeps original');
 await page.locator('[data-pi-action="edit"]').click();await page.locator('#pi-text-mode').selectOption('exact');assert.equal(await page.locator('#pi-exact-text').isVisible(),true);
 const mobile=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,background:getComputedStyle(document.querySelector('.pi-panel')).backgroundImage,height:document.querySelector('.pi-mode').getBoundingClientRect().height,radius:getComputedStyle(document.querySelector('.pi-mode')).borderRadius,grid:getComputedStyle(document.querySelector('.pi-modes')).display}));
 assert.equal(mobile.overflow,false);assert.ok(mobile.height>=44);assert.equal(mobile.radius,'999px');assert.equal(mobile.grid,'grid');assert.match(mobile.background,/255, 255, 255/);
 console.log('PASS: mobile layout, lettering-only edits, selected repairs, lower-score retention, failure recovery');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
