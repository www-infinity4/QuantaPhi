import {test,expect} from '@playwright/test';
const base=process.env.QUANTA_TEST_BASE||'http://127.0.0.1:8799';
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220"><rect width="320" height="220" fill="#d7d7d7"/><path d="M60 160L180 35L280 160" fill="#aaa"/></svg>';
test.use({viewport:{width:393,height:844}});

test('Miele card shows real photo with a visible official manufacturer source credit',async({page})=>{
 await page.route('https://media.miele.com/**',r=>r.fulfill({contentType:'image/svg+xml',body:svg}));
 await page.goto(base+'/infinity-accepted.html?card=durable-miele',{waitUntil:'domcontentloaded'});
 const card=page.locator('#infinityAcceptedDetail .iac-card');
 await expect(card.locator('.iac-media>img')).toHaveAttribute('src',/20000463179_HighresDigitalRGB/);
 await expect(card.locator('.iac-image-credit')).toBeVisible();
 await expect(card.locator('.iac-image-credit')).toHaveAttribute('href','https://www.mieleusa.com/');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});

test('a brand whose source pictures fail recovers an indexed public item photo without blank cards',async({page})=>{
 await page.route('**/*',async route=>{
  if(route.request().resourceType()==='image'&&route.request().url.startsWith('https://'))return route.abort();
  return route.continue();
 });
 await page.route('**/quick-card-spotlights-latest.json*',r=>r.fulfill({json:{
  schema_version:1,checked_at:new Date().toISOString(),cards:{}
 }}));
 await page.route('https://orange-brook-a2ac.marvaseater.workers.dev/search?*',r=>r.fulfill({
  headers:{'access-control-allow-origin':'*'},json:{results:[{
   title:'PK22 chair · official source listing',
   url:'https://www.fritzhansen.com/en/categories/products/pk22-chair',
   img_src:'https://static.fritzhansen.com/test-fritz-chair.jpg'
  }]}
 }));
 await page.route('https://static.fritzhansen.com/test-fritz-chair.jpg',r=>r.fulfill({contentType:'image/svg+xml',body:svg}));
 await page.goto(base+'/infinity-accepted.html?card=durable-fritz-hansen',{waitUntil:'domcontentloaded'});
 const card=page.locator('#infinityAcceptedDetail .iac-card');
 await expect(card).toHaveAttribute('data-source-photo-recovered','true',{timeout:18000});
 await expect(card.locator('.iac-media.iac-source-discovered img')).toHaveAttribute('src',/test-fritz-chair\.jpg/);
 await expect(card.locator('.iac-image-credit')).toHaveAttribute('href','https://www.fritzhansen.com/en/categories/products/pk22-chair');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});
