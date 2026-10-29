import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:390,height:844}});
test('accepted cards keep mobile carousel arrows, original artwork and local collection controls',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'share',{value:undefined,configurable:true});
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{window.__sharedCardUrl=value}},configurable:true});
 });
 await page.goto(base+'/?card=durable-framework-computers',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage .iac-card');
 await expect(card.getByRole('heading',{name:'Framework Computers',exact:true})).toBeVisible();
 await expect(card.locator('.iac-media img')).toHaveAttribute('src',/images\.prismic\.io\/frameworkmarketplace/);
 await expect(card.getByRole('searchbox')).toHaveCount(0);
 await card.getByRole('button',{name:'+ Collect',exact:true}).click();
 await expect(card.getByRole('button',{name:'✓ Collected',exact:true})).toBeVisible();
 await expect(page.locator('#oracleCardNext')).toBeInViewport();
 await expect(page.locator('#oracleCardPrevious')).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 await card.getByRole('button',{name:'↗ Share',exact:true}).click();
 const shared=await page.evaluate(()=>window.__sharedCardUrl);
 expect(new URL(shared).pathname).toBe('/q-share');expect(new URL(shared).searchParams.get('image')).toMatch(/images\.prismic\.io\/frameworkmarketplace/);
});
test('website button performs an authenticated typed request and renders only same-brand result links',async({page})=>{
 let starts=0;const requests=[];
 await page.route('**/robot-brain-owner.js?*',r=>r.fulfill({contentType:'application/javascript',body:'window.QuantaBrainOwner={ready:Promise.resolve({Authorization:"Bearer synthetic-owner-fixture"})};'}));
 await page.route('**/work/quick-card-browser',async route=>{
  const body=route.request().postDataJSON();requests.push(body);
  expect(route.request().headers().authorization).toBe('Bearer synthetic-owner-fixture');
  let data;
  if(body.action==='capabilities')data={ok:true,configured:true,supported:[{id:'durable-framework-computers',actions:['parts']}]};
  else if(body.action==='start'){starts++;data={ok:true,job:{jobId:'fixture-job',state:'working'}};}
  else data={ok:true,job:{jobId:'fixture-job',state:'completed_browser_read',report:{summary:'Fixture parts result',items:[
   {name:'Framework part fixture',price:'$10',url:'https://frame.work/products/fixture-part'},
   {name:'Untrusted link fixture',url:'https://evil.example/checkout'}]}}};
  await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto(base+'/?card=durable-framework-computers',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage .iac-card');
 await card.getByText('Read public website with TinyFish · Bubbles owner',{exact:true}).click();
 await card.getByRole('button',{name:'Parts & accessories on Framework Computers',exact:true}).click();
 await expect(card.getByRole('button',{name:'Check results',exact:true})).toBeVisible();
 await expect(card.getByRole('button',{name:'Parts & accessories on Framework Computers',exact:true})).toBeDisabled();
 await card.getByRole('button',{name:'Check results',exact:true}).click();
 await expect(card.getByText('Read completed. Fixture parts result')).toBeVisible();
 await expect(card.getByRole('link',{name:'Open original result ↗'})).toHaveAttribute('href','https://frame.work/products/fixture-part');
 await expect(card.locator('a[href*="evil.example"]')).toHaveCount(0);
 expect(starts).toBe(1);expect(requests.find(x=>x.action==='start')).toMatchObject({cardId:'durable-framework-computers',kind:'parts',query:''});
});
test('missing TinyFish backend reports unavailable and never launches a run',async({page})=>{
 let starts=0;
 await page.route('**/robot-brain-owner.js?*',r=>r.fulfill({contentType:'application/javascript',body:'window.QuantaBrainOwner={ready:Promise.resolve({Authorization:"Bearer synthetic-owner-fixture"})};'}));
 await page.route('**/work/quick-card-browser',r=>{
  if(r.request().postDataJSON().action==='start')starts++;
  return r.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,configured:false})});
 });
 await page.goto(base+'/?card=durable-framework-computers',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage .iac-card');
 await card.getByText('Read public website with TinyFish · Bubbles owner',{exact:true}).click();
 await card.getByRole('button',{name:'Parts & accessories on Framework Computers',exact:true}).click();
 await expect(card.getByRole('status').filter({hasText:'awaiting activation'})).toBeVisible();expect(starts).toBe(0);
});

