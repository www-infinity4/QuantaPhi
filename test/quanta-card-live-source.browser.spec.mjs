import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:390,height:844}});

test('eBay Quick Card loads real source-filtered listings inside the existing mobile card',async({page})=>{
 await page.route('https://orange-brook-a2ac.marvaseater.workers.dev/search**',route=>route.fulfill({
  status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
  body:JSON.stringify({results:[
   {title:'1881-S Morgan Dollar eBay listing',url:'https://www.ebay.com/itm/176734829110',content:'Public auction listing preview, not a verified live price.'},
   {title:'Imitation listing',url:'https://ebay.com.evil.test/itm/999'},
   {title:'Other shop',url:'https://example.com/coins'}
  ]})
 }));
 await page.goto(base+'/quanta-feed-card.html?card=ebay',{waitUntil:'domcontentloaded'});
 const card=page.locator('#quantaFeedCardDetail');
 await expect(card.getByLabel('Search eBay')).toBeVisible();
 await card.getByLabel('Search eBay').fill('1881 Morgan dollar');
 await card.getByRole('button',{name:'Search eBay'}).click();
 await expect(card.locator('.qcx-source-item')).toHaveCount(1);
 await expect(card.getByText('1881-S Morgan Dollar eBay listing')).toBeVisible();
 await expect(card.getByRole('link',{name:'1881-S Morgan Dollar eBay listing'})).toHaveAttribute('href','https://www.ebay.com/itm/176734829110');
 await expect(card.getByText('Imitation listing')).toHaveCount(0);
 await expect(card.locator('.qca-search')).toHaveCount(0);
 await expect(card.getByText(/Not an official provider API/)).toBeVisible();
 const overflow=await card.evaluate(e=>e.scrollWidth>window.innerWidth);
 expect(overflow).toBe(false);
});

test('CNN source card shows only CNN links, not pretend live publisher access',async({page})=>{
 await page.route('https://orange-brook-a2ac.marvaseater.workers.dev/search**',route=>route.fulfill({
  status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
  body:JSON.stringify({results:[
   {title:'Public CNN story',url:'https://www.cnn.com/2026/10/26/world/example',content:'From independent search index.'},
   {title:'Different news outlet',url:'https://othernews.example/article'}
  ]})
 }));
 await page.goto(base+'/source-quick-card.html?card=cnn',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Search CNN').fill('science');
 await page.getByRole('button',{name:'Search CNN'}).click();
 await expect(page.locator('.qcx-source-item')).toHaveCount(1);
 await expect(page.getByRole('link',{name:'Public CNN story'})).toHaveAttribute('href',/cnn\.com/);
 await expect(page.getByText('Different news outlet')).toHaveCount(0);
});

test('no broker matches leaves honest original-site fallback',async({page})=>{
 await page.route('https://orange-brook-a2ac.marvaseater.workers.dev/search**',route=>route.fulfill({
  status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
  body:JSON.stringify({results:[{title:'Unrelated',url:'https://example.org/'}]})
 }));
 await page.goto(base+'/quanta-feed-card.html?card=us-mint',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Search U.S. Mint').fill('silver proof set');
 await page.getByRole('button',{name:'Search U.S. Mint'}).click();
 await expect(page.getByText(/No verified public U.S. Mint matches/)).toBeVisible();
 await expect(page.getByRole('link',{name:/Open original U.S. Mint site/})).toHaveAttribute('href',/usmint.gov/);
});
