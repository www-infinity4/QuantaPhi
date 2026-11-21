import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
const broker='https://orange-brook-a2ac.marvaseater.workers.dev/search**';
test.use({viewport:{width:320,height:760}});
test('the existing eBay card contains one competing sellers carousel with safe original listing handoffs',async({page})=>{
 await page.route(broker,route=>{
  const q=new URL(route.request().url()).searchParams.get('q')||'';
  const entry=q.includes('etsy.com')?{title:'Original Etsy radio',url:'https://www.etsy.com/listing/4486750515/radio'}:
   q.includes('mercari.com')?{title:'Original Mercari radio',url:'https://www.mercari.com/us/item/m10316477687/'}:
   q.includes('poshmark.com')?{title:'Original Poshmark radio',url:'https://poshmark.com/listing/radio-6085e36e7f80d21bc01bf587'}:
   {title:'Original eBay radio',url:'https://www.ebay.com/itm/176734829110'};
  return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
   body:JSON.stringify({results:[entry,{title:'Fake seller',url:'https://www.ebay.com.phishing.invalid/itm/88'}]})});
 });
 await page.goto(base+'/quanta-feed-card.html?card=ebay',{waitUntil:'domcontentloaded'});
 const card=page.locator('#quantaFeedCardDetail'),carousel=card.locator('.qcm-panel');
 await expect(carousel).toBeVisible();
 await expect(card.locator('.qcm-form')).toHaveCount(1);
 await expect(card.locator('.qca-search')).toHaveCount(0);
 await carousel.getByRole('searchbox',{name:'Search competing marketplace listings'}).fill('antique radio');
 await carousel.getByRole('button',{name:'Search listings'}).click();
 await expect(carousel.getByText(/4 public source-linked listings/)).toBeVisible();
 await expect(carousel.getByText('Original eBay radio')).toBeVisible();
 await carousel.getByRole('button',{name:'Next'}).click();
 await expect(carousel.getByText('Original Etsy radio')).toBeVisible();
 await carousel.getByRole('button',{name:'Mercari'}).click();
 await expect(carousel.getByText('Original Mercari radio')).toBeVisible();
 const a=carousel.getByRole('link',{name:'View listing on Mercari'});
 await expect(a).toHaveAttribute('href','https://www.mercari.com/us/item/m10316477687/');
 await expect(carousel.getByRole('link',{name:'eBay auctions'})).toHaveAttribute('href',/LH_Auction=1/);
 await expect(carousel.getByRole('link',{name:'eBay Buy It Now'})).toHaveAttribute('href',/LH_BIN=1/);
 await expect(carousel.getByText('Fake seller')).toHaveCount(0);
 expect(await card.evaluate(el=>el.scrollWidth>window.innerWidth)).toBe(false);
});
test('original external marketplace links remain available when the listing index is offline',async({page})=>{
 await page.route(broker,route=>route.abort('failed'));
 await page.goto(base+'/quanta-feed-card.html?card=ebay',{waitUntil:'domcontentloaded'});
 const panel=page.locator('.qcm-panel');
 await panel.getByRole('searchbox').fill('old radios');
 await panel.getByRole('button',{name:'Search listings'}).click();
 await expect(panel.getByText(/0 public source-linked listings/)).toBeVisible();
 await expect(panel.getByRole('link',{name:'Search Etsy'})).toHaveAttribute('href',/etsy\.com\/search/);
 await expect(panel.getByRole('link',{name:'Search Mercari'})).toHaveAttribute('href',/mercari\.com\/search/);
});

test('new search removes previous seller links before asynchronous results arrive',async({page})=>{
 let release;const hold=new Promise(resolve=>{release=resolve});
 await page.route(broker,async route=>{
  const term=new URL(route.request().url()).searchParams.get('q')||'';
  if(term.includes('second'))await hold;
  const items=term.includes('ebay.com')?[{title:term.includes('first')?'Old listing':'New listing',
   url:'https://www.ebay.com/itm/176734829110'}]:[];
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({results:items})});
 });
 await page.goto(base+'/quanta-feed-card.html?card=ebay',{waitUntil:'domcontentloaded'});
 const panel=page.locator('.qcm-panel'),field=panel.getByRole('searchbox');
 await field.fill('first radio');await panel.getByRole('button',{name:'Search listings'}).click();
 await expect(panel.getByText('Old listing')).toBeVisible();
 await field.fill('second radio');await panel.getByRole('button',{name:'Search listings'}).click();
 await expect(panel.getByText('Old listing')).toHaveCount(0);
 await expect(panel.getByRole('link',{name:'View listing on eBay'})).toHaveCount(0);
 release();
 await expect(panel.getByText('New listing')).toBeVisible();
});
