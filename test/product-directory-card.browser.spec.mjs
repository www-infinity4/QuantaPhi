import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
const source=(id,name,department,shelf,site)=>({brand_id:id,name,primary_department:department,primary_shelf:shelf,description:'Official source directory',official_url:site,source_url:site,source_state:'official_site_verified',source_checked_at:'2026-11-02'});
const brands=[
 source('comet','Comet Cleaner','Home','Cleaning','https://cometcleaner.com/products'),
 source('eastland','Eastland Shoe','Fashion','Footwear','https://eastlandshoe.com/'),
 source('jarritos','Jarritos','Food','Drinks','https://jarritos.com/'),
 source('restricted','Restricted Brand','Food','Drinks','https://example.com/')
];
brands[3].adult_restricted=1;
async function routeCatalog(page,{unavailable=false}={}){
 await page.route('https://quantaphi-product-directory.marvaseater.workers.dev/**',route=>{
  if(unavailable)return route.fulfill({status:503,headers:{'access-control-allow-origin':'*'},json:{error:'source_offline'}});
  const url=new URL(route.request().url);
  let rows=[];
  if(url.pathname==='/v1/mixed')rows=brands;
  else if(url.pathname==='/v1/brands')rows=brands.filter(b=>b.primary_department===url.searchParams.get('department'));
  else if(url.pathname==='/v1/collections')rows=[];
  else return route.fulfill({status:404,headers:{'access-control-allow-origin':'*'},json:{error:'not_found'}});
  return route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},json:{data:rows}});
 });
}
async function mount(page){
 await page.goto(base+'/trending-now.html',{waitUntil:'domcontentloaded'});
 await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:8px"><section id="productDirectoryCard"><p>Source directory</p></section><link rel="stylesheet" href="/product-directory-card.css"><script type="module" src="/product-directory-card.mjs"><\/script></body></html>');
}
for(const width of [320,360,393,430]){
 test('brand card original module works at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.emulateMedia({reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await routeCatalog(page);
  await mount(page);
  const card=page.locator('#productDirectoryCard');
  await expect(card.locator('.qpd-name')).toHaveText('Comet Cleaner');
  await expect(card.locator('.qpd-count')).toContainText('3');
  expect(await card.evaluate(node=>node.getBoundingClientRect().right<=innerWidth)).toBeTruthy();
  await card.getByRole('button',{name:'Next brand'}).click();
  await expect(card.locator('.qpd-name')).toHaveText('Eastland Shoe');
  await card.getByLabel('Quick Card merchandise department').selectOption('Food');
  await expect(card.locator('.qpd-name')).toHaveText('Jarritos');
  await expect(card.locator('.qpd-collections')).toBeEmpty();
  await expect(card.locator('.qpd-link').first()).toHaveAttribute('href','https://jarritos.com/');
  await card.getByLabel('Filter currently loaded brands').fill('notfound');
  await expect(card.locator('.qpd-status')).toContainText('No brands match your search');
  expect(await card.evaluate(node=>node.getBoundingClientRect().right<=innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
 });
}
test('source HTTP error shows honest retry, no fake cards',async({page})=>{
 await page.setViewportSize({width:360,height:800});
 await routeCatalog(page,{unavailable:true});
 await mount(page);
 const card=page.locator('#productDirectoryCard');
 await expect(card.locator('.qpd-status')).toContainText('source feed is unavailable');
 await expect(card.locator('.qpd-panel')).toBeHidden();
 await expect(card.getByRole('button',{name:'Refresh sources'})).toBeEnabled();
});
