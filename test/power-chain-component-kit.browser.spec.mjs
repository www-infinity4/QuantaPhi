import { test, expect } from 'playwright/test';

const base = 'http://127.0.0.1:8799';
const brokerPattern = 'https://orange-brook-a2ac.marvaseater.workers.dev/search**';
test.use({ viewport: { width: 393, height: 852 } });

test.beforeEach(async ({ page }) => {
 // Tests have no external network dependency: only the local app is served.
 await page.route('**/*', route => new URL(route.request().url()).origin === base ?
  route.continue() : route.abort('blockedbyclient'));
 await page.addInitScript(() => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true,
   value: { writeText: async text => { window.__kitCopiedReceipt = text; } } });
 });
});

async function openKit(page, query = '') {
 await page.goto(base + '/design-lab/index.html' + query, { waitUntil: 'domcontentloaded' });
 await expect(page.locator('#kitRun')).toBeEnabled();
}

async function copyReceipt(page) {
 await page.locator('#kitCopy').click();
 return page.evaluate(() => JSON.parse(window.__kitCopiedReceipt));
}

function mockBroker(page, mode = 'results') {
 const calls = [];
 page.route(brokerPattern, route => {
  const query = new URL(route.request().url()).searchParams.get('q') || '';
  const target = query.split(' ')[0].replace(/^site:/, '');
  calls.push({ target, query });
  return route.fulfill({ status: mode === 'error' ? 503 : 200, contentType: 'application/json',
   headers: { 'access-control-allow-origin': '*' },
   body: JSON.stringify({ results: mode === 'results' ? [
    { title: 'Original ' + target, url: 'https://' + target + '/coin-evidence', content: 'Public index research lead.' },
    { title: 'Spoofed original source', url: 'https://' + target + '.untrusted.example/coin-evidence' }
   ] : [] }) });
 });
 return calls;
}

async function runCoinSearch(page) {
 await page.locator('#kitDiagnostics').fill('date feature\nmint mark position');
 await page.locator('#kitRun').click();
 await expect(page.locator('#kitStatus')).toContainText('Search finished.');
}

