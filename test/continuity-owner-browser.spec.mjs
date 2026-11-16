import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799',api='https://infinity-brain-clock.marvaseater.workers.dev';
const fixtureToken='rb_'+'1'.repeat(64); // Synthetic only; no real owner credentials.
const ticket=(i,extra={})=>({ticketId:'IW-20261025-'+String(i).padStart(8,'0'),repository:'www-infinity4/QuantaPhi',title:'Saved '+i,request:'Original instruction '+i,updatedAt:1000-i,jobs:[{jobId:'TASK-1',phase:'blocked_recoverable',next:'Inspect the real failure',blocker:'fixture offline',instructions:'Preserve this context',acceptance:['Observed outcome'],missingEvidence:['deployment']}],...extra});
const snapshot=(tickets,extra={})=>({ok:true,service:'Continuity',tickets,hasMore:false,nextCursor:null,...extra});
async function setup(page){
 await page.setViewportSize({width:360,height:800});
 await page.route('**/cloud-wallet-client.js?*',r=>r.fulfill({contentType:'application/javascript',body:''}));
 await page.route('**/robot-brain-owner.js?*',r=>r.fulfill({contentType:'application/javascript',body:'window.QuantaBrainOwner={ready:Promise.resolve({Authorization:'+JSON.stringify('Bearer '+fixtureToken)+'})};'}));
}
async function respond(route,data,status=200){await route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(data)});}

