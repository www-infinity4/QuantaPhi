import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:390,height:844},hasTouch:true});
test('six original readers are selectable and render a complete story in the active carousel',async({page})=>{
 await page.goto(base+'/?card=infinityReaderMystery',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage .isr-card');
 await expect(card.getByRole('heading',{name:'Tales of Mystery & Suspense'})).toBeVisible({timeout:20000});
 await expect(card.locator('.isr-story-body p')).toHaveCount(4);
 await expect(card.locator('.isr-story-title')).toHaveText('The Key That Rang Twice');
 await expect(card.getByRole('button',{name:'Next story ›'})).toBeVisible();
 await expect(page.locator('#oracleCardPrevious')).toBeInViewport();
 await expect(page.locator('#oracleCardNext')).toBeInViewport();
 const chooser=page.locator('#oracleCardChooser');
 for(const [id,title] of [
  ['infinityReaderTwilight','Twilight Zone'],
  ['infinityReaderTech','Tech History'],
  ['infinityReaderFame','Touts of Fame'],
  ['infinityReaderSports','Sports Almanac'],
  ['infinityReaderCosmic','Beyond the Signal']
 ]){
  await page.locator('#oracleCardInventory').click();
  await chooser.selectOption(id);
  await expect(page.locator('#oracleCardStage .isr-card').getByRole('heading',{name:title,exact:true})).toBeVisible();
  await expect(page.locator('#oracleCardStage .isr-story-body p').first()).toBeVisible();
  await page.locator('#oracleCardInventory').click();
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});
test('Next stays fresh across reloads, Prev works, and Collect saves without minting',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async x=>{window.__isrShare=x}}});
 });
 await page.goto(base+'/?card=infinityReaderMystery',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage .isr-card');
 await expect(card.locator('.isr-story-title')).toHaveText('The Key That Rang Twice');
 await card.getByRole('button',{name:'Next story ›'}).click();
 await expect(card.locator('.isr-story-title')).toHaveText('Passenger Without a Ticket');
 await card.getByRole('button',{name:'‹ Previous'}).click();
 await expect(card.locator('.isr-story-title')).toHaveText('The Key That Rang Twice');
 await card.getByRole('button',{name:'◇ Collect'}).click();
 await expect(card.getByRole('button',{name:'✓ Collected'})).toBeVisible();
 await card.getByRole('button',{name:'↗ Share'}).click();
 await expect.poll(async()=>page.evaluate(()=>window.__isrShare)).toContain('/q-share?');
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#oracleCardStage .isr-story-title')).toHaveText('The Portrait in the Inventory');
 const seen=await page.evaluate(()=>JSON.parse(localStorage.getItem('quanta:infinity-readers:seen:v1:mystery')));
 expect(new Set(seen).size).toBe(3);
});
test('beyond seeds, factual stories load approved Wikipedia excerpts with visible attribution',async({page})=>{
 await page.route('https://en.wikipedia.org/w/api.php?**',route=>route.fulfill({
  status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
  body:JSON.stringify({query:{pages:[{ns:0,pageid:100234,title:'Vacuum tubes',fullurl:'https://en.wikipedia.org/wiki/Vacuum_tube',
   extract:'The vacuum tube is a historic electronic component. '.repeat(12)}]}}),
 }));
 await page.goto(base+'/?card=infinityReaderTech',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage .isr-card');
 await expect(card.locator('.isr-story-title')).toHaveText('The Internet’s First Two Letters');
 await card.getByRole('button',{name:'Next story ›'}).click();
 await card.getByRole('button',{name:'Next story ›'}).click();
 await expect(card.locator('.isr-story-title')).toHaveText('Vacuum tubes');
 await expect(card.locator('.isr-credit')).toContainText('CC BY-SA');
 await expect(card.getByRole('link',{name:/complete source and attribution/})).toHaveAttribute('href','https://en.wikipedia.org/wiki/Vacuum_tube');
});
test('public domain discoveries link to actual book while copyrighted catalog entries are excluded',async({page})=>{
 await page.route('https://gutendex.com/books/**',route=>route.fulfill({
  status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
  body:JSON.stringify({next:null,results:[
   {id:9876,title:'A Forgotten Public Domain Mystery',copyright:false,languages:['en'],authors:[{name:'Historical Author'}],summaries:['A forgotten mystery about a locked room.']},
   {id:9877,title:'Copyrighted Modern Story',copyright:true,languages:['en'],summaries:['Not allowed.']}
  ]}),
 }));
 await page.goto(base+'/?card=infinityReaderMystery',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage .isr-card');
 for(let i=0;i<3;i++)await card.getByRole('button',{name:'Next story ›'}).click();
 await expect(card.locator('.isr-story-title')).toHaveText('A Forgotten Public Domain Mystery');
 await expect(card.getByRole('link',{name:'Read complete public-domain book ↗'})).toHaveAttribute('href','https://www.gutenberg.org/ebooks/9876');
 await expect(card.locator('.isr-story')).not.toContainText('Copyrighted Modern Story');
});
