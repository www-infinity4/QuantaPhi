const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
test('retired Cardone cards stay absent at mobile and desktop widths',async()=>{
 const root=process.cwd();
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
   res.writeHead(404);res.end();return;
  }
  const type={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
  res.setHeader('Content-Type',type[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  const origin='http://127.0.0.1:'+server.address().port;
  for(const width of [360,1280]){
   const page=await browser.newPage({viewport:{width,height:844}});
   await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
   await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.body.classList.contains('oracle-card-deck-active'));
   assert.equal(await page.locator('#churchOfIAmCard,#cardoneCapitalOffer').count(),0);
   assert.equal(await page.locator('#oracleCardChooser option[value="churchOfIAmCard"],#oracleCardChooser option[value="cardoneCapitalOffer"]').count(),0);
   assert.equal(await page.locator('#walmartShoppingCard').count(),1);
   await page.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
