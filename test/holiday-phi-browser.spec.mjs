import {test, expect} from '@playwright/test';
const base = 'http://127.0.0.1:8799';

async function openHoliday(page) {
  // Keep media providers isolated: this verifies QuantaPhi wiring, not provider uptime.
  await page.route('https://commons.wikimedia.org/wiki/Special:FilePath/**', route =>
    route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720"><rect width="960" height="720" fill="#d7c8ae"/></svg>'}));
  await page.route('https://archive.org/services/img/**', route =>
    route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720"><rect width="960" height="720" fill="#b2c6ae"/></svg>'}));
  await page.route('https://archive.org/embed/**', route =>
    route.fulfill({contentType:'text/html',body:'<!doctype html><title>Archive video fixture</title><p>Integration fixture only. Playback not verified.</p>'}));
  await page.goto(base+'/?card=holidayPhi', {waitUntil:'domcontentloaded'});
  await page.locator('#oracleCardInventory').click();
  const chooser=page.locator('#oracleCardChooser');
  await expect(chooser.locator('option[value="holidayPhi"]')).toHaveCount(1);
  await chooser.selectOption('holidayPhi');
  await expect(page.locator('#holidayPhi .holiday-card')).toBeVisible();
  return page.locator('#holidayPhi');
}

for (const width of [320,360,393,720]) {
  test('holiday studio is usable at '+width+'px with source images and tabs', async ({page}) => {
    await page.setViewportSize({width,height:800});
    const card = await openHoliday(page);
    await expect(card.getByRole('heading',{name:'Christmas & Thanksgiving'})).toBeVisible();
    await expect(card.locator('.holiday-image')).toHaveAttribute('src',/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//);
    await card.getByRole('button',{name:'Christmas',exact:true}).click();
    await expect(card.getByText('Classic films, festive art & seasonal creations')).toBeVisible();
    await expect(card.locator('.holiday-image')).toBeVisible();
    await card.locator('.holiday-feature').scrollIntoViewIfNeeded();
    await expect(card.locator('.holiday-feature')).toBeInViewport();
    const dimensions = await card.evaluate(element => ({
      right: element.getBoundingClientRect().right,
      viewport: document.documentElement.clientWidth,
      childOverflow: Array.from(element.querySelectorAll('*')).filter(child => {
        const r=child.getBoundingClientRect(), parent=element.getBoundingClientRect();
        return r.width>0 && (r.left<parent.left-2 || r.right>parent.right+2);
      }).map(child=>child.tagName.toLowerCase()+'.'+String(child.className||'').slice(0,50)).slice(0,8)
    }));
    expect(dimensions.right).toBeLessThanOrEqual(width+2);
    expect(dimensions.childOverflow).toEqual([]);
  });
}

test('Christmas video plays inside the card, collects to a local draft, then opens Code Phi with the real source', async ({page}) => {
  const card = await openHoliday(page);
  await card.getByRole('button',{name:'Christmas',exact:true}).click();
  await card.getByRole('button',{name:'Videos',exact:true}).click();
  await expect(card.locator('.holiday-feature h3')).toContainText('Christmas Comes But Once a Year');
  await card.getByRole('button',{name:'▶ Play here'}).click();
  await expect(card.locator('iframe[src^="https://archive.org/embed/"]')).toHaveCount(1);
  await card.getByRole('button',{name:'＋ Collect selection'}).click();
  await expect(card.locator('.holiday-status').first()).toContainText('Added source to your project.');
  await expect(card.locator('.holiday-build')).toContainText('1 collected items');
  await card.getByRole('button',{name:'Build website in Code Phi'}).click();
  await expect(page).toHaveURL(/\/omni-phi\/code\/\?q=/);
  const project=await page.evaluate(()=>JSON.parse(localStorage.getItem('omniPhi:codeSeed:v1')||'{}'));
  expect(project.sources?.some(x => x.sourceUrl==='https://archive.org/details/ChristmasComesButOnceAYear-1936')).toBe(true);
  expect(project.overview).toContain('device-local');
});

test('live image search adds original Commons links, no fabricated wallet reward', async ({page}) => {
  const card=await openHoliday(page);
  await page.route('https://commons.wikimedia.org/w/api.php**', route => route.fulfill({
    contentType:'application/json', headers:{'access-control-allow-origin':'*'},
    body: JSON.stringify({query:{pages:{99:{title:'File:Holiday table photo.jpg',
      imageinfo:[{mime:'image/jpeg',thumburl:'https://commons.wikimedia.org/wiki/Special:FilePath/Holiday_table_photo.jpg',
        descriptionurl:'https://commons.wikimedia.org/wiki/File:Holiday_table_photo.jpg',
        extmetadata:{LicenseShortName:{value:'CC BY 4.0'}}}]}}}})
  }));
  await card.getByRole('button',{name:'Search images'}).click();
  await expect(card.getByText('1 sourced results')).toBeVisible();
  await expect(card.locator('.holiday-feature h3')).toContainText('Holiday table photo');
  await card.getByRole('button',{name:'☆ Star'}).click();
  await expect(card.getByText('No wallet reward claimed.')).toBeVisible();
});