for (const width of [320, 360, 393]) {
 test('component kit wiring and allocations fit a ' + width + 'px Android screen', async ({ page }) => {
  await page.setViewportSize({ width, height: 852 });
  await openKit(page);
  await expect(page.locator('#kitParts > li')).toHaveCount(6);
  await expect(page.locator('#kitWiringStatus')).toContainText('6 parts');
  await page.getByRole('button', { name: 'Bulk buying allocation', exact: true }).click();
  await expect(page.locator('#kitParts > li')).toHaveCount(3);
  await expect(page.locator('#kitWires > li')).toHaveCount(3);
  await expect(page.locator('#kitPurpose')).toContainText('complete');
  await page.locator('#kitRun').click();
  await expect(page.locator('#kitStatus')).toContainText('Incomplete pool.');
  await expect(page.locator('.kit-total').nth(0).locator('strong')).toHaveText('150');
  await expect(page.locator('.kit-total').nth(1).locator('strong')).toHaveText('150');
  await expect(page.locator('#kitResults tbody tr')).toHaveCount(5);
  for (const row of await page.locator('#kitResults tbody tr').all()) {
   await expect(row.locator('td').nth(2)).toHaveText('30');
   await expect(row.locator('td').nth(3)).toHaveText('$30.00');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Coin diagnostic research', exact: true }).click();
  await expect(page.locator('#kitParts > li')).toHaveCount(6);
  await expect(page.locator('#kitResults')).toBeEmpty();
  await expect(page.locator('#kitCopy')).toBeDisabled();
 });
}

test('five buyers taking 60 and ten taking 30 get exact complete proposals with no invented savings', async ({ page }) => {
 await openKit(page, '?kit=bulk-pool');
 await expect(page.getByRole('button', { name: 'Bulk buying allocation', exact: true })).toHaveAttribute('aria-pressed', 'true');
 await expect(page.locator('#kitCoinPanel')).toBeHidden();
 for (const [example, count, quantity, amount] of [['5 × 60', 5, '60', '$60.00'], ['10 × 30', 10, '30', '$30.00']]) {
  await page.getByRole('button', { name: example, exact: true }).click();
  await page.locator('#kitRun').click();
  await expect(page.locator('#kitStatus')).toContainText('Fully allocated proposal.');
  await expect(page.locator('#kitStatus')).toContainText('No order or charge was made.');
  await expect(page.locator('.kit-total').nth(1).locator('strong')).toHaveText('0');
  await expect(page.locator('#kitResults tbody tr')).toHaveCount(count);
  for (const row of await page.locator('#kitResults tbody tr').all()) {
   await expect(row.locator('td').nth(2)).toHaveText(quantity);
   await expect(row.locator('td').nth(3)).toHaveText(amount);
   await expect(row.locator('td').nth(4)).toHaveText('Not provided');
  }
  await expect(page.locator('#kitResults')).toContainText('no cash savings');
  const receipt = await copyReceipt(page);
  expect(receipt.result.fullyAllocated).toBe(true);
  expect(receipt.result.canOrder).toBe(false);
  expect(receipt.result.proposalOnly).toBe(true);
  expect(receipt.result.totalMinor).toBe(30000);
 }
});

test('extra costs expose exceeded budgets and changed inputs invalidate the old receipt', async ({ page }) => {
 await openKit(page, '?kit=bulk-pool');
 await page.locator('#kitBuyers').fill(Array.from({ length: 10 }, (_, i) => 'Buyer ' + (i + 1) + ', 30, 30.00').join('\n'));
 await page.locator('#kitExtraCost').fill('30.00');
 await page.locator('#kitRun').click();
 await expect(page.locator('#kitStatus')).toContainText('exceed their maximum total');
 await expect(page.locator('#kitResults tbody tr')).toHaveCount(10);
 await expect(page.locator('#kitResults tbody tr').first().locator('td').nth(3)).toHaveText('$33.00');
 await expect(page.locator('#kitResults tbody tr').first().locator('td').nth(4)).toHaveText('Over limit');
 await expect(page.locator('#kitResults')).toContainText('$30.00 higher cost');
 const receipt = await copyReceipt(page);
 expect(receipt.result.withinBudgets).toBe(false);
 expect(receipt.result.canOrder).toBe(false);
 await page.locator('#kitUnitPrice').fill('0.90');
 await expect(page.locator('#kitResults')).toBeEmpty();
 await expect(page.locator('#kitCopy')).toBeDisabled();
 await expect(page.locator('#kitStatus')).toContainText('Inputs changed.');
});

test('duplicate buyer IDs fail visibly without an allocation or copyable receipt', async ({ page }) => {
 await openKit(page, '?kit=bulk-pool');
 await page.locator('#kitBuyers').fill('Same buyer, 150\nSame buyer, 150');
 await page.locator('#kitRun').click();
 await expect(page.locator('#kitStatus')).toContainText('Duplicate buyer ID');
 await expect(page.locator('#kitResults')).toBeEmpty();
 await expect(page.locator('#kitCopy')).toBeDisabled();
});

test('coin research groups original leads, rejects spoofed hosts and leaves photographs uninspected', async ({ page }) => {
 const calls = mockBroker(page);
 await openKit(page);
 await page.locator('#kitRun').click();
 await expect(page.locator('#kitStatus')).toContainText('one to six diagnostic phrases');
 expect(calls).toHaveLength(0);
 await runCoinSearch(page);
 expect(calls).toHaveLength(10);
 expect(calls.every(call => call.query.includes('date feature mint mark position'))).toBe(true);
 await expect(page.getByRole('heading', { name: 'Reference leads · 6', exact: true })).toBeVisible();
 await expect(page.getByRole('heading', { name: 'Candidate listing leads · 4', exact: true })).toBeVisible();
 await expect(page.locator('#kitResults .kit-source')).toHaveCount(10);
 await expect(page.getByText('Spoofed original source', { exact: true })).toHaveCount(0);
 await expect(page.locator('#kitStatus')).toContainText('Images inspected: 0.');
 await expect(page.locator('#kitStatus')).toContainText('Diagnostic matches remain unverified.');
 const receipt = await copyReceipt(page);
 expect(receipt.coverage.imagesInspected).toBe(0);
 expect(receipt.assessment).toBeNull();
 expect(receipt.references).toHaveLength(6);
 expect(receipt.candidates).toHaveLength(4);
 expect(receipt.canOrder).toBe(false);
});

test('diagnostic checks require reference links and a specimen, and edited evidence invalidates the assessment', async ({ page }) => {
 mockBroker(page);
 await openKit(page);
 await runCoinSearch(page);
 await page.locator('#kitEvidence summary').click();
 await page.locator('#kitAssess').click();
 await expect(page.locator('#kitAssessment')).toContainText('insufficient evidence');
 await page.locator('#kitCandidateUrl').fill('https://www.ebay.com/itm/12345');
 for (let i = 0; i < 2; i++) await page.locator('#kitCheckState' + i).selectOption('supported');
 await page.locator('#kitAssess').click();
 await expect(page.locator('#kitAssessment')).toContainText('insufficient evidence');
 for (let i = 0; i < 2; i++) await page.locator('#kitCheckReference' + i).fill('https://www.pcgs.com/reference-' + i);
 await page.locator('#kitAssess').click();
 await expect(page.locator('#kitAssessment')).toContainText('candidate · 2 / 2 supported.');
 let receipt = await copyReceipt(page);
 expect(receipt.assessment.status).toBe('candidate');
 expect(receipt.assessment.assessmentMethod).toBe('user-recorded');
 expect(receipt.assessment.certified).toBe(false);
 expect(receipt.assessment.canOrder).toBe(false);
 await page.locator('#kitCandidateUrl').fill('https://www.ebay.com/itm/67890');
 receipt = await copyReceipt(page);
 expect(receipt.assessment).toBeNull();
 await expect(page.locator('#kitEvidence')).toBeVisible();
 await page.locator('#kitAssess').click();
 await expect(page.locator('#kitAssessment')).toContainText('insufficient evidence');
 for (let i = 0; i < 2; i++) await page.locator('#kitCheckState' + i).selectOption('supported');
 await page.locator('#kitAssess').click();
 await expect(page.locator('#kitAssessment')).toContainText('candidate · 2 / 2 supported.');
 await page.locator('#kitCheckReference0').fill('https://pcgs.com.attacker.example/not-a-reference');
 await page.locator('#kitAssess').click();
 await expect(page.locator('#kitAssessment')).toContainText('approved HTTPS reference link');
 receipt = await copyReceipt(page);
 expect(receipt.assessment).toBeNull();
});

test('Stop cancels the bounded coin search without claiming a completed image scan', async ({ page }) => {
 const pending = [], releases = [];
 await page.route(brokerPattern, route => {
  pending.push(route);
  return new Promise(resolve => releases.push(resolve));
 });
 await openKit(page);
 await page.locator('#kitDiagnostics').fill('date feature');
 await page.locator('#kitRun').click();
 await expect(page.locator('#kitStop')).toBeEnabled();
 await expect.poll(() => pending.length).toBeGreaterThan(0);
 expect(pending.length).toBeLessThanOrEqual(4);
 await page.locator('#kitStop').click();
 await expect(page.locator('#kitStatus')).toContainText('Stopped.');
 await expect(page.locator('#kitStatus')).toContainText('Images inspected: 0.');
 await expect(page.locator('#kitRun')).toBeEnabled();
 await expect(page.locator('#kitStop')).toBeDisabled();
 const receipt = await copyReceipt(page);
 expect(receipt.coverage.stopped).toBe(true);
 expect(receipt.coverage.imagesInspected).toBe(0);
 expect(receipt.assessment).toBeNull();
 for (const route of pending) await route.abort().catch(() => {});
 for (const release of releases) release();
});

for (const mode of ['empty', 'error']) {
 test('coin search reports ' + mode + ' source returns without invented leads', async ({ page }) => {
  mockBroker(page, mode);
  await openKit(page);
  await runCoinSearch(page);
  await expect(page.locator('#kitResults .kit-source')).toHaveCount(0);
  await expect(page.locator('#kitResults')).toContainText('No indexed leads returned for this group.');
  await expect(page.locator('#kitStatus')).toContainText('0 indexed leads');
  await expect(page.locator('#kitStatus')).toContainText(mode === 'error' ? '10 unavailable sources' : '0 unavailable sources');
  const receipt = await copyReceipt(page);
  expect(receipt.references).toEqual([]);
  expect(receipt.candidates).toEqual([]);
  expect(receipt.coverage.failedSources).toBe(mode === 'error' ? 10 : 0);
 });
}
