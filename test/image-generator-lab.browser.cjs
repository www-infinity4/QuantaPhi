/* Real Chromium test: a complete browser-local image is produced in each card.
 * No live image model calls, third-party remote previews or fake download receipts.
 */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const PORT=8798,base='http://127.0.0.1:'+PORT+'/';
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
async function ready(){
 for(let i=0;i<45;i++){
  try{const r=await fetch(base+'test/fixtures/image-generator-lab.html');if(r.ok)return}catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 throw Error('Test HTTP server did not start');
}
(async()=>{
 let browser;
 try{
  await ready();
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  for(const width of [320,360,393]){
   const page=await browser.newPage({viewport:{width,height:830},acceptDownloads:true,isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'test/fixtures/image-generator-lab.html',{waitUntil:'domcontentloaded'});
   const carousel=page.locator('#imageGeneratorCarousel');
   const first=carousel.locator('.igl-card');
   await first.waitFor({state:'visible',timeout:15000});
   assert.equal(await first.getAttribute('data-generator-id'),'image-gradient-studio');
   assert.match(await carousel.locator('.igl-count').innerText(),/1 \/ 6/);
   let picture=first.locator('.igl-image');
   await picture.evaluate(img=>img.decode());
   assert.equal(await picture.evaluate(img=>img.naturalWidth),960);
   const bounds=await carousel.evaluate(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(bounds.left>=-1&&bounds.right<=bounds.viewport+1,'Android '+width+'px carousel fits screen '+JSON.stringify(bounds));
   assert.ok(bounds.scroll<=bounds.viewport+1,'No horizontal overflow at '+width+'px');
   const prompt=carousel.locator('#igl-prompt');
   await prompt.fill('Original lighthouse in azure and gold <script>alert(1)</script>');
   await carousel.getByRole('button',{name:'Print image'}).click();
   await picture.evaluate(img=>img.decode());
   assert.match(await carousel.locator('.igl-status').innerText(),/Image generated on your device/);
   const svgDownload=page.waitForEvent('download');
   await carousel.getByRole('button',{name:'Save SVG'}).click();
   const svg=await svgDownload;assert.equal(svg.suggestedFilename(),'image-gradient-studio.svg');
   const pngDownload=page.waitForEvent('download');
   await carousel.getByRole('button',{name:'Save PNG'}).click();
   const png=await pngDownload;assert.equal(png.suggestedFilename(),'image-gradient-studio.png');
   await carousel.getByRole('button',{name:'Next image generator'}).click();
   assert.equal(await carousel.locator('.igl-card').getAttribute('data-generator-id'),'image-pattern-lab');
   assert.equal(await carousel.locator('.igl-card .igl-source-link').count(),2);
   await carousel.getByRole('button',{name:'Previous image generator'}).click();
   assert.equal(await carousel.locator('#igl-prompt').inputValue(),'Original lighthouse in azure and gold <script>alert(1)</script>');
   assert.deepEqual(errors,[],'Browser JavaScript errors');
   await page.close();
  }
  const page=await browser.newPage({viewport:{width:320,height:740}});
  await page.route('**/data/image-generator-sources.json',route=>route.fulfill({status:503,body:'unavailable'}));
  await page.goto(base+'test/fixtures/image-generator-lab.html',{waitUntil:'domcontentloaded'});
  await page.getByText('Image generator sources unavailable').waitFor({timeout:12000});
  assert.equal(await page.locator('.igl-card').count(),0,'Unavailable catalog never creates fake cards');
  await page.close();
  console.log('PASS: 320/360/393 Android real SVG & PNG prints, navigation, source links, prompt preservation, error fail-closed');
 }finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
 }
})().catch(error=>{console.error(error);server.kill('SIGTERM');process.exitCode=1});
