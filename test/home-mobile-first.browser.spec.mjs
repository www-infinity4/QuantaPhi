import {test,expect} from '@playwright/test';
test.use({viewport:{width:390,height:844}});
test('Android homepage shows compact traffic, live card, inline Follow, and accessible wallet recovery',async({page})=>{
 await page.goto('http://127.0.0.1:8799/?card=google',{waitUntil:'domcontentloaded'});
 const traffic=page.locator('#qtraffic');
 await expect(traffic.locator('summary')).toBeVisible();
 await expect(traffic.locator('#qtrafficNote')).toBeHidden();
 await traffic.locator('summary').click();
 await expect(traffic.locator('#qtrafficNote')).toBeVisible();
 await traffic.locator('summary').click();
 const deck=page.locator('#oracleCardDeck');
 await expect(deck.locator('#oracleCardStage .qcx-google-wordmark')).toBeVisible({timeout:18000});
 const order=await deck.evaluate(root=>{
  const s=root.querySelector('#oracleCardStage'),l=root.querySelector('.oracle-card-library');
  return Boolean(s&&l&&(s.compareDocumentPosition(l)&Node.DOCUMENT_POSITION_FOLLOWING));
 });
 expect(order).toBeTruthy();
 const follow=deck.locator('#oracleCardFollow');
 await expect(follow).toBeVisible();
 await expect(follow.locator('xpath=..')).toHaveClass(/oracle-card-deck-nav/);
 const width=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
 expect(width).toBeTruthy();
 await page.getByRole('button',{name:'Open menu'}).click();
 await expect(page.getByRole('link',{name:'Find StarCoins, Quants and Infinity records in Cloudflare'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Bubbles account connections'})).toBeVisible().catch(async()=>{
  await expect(page.getByRole('link',{name:/Connect accounts.*Bubbles/i})).toBeVisible();
 });
});