test('notebook creation and recovery state survives visiting separate owner view at mobile width',async({page})=>{
 await setup(page);await page.route(api+'/**',r=>respond(r,snapshot([])));
 await page.goto(base+'/continuity/');await page.getByRole('button',{name:'+ New work',exact:true}).click();
 await page.getByLabel('What must be built or fixed?').fill('Notebook checkpoint survives');
 await page.getByRole('button',{name:'Save checkpoint',exact:true}).click();
 await expect(page.locator('#cards')).toContainText('Notebook checkpoint survives');
 const before=await page.evaluate(()=>localStorage.getItem('continuity.workspace.v1'));
 await page.getByRole('link',{name:'Owner work and recovery'}).click();
 await expect(page.locator('#app')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('link',{name:'Continuity workspace'}).click();
 await expect(page.locator('#cards')).toContainText('Notebook checkpoint survives');
 const saved=JSON.parse(await page.evaluate(()=>localStorage.getItem('continuity.workspace.v1')));
 expect(saved.items.some(t=>t.title==='Notebook checkpoint survives')).toBe(true);
 expect(before).toContain('Notebook checkpoint survives');
 await page.evaluate(()=>localStorage.removeItem('continuity.workspace.v1'));await page.reload();
 await expect(page.locator('#cards')).not.toContainText('Notebook checkpoint survives');
 await page.locator('#import').setInputFiles({name:'continuity-recovery.json',mimeType:'application/json',buffer:Buffer.from(before)});
 await expect(page.locator('#cards')).toContainText('Notebook checkpoint survives');
});
test('owner page paginates 101 records, escapes source text and never dispatches while reading',async({page})=>{
 await setup(page);let reads=0,dispatches=0;
 await page.route(api+'/**',async r=>{
  const req=r.request();if(req.method()==='OPTIONS')return r.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type'}});
  expect(req.headers().authorization).toBe('Bearer '+fixtureToken);
  if(req.url().endsWith('/work/run-next')){dispatches++;return respond(r,{ok:true,status:'queued_for_runner'});}
  reads++;const data=req.postDataJSON();
  return respond(r,data.beforeId?snapshot([ticket(101)]):snapshot(Array.from({length:100},(_,i)=>ticket(i,{title:i===0?'<img src=x onerror=alert(1)>':('Saved '+i)})),{hasMore:true,nextCursor:{beforeUpdatedAt:901,beforeId:'IW-20261025-00000099'}}));
 });
 await page.goto(base+'/continuity/owner/');await expect(page.locator('#stats')).toContainText('100');
 await expect(page.locator('#tickets')).toContainText('<img src=x onerror=alert(1)>');expect(await page.locator('#tickets img').count()).toBe(0);
 await page.getByRole('button',{name:'Load more saved work'}).click();await expect(page.locator('#stats')).toContainText('101');
 await expect(page.locator('#more')).toBeHidden();expect(reads).toBe(2);expect(dispatches).toBe(0);
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('revoked session clears private records and cannot fall back to legacy reads',async({page})=>{
 await setup(page);let n=0,legacy=0;
 await page.route(api+'/**',r=>{
  if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type'}});
  if(r.request().url().endsWith('/work/tickets/list'))legacy++;
  return ++n===1?respond(r,snapshot([ticket(1)])):respond(r,{ok:false,error:'owner_authorization_required'},404);
 });
 await page.goto(base+'/continuity/owner/');await expect(page.locator('#tickets')).toContainText('Saved 1');
 await page.getByRole('button',{name:'Refresh actual status'}).click();
 await expect(page.locator('#connection')).toContainText('no longer verified');await expect(page.locator('#app')).toBeHidden();
 await expect(page.locator('#tickets')).toBeEmpty();expect(legacy).toBe(0);
});
test('ready job dispatch is explicit and target-specific; acceptance is not completion',async({page})=>{
 await setup(page);let writes=[];
 await page.route(api+'/**',r=>{
  if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type'}});
  if(r.request().url().endsWith('/work/run-next')){writes.push(r.request().postDataJSON());return respond(r,{ok:true,status:'queued_for_runner'});}
  return respond(r,snapshot([ticket(4,{jobs:[{jobId:'TASK-2',phase:'ready_to_dispatch',next:'Execute one authorized step',approvalRequired:false}]})]));
 });
 await page.goto(base+'/continuity/owner/');const button=page.getByRole('button',{name:'Resume this authorized job'});
 await expect(button).toBeVisible();expect(writes).toHaveLength(0);await button.click();
 await expect(page.locator('#tickets')).toContainText('completion is not verified');await expect(button).toBeDisabled();
 expect(writes).toEqual([{ticketId:'IW-20261025-00000004',jobId:'TASK-2'}]);
});
test('store failure remains a failure instead of a silent legacy fallback',async({page})=>{
 await setup(page);let legacy=0;
 await page.route(api+'/**',r=>{
  if(r.request().url().endsWith('/work/tickets/list'))legacy++;
  return respond(r,{ok:false,error:'continuity_store_unavailable'},503);
 });
 await page.goto(base+'/continuity/owner/');await expect(page.locator('#error')).toContainText('continuity_store_unavailable');
 await expect(page.locator('#app')).toBeHidden();expect(legacy).toBe(0);
});

test('older endpoint fallback shows its 100-ticket limitation and never grants proof',async({page})=>{
 await setup(page);
 await page.route(api+'/**',r=>{
  if(r.request().url().endsWith('/work/continuity'))return r.fulfill({status:404,headers:{'access-control-allow-origin':'*'},body:'Not found'});
  const tickets=Array.from({length:100},(_,i)=>({id:'IW-20261025-'+String(i).padStart(8,'0'),title:'Legacy '+i,repository:'www-infinity4/QuantaPhi',status:'ready',updated_at:1000,context:{color_jobs:[]}}));
  return respond(r,{ok:true,tickets});
 });
 await page.goto(base+'/continuity/owner/');await expect(page.locator('#stats')).toContainText('100');
 await expect(page.locator('#coverage')).toContainText('Older work may be outside this limited list');await expect(page.locator('#more')).toBeHidden();
});
test('malformed snapshot is rejected instead of appearing as an empty successful load',async({page})=>{
 await setup(page);await page.route(api+'/**',r=>respond(r,{ok:true,tickets:[]}));
 await page.goto(base+'/continuity/owner/');await expect(page.locator('#error')).toContainText('Invalid saved-work response');await expect(page.locator('#app')).toBeHidden();
});

test('built Cloudflare static shell admits its exact inline styles and owner bootstrap under CSP',async({page})=>{
 const {createServer}=await import('node:http'),{readFile}=await import('node:fs/promises');
 const {createContinuitySite}=await import('../workers/continuity-site/worker.mjs');
 const {ASSETS}=await import('../scripts/build-continuity-site.mjs');
 const assets={};for(const name of ASSETS)assets[name]=await readFile(new URL('../continuity/'+name,import.meta.url),'utf8');
 const gateway=createContinuitySite(assets,'a'.repeat(40));
 const server=createServer(async(req,res)=>{try{
  const r=await gateway.fetch(new Request('http://127.0.0.1'+req.url),{});
  res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());
 }catch{res.writeHead(500);res.end('fixture failed');}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  await setup(page);await page.route(api+'/**',r=>respond(r,snapshot([ticket(1)])));
  const violations=[];page.on('console',msg=>{if(/Refused|Content Security Policy/i.test(msg.text()))violations.push(msg.text());});
  await page.goto('http://127.0.0.1:'+server.address().port+'/continuity/owner/');
  await expect(page.locator('#app')).toBeVisible();await expect(page.locator('#tickets')).toContainText('Saved 1');
  expect(await page.locator('body').evaluate(el=>getComputedStyle(el).margin)).toBe('0px');
  expect(violations).toEqual([]);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
