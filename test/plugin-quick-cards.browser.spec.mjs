import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:360,height:800}});
async function prepare(page){
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.origin===base)return route.continue();
  return route.abort();
 });
}
test('each plugin opens as one real mobile Infinity card with shared actions',async({page})=>{
 await prepare(page);
 await page.goto(base+'/plugin-quick-cards.html?card=plugin-shopify',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#iqpCard h2')).toHaveText('Shopify');
 await expect(page.locator('#iqpCount')).toContainText('56 Quick Cards');
 await expect(page.getByRole('link',{name:'Open original website ↗'})).toHaveAttribute('href','https://www.shopify.com/');
 await expect(page.locator('#iqpCard').getByRole('button',{name:'+ Follow'})).toBeVisible();
 await expect(page.locator('#iqpCard').getByRole('button',{name:'+ Collect'})).toBeVisible();
 await expect(page.locator('#iqpCard').getByRole('button',{name:'+1 Build'})).toBeVisible();
 await expect(page.locator('body')).toHaveJSProperty('scrollWidth',360);
 await page.locator('#iqpNext').click();
 await expect(page.locator('#iqpCard h2')).not.toHaveText('Shopify');
});
test('search and category navigation retain separate source cards',async({page})=>{
 await prepare(page);
 await page.goto(base+'/plugin-quick-cards.html',{waitUntil:'domcontentloaded'});
 await page.locator('#iqpCategory').selectOption('Security');
 await expect(page.locator('#iqpCount')).toContainText('4 Quick Cards');
 await page.locator('#iqpFilter').fill('AJAXX');
 await expect(page.locator('#iqpCard h2')).toHaveText('AJAXX Data Scrubber');
 await expect(page.getByRole('link',{name:'Open original website ↗'})).toHaveAttribute('href','https://www.ajaxxdatascrubber.com/');
 await page.locator('#iqpFilter').fill('totally unknown source');
 await expect(page.locator('.iqp-empty')).toHaveText(/No matching/);
});
test('directory-only apps do not pretend to be independently signed in',async({page})=>{
 await prepare(page);
 await page.goto(base+'/plugin-quick-cards.html?card=plugin-data',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#iqpCard h2')).toHaveText('Data');
 await expect(page.locator('.iqp-warning')).toContainText('provider-specific website is not verified');
 await expect(page.getByRole('link',{name:'Find in ChatGPT Plugins ↗'})).toHaveAttribute('href','https://chatgpt.com/plugins');
});

test('verified public-site reads and search results render within the Infinity card',async({page})=>{
 await prepare(page);
 const observed=[];
 await page.route('**/v1/cards/website',async route=>{
  const body=route.request().postDataJSON();observed.push(body);
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   ok:true,cardId:body.cardId,action:body.action,
   provider:body.action==='search'?'TinyFish Search':'TinyFish Fetch',
   sourceUrl:'https://www.etsy.com/',observedAt:'2026-10-31T07:50:00.000Z',
   receipt:{id:'synthetic-public-receipt'},
   items:[{title:'Handmade radio parts',url:'https://www.etsy.com/listing/123',
    text:'Original publisher listing for tested handcrafted radio components.'}]
  })});
 });
 await page.goto(base+'/plugin-quick-cards.html?card=plugin-etsy',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Read website'}).click();
 await expect(page.locator('.iqp-public-results')).toContainText('Handmade radio parts');
 await expect(page.locator('.iqp-public-results')).toContainText('synthetic-public-receipt');
 await expect(page.getByRole('link',{name:'Open original page ↗'})).toHaveAttribute('href','https://www.etsy.com/listing/123');
 const entry=page.getByRole('searchbox',{name:'Search public pages from Etsy'});
 await entry.fill('handmade radios');
 await page.getByRole('button',{name:'Search website'}).click();
 await expect.poll(()=>observed.length).toBe(2);
 assert.deepEqual(observed.map(r=>[r.cardId,r.action,r.query||'']),[
  ['plugin-etsy','inspect',''],['plugin-etsy','search','handmade radios']
 ]);
 await expect(page.locator('.iqp-warning')).toContainText('private feeds, accounts, edits and purchases');
 await expect(page.locator('iframe')).toHaveCount(0);
});
test('failed provider reads show an honest error without fake source data',async({page})=>{
 await prepare(page);
 await page.route('**/v1/cards/website',route=>route.fulfill({status:503,contentType:'application/json',
  body:JSON.stringify({ok:false,error:'tinyfish_not_configured'})}));
 await page.goto(base+'/plugin-quick-cards.html?card=plugin-etsy',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Read website'}).click();
 await expect(page.locator('.iqp-public-results')).toContainText('awaiting activation');
 await expect(page.locator('.iqp-public-results')).not.toContainText('Receipt');
 await expect(page.getByRole('link',{name:'Open original website ↗'})).toHaveAttribute('href','https://www.etsy.com/');
});
test('carousel stays in viewport at additional Android widths',async({page})=>{
 await prepare(page);
 for(const width of [320,393,430]){
  await page.setViewportSize({width,height:800});
  await page.goto(base+'/plugin-quick-cards.html?card=plugin-spotify',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#iqpCard h2')).toHaveText('Spotify');
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth',width);
  await expect(page.locator('#iqpNext')).toBeVisible();
 }
});

test('verified plugin handoff is specific and does not imply inherited login',async({page})=>{
 await prepare(page);
 await page.goto(base+'/plugin-quick-cards.html?card=plugin-flaim-fantasy',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('link',{name:'Connect via ChatGPT plugin ↗'}))
  .toHaveAttribute('href','https://chatgpt.com/plugins/flaim-fantasy');
 await expect(page.locator('.iqp-warning')).toContainText('require an approved connection');
 await page.goto(base+'/plugin-quick-cards.html?card=plugin-daily-tarot',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('link',{name:'Open verified ChatGPT plugin ↗'}))
  .toHaveAttribute('href','https://chatgpt.com/plugins/plugin_asdk_app_6943a2c078b0819188de39e4fe168d9b');
 await expect(page.locator('.iqp-warning')).toContainText('does not inherit account access');
});
