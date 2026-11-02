import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
const topics=[
 ['gold-coins','Gold coins and Morgan dollars'],
 ['coin-supplies','Coin collection supplies'],
 ['pcgs-grading','PCGS coin grading reference'],
 ['jeweler-loupe','Jeweler loupe coin inspection'],
 ['coin-albums','Coin albums for silver dollars'],
 ['silver-dollars','More Morgan silver dollars']
];
function card([slug,title]){
 return {slug,title,description:title+' and coin collection resources',
  kind:'visit',status:'approved',cardUrl:'https://quantaphi.org/cards/'+slug,
  website:'https://collector.example/'+slug,
  image:'https://images.example/'+slug+'.svg'};
}
async function setup(page,{empty=false}={}){
 await page.route('**/api/quick-cards?**',r=>r.fulfill({status:200,contentType:'application/json',
  body:JSON.stringify({ok:true,cards:empty?[]:topics.map(card)})}));
 await page.route('https://ad-phi.marvaseater.workers.dev/**',r=>r.fulfill({status:404,
  contentType:'application/json',body:JSON.stringify({ok:false,error:'No paid offers'})}));
 await page.route('https://images.example/**',r=>r.fulfill({status:200,contentType:'image/svg+xml',
  body:'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#d3e4ef"/><circle cx="400" cy="300" r="160" fill="#cdbb85"/></svg>'}));
}
test('Android gets two legible large interactive companion tiles with working Next/Previous',async({page})=>{
 await page.setViewportSize({width:360,height:800});await setup(page);
 await page.goto(base+'/?card=source-pcgs',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#oracleCardStage [data-source-id="pcgs"]')).toBeVisible({timeout:30000});
 const tiles=page.locator('#oracleCardDeck .shopphi-flank:visible');
 await expect(tiles).toHaveCount(2,{timeout:25000});
 await expect(page.locator('.shopphi-flank-position')).toHaveText('1–2 of 6');
 // Source banks may finish mounting between locator resolution and evaluation.
 // Wait for the current tile's rendered visual, rather than measure a replaced node.
 await expect.poll(()=>tiles.first().locator('.shopphi-flank-visual')
  .evaluate(x=>x.isConnected?x.getBoundingClientRect().height:0).catch(()=>0)).toBeGreaterThanOrEqual(120);
 await expect(tiles.first().locator('.shopphi-flank-cta')).toContainText(/Open/);
 const first=await tiles.first().getAttribute('href');
 expect(first).toMatch(/^https:\/\//);expect(first).not.toContain('undefined');
 await page.getByRole('button',{name:'Next ›'}).click();
 await expect(page.locator('.shopphi-flank-position')).toHaveText('3–4 of 6');
 const after=await tiles.first().getAttribute('href');
 expect(after).not.toBe(first);
 await page.getByRole('button',{name:'‹ Previous'}).click();
 await expect(page.locator('.shopphi-flank-position')).toHaveText('1–2 of 6');
});
test('404 paid ad service does not create fake sponsored ads or six empty boxes',async({page})=>{
 await page.setViewportSize({width:360,height:800});await setup(page,{empty:true});
 await page.goto(base+'/?card=source-pcgs',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#oracleCardStage [data-source-id="pcgs"]')).toBeVisible({timeout:30000});
 await expect(page.locator('.shopphi-switchboard-receipt')).toContainText(/related, working|No verified companion offers/, {timeout:28000});
 // Empty AdPhi inventory cannot hide, replace or disable the real PCGS search.
 await expect(page.locator('#oracleCardStage [data-source-id="pcgs"] form.premium-search input[type="search"]')).toBeVisible();
 await expect(page.locator('#oracleCardStage [data-source-id="pcgs"] form.premium-search button[type="submit"]')).toBeEnabled();
 expect(await page.locator('#oracleCardDeck .shopphi-flank-tag:visible').allTextContents())
  .not.toContain('SPONSORED');
 const cards=page.locator('#oracleCardDeck .shopphi-flank:visible');
 const finalStatus=await page.locator('.shopphi-switchboard-receipt').textContent();
 // Source discovery is asynchronous; do not infer empty inventory from a
 // transient zero-card frame before the final six-card render is visible.
 if(finalStatus?.includes('related, working card links')){
  await expect(cards).toHaveCount(2);
 
  const link=cards.first();
  await expect(link).toContainText('INDEPENDENT SOURCE CARD');
  expect(await link.getAttribute('href')).toMatch(/^https:\/\/quantaphi\.org\/\?card=source-/);
  await expect(link.locator('.shopphi-flank-visual')).toBeVisible();
 }else{
  await expect(page.locator('.shopphi-switchboard-receipt')).toContainText('No verified companion offers');
 }
 expect(await page.locator('.shopphi-flank-empty').count()).toBe(0);
});

test('source-backed shopping companions lead the mobile card with a real photo, not an unrelated museum',async({page})=>{
 await page.setViewportSize({width:360,height:800});await setup(page);
 await page.goto(base+'/?card=source-pcgs',{waitUntil:'domcontentloaded'});
 const hero=page.locator('#oracleCardStage [data-source-id="pcgs"]');
 await expect(hero).toBeVisible({timeout:30000});
 const grid=page.locator('#oracleCardDeck .shopphi-switchboard-grid');
 await expect(grid).toHaveClass(/shopphi-showcase-mode/);
 const photos=page.locator('#oracleCardDeck .shopphi-flank:visible img');
 await expect(photos).toHaveCount(2);
 const bounds=await page.evaluate(()=>{
  const visible=[...document.querySelectorAll('#oracleCardDeck .shopphi-flank')].find(x=>!x.hidden);
  return {ad:visible?.getBoundingClientRect().top,hero:document.getElementById('oracleCardStage')?.getBoundingClientRect().top};
 });
 expect(bounds.ad).toBeLessThan(bounds.hero);
 const titles=await page.locator('#oracleCardDeck .shopphi-flank:visible .shopphi-flank-title').allTextContents();
 expect(titles.join(' ')).not.toMatch(/Art studios|museum originals/i);
 await expect(page.getByRole('button',{name:/Pause automatic companion card rotation/})).toBeVisible();
});
