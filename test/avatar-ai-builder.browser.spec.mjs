import {test, expect} from '@playwright/test';

const base = 'http://127.0.0.1:8799';
const storageKey = 'quantaphi.avatar-builder.design.v1';

test.beforeEach(async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/*', route => {
    if (route.request().url().startsWith(base)) return route.continue();
    return route.fulfill({status:401, contentType:'application/json', body:'{"ok":false,"error":"test_account_disconnected"}'});
  });
});

async function seek(builder, value) {
  await builder.getByRole('slider', {name:'Replay position'}).evaluate((input, position) => {
    input.value = String(position);
    input.dispatchEvent(new Event('input', {bubbles:true}));
  }, value);
}

for (const width of [320, 360, 393, 1024]) {
  test('builder playback and layout choices on the real Bubbles page at ' + width + 'px', async ({page}, testInfo) => {
    await page.setViewportSize({width, height:850});
    const errors = [];
    page.on('pageerror', error => { if (String(error.stack).includes('avatar-ai-builder')) errors.push(error.message); });
    await page.goto(base + '/bubbles.html#avatarBuilder');
    const builder = page.locator('#avatarBuilder');
    await expect(builder).toBeVisible();
    await expect(builder.getByText('Demo replay', {exact:true})).toBeVisible();
    await expect(builder.locator('.av-scene')).toHaveCSS('background-color','rgb(255, 255, 255)');
    await expect(builder.locator('.av-part:visible')).toHaveCount(0);
    await expect(builder.locator('[data-worker]:visible')).toHaveCount(0);
    await page.locator('.bubbles-nav-more summary').click();
    const builderLink = page.locator('.bubbles-nav-menu a[href="#avatarBuilder"]');
    await expect(builderLink).toBeVisible();
    const navBox = await builderLink.boundingBox();
    expect(navBox.x).toBeGreaterThanOrEqual(0);
    expect(navBox.x + navBox.width).toBeLessThanOrEqual(width);
    await builderLink.click();
    await page.locator('.bubbles-nav-more summary').click();

    await seek(builder, 11);
    await expect(builder.locator('[data-worker]:visible')).toHaveCount(8);
    await expect(builder.getByLabel('Separate search preview window')).toBeVisible();
    await expect(builder.locator('.av-scene')).toHaveAttribute('data-search','left');
    await seek(builder, 15);
    await expect(builder.locator('.av-scene')).toHaveAttribute('data-search','wide');
    await seek(builder, 19);
    await expect(builder.locator('.av-scene')).toHaveAttribute('data-carousel','upper');
    await builder.getByRole('button',{name:'Latest', exact:true}).click();
    await expect(builder.locator('[data-pin]:visible')).toHaveCount(4);

    const left = builder.getByRole('button',{name:'Preview left-aligned search', exact:true});
    await left.click();
    await expect(builder.locator('.av-scene')).toHaveAttribute('data-search','left');
    await builder.getByRole('button',{name:'Close layout preview'}).click();
    await expect(builder.locator('.av-scene')).toHaveAttribute('data-search','center');
    await left.click();
    await builder.getByRole('button',{name:'Update design',exact:true}).click();
    await expect(builder.getByRole('status')).toContainText('Saved on this device');
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey)).toEqual({search:'left'});
    await seek(builder,15);
    await expect(builder.locator('.av-scene')).toHaveAttribute('data-search','wide');
    await builder.getByRole('button',{name:'Latest',exact:true}).click();
    await expect(builder.locator('.av-scene')).toHaveAttribute('data-search','left');

    await page.reload();
    await builder.getByRole('button',{name:'Latest',exact:true}).click();
    await expect(builder.locator('.av-scene')).toHaveAttribute('data-search','left');
    await left.click();
    await builder.getByRole('button',{name:'Restore design',exact:true}).click();
    await expect(builder.locator('.av-scene')).toHaveAttribute('data-search','center');

    await builder.getByRole('button',{name:'Preview carousel above search'}).click();
    await builder.getByRole('button',{name:'Update design',exact:true}).click();
    const searchBox = await builder.locator('.av-search-row').boundingBox();
    const carouselBox = await builder.locator('.av-carousel').boundingBox();
    expect(carouselBox.y).toBeLessThan(searchBox.y);
    await builder.getByRole('button',{name:'Preview carousel above search'}).click();
    await builder.getByRole('button',{name:'Restore design',exact:true}).click();

    await builder.getByRole('button',{name:'Show bots on the page'}).click();
    await expect(builder.locator('[data-worker]:visible')).toHaveCount(0);
    await builder.getByRole('button',{name:'Show bots on the page'}).click();
    await expect(builder.locator('[data-worker]:visible')).toHaveCount(8);

    for (const control of await builder.locator('button:visible,select:visible').all()) {
      const box = await control.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    expect(await builder.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(errors).toEqual([]);
    if (width === 360 || width === 1024) {
      await builder.screenshot({path:testInfo.outputPath('avatar-builder-' + width + '.png')});
    }

    await builder.getByRole('button',{name:'Reverse',exact:true}).click();
    await expect.poll(async () => Number(await builder.getByRole('slider').inputValue())).toBeLessThan(26);
    await builder.getByRole('button',{name:'Pause',exact:true}).click();
    await builder.getByRole('button',{name:'Latest',exact:true}).click();
    await builder.getByRole('button',{name:'Replay',exact:true}).click();
    await expect.poll(async () => Number(await builder.getByRole('slider').inputValue())).toBeGreaterThan(0);
  });
}

test('saved layouts stay usable when device storage is unavailable', async ({page}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {throw Error('storage disabled');};
    Storage.prototype.setItem = () => {throw Error('storage disabled');};
  });
  await page.goto(base + '/bubbles.html#avatarBuilder');
  const builder = page.locator('#avatarBuilder');
  await builder.getByRole('button',{name:'Latest',exact:true}).click();
  await builder.getByRole('button',{name:'Preview full-width search'}).click();
  await builder.getByRole('button',{name:'Update design',exact:true}).click();
  await expect(builder.locator('.av-scene')).toHaveAttribute('data-search','wide');
  await expect(builder.getByRole('status')).toContainText('Applied for this visit');
});

test('Improve with Bubbles prepares the actual existing editor and preserves an unsent draft', async ({page}) => {
  await page.goto(base + '/bubbles.html#avatarBuilder');
  await expect.poll(() => page.evaluate(() => typeof window.QuantaBubbles?.prepareWorkDraft)).toBe('function');
  const builder = page.locator('#avatarBuilder');
  await builder.locator('summary').click();
  await builder.getByLabel('Next change').fill('Let me try a larger header');
  await builder.getByRole('button',{name:'Prepare Bubbles request'}).click();
  const editor = page.getByRole('textbox',{name:'Work request for Robot Brain',exact:true});
  await expect(editor).toHaveValue(/Let me try a larger header/);
  await expect(editor).toBeVisible();
  await editor.fill('My unsent work');
  await page.evaluate(() => window.QuantaBubbles.close());
  await builder.getByRole('button',{name:'Prepare Bubbles request'}).click();
  await expect(builder.getByRole('status')).toContainText('existing Bubbles work draft');
  await expect(editor).toHaveValue('My unsent work');
});

test('the orb embed keeps the full builder hidden', async ({page}) => {
  await page.goto(base + '/bubbles.html?embed=1');
  await expect(page.locator('#avatarBuilder')).toBeHidden();
  await expect(page.locator('#avatarBuilder .av-part[data-shown="true"]')).toHaveCount(0);
});
