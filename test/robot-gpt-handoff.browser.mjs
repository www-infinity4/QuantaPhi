import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const fixture=`<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/robot-directions.css">
<div id="robotDirections"><h3>What would you like Bubbles to do?</h3>
<textarea aria-label="Describe work"></textarea><button data-refresh>Jobs</button><button data-gemini>Plans</button></div>
<script>
window.QuantaBrainOwner={ready:Promise.resolve(location.search.includes('deny')?null:{Authorization:'Bearer FIXTURE_OWNER'})};
window.__copied='';
Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text;}}});
</script>
<script src="/robot-work-report.js"></script></html>`;
let server,browser,base;
test.before(async()=>{
 server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://test.local').pathname;
  if(path==='/fixture'){res.setHeader('content-type','text/html;charset=utf-8');res.end(fixture);return}
  const files={'/robot-work-report.js':'robot-work-report.js','/robot-gpt-handoff.mjs':'robot-gpt-handoff.mjs','/robot-directions.css':'robot-directions.css'};
  if(!files[path]){res.statusCode=404;res.end('Not found');return}
  try{res.setHeader('content-type',path.endsWith('.css')?'text/css':'text/javascript');
   res.end(await readFile(files[path]));}catch{res.statusCode=500;res.end('Fixture source unavailable')}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true});
});
after(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve))});

const ticket=(suffix,title,phase,extra={})=>({
 ticketId:'IW-20261029-'+suffix,repository:'www-infinity4/QuantaPhi',
 title,request:'Owner requested '+title,updatedAt:Date.now(),
 jobs:[{jobId:'TASK-1',status:phase==='blocked_recoverable'?'blocked':'working',phase,
 blocker:phase==='blocked_recoverable'?'A source-only repair is needed':null,
 next:'Inspect repository and run focused tests',...extra}]
});
async function mount(page,{deny=false,legacy=false}={}){
 const paths=[],requests=[];
 await page.route('https://infinity-brain-clock.marvaseater.workers.dev/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
  if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers:cors});return}
  const body=route.request().postDataJSON?.()||{};
  paths.push(path);requests.push({path,body});
  let result;
  if(path==='/work/tickets/list')result={ok:true,tickets:[]};
  else if(path==='/work/earnings/status')result={ok:true,counts:{paid:0}};
  else if(path==='/work/continuity'){
   if(legacy){await route.fulfill({status:404,body:'Not found'});return}
   const next=Boolean(body.beforeId);
   result=next?{ok:true,service:'Continuity',tickets:[ticket('22222222','APK upgrade repair','stale_working')],hasMore:false,nextCursor:null}:
    {ok:true,service:'Continuity',tickets:[ticket('11111111','Robot Brain status repair','blocked_recoverable')],hasMore:true,
     nextCursor:{beforeUpdatedAt:123456,beforeId:'IW-20261029-11111111'}};
  }else{await route.fulfill({status:404,body:'Not found'});return}
  await route.fulfill({status:200,contentType:'application/json',headers:cors,body:JSON.stringify(result)});
 });
 await page.goto(base+'/fixture'+(deny?'?deny=1':''),{waitUntil:'load'});
 return {paths,requests};
}

test('Android browser copies a fresh, paginated, private GPT handoff with real job details',async()=>{
 const page=await browser.newPage({viewport:{width:360,height:780},hasTouch:true,isMobile:true});
 const {paths}=await mount(page);
 assert.equal(await page.locator('.robot-work-history').evaluate(e=>e.open),false);
 await page.getByRole('button',{name:'Copy live jobs for ChatGPT'}).click();
 await page.waitForFunction(()=>window.__copied.includes('APK upgrade repair'));
 const copied=await page.evaluate(()=>window.__copied);
 assert.match(copied,/Robot Brain status repair/);
 assert.match(copied,/APK upgrade repair/);
 assert.match(copied,/stale_working|unverified_or_stale_working/);
 assert.match(copied,/source-only repair/);
 assert.doesNotMatch(copied,/FIXTURE_OWNER/);
 assert.ok(paths.filter(x=>x==='/work/continuity').length>=2,'read full cursored queue');
 assert.equal(await page.getByRole('link',{name:'Open ChatGPT to paste'}).getAttribute('href'),'https://chatgpt.com/');
 assert.match(await page.locator('.robot-work-handoff small').textContent(),/Copied 2 live ticket/);
 assert.ok(await page.getByRole('button',{name:'Copy live jobs for ChatGPT'}).isVisible());
 assert.equal(await page.locator('html').evaluate(e=>e.scrollWidth<=e.clientWidth+2),true,'no Android horizontal overflow');
 await page.close();
});
test('Unverified owner never copies or opens the protected handoff',async()=>{
 const page=await browser.newPage({viewport:{width:360,height:780}});
 const {paths}=await mount(page,{deny:true});
 await page.getByRole('button',{name:'Copy live jobs for ChatGPT'}).click();
 await page.waitForFunction(()=>document.querySelector('.robot-work-handoff small').textContent.includes('unavailable'));
 assert.equal(await page.evaluate(()=>window.__copied),'');
 assert.equal(paths.includes('/work/continuity'),false);
 await page.close();
});