test('TinyFish public-source result is labeled correctly and never displays untrusted hosts',async({page})=>{
 let starts=0;
 await page.route('**/robot-brain-owner.js?*',r=>r.fulfill({contentType:'application/javascript',body:'window.QuantaBrainOwner={ready:Promise.resolve({Authorization:"Bearer synthetic-owner-fixture"})};'}));
 await page.route('**/work/quick-card-browser',async r=>{
  const body=r.request().postDataJSON();
  if(body.action==='start')starts++;
  const data=body.action==='capabilities'?
   {ok:true,configured:true,brokerSourceReads:true,browserNavigationConfigured:false,
    supported:[{id:'durable-framework-computers',actions:['parts']}]}:
   {ok:true,sourceRead:true,job:{jobId:'source-read-fixture',state:'completed_source_read',
    report:{summary:'Public parts links from a TinyFish source read.',mode:'source_read',notBrowserNavigation:true,
     items:[{name:'Original Framework parts',url:'https://frame.work/marketplace/parts',note:'Observed source link'},
            {name:'Rejected domain',url:'https://evil.example/secret'}]}}};
  await r.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto(base+'/?card=durable-framework-computers',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage .iac-card');
 await card.getByText('Read public website with TinyFish · Bubbles owner',{exact:true}).click();
 await card.getByRole('button',{name:'Parts & accessories on Framework Computers',exact:true}).click();
 await expect(card.getByRole('status').filter({hasText:'TinyFish public-source lookup complete'})).toBeVisible();
 await expect(card.getByRole('link',{name:'Open original result ↗'})).toHaveAttribute('href','https://frame.work/marketplace/parts');
 await expect(card.locator('a[href*="evil.example"]')).toHaveCount(0);
 expect(starts).toBe(1);
});

test('all 116 accepted brands remain reachable when live TV can lead the homepage',async({page})=>{
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 // Live-event opening priority is covered by live-tv-browser.spec.mjs.
 // Brand inventory and direct selection must work with any current opener.
 await expect(page.locator('#oracleCardStage')).toBeVisible();
 await expect(page.locator('.iac-card[data-infinity-accepted="true"]')).toHaveCount(116);
 await expect(page.locator('#oracleCardChooser option[value^="source-durable-"]')).toHaveCount(116);
 await page.locator('#oracleCardInventory').click();
 await page.locator('#oracleCardChooser').selectOption('source-durable-fisher-space-pen');
 await expect(page.locator('#oracleCardStage').getByRole('heading',{name:'Fisher Space Pen',exact:true})).toBeVisible();
});
test('website actions remain direct links without owner login or browser dispatch',async({page})=>{
 let requests=0;
 await page.route('**/work/quick-card-browser',r=>{requests++;return r.abort();});
 await page.goto(base+'/?card=durable-framework-computers',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage .iac-card');
 await expect(card.getByRole('link',{name:'Parts & accessories on Framework Computers',exact:true})).toHaveAttribute('href','https://frame.work/marketplace/parts');
 await expect(card.getByRole('link',{name:'Parts & accessories on Framework Computers',exact:true})).toHaveAttribute('target','_blank');
 expect(requests).toBe(0);
 await page.goto(base+'/?card=durable-ronson',{waitUntil:'domcontentloaded'});
 const held=page.locator('#oracleCardStage .iac-card');
 await expect(held.getByRole('heading',{name:'Ronson',exact:true})).toBeVisible();
 await expect(held.getByRole('link',{name:'Visit official website ↗'})).toHaveAttribute('href','https://kb.zippo.com/kb-articleour-companies');
 await expect(held.locator('[data-website-action]')).toHaveCount(0);
 await expect(held.locator('.iac-provenance')).toContainText('awaiting verification');
 expect(requests).toBe(0);
});
