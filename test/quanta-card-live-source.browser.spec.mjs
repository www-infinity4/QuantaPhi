import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
const endpoint='https://continuity-session-coordinator.marvaseater.workers.dev/v1/cards/website';
test.use({viewport:{width:390,height:844}});
async function fixture(page,cardId,sourceUrl,items){
 await page.route(endpoint,route=>{
  const payload=route.request().postDataJSON();expect(payload.cardId).toBe(cardId);
  return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
   body:JSON.stringify({ok:true,cardId,action:payload.action,provider:'TinyFish Search',sourceUrl,
    observedAt:'2026-10-28T04:00:00Z',receipt:{id:'synthetic-browser-receipt'},items})});
 });
}
test('eBay Quick Card returns source results in its existing search field and filters forged links',async({page})=>{
 await fixture(page,'ebay','https://www.ebay.com/',[
  {title:'1881-S Morgan Dollar eBay listing',url:'https://www.ebay.com/itm/176734829110',text:'Observed public listing fixture.'},
  {title:'Imitation listing',url:'https://ebay.com.evil.test/itm/999'},
  {title:'Other shop',url:'https://example.com/coins'}]);
 await page.goto(base+'/quanta-feed-card.html?card=ebay',{waitUntil:'domcontentloaded'});
 const card=page.locator('#quantaFeedCardDetail');
 await card.getByLabel('Search eBay').fill('1881 Morgan dollar');
 await card.getByRole('button',{name:'Search eBay',exact:true}).click();
 await expect(card.locator('.qca-website-result')).toHaveCount(1);
 await expect(card.getByText('1881-S Morgan Dollar eBay listing')).toBeVisible();
 await expect(card.getByRole('link',{name:'Open original page ↗'})).toHaveAttribute('href','https://www.ebay.com/itm/176734829110');
 await expect(card.getByText('Imitation listing')).toHaveCount(0);
 await expect(card.locator('.qca-search')).toHaveCount(0);
 await expect(card.getByText(/TinyFish Search · Receipt/)).toBeVisible();
 expect(await card.evaluate(e=>e.scrollWidth>window.innerWidth)).toBe(false);
});
test('CNN card returns only source links from its website',async({page})=>{
 await fixture(page,'cnn','https://www.cnn.com/',[
  {title:'Public CNN story',url:'https://www.cnn.com/2026/10/26/world/example',text:'Actual source result fixture.'},
  {title:'Different news outlet',url:'https://othernews.example/article'}]);
 await page.goto(base+'/source-quick-card.html?card=cnn',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Search CNN').fill('science');await page.getByRole('button',{name:'Search CNN',exact:true}).click();
 await expect(page.locator('.qca-website-result')).toHaveCount(1);
 await expect(page.getByRole('link',{name:'Open original page ↗'})).toHaveAttribute('href',/cnn\.com/);
 await expect(page.getByText('Different news outlet')).toHaveCount(0);
});
test('zero TinyFish matches leaves the original website available without invented content',async({page})=>{
 await fixture(page,'us-mint','https://www.usmint.gov/shop/',[]);
 await page.goto(base+'/quanta-feed-card.html?card=us-mint',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Search U.S. Mint').fill('silver proof set');
 await page.getByRole('button',{name:'Search U.S. Mint',exact:true}).click();
 await expect(page.getByText('No matching public pages were found on this website.')).toBeVisible();
 await expect(page.getByRole('link',{name:'↗ Open original website',exact:true})).toHaveAttribute('href',/usmint.gov/);
});
test('StarMaker Find songs uses TinyFish and keeps results inside the active carousel card',async({page})=>{
 await fixture(page,'starmaker','https://www.starmakerstudios.com/en/songs',[
  {title:'StarMaker live song fixture',url:'https://www.starmakerstudios.com/en/song/123',text:'Source song description fixture.'}]);
 await page.goto(base+'/?card=starmaker',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage');
 await card.getByLabel('Search verified StarMaker songs').fill('Bee Gees');
 await card.getByRole('button',{name:'Find songs',exact:true}).click();
 await expect(card.getByText('StarMaker live song fixture')).toBeVisible();
 await expect(card.getByRole('link',{name:'Open original page ↗'})).toHaveAttribute('href',/starmakerstudios.com/);
});
test('Framework parts control fetches the mapped original website only after a tap',async({page})=>{
 let requests=0;
 await page.route(endpoint,route=>{requests++;expect(route.request().postDataJSON()).toEqual({cardId:'durable-framework-computers',action:'parts'});
  return route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true,
   cardId:'durable-framework-computers',action:'parts',provider:'TinyFish Fetch',sourceUrl:'https://frame.work/marketplace/parts',
   observedAt:'2026-10-28T04:00:00Z',receipt:{id:'parts-fixture'},items:[{title:'Parts source fixture',url:'https://frame.work/marketplace/parts',text:'Actual source text fixture.'}]})});
 });
 await page.goto(base+'/?card=durable-framework-computers',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage');
 const action=card.getByRole('button',{name:'Parts & accessories on Framework Computers',exact:true});
 await expect(action).toBeVisible();expect(requests).toBe(0);
 await expect(card.locator('.qca-website-reader')).toHaveCount(0);
 await action.click();
 await expect(card.getByText('Parts source fixture')).toBeVisible();expect(requests).toBe(1);
});
