const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 try{
 const page=await browser.newPage({viewport:{width:360,height:800}});
 await page.setContent('<body class="oracle-quanta oracle-surface"><div id="phiImageBuilder"></div></body>');
 for(const file of ['phi-image-builder.css','phi-card-controls.css','phi-electric-theme.css'])
  await page.addStyleTag({path:path.resolve(__dirname,'..',file)});
 await page.evaluate(()=>{
  window.calls=[];window.nextScore=80;window.fail=false;
  const canvas=document.createElement('canvas');canvas.width=600;canvas.height=400;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#eef';ctx.fillRect(0,0,600,400);
  const src=canvas.toDataURL();
  window.PhiVisualRender={
   modePrompt:()=>'',inspect:async()=>'',direct:async input=>{calls.push({type:'direct',input});return input.description},
   render:async input=>{
    calls.push({type:'render',description:input.description,prompt:input.prompt,sourceName:input.source?.name||'',source:!!input.source,exactText:input.exactText});
    if(window.fail)throw Error('provider unavailable');
    return {src,renderer:'test'};
   },
   validate:async()=>({width:600,height:400}),
   asBlob:async()=>new Blob(['pixels'],{type:'image/png'}),
   composeExactText:async(_,text)=>{calls.push({type:'compose',text});return src},
   review:async()=>({score:window.nextScore,status:window.nextScore>=90?'good':'needs_work',
    issues:[{problem:'Gibberish text',fix:'Remove painted text'},{problem:'Unclear disc geometry',fix:'Repair the connection to the plate'}]})
  };
 });
 await page.addScriptTag({path:path.resolve(__dirname,'../phi-image-language.js')});
 await page.addScriptTag({path:path.resolve(__dirname,'../phi-image-learning.js')});
 await page.addScriptTag({path:path.resolve(__dirname,'../phi-image-builder.js')});
 assert.equal(await page.locator('#pi-exact-text').isVisible(),false);
 assert.equal(await page.locator('.pi-exact-optional').isVisible(),true);
 assert.equal(await page.locator('.pi-exact-optional').getAttribute('open'),null);
 assert.equal(await page.locator('.pi-section h3').filter({hasText:'Lettering'}).count(),0,'There must not be a prominent lettering step');
 assert.equal(await page.locator('#pi-text-mode').inputValue(),'auto');
 assert.equal(await page.locator('.pi-type-panel').count(),0,'No dragging studio should appear');
 const description='Preserve my mechanism artwork';
 await page.locator('#pi-prompt').fill(description);
 // The uploaded reference is the user's asset, not a scratch slot for generated images.
 const sample=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=20;c.height=20;
  c.getContext('2d').fillRect(0,0,20,20);return c.toDataURL().split(',')[1];
 });
 await page.locator('[data-pi-file="source"]').setInputFiles({name:'my-photo.png',mimeType:'image/png',buffer:Buffer.from(sample,'base64')});
 const beforeUpload=await page.locator('.pi-upload-image').getAttribute('src');
 await page.locator('[data-pi-action="build"]').click();
 await page.waitForFunction(()=>document.querySelector('#phiImageBuilder').dataset.stage==='finished');
 assert.match(await page.locator('.pi-audit-title').innerText(),/Image Grader · 80\/100/);
 assert.equal(await page.locator('.pi-grade-issue').count(),2);
 const initial=await page.evaluate(()=>PhiImageBuilder.get().artifact.id);
 await page.evaluate(()=>window.nextScore=35);
 await page.locator('[data-pi-action="fix"]').click();
 await page.waitForFunction(()=>calls.filter(x=>x.type==='render').length===2&&!PhiImageBuilder.get().busy);
 assert.equal(await page.evaluate(()=>PhiImageBuilder.get().artifact.id),initial,'lower grade preserves original');
 assert.equal(await page.locator('#pi-prompt').inputValue(),description,'Fix must not rewrite description');
 assert.equal(await page.locator('.pi-upload-image').getAttribute('src'),beforeUpload,'Fix must not replace uploaded photo');
 assert.equal(await page.locator('#phiImageBuilder').getAttribute('data-stage'),'finished');
 const low=await page.evaluate(()=>calls.filter(x=>x.type==='render').at(-1));
 assert.equal(low.source,true,'Fix internally provides current pixels');
 assert.match(low.prompt,/Remove painted text/);
 assert.match(low.prompt,/Repair the connection to the plate/);
 assert.equal(low.description,description,'Fix uses original description');
 await page.evaluate(()=>window.fail=true);
 await page.locator('[data-pi-action="fix"]').click();
 await page.waitForFunction(()=>calls.filter(x=>x.type==='render').length===3&&!PhiImageBuilder.get().busy);
 assert.equal(await page.evaluate(()=>PhiImageBuilder.get().artifact.id),initial,'failed repair preserves original');
 await page.evaluate(()=>{window.fail=false;window.nextScore=93});
 await page.locator('#pi-fix-notes').fill('Clean the distracting lettering only');
 await page.locator('[data-pi-action="fix"]').click();
 await page.waitForFunction(()=>calls.filter(x=>x.type==='render').length===4&&!PhiImageBuilder.get().busy);
 assert.notEqual(await page.evaluate(()=>PhiImageBuilder.get().artifact.id),initial,'improved repair returns a new artifact');
 assert.match(await page.locator('.pi-audit-title').innerText(),/Image Grader · 93\/100/);
 assert.equal(await page.locator('.pi-upload-image').getAttribute('src'),beforeUpload);
 assert.equal(await page.locator('#pi-fix-notes').inputValue(),'');
 const fixed=await page.evaluate(()=>calls.filter(x=>x.type==='render').at(-1));
 assert.match(fixed.prompt,/Clean the distracting lettering only/);
 assert.doesNotMatch(fixed.prompt,/Repair the connection to the plate/,'specific user fix must override other grader suggestions');
 await page.locator('[data-pi-action="edit"]').click();
 assert.equal(await page.locator('#pi-prompt').inputValue(),description);
 await page.locator('.pi-exact-optional summary').click();
 await page.locator('#pi-text-mode').selectOption('exact');
 assert.equal(await page.locator('#pi-exact-text').isVisible(),true);
 const mobile=await page.evaluate(()=>({
  overflow:document.documentElement.scrollWidth>innerWidth,
  background:getComputedStyle(document.querySelector('.pi-panel')).backgroundImage,
  height:document.querySelector('.pi-mode').getBoundingClientRect().height,
  radius:getComputedStyle(document.querySelector('.pi-mode')).borderRadius,
  pickerHeight:document.querySelector('#pi-build-type').getBoundingClientRect().height
 }));
 assert.equal(mobile.overflow,false);assert.ok(mobile.height>=44);
 assert.equal(mobile.radius,'999px');assert.ok(mobile.pickerHeight>=44);
 assert.match(mobile.background,/247, 252, 255/,'The user-facing composer must use the blue palette');
 const primary=await page.locator('[data-pi-action="build"]').evaluate(el=>getComputedStyle(el).backgroundImage);
 assert.match(primary,/23, 105, 182/,'Main button should be blue rather than purple');
 // Normal customers never open a lettering mode. Their poster still prints
 // the two requested lines directly from the one description field.
 await page.locator('#pi-text-mode').selectOption('auto');
 await page.locator('.pi-exact-optional summary').click();
 await page.locator('#pi-build-type').selectOption('Poster');
 await page.locator('#pi-prompt').fill('Design a mosaic poster for Oracle AI Studio - Mosaic with the phrase "The Intelligence Architecture Solution".');
 await page.locator('[data-pi-action="build"]').click();
 await page.waitForFunction(()=>document.querySelector('#phiImageBuilder').dataset.stage==='finished' && !window.PhiImageBuilder.get().busy);
 const auto=await page.evaluate(()=>window.calls.filter(c=>c.type==='render').at(-1));
 assert.equal(auto.exactText,'Oracle AI Studio - Mosaic\nThe Intelligence Architecture Solution');
 assert.equal(await page.locator('.pi-exact-optional').getAttribute('open'),null);
 const print=await page.evaluate(()=>window.calls.filter(c=>c.type==='compose').at(-1));
 assert.equal(print.text,auto.exactText,'automatically inferred wording is printed without additional user input');
 assert.match(await page.locator('.pi-finished .pi-notice').innerText(),/Exact requested words printed/);
 console.log('PASS: blue mobile card, grader, direct repair, preserved upload and prompt, failure and lower-score recovery');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
