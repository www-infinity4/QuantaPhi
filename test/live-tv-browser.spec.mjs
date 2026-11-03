import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:360,height:800},reducedMotion:'reduce'});
async function prepare(page){
 await page.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Video player fixture</title><p>This fixture does not establish live playback.</p>'}));
 await page.route('https://i.ytimg.com/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#123"/></svg>'}));
 await page.route('https://webpubcontent.gray.tv/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#123"/></svg>'}));
}
test('KYOU opens as one 16:9 image-ready watch screen, never a station website iframe',async({page})=>{
 await prepare(page);await page.goto(base+'/?card=kyou',{waitUntil:'domcontentloaded'});
 const station=page.locator('#liveFoxGameCard'),screen=station.locator('.ltv-poster');
 await expect(screen).toBeVisible();
 await expect(station.locator('iframe,video,.ltv-score,.ltv-station-window')).toHaveCount(0);
 await expect(screen).toHaveAttribute('href',/^https:\/\/www\.kyoutv\.com\/livestream\/\?utm_source=quantaphi/);
 await expect(station.locator('.ltv-poster-image')).toHaveAttribute('loading','eager');
 const ratio=await screen.evaluate(n=>n.getBoundingClientRect().width/n.getBoundingClientRect().height);
 expect(ratio).toBeGreaterThan(1.65);expect(ratio).toBeLessThan(1.9);
 await expect(page.locator('#oracleCardLive')).toHaveCount(0);
 await expect(page.locator('#oracleCardChooser optgroup[label="Live game · pinned first"]')).toHaveCount(0);
});
test('FOX news shows poster first and swaps only that screen for the actual video player',async({page})=>{
 await prepare(page);await page.goto(base+'/?card=fox-live-news',{waitUntil:'domcontentloaded'});
 const root=page.locator('#liveFoxNewsCard'),screen=root.locator('.ltv-screen');
 await expect(root.locator('.ltv-poster')).toBeVisible();
 await expect(root.locator('iframe')).toHaveCount(0);
 await root.getByRole('button',{name:'Play LiveNOW from FOX news video'}).click();
 const frame=screen.locator('iframe');await expect(frame).toHaveCount(1);
 const src=new URL(await frame.getAttribute('src'));
 expect(src.origin).toBe('https://www.youtube-nocookie.com');
 expect(src.pathname).toBe('/embed/live_stream');
 expect(src.searchParams.get('controls')).toBe('1');
 await page.locator('#oracleCardInventory').click();
 await page.locator('#oracleCardChooser').selectOption('liveFoxGameCard');
 await expect(root.locator('iframe')).toHaveCount(0);
 await expect(root.locator('.ltv-poster')).toBeVisible();
});
test('the KYOU TV wall has immediate publisher art and only plays actual in-card video for supported channels',async({page})=>{
 await prepare(page);await page.goto(base+'/infinity-tv/kyou.html',{waitUntil:'domcontentloaded'});
 const wall=page.locator('#phiChannelCards'),kyou=wall.locator('.channelphi-kyou');
 await expect(kyou.locator('.channelphi-screen')).toBeVisible();
 await expect(kyou.locator('.channelphi-art')).toHaveAttribute('loading','eager');
 await expect(kyou.locator('iframe,video')).toHaveCount(0);
 const star=wall.locator('.channelphi-starquest');
 await star.getByRole('button',{name:'Watch StarQuest video in this card'}).click();
 await expect(star.locator('iframe')).toHaveCount(1);
 expect(await star.locator('iframe').getAttribute('src')).toContain('youtube-nocookie.com/embed/');
 await expect(kyou.locator('iframe,video')).toHaveCount(0);
});
test('the separate FOX viewer never frames entire FOX website or shows an old game score',async({page})=>{
 await prepare(page);await page.goto(base+'/infinity-tv/fox.html',{waitUntil:'domcontentloaded'});
 const root=page.locator('#foxInfinityViewer');
 await expect(root.locator('.fit-fox-poster')).toBeVisible();
 await expect(root.locator('iframe,.fit-match')).toHaveCount(0);
 await root.getByRole('button',{name:'Play LiveNOW from FOX video'}).click();
 const player=root.locator('iframe');await expect(player).toHaveCount(1);
 expect(await player.getAttribute('src')).toContain('youtube-nocookie.com/embed/live_stream');
});
