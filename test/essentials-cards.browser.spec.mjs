import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:360,height:780}});
test.beforeEach(async({page})=>{
 await page.route('**/*',route=>{
  const url=route.request().url();
  if(url.startsWith(base+'/'))return route.continue();
  if(url.startsWith('https://d3pq5rjvq8yvv1.cloudfront.net/'))return route.fulfill({
   status:200,contentType:'image/svg+xml',
   body:'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'
  });
  if(url.startsWith('https://i5.walmartimages.com/'))return route.fulfill({
   status:200,contentType:'image/svg+xml',
   body:'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'
  });
  return route.abort();
 });
});
test('Blue Star and Neosporin are individual original Oracle cards with direct visible jumps',async({page})=>{
 await page.goto(base+'/?card=blue-star-ointment',{waitUntil:'domcontentloaded'});
 const deck=page.locator('#oracleCardDeck'),stage=deck.locator('#oracleCardStage');
 await expect(stage).toHaveAttribute('data-switchboard-id','blue-star-ointment',{timeout:20000});
 await expect(stage.getByRole('heading',{name:/Blue Star.*Anti-Itch/i})).toBeVisible();
 await expect(stage.getByRole('link',{name:'View exact item at Walmart'}))
  .toHaveAttribute('href','https://www.walmart.com/ip/10316529');
 await expect(deck.getByRole('button',{name:'Blue Star Ointment'})).toBeVisible();
 await deck.getByRole('button',{name:'Neosporin Original'}).click();
 await expect(stage).toHaveAttribute('data-switchboard-id','neosporin-original-1oz');
 await expect(stage.getByRole('heading',{name:/Neosporin.*Triple Antibiotic/i})).toBeVisible();
 await expect(stage.getByRole('link',{name:'View exact item at Walmart'}))
  .toHaveAttribute('href','https://www.walmart.com/ip/10294303');
 await expect(stage.locator('.qec-card')).toHaveAttribute('data-personalization','disabled');
 const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(horizontal).toBeLessThanOrEqual(4);
});
test('Follow Neosporin then Blue Star in the same existing Following tab',async({page})=>{
 await page.goto(base+'/?card=neosporin-original-1oz',{waitUntil:'domcontentloaded'});
 const deck=page.locator('#oracleCardDeck'),stage=deck.locator('#oracleCardStage');
 await expect(stage).toHaveAttribute('data-switchboard-id','neosporin-original-1oz',{timeout:20000});
 await deck.locator('#oracleCardFollow').click();
 await deck.getByRole('button',{name:'Blue Star Ointment'}).click();
 await expect(stage).toHaveAttribute('data-switchboard-id','blue-star-ointment');
 await deck.locator('#oracleCardFollow').click();
 await deck.getByRole('tab',{name:'Following'}).click();
 await expect(deck.locator('#oracleCardChooser option[value="source-blue-star-ointment"]')).toHaveCount(1);
 await expect(deck.locator('#oracleCardChooser option[value="source-neosporin-original-1oz"]')).toHaveCount(1);
 await page.reload({waitUntil:'domcontentloaded'});
 await deck.getByRole('tab',{name:'Following'}).click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('quanta:discovery:anonymous:v1')));
 expect(saved.following).toEqual(expect.arrayContaining(['blue-star-ointment','neosporin-original-1oz']));
});

test('Aquaphor, Band-Aid Hydro Seal and Cortizone-10 are distinct real Quick Cards with exact manufacturer directions',async({page})=>{
 await page.goto(base+'/?card=aquaphor-healing-175oz',{waitUntil:'domcontentloaded'});
 const deck=page.locator('#oracleCardDeck'),stage=deck.locator('#oracleCardStage');
 const fixtures=[
  ['aquaphor-healing-175oz','Aquaphor Healing','Walmart','https://www.walmart.com/ip/193670269','petrolatum'],
  ['band-aid-hydro-seal-10ct','Band-Aid Hydro Seal','Kroger','https://www.kroger.com/p/band-aid-brand-hydro-seal-waterproof-first-aid-hydrocolloid-gel-bandages/0038137117297','hydrocolloid'],
  ['cortizone10-sensitive-skin-2oz','Cortizone-10','Walmart','https://www.walmart.com/ip/1520268394','hydrocortisone']
 ];
 for(const [id,button,source,url,term] of fixtures){
  await expect(deck.getByRole('button',{name:button,exact:true})).toBeVisible();
  await deck.getByRole('button',{name:button,exact:true}).click();
  await expect(stage).toHaveAttribute('data-switchboard-id',id);
  await expect(stage.locator('.qec-card')).toHaveAttribute('data-personalization','disabled');
  await expect(stage.locator('.qec-photo')).toHaveAttribute('src',/^https:\/\//);
  await expect(stage.getByRole('link',{name:'View exact item at '+source})).toHaveAttribute('href',url);
  await expect(stage.getByText(new RegExp(term,'i')).first()).toBeVisible();
  await expect(stage.getByRole('link',{name:'Official product facts and directions'})).toHaveAttribute('href',/^https:\/\//);
 }
 const over=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(over).toBeLessThanOrEqual(4);
});
test('new companion cards use the existing Following tab without any independent ad carousel',async({page})=>{
 await page.goto(base+'/?card=band-aid-hydro-seal-10ct',{waitUntil:'domcontentloaded'});
 const deck=page.locator('#oracleCardDeck'),stage=deck.locator('#oracleCardStage');
 await expect(stage).toHaveAttribute('data-switchboard-id','band-aid-hydro-seal-10ct',{timeout:20000});
 await deck.locator('#oracleCardFollow').click();
 await deck.getByRole('tab',{name:'Following'}).click();
 await expect(deck.locator('#oracleCardChooser option[value="source-band-aid-hydro-seal-10ct"]')).toHaveCount(1);
 const over=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(over).toBeLessThanOrEqual(4);
});
