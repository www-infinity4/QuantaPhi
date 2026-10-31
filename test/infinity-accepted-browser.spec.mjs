import {test,expect} from '@playwright/test';
const base=process.env.QUANTA_TEST_BASE||'http://127.0.0.1:8799';
const endpoint='**/v1/cards/website';
const parts='https://frame.work/marketplace/parts';
const response=(body,items=[{title:'Framework replacement parts',url:parts,text:'Original replacement parts and repair modules listed by Framework.'}])=>({
 ok:true,cardId:body.cardId,action:body.action,provider:'TinyFish Fetch',sourceUrl:parts,
 observedAt:'2026-10-29T20:00:00.000Z',receipt:{id:'synthetic-source-receipt'},items
});
test.use({viewport:{width:390,height:844}});
test('accepted cards preserve collection, sharing, imagery and mobile carousel navigation',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'share',{value:undefined,configurable:true});
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{window.__sharedCardUrl=value}},configurable:true});
 });
 await page.goto(base+'/?card=durable-framework-computers',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage .iac-card');
 await expect(card.getByRole('heading',{name:'Framework Computers',exact:true})).toBeVisible();
 await expect(card.locator('.iac-media img')).toHaveAttribute('src',/framework/);
 await expect(card.getByRole('searchbox')).toHaveCount(0);
 await expect(card.locator('.qca-website-reader')).toHaveCount(0);
 await expect(card.getByRole('button',{name:'◫ Preview',exact:true})).toHaveCount(0);
 await card.getByRole('button',{name:'+ Collect',exact:true}).click();
 await expect(card.getByRole('button',{name:'✓ Collected',exact:true})).toBeVisible();
 await expect(page.locator('#oracleCardNext')).toBeVisible();
 await expect(page.locator('#oracleCardPrevious')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 await card.getByRole('button',{name:'↗ Share',exact:true}).click();
 const shared=await page.evaluate(()=>window.__sharedCardUrl);
 expect(new URL(shared).pathname).toBe('/q-share');expect(new URL(shared).searchParams.get('image')).toMatch(/framework/);
});
test('primary buttons return verified public content in the same card without owner credentials or another tab',async({page,context})=>{
 const requests=[];let browserPilot=0;
 await page.route('**/work/quick-card-browser',r=>{browserPilot++;return r.abort()});
 await page.route(endpoint,async r=>{
  requests.push(r.request());await r.fulfill({json:response(r.request().postDataJSON(),[
   {title:'Framework parts',url:parts,text:'Original Framework replacement parts, with product information from the source.'},
   {title:'Untrusted result',url:'https://evil.example/checkout',text:'Reject this item'}
  ])});
 });
 await page.goto(base+'/?card=durable-framework-computers',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage .iac-card');
 await card.getByRole('button',{name:'Parts & accessories on Framework Computers',exact:true}).click();
 await expect(card.getByText('Results from Framework Computers · here in Infinity')).toBeVisible();
 await expect(card.getByRole('link',{name:'Open original page ↗'})).toHaveAttribute('href',parts);
 await expect(card.locator('a[href*="evil.example"]')).toHaveCount(0);
 expect(requests).toHaveLength(1);expect(requests[0].postDataJSON()).toEqual({cardId:'durable-framework-computers',action:'parts'});
 expect(requests[0].headers().authorization).toBeUndefined();expect(browserPilot).toBe(0);expect(context.pages()).toHaveLength(1);
 await expect(page).toHaveURL(base+'/?card=durable-framework-computers');
 await card.getByRole('button',{name:'Close results'}).click();
 await expect(card.locator('.iac-results')).toBeHidden();
 await card.getByRole('button',{name:'Parts & accessories on Framework Computers',exact:true}).click();
 await expect(card.getByText('Framework parts',{exact:true})).toBeVisible();expect(requests).toHaveLength(1);
});
test('provider failure shows an honest retry and the exact clicked source fallback',async({page})=>{
 let requests=0;
 await page.route(endpoint,r=>{requests++;return r.fulfill({status:503,json:{ok:false,error:'tinyfish_not_configured'}})});
 await page.goto(base+'/infinity-accepted.html?card=durable-framework-computers',{waitUntil:'domcontentloaded'});
 const card=page.locator('.iac-card');
 await card.getByRole('button',{name:'Parts & accessories on Framework Computers',exact:true}).click();
 await expect(card.getByRole('status').filter({hasText:'awaiting activation'})).toBeVisible();
 await expect(card.getByRole('link',{name:'Open this page on Framework Computers ↗'})).toHaveAttribute('href',parts);
 await expect(card.getByRole('button',{name:'Parts & accessories on Framework Computers',exact:true})).toBeEnabled();expect(requests).toBe(1);
});
test('unexpected source receipts never appear as successful product results',async({page})=>{
 await page.route(endpoint,r=>r.fulfill({json:{...response(r.request().postDataJSON()),sourceUrl:'https://evil.example/'}}));
 await page.goto(base+'/infinity-accepted.html?card=durable-framework-computers',{waitUntil:'domcontentloaded'});
 const card=page.locator('.iac-card');
 await card.getByRole('button',{name:'Parts & accessories on Framework Computers',exact:true}).click();
 await expect(card.getByRole('status').filter({hasText:'unexpected source'})).toBeVisible();
 await expect(card.locator('.qca-website-result')).toHaveCount(0);
});
test('all 116 accepted brands remain reachable in the real carousel',async({page})=>{
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.iac-card[data-infinity-accepted="true"]')).toHaveCount(116);
 await expect(page.locator('#oracleCardChooser option[value^="source-durable-"]')).toHaveCount(116);
 await page.locator('#oracleCardInventory').click();await page.locator('#oracleCardChooser').selectOption('source-durable-fisher-space-pen');
 await expect(page.locator('#oracleCardStage').getByRole('heading',{name:'Fisher Space Pen',exact:true})).toBeVisible();
});
test('held sources keep verification status and never request automated reads',async({page})=>{
 let requests=0;await page.route(endpoint,r=>{requests++;return r.abort()});
 await page.goto(base+'/infinity-accepted.html?card=durable-ronson',{waitUntil:'domcontentloaded'});
 const card=page.locator('.iac-card');
 await expect(card.locator('[data-website-action]')).toHaveCount(0);
 await card.getByText('Website & product information',{exact:true}).click();
 await expect(card.getByRole('link',{name:'Visit official website ↗'})).toHaveAttribute('href','https://kb.zippo.com/kb-articleour-companies');
 await expect(card.locator('.iac-provenance')).toContainText('awaiting verification');expect(requests).toBe(0);
});
test('Starrett stays still, presents its offerings before the photo, and has no inner scrolling viewport',async({page})=>{
 await page.goto(base+'/?card=durable-starrett',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage .iac-card');
 await expect(card.getByRole('heading',{name:'Starrett',exact:true})).toBeVisible();
 await expect(card.locator('.iac-intro')).toContainText('Micrometers, calipers, height gages');
 await expect(card.locator('.iac-media img')).toHaveAttribute('src',/\/products\/precision-hand-tools\/thread-gaging\//);
 await expect(card.getByRole('button',{name:'Thread gages on Starrett'})).toBeVisible();
 await expect(card.getByRole('button',{name:'Saw blades on Starrett'})).toBeVisible();
 const shape=await card.evaluate(el=>({overflow:getComputedStyle(el).overflowY,max:getComputedStyle(el).maxHeight,
  animation:getComputedStyle(el).animationName,client:el.clientHeight,scroll:el.scrollHeight,frames:el.querySelectorAll('iframe').length,
  titleBeforeMedia:!!(el.querySelector('.iac-title').compareDocumentPosition(el.querySelector('.iac-media'))&Node.DOCUMENT_POSITION_FOLLOWING)}));
 expect(shape.overflow).toBe('clip');expect(shape.max).toBe('none');expect(shape.animation).toBe('none');expect(shape.frames).toBe(0);
 expect(shape.scroll-shape.client).toBeLessThanOrEqual(1);expect(shape.titleBeforeMedia).toBeTruthy();
});
test('an image failure tries another observed photo without inserting the old empty placeholder',async({page})=>{
 await page.route('**/images/default-source/**',r=>r.request().url().includes('/thread-gaging/')?r.abort():
  r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="lightgray"/></svg>'}));
 await page.goto(base+'/infinity-accepted.html?card=durable-starrett',{waitUntil:'domcontentloaded'});
 const card=page.locator('.iac-card');
 await expect(card.locator('.iac-media img')).toHaveAttribute('src',/\/promotions\//);
 await expect(card.locator('.iac-media')).toBeVisible();await expect(card.getByText('See original website for product photos.')).toHaveCount(0);
});
test('exhausted image sources collapse cleanly without hiding product actions',async({page})=>{
 await page.route('**/images/default-source/**',r=>r.abort());
 await page.goto(base+'/infinity-accepted.html?card=durable-starrett',{waitUntil:'domcontentloaded'});
 const card=page.locator('.iac-card');await expect(card.locator('.iac-media')).toBeHidden();
 await expect(card.getByRole('button',{name:'Thread gages on Starrett'})).toBeVisible();
});
