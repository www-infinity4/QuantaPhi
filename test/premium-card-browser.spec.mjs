import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:360,height:800}});
async function fixtures(page){
 await page.route('https://orange-brook-a2ac.marvaseater.workers.dev/search**',route=>{
  const q=new URL(route.request().url()).searchParams.get('q');
  if(!q?.includes('pcgs.com'))return route.fulfill({contentType:'application/json',body:'{"results":[]}'});
  return route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({results:[
   {title:'1888-O Morgan Dollar',url:'https://www.pcgs.com/coinfacts/coin/1888-o',content:'First original source record.',thumbnail:base+'/assets/julius-balloon-001.jpg'},
   {title:'1891-CC Morgan Dollar',url:'https://www.pcgs.com/coinfacts/coin/1891-cc',content:'Second original source record.'},
   {title:'Unrelated publisher',url:'https://example.org/wrong'}]})});
 });
}
test('available-card chooser exposes original tools plus all 17 actual source searches',async({page})=>{
 await fixtures(page);await page.goto(base+'/?card=pcgs',{waitUntil:'domcontentloaded'});
 const stage=page.locator('#oracleCardStage');await expect(stage.locator('[data-source-id="pcgs"]')).toBeVisible();
 await expect(stage.getByText('1888-O Morgan Dollar',{exact:true})).toBeVisible({timeout:25000});
 await expect(stage.getByText('Unrelated publisher')).toHaveCount(0);
 await page.locator('.oracle-card-library summary').click();
 const options=await page.locator('#oracleCardChooser option').allTextContents();
 expect(options.length).toBeGreaterThan(25);expect(options.some(x=>x.includes('Write a story'))).toBeTruthy();expect(options.some(x=>x.includes('NASA Image Library'))).toBeTruthy();
 await page.locator('#oracleCardChooser').selectOption('phiStoryWriter');
 await expect(stage.locator('#sw-idea')).toBeVisible();await stage.locator('#sw-idea').fill('Preserve this story draft');
 await expect(stage.locator('.oracle-original-cover')).toBeVisible();
 await page.locator('#oracleCardChooser').selectOption('source-pcgs');
 await stage.getByRole('button',{name:'Next item ›'}).click();await expect(stage.getByText('1891-CC Morgan Dollar',{exact:true})).toBeVisible();
 await stage.getByRole('button',{name:'☆ Star',exact:true}).click();
 await stage.getByRole('button',{name:'+ Collect',exact:true}).click();
 await expect(stage.getByRole('button',{name:'✓ Collected',exact:true})).toBeVisible();
 await page.locator('#oracleCardChooser').selectOption('phiStoryWriter');await expect(stage.locator('#sw-idea')).toHaveValue('Preserve this story draft');
 expect(await stage.evaluate(el=>el.getBoundingClientRect().right<=innerWidth)).toBeTruthy();
});
test('Following keeps only opted-in sources and shelf mode reveals restored cards',async({page})=>{
 await fixtures(page);await page.goto(base+'/?card=pcgs',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#oracleCardStage [data-source-id="pcgs"]')).toBeVisible();
 await page.locator('#oracleCardFollow').click();await page.getByRole('tab',{name:'Following',exact:true}).click();
 await expect(page.locator('#oracleCardInventory')).toHaveText('Choose a card · 1 available');
 await page.getByRole('tab',{name:'Public',exact:true}).click();await page.locator('#oracleCardScroll').click();
 await expect(page.locator('#premiumSourceCards')).toBeVisible();await expect(page.locator('#siteQuickCards')).toBeVisible();
});
test('unavailable sources are explicit and do not fabricate an item',async({page})=>{
 await page.route('https://orange-brook-a2ac.marvaseater.workers.dev/**',route=>route.fulfill({status:503,body:'Unavailable'}));
 await page.goto(base+'/?card=heritage',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage [data-source-id="heritage"]');await expect(card).toBeVisible();
 await expect(card.locator('.premium-state')).toContainText('unavailable right now',{timeout:20000});await expect(card.locator('.premium-selected')).toHaveCount(0);
});

test('a shared original-tool link waits for its actual controls before spotlighting',async({page})=>{
 await fixtures(page);await page.goto(base+'/?card=phiStoryWriter',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#oracleCardStage #sw-idea')).toBeVisible();
 await expect(page.locator('#oracleCardStage .oracle-original-cover h2')).toHaveText('Story Writer');
});


test('Following displays genuine publisher listings only after Follow and preserves Heritage sign-in handoff',async({page})=>{
 const at=new Date().toISOString();
 const lot='https://coins.ha.com/itm/morgan-dollars/verified-fixture/a/12345-678.s';
 await page.route('**/data/quick-card-spotlights-latest.json?**',route=>route.fulfill({json:{
  schema_version:1,checked_at:at,cards:{heritage:{schema_version:1,items:[{
   url:lot,image:'https://images.ha.com/lot-fixture.jpg',title:'1885 Morgan Silver Dollar · Heritage lot',
   description:'Original Heritage lot page preview',checked_at:at,kind:'product'
  }]}}
 }}));
 await page.route('https://images.ha.com/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#ddd"/></svg>'}));
 await page.route('https://orange-brook-a2ac.marvaseater.workers.dev/**',route=>route.fulfill({json:{results:[]}}));
 await page.goto(base+'/?card=heritage',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage [data-source-id="heritage"]');
 await expect(card).toBeVisible({timeout:20000});
 await expect(card.locator('a.qca-signin')).toHaveAttribute('href','https://www.ha.com/c/login.zx');
 const listing=page.locator('#oracleFollowingFeed');
 await expect(listing).toBeHidden();
 await page.locator('#oracleCardFollow').click();
 await page.getByRole('tab',{name:'Following',exact:true}).click();
 await expect(listing).toBeVisible();
 await expect(listing.getByText('1885 Morgan Silver Dollar · Heritage lot')).toBeVisible({timeout:20000});
 await expect(listing.getByRole('link',{name:'View original listing'})).toHaveAttribute('href',lot);
 await expect(listing.locator('img.ofp-photo')).toHaveAttribute('src','https://images.ha.com/lot-fixture.jpg');
 await expect(listing.getByText(/not a paid Infinity advertisement/)).toBeVisible();
 await page.locator('#oracleCardFollow').click();
 await expect(listing.getByText('1885 Morgan Silver Dollar · Heritage lot')).toHaveCount(0);
 await expect(listing).toContainText('Follow auction houses');
});
