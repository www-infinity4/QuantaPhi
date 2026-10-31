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

test('public site search keeps results within the card and never impersonates a signed-in provider',async({page})=>{
 await prepare(page);
 await page.goto(base+'/plugin-quick-cards.html?card=plugin-etsy',{waitUntil:'domcontentloaded'});
 const entry=page.getByRole('searchbox',{name:'Search public pages from Etsy'});
 await entry.fill('handmade radios');
 await page.getByRole('button',{name:'Find pages'}).click();
 const frame=page.locator('.iqp-public-results');
 await expect(frame).toBeVisible();
 const target=new URL(await frame.getAttribute('src'),base);
 assert.equal(target.origin,base);
 expect(target.searchParams.get('q')).toBe('site:www.etsy.com handmade radios');
 await expect(page.locator('.iqp-warning')).toContainText('private feeds, accounts, edits and purchases');
});
