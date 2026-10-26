const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');

test('Gary Cardone appears once, inside the carousel, and survives Next/Previous and shelf toggles',async()=>{
 const root=process.cwd();
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
   res.writeHead(404);res.end();return;
  }
  const type={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
  res.setHeader('Content-Type',type[path.extname(file)]||'application/octet-stream');
  res.end(fs.readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const origin='http://127.0.0.1:'+server.address().port;
  for(const width of [360,1280]){
   const page=await browser.newPage({viewport:{width,height:844}});
   await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
   await page.goto(origin+'/?card=cardone',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.body.classList.contains('oracle-card-deck-active'));
   await page.waitForFunction(()=>document.querySelector('#oracleCardChooser option[value="churchOfIAmCard"]'));
   const metrics=()=>page.evaluate(()=>{
    const card=document.getElementById('churchOfIAmCard');
    return {count:document.querySelectorAll('#churchOfIAmCard').length,
     parent:card.parentElement.id,display:getComputedStyle(card).display,
     same:!window.__qaGary||window.__qaGary===card};
   });
   assert.equal((await metrics()).display,'none','Gary must not remain above the carousel at '+width+'px');
   await page.evaluate(()=>{window.__qaGary=document.getElementById('churchOfIAmCard')});
   await page.locator('#oracleCardChooser').selectOption('churchOfIAmCard');
   let state=await metrics();
   assert.equal(state.count,1);assert.equal(state.parent,'oracleCardStage');assert.notEqual(state.display,'none');
   await page.locator('#oracleCardNext').click();
   state=await metrics();assert.equal(state.count,1);assert.equal(state.display,'none');assert.equal(state.same,true);
   await page.locator('#oracleCardPrevious').click();
   state=await metrics();assert.equal(state.parent,'oracleCardStage');assert.equal(state.same,true);
   await page.locator('#oracleCardScroll').click();
   state=await metrics();assert.notEqual(state.parent,'oracleCardStage');assert.notEqual(state.display,'none');
   await page.locator('#oracleCardScroll').click();
   await page.locator('#oracleCardChooser').selectOption('churchOfIAmCard');
   state=await metrics();assert.equal(state.count,1);assert.equal(state.parent,'oracleCardStage');assert.equal(state.same,true);
   await page.close();
  }
 }finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
 }
});
