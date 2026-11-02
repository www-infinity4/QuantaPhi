import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8891';
const root='#zeusDiscoveryCarousel';
for(const width of [320,360,393,430,720]){
 test('Zeus second carousel fits '+width+'px without horizontal page overflow',async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.goto(base+'/test/fixtures/zeus-discovery.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator(root)).toBeVisible();
  await expect(page.locator('#zeusDiscoverStage .zdc-slide')).toHaveCount(10);
  const metrics=await page.evaluate(()=>({window:innerWidth,doc:document.documentElement.scrollWidth,root:document.getElementById('zeusDiscoveryCarousel').getBoundingClientRect().width}));
  expect(metrics.doc,JSON.stringify(metrics)).toBeLessThanOrEqual(width+1);
  await page.getByRole('button',{name:'Next Zeus discovery card'}).click();
  await expect(page.locator('#zeusDiscoverStatus')).toContainText('2 of 10');
  await page.getByRole('button',{name:'Previous Zeus discovery card'}).click();
  await expect(page.locator('#zeusDiscoverStatus')).toContainText('1 of 10');
 });
}
test('creator tab only offers real external destinations, not fake in-page GPT answers',async({page})=>{
 await page.goto(base+'/test/fixtures/zeus-discovery.html',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Creator GPTs & plugins'}).click();
 await expect(page.locator('#zeusDiscoverStage .zdc-slide')).toHaveCount(6);
 const links=await page.locator('#zeusDiscoverStage .zdc-cta').evaluateAll(items=>items.map(a=>({url:a.href,rel:a.rel,target:a.target})));
 expect(links.length).toBe(6);
 for(const item of links){
  expect(item.url.startsWith('https://chatgpt.com/')).toBe(true);
  expect(item.target).toBe('_blank');
  expect(item.rel).toContain('noopener');
 }
});
test('reduced motion starts paused, selection and keyboard do not navigate page away',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(base+'/test/fixtures/zeus-discovery.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#zeusDiscoverPlay')).toHaveText('Watch');
 await page.locator('#zeusDiscoverStage').focus();
 await page.keyboard.press('ArrowRight');
 await expect(page.locator('#zeusDiscoverStatus')).toContainText('2 of 10');
 await page.getByRole('button',{name:'Infinity editions'}).click();
 await expect(page.locator('#zeusDiscoverStage .zdc-slide')).toHaveCount(4);
});

test('tab changes reset the visible slide to the first card, not a stale scroll offset',async({page})=>{
 await page.goto(base+'/test/fixtures/zeus-discovery.html',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Next Zeus discovery card'}).click();
 await expect(page.locator('#zeusDiscoverStatus')).toContainText('2 of 10');
 await page.getByRole('button',{name:'Creator GPTs & plugins'}).click();
 await expect(page.locator('#zeusDiscoverStatus')).toContainText('1 of 6');
 const offset=await page.locator('#zeusDiscoverStage').evaluate(el=>el.scrollLeft);
 expect(offset).toBe(0);
});
test('keyboard focus on a creator CTA pauses automatic rotation',async({page})=>{
 await page.goto(base+'/test/fixtures/zeus-discovery.html',{waitUntil:'domcontentloaded'});
 await page.locator('#zeusDiscoverStage .zdc-cta').first().focus();
 await expect(page.locator('#zeusDiscoverPlay')).toHaveText('Watch');
 await expect(page.locator('#zeusDiscoverPlay')).toHaveAttribute('aria-pressed','false');
});
