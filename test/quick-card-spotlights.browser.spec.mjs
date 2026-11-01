import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#1267a2"/></svg>';
async function sourceData(page,{validUntil}={}){
 const checked_at=new Date().toISOString();
 const feed={schema_version:1,checked_at,cards:{'levis-501-dark':{schema_version:1,items:[
  {url:'https://www.levi.com/US/en_US/p/1',title:'Fixture denim jacket',image:'https://lsco.scene7.com/fixture-a.jpg',checked_at,kind:'product',offer:{price:'89.00',currency:'USD',evidence:'jsonld-offer',valid_until:validUntil}},
  {url:'https://www.levi.com/US/en_US/p/2',title:'Fixture straight jeans',image:'https://lsco.scene7.com/fixture-b.jpg',checked_at,kind:'product'}
 ]}}};
 await page.route('**/data/quick-card-spotlights-latest.json?**',r=>r.fulfill({json:feed}));
 await page.route('https://orange-brook-a2ac.marvaseater.workers.dev/**',r=>r.fulfill({json:{results:[]}}));
 await page.route('https://lsco.scene7.com/**',r=>r.fulfill({contentType:'image/svg+xml',body:svg}));
}
for(const width of [320,360,430])test('actual product renderer changes photo, item and destination at '+width+'px',async({page})=>{
 await page.setViewportSize({width,height:850});await page.emulateMedia({reducedMotion:'reduce'});await sourceData(page);
 await page.goto(base+'/trending-now.html');
 await page.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/brand-product-cards.css"><main></main><script type="module">import {BRAND_PRODUCT_CARDS,createBrandProductCard} from "/brand-product-cards.mjs";document.querySelector("main").append(createBrandProductCard(BRAND_PRODUCT_CARDS.find(c=>c.id==="levis-501-dark")));<\/script>');
 const hero=page.locator('.qcs-panel');await expect(hero).toBeVisible();
 await expect(hero.locator('.qcs-title')).toHaveText('Fixture denim jacket');await expect(hero.locator('.qcs-price')).toContainText('$89.00');
 await expect(hero.locator('img')).toHaveAttribute('src',/fixture-a/);
 await hero.getByRole('button',{name:'Next offer'}).click();
 await expect(hero.locator('.qcs-title')).toHaveText('Fixture straight jeans');await expect(hero.locator('img')).toHaveAttribute('src',/fixture-b/);
 await expect(hero.locator('.qcs-open')).toHaveAttribute('href',/\/p\/2$/);
 await expect(page.locator('.qca-toolbar')).toHaveCount(1);
 const fits=await hero.evaluate(node=>node.getBoundingClientRect().right<=innerWidth);expect(fits).toBeTruthy();
});
test('Share carries the selected product and reopens it despite saved no-repeat history',async({page})=>{
 await page.setViewportSize({width:360,height:850});await page.emulateMedia({reducedMotion:'reduce'});await sourceData(page);
 await page.addInitScript(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{window.__spotlightShare=payload}}));
 await page.goto(base+'/?card=levis-501-dark',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage [data-source-id="levis-501-dark"]'),hero=card.locator('.qcs-panel');
 await expect(hero.locator('.qcs-title')).toHaveText('Fixture denim jacket');
 await hero.getByRole('button',{name:'Next offer'}).click();
 console.log('NEXT_OFFER_DIAGNOSTIC',JSON.stringify(await card.evaluate(node=>({
  id:node.dataset.sourceId,spotlightManual:node.dataset.spotlightManual,
  count:node.querySelector('.qcs-count')?.textContent,
  title:node.querySelector('.qcs-title')?.textContent,
  image:node.querySelector('.qcs-photo')?.getAttribute('src'),
  currentUrl:node.dataset.currentSpotlight,
  nextDisabled:node.querySelector('.qcs-nav button:last-of-type')?.disabled,
  history:localStorage.getItem('quanta:spotlight:levis-501-dark:v1')
 }))));
 await expect(hero.locator('.qcs-title')).toHaveText('Fixture straight jeans');
 await card.getByRole('button',{name:'↗ Share',exact:true}).click();
 const payload=await page.evaluate(()=>window.__spotlightShare),shared=new URL(payload.url),destination=new URL(shared.searchParams.get('dest'));
 expect(payload.title).toBe('Fixture straight jeans');expect(shared.searchParams.get('image')).toContain('fixture-b.jpg');
 expect(destination.searchParams.get('spotlight')).toBe('https://www.levi.com/US/en_US/p/2');expect(destination.origin).toBe(base);
 await page.goto(destination.href,{waitUntil:'domcontentloaded'});
 await expect(hero.locator('.qcs-title')).toHaveText('Fixture straight jeans');await expect(hero.locator('.qcs-open')).toHaveAttribute('href',/\/p\/2$/);
 await hero.getByRole('button',{name:'Next offer'}).click();await card.getByRole('button',{name:'↗ Share',exact:true}).click();
 expect((await page.evaluate(()=>window.__spotlightShare)).title).toBe('Fixture denim jacket');
});
test('a paused visible card clears an expired source price without a feed refresh',async({page})=>{
 const now=new Date();await page.clock.install({time:now});await page.emulateMedia({reducedMotion:'reduce'});
 await sourceData(page,{validUntil:new Date(now.getTime()+30000).toISOString()});
 await page.goto(base+'/trending-now.html');
 await page.setContent('<!doctype html><main></main><script type="module">import {BRAND_PRODUCT_CARDS,createBrandProductCard} from "/brand-product-cards.mjs";document.querySelector("main").append(createBrandProductCard(BRAND_PRODUCT_CARDS.find(c=>c.id==="levis-501-dark")));<\/script>');
 const price=page.locator('.qcs-price');await expect(price).toContainText('$89.00');
 await page.clock.fastForward(60000);await expect(price).toHaveText('See current price and availability at the source');
});
test('trends retain source photo, publisher headline and change topics in their own card',async({page})=>{
 await page.setViewportSize({width:360,height:850});const checked_at=new Date().toISOString();
 const feed={schema_version:1,source_url:'https://trends.google.com/trending/rss?geo=US',checked_at,topics:[1,2].map(n=>({
  query:'Fixture topic '+n,approx_searches:'20K+',published_at:checked_at,image_url:'https://encrypted-tbn0.gstatic.com/fixture-'+n+'.jpg',image_credit:'Fixture publisher',
  news:[{url:'https://www.espn.com/story/'+n,title:'Publisher headline '+n,publisher:'ESPN',description:'Source summary'}]
 }))};
 await page.route('**/data/google-trends-latest.json?**',r=>r.fulfill({json:feed}));
 await page.route('https://encrypted-tbn0.gstatic.com/**',r=>r.fulfill({contentType:'image/svg+xml',body:svg}));
 await page.goto(base+'/trending-now.html#googleTrendCulture');const host=page.locator('#googleTrendCulture');
 await host.scrollIntoViewIfNeeded();await expect(host.locator('.gt-trend-photo')).toBeVisible();
 await expect(host.locator('.gt-trend-feature')).toContainText('Publisher headline 1');
 await host.getByRole('button',{name:'Next trend'}).click();
 await expect(host.locator('.gt-trend-photo')).toHaveAttribute('src',/fixture-2/);
 await expect(host.locator('.gt-trend-feature')).toContainText('Fixture topic 2');
 expect(await host.evaluate(node=>node.getBoundingClientRect().right<=innerWidth)).toBeTruthy();
});
