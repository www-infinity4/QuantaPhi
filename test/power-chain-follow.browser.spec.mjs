import { test, expect } from '@playwright/test';

const base = 'http://127.0.0.1:8799';
test.use({ viewport: { width: 360, height: 800 } });

test('Power Chain follows source cards, mixes topics and remembers an individual unfollow', async ({ page }) => {
 await page.route('**/*', route => route.request().url().startsWith(base+'/') ? route.continue() : route.abort());
 const deck = page.locator('#oracleCardDeck');
 const stage = deck.locator('#oracleCardStage');
 const follow = deck.locator('#oracleCardFollow');
 const chain = deck.locator('#oraclePowerChainFollow');
 const following = deck.getByRole('tab', { name: 'Following' });
 const chooser = deck.locator('#oracleCardChooser');
 const guess = chooser.locator('option[value="source-guess-g11-light"]');

 await page.goto(base+'/?card=levis-501-dark', { waitUntil: 'domcontentloaded' });
 await expect(stage).toHaveAttribute('data-switchboard-id', 'levis-501-dark');
 await follow.click();
 await following.click();
 await expect(guess).toHaveCount(0);
 await chain.click();
 await expect(chain).toHaveAttribute('aria-pressed', 'true');
 await expect(guess).toHaveCount(1);

 await page.goto(base+'/?card=coinworld', { waitUntil: 'domcontentloaded' });
 await expect(stage).toHaveAttribute('data-switchboard-id', 'coinworld');
 await chain.click();
 await following.click();
 await expect(chooser.locator('option[value="source-coinage"]')).toHaveCount(1);

 await deck.locator('#oracleCardInventory').click();
 await chooser.selectOption('source-guess-g11-light');
 await expect(stage).toHaveAttribute('data-switchboard-id', 'guess-g11-light');
 await expect(deck.locator('#oraclePowerChainReason')).toContainText('Via Levi');
 await expect(follow).toHaveText('Unfollow this one');
 await deck.getByRole('button', { name: 'Next card' }).click();
 await expect(stage).toHaveAttribute('data-switchboard-id', /^(coinworld|coinage|pcgs|ngc|vamworld|heritage)$/);

 await chooser.selectOption('source-guess-g11-light');
 await follow.click();
 await expect(guess).toHaveCount(0);
 await page.reload({ waitUntil: 'domcontentloaded' });
 await following.click();
 await expect(chooser.locator('option[value="source-levis-501-dark"]')).toHaveCount(1);
 await expect(guess).toHaveCount(0);
 await expect(chooser.locator('option[value="source-pepe-brooke"]')).toHaveCount(1);
 const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('quanta:discovery:anonymous:v1')));
 expect(saved.following).toEqual(['levis-501-dark', 'coinworld']);
 expect(saved.powerChain.excluded).toContain('guess-g11-light');
});

test('resuming a deep-linked page respects an empty Following feed', async ({ page }) => {
 await page.route('**/*', route => route.request().url().startsWith(base+'/') ? route.continue() : route.abort());
 await page.goto(base+'/?card=levis-501-dark', { waitUntil: 'domcontentloaded' });
 const deck = page.locator('#oracleCardDeck');
 const stage = deck.locator('#oracleCardStage');
 const follow = deck.locator('#oracleCardFollow');
 await expect(stage).toHaveAttribute('data-switchboard-id', 'levis-501-dark');
 await follow.click();
 await deck.getByRole('tab', { name: 'Following' }).click();
 await follow.click();
 await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
 await expect(deck.locator('#oracleCardNow')).toHaveText('No followed interactive cards');
 await expect(stage).not.toHaveAttribute('data-switchboard-id', /.+/);
});


test('Blue Star opens as a mobile Quick Card and its user-chosen chain adds reviewed skin-relief publishers', async ({ page }) => {
 // The mock isolates layout/navigation from a retailer CDN outage. A real photo
 // and commercial license still require independent live verification.
 await page.route('**/*', route => {
  const url=route.request().url();
  if(url.startsWith(base+'/'))return route.continue();
  if(url.startsWith('https://i5.walmartimages.com/'))
   return route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"></svg>'});
  return route.abort();
 });
 await page.goto(base+'/?card=blue-star-ointment',{waitUntil:'domcontentloaded'});
 const deck=page.locator('#oracleCardDeck');
 const stage=deck.locator('#oracleCardStage');
 const chain=deck.locator('#oraclePowerChainFollow');
 await expect(stage).toHaveAttribute('data-switchboard-id','blue-star-ointment');
 await expect(stage.getByRole('heading',{name:/Blue Star.*Anti-Itch/i})).toBeVisible();
 await expect(stage.getByRole('link',{name:'View exact item at Walmart'}))
  .toHaveAttribute('href','https://www.walmart.com/ip/10316529');
 await expect(stage.locator('.qec-card')).toHaveAttribute('data-personalization','disabled');
 await expect(chain).toBeVisible();
 await chain.click();
 await deck.getByRole('tab',{name:'Following'}).click();
 const chooser=deck.locator('#oracleCardChooser');
 await expect(chooser.locator('option[value="source-aveeno-anti-itch"]')).toHaveCount(1);
 await expect(chooser.locator('option[value="source-sarna-original-lotion"]')).toHaveCount(1);
 await expect(chooser.locator('option[value="source-campho-phenique-liquid"]')).toHaveCount(0);
});
