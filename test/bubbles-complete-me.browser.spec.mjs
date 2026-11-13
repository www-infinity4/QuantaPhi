import {test, expect} from '@playwright/test';

const base = 'http://127.0.0.1:8799';
const repository = 'www-infinity4/QuantaPhi';
const command = 'Complete Me AI — Synthetic project for browser verification';
test.use({viewport: {width: 360, height: 800}, isMobile: true, hasTouch: true, serviceWorkers: 'block'});

async function openComposer(page) {
  await page.goto(base + '/bubbles.html', {waitUntil: 'domcontentloaded'});
  const composer = page.getByRole('textbox', {name: 'Message Bubbles', exact: true});
  if (!await composer.isVisible()) await page.locator('.ba-launcher').tap();
  await composer.fill(command);
  await page.locator('.ba-send').tap();
  return composer;
}

test('a visitor cannot open the private card or transmit its project brief', async ({page}) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/robot-brain-owner.js') return route.fulfill({contentType: 'application/javascript', body: `window.QuantaBrainOwner={ready:Promise.resolve(null),currentHeaders:()=>null}`});
    return url.origin === base ? route.continue() : route.abort();
  });
  const outbound = [];
  page.on('request', request => {if (request.postData()?.includes('Synthetic project')) outbound.push(request.url());});
  const composer = await openComposer(page);
  await expect(page.locator('.ba-panel')).toContainText('Verify your owner Unified Wallet');
  await expect(composer).toHaveValue(command);
  await expect(page.getByRole('region', {name: 'Complete Me AI'})).toHaveCount(0);
  expect(outbound).toEqual([]);
});

test('the owner reviews the scope, starts one project, and sees its recorded dependency', async ({page}) => {
  const calls = [];
  const auth = 'Bearer synthetic-browser-fixture';
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/robot-brain-owner.js') {
      const body = `const fixture={Authorization:${JSON.stringify(auth)}};window.QuantaBrainOwner={ready:Promise.resolve(fixture),currentHeaders:()=>fixture};`;
      return route.fulfill({contentType: 'application/javascript', body});
    }
    if (url.origin === base) return route.continue();
    if (url.hostname !== 'infinity-brain-clock.marvaseater.workers.dev') return route.abort();
    const headers = {'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS'};
    if (route.request().method() === 'OPTIONS') return route.fulfill({status: 204, headers});
    if (url.pathname === '/work/github/read') {
      calls.push(url.pathname);
      return route.fulfill({headers, json: {ok: true, repository, headSha: 'a'.repeat(40)}});
    }
    if (url.pathname === '/work/tickets/create') {
      expect(route.request().headers().authorization).toBe(auth);
      calls.push(url.pathname);
      const payload = route.request().postDataJSON();
      expect(payload.context.color_jobs.map(job => job.dependencies)).toEqual([[], ['TASK-1']]);
      const context = {...payload.context, color_jobs: payload.context.color_jobs.map(job => ({...job, status: 'queued'}))};
      return route.fulfill({headers, json: {ok: true, ticket: {id: 'IW-20261113-ABCD1234', repository, context}, execution: {status: 'queued_for_runner'}}});
    }
    return route.fulfill({headers, json: {ok: true, tickets: []}});
  });
  const composer = await openComposer(page);
  const card = page.getByRole('region', {name: 'Complete Me AI'});
  await expect(card).toBeVisible();
  await expect(composer).toHaveValue('');
  await expect(card.getByLabel('Project goal')).toHaveValue('Synthetic project for browser verification');
  expect(calls).toEqual([]);
  await card.getByLabel('Repository').fill(repository);
  await card.getByLabel('Existing issue number').fill('1927');
  await card.getByLabel('First job').fill('Check the first source change');
  await card.getByLabel('Dependent job').fill('Check the dependent integration');
  await card.getByLabel('What must pass').fill('Run the focused regressions');
  const start = card.getByRole('button', {name: 'Start project'});
  expect((await start.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await start.tap();
  await expect(card).toContainText('Waiting for a signed claim');
  await expect(card).toContainText('Waiting for prerequisite jobs and their review');
  expect(calls).toEqual(['/work/github/read', '/work/tickets/create']);
  await page.evaluate(() => window.dispatchEvent(new Event('bubbles:owner-lost')));
  await expect(card).toHaveCount(0);
});
