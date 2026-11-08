import {test,expect} from '@playwright/test';

const base='http://127.0.0.1:8799';
test.use({viewport:{width:360,height:780}});
test.beforeEach(async({page})=>{
 await page.route('**/*',route=>{
  if(route.request().url().startsWith(base+'/'))return route.continue();
  return route.abort();
 });
});

test('Not for me persists on this browser, hides only For You, and restores without deleting the card',async({page})=>{
 await page.goto(base+'/?card=google',{waitUntil:'domcontentloaded'});
 const deck=page.locator('#oracleCardDeck'),stage=deck.locator('#oracleCardStage');
 await expect(stage).toHaveAttribute('data-switchboard-id','google',{timeout:20000});
 const hide=deck.locator('#oracleCardNotForMe'),restore=deck.locator('#oracleCardRestoreHidden');
 await expect(hide).toBeVisible();
 await hide.click();
 await expect.poll(()=>page.evaluate(()=>{
  try{return JSON.parse(localStorage.getItem('quanta:discovery:anonymous:v1')||'{}').hiddenForYou?.includes('google')===true}
  catch{return false}
 })).toBe(true);
 await expect(hide).toHaveText('Show in For You');
 await deck.getByRole('tab',{name:'For You'}).click();
 await expect(deck.locator('#oracleCardChooser option[value="source-google"]')).toHaveCount(0);
 await expect(restore).toBeVisible();
 await expect(stage).not.toHaveAttribute('data-switchboard-id','google');
 await deck.getByRole('tab',{name:'Public'}).click();
 await expect(deck.locator('#oracleCardChooser option[value="source-google"]')).toHaveCount(1);
 await page.reload({waitUntil:'domcontentloaded'});
 await deck.getByRole('tab',{name:'For You'}).click();
 await expect(deck.locator('#oracleCardChooser option[value="source-google"]')).toHaveCount(0);
 await restore.click();
 await expect(deck.locator('#oracleCardChooser option[value="source-google"]')).toHaveCount(1);
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('quanta:discovery:anonymous:v1')||'{}'));
 expect(stored.hiddenForYou).toEqual([]);
 await expect(restore).toBeHidden();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(4);
});
