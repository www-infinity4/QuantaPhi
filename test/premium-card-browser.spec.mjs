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
 await page.locator('#oracleCardFollow').click();await page.locator('#oracleCardDeck').getByRole('tab',{name:'Following',exact:true}).click();
 await expect(page.locator('#oracleCardInventory')).toHaveText('Choose a real interactive card');
 await expect(page.locator('#oracleCardChooser option[value="source-pcgs"]')).toHaveCount(1);
 await expect(page.locator('#oracleCardChooser option[value="source-heritage"]')).toHaveCount(0);
 await page.locator('#oracleCardDeck').getByRole('tab',{name:'Public',exact:true}).click();await page.locator('#oracleCardScroll').click();
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
 await page.locator('#oracleCardDeck').getByRole('tab',{name:'Following',exact:true}).click();
 await expect(listing).toBeVisible();
 await expect(listing.getByText('1885 Morgan Silver Dollar · Heritage lot')).toBeVisible({timeout:20000});
 await expect(listing.getByRole('link',{name:'View original listing'})).toHaveAttribute('href',lot);
 await expect(listing.locator('img.ofp-photo')).toHaveAttribute('src','https://images.ha.com/lot-fixture.jpg');
 await expect(listing.getByText(/not a paid Infinity advertisement/)).toBeVisible();
 await page.locator('#oracleCardFollow').click();
 await expect(listing.getByText('1885 Morgan Silver Dollar · Heritage lot')).toHaveCount(0);
 await expect(listing).toContainText('Follow auction houses');
});

test('PCGS certified-VAM cross-seller discovery shows attributed lots and licensed reference image at Android width',async({page})=>{
 await page.route('https://commons.wikimedia.org/**',route=>route.fulfill({
  contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="500" height="350"><rect width="500" height="350" fill="#ddd"/></svg>'
 }));
 await page.route('https://orange-brook-a2ac.marvaseater.workers.dev/search**',route=>{
  const q=new URL(route.request().url()).searchParams.get('q')||'';
  const results=q.includes('site:greatcollections.com')?[
   {title:'1888-O Hot Lips VAM-4 Top 100 PCGS AU-53',url:'https://www.greatcollections.com/Coin/2299600/1888-O-Morgan-Silver-Dollar-Hot-Lips-VAM-4-PCGS-AU-53',description:'Certified lot, seller provides photos'},
   {title:'Fake ungraded dollar',url:'https://www.greatcollections.com/Coin/2399000/No-Holder'}
  ]:q.includes('site:icollector.com')?[
   {title:'1889-O MORGAN DOLLAR, PCGS AU-53 VAM 2 OVAL O',url:'https://www.icollector.com/1889-O-MORGAN-DOLLAR-PCGS-AU-53-VAM-2-OVAL-O_i37331753',status:'sold'}
  ]:q.includes('site:pcgs.com')?[
   {title:'PCGS CoinFacts Morgan Dollar',url:'https://www.pcgs.com/coinfacts/coin/1888-o'}
  ]:[];
  route.fulfill({json:{results},headers:{'access-control-allow-origin':'*'}});
 });
 await page.goto(base+'/?card=pcgs',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage [data-source-id="pcgs"]');
 await expect(card).toBeVisible();
 const sales=card.locator('.premium-coin-sales');
 await expect(sales).toBeVisible();
 await expect(sales.getByText('1888-O Hot Lips VAM-4 Top 100 PCGS AU-53')).toBeVisible({timeout:25000});
 await expect(sales.locator('img.premium-coin-reference-photo')).toHaveAttribute('src',/commons\.wikimedia\.org/);
 await expect(sales.getByText(/not a seller listing/i)).toBeVisible();
 await expect(sales.getByRole('link',{name:/View actual lot photographs at GreatCollections/})).toHaveAttribute('href',/greatcollections\.com\/Coin\/2299600/);
 await expect(sales.getByText('Fake ungraded dollar')).toHaveCount(0);
 await sales.getByRole('button',{name:'iCollector'}).click();
 await expect(sales.getByText('1889-O MORGAN DOLLAR, PCGS AU-53 VAM 2 OVAL O')).toBeVisible();
 await expect(sales.getByText(/Past\/closed listing/)).toBeVisible();
 expect(await sales.evaluate(el=>el.getBoundingClientRect().right<=innerWidth)).toBeTruthy();
});

test('seller-authorized listing photo appears for the exact PCGS VAM lot and is credited in the card',async({page})=>{
 const lot='https://www.greatcollections.com/Coin/2299600/1888-O-Morgan-Silver-Dollar-Hot-Lips-VAM-4-PCGS-AU-53';
 await page.route('**/data/coin-media-approvals.json',route=>route.fulfill({json:{
  schema_version:1,grants:[{market:'greatcollections',lot_url:lot,
   image_url:'https://www.greatcollections.com/approved/lot-2299600.jpg',
   image_credit:'GreatCollections rights holder · reviewed approved lot photo',
   license:'seller-permitted',proof_url:'https://www.greatcollections.com/approved/lot-2299600-rights',
   approved_by:'reviewed-commercial-media',approved_at:'2026-11-07',expires_at:'2027-01-01'}]
 }}));
 await page.route('https://www.greatcollections.com/approved/lot-2299600.jpg',route=>route.fulfill({
  contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450"><rect width="600" height="450" fill="#ddd"/></svg>'
 }));
 await page.route('https://orange-brook-a2ac.marvaseater.workers.dev/search**',route=>{
  const q=new URL(route.request().url()).searchParams.get('q')||'';
  return route.fulfill({json:{results:q.includes('site:greatcollections.com')?[
   {title:'1888-O Hot Lips VAM-4 Top 100 PCGS AU-53',url:lot}
  ]:[]},headers:{'access-control-allow-origin':'*'}});
 });
 await page.goto(base+'/?card=pcgs',{waitUntil:'domcontentloaded'});
 const photos=page.locator('#oracleCardStage [data-source-id="pcgs"] .premium-coin-lot-photo');
 await expect(photos).toBeVisible({timeout:25000});
 await expect(photos.locator('img')).toHaveAttribute('src','https://www.greatcollections.com/approved/lot-2299600.jpg');
 await expect(photos).toContainText('GreatCollections rights holder');
 await expect(photos.getByRole('link',{name:'Original lot and image credit'})).toHaveAttribute('href',lot);
});
