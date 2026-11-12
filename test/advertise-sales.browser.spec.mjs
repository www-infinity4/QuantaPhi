import {test,expect} from '@playwright/test';
const origin='http://127.0.0.1:8799';
test.use({viewport:{width:360,height:780}});
test('QuantaPhi direct sponsorship card shows proposed prices and correctly qualified Cloudflare traffic',async({page})=>{
 const api={
  schemaVersion:2,site:'quantaphi.org',source:'Cloudflare GraphQL httpRequests1dGroups',
  scope:'recorded_since',since:'2026-10-04',through:'2026-11-07',
  fetchedAt:'2026-11-08T04:00:55.621Z',pageViews:9999,requests:30000,
  includesBots:true,uniqueVisitors:false
 };
 await page.route('**/api/site-traffic',route=>route.fulfill({json:api}));
 const posts=[];page.on('request',r=>{if(r.method()==='POST')posts.push(r.url())});
 await page.goto(origin+'/advertise.html',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('heading',{name:'Advertise on QuantaPhi'})).toBeVisible();
 await expect(page.locator('#salesPrices .price')).toHaveCount(5);
 await expect(page.locator('#salesPrices')).toContainText('$100,000');
 await expect(page.locator('#salesPrices')).toContainText('$100');
 await expect(page.locator('#salesTraffic')).toContainText('9,999');
 await expect(page.locator('#salesTraffic')).toContainText('includes bots');
 await expect(page.locator('#salesTraffic')).toContainText('not sponsored ad impressions');
 await expect(page.locator('#salesNote')).toContainText(/not unique human visitors/i);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(4);
 expect(posts).toEqual([]);
});
test('missing or unqualified traffic never shows invented advertising audience',async({page})=>{
 await page.route('**/api/site-traffic',route=>route.fulfill({json:{site:'quantaphi.org',pageViews:250000,includesBots:false,uniqueVisitors:true}}));
 await page.goto(origin+'/advertise.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#salesTraffic')).toContainText('unavailable');
 await expect(page.locator('#salesTraffic')).not.toContainText('250,000');
});
