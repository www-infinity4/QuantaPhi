import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';test.use({viewport:{width:360,height:800}});
async function prepare(page){
 await page.clock.setFixedTime(new Date('2026-10-29T01:00:00Z'));
 await page.route('**/*',route=>{const u=new URL(route.request().url());
  if(u.origin===base)return route.continue();
  if(u.hostname==='www.kyoutv.com')return route.fulfill({contentType:'text/html',body:'<p>Publisher fixture, no verified game playback</p>'});
  return route.abort();
 });
}
test('Burger King search immediately returns its working Quick Card and original-site link, even offline',async({page})=>{
 await prepare(page);await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.getByRole('searchbox',{name:'Search anything',exact:true}).fill('burger king');await page.locator('#go').click();
 const card=page.locator('#quickCardSearchResults [data-quick-card-match="burger-king"]');await expect(card).toBeVisible();
 await expect(card.getByRole('link',{name:'Visit Burger King ↗',exact:true})).toHaveAttribute('href','https://www.bk.com/');
 await expect(card.getByRole('button',{name:'↗ Share',exact:true})).toBeVisible();
 await expect(card.getByRole('button',{name:'+ Collect',exact:true})).toBeVisible();
 await expect(card.getByRole('button',{name:'+1 Build',exact:true})).toBeVisible();
 await card.getByRole('button',{name:'◫ Preview',exact:true}).click();
 const preview=page.getByRole('dialog',{name:'Quick Card live preview'});await expect(preview).toBeVisible();
 const view=preview.frameLocator('iframe');await expect(view.getByRole('heading',{name:'Burger King',exact:true})).toBeVisible();
 await expect(view.getByRole('link',{name:'Visit original Burger King ↗',exact:true})).toHaveAttribute('href','https://www.bk.com/');
});
test('a new search replaces stale card matches and preserves ordinary research',async({page})=>{
 await prepare(page);await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 const q=page.getByRole('searchbox',{name:'Search anything',exact:true});
 await q.fill('burgerking');await q.press('Enter');await expect(page.locator('[data-quick-card-match="burger-king"]')).toBeVisible();
 await q.fill('google');await q.press('Enter');await expect(page.locator('[data-quick-card-match="google"]')).toBeVisible();await expect(page.locator('[data-quick-card-match="burger-king"]')).toHaveCount(0);
 await q.fill('unrelated-zzq-topic');await q.press('Enter');await expect(page.locator('#quickCardSearchResults')).toBeHidden();await expect(page.locator('#webSearchResults')).toBeVisible();
});
test('a search permalink restores the matching card without relying on a paid lookup',async({page})=>{
 await prepare(page);let jobs=0;await page.route('**/v1/cards/website',route=>{jobs++;return route.abort()});
 await page.goto(base+'/?q=Burger%20King',{waitUntil:'domcontentloaded'});
 await expect(page.locator('[data-quick-card-match="burger-king"]')).toBeVisible();expect(jobs).toBe(0);
});
