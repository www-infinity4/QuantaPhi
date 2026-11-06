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
