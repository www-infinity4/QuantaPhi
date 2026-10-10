import { test, expect } from '@playwright/test';
test('public page keeps private robot controls hidden', async ({ page, request }) => {
  await page.goto('https://quantaphi.org/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#quantaAgentIterations')).toBeHidden();
  await expect(page.locator('#robotDirections')).toBeHidden();
  for (const path of ['/health', '/activity/feed.json', '/work/preview', '/work/quants']) {
    const response = await request.get('https://infinity-brain-clock.marvaseater.workers.dev' + path);
    expect(response.status()).toBe(404);
    expect(await response.text()).toBe('Not found');
  }
  await page.screenshot({ path: 'proofs/screenshots/public-owner-boundary.png', fullPage: true });
});
