import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:393,height:844},isMobile:true,hasTouch:true});
for(const width of [320,360,393]){
 test('Innovations shows original source-backed Solar Paint card on Android '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  const root=page.locator('#innovationsCarousel'),slide=root.locator('.innovations-slide:not([hidden])');
  await expect(root.getByRole('heading',{name:"Innovations · Tomorrow's technology"})).toBeVisible();
  await expect(slide).toHaveCount(1);
  await expect(slide.locator('.innovations-title')).toHaveText('Solar Paint');
  await expect(slide.locator('.innovations-card-image')).toBeVisible();
  await expect(slide.locator('.innovations-source')).toHaveAttribute('href','https://8msolar.com/solar-paint-turning-any-surface-into-a-solar-panel/');
  await expect(slide.locator('.innovations-readiness')).toContainText('research');
  await expect(slide.getByText(/not a retail offer|not a retail product/i).first()).toBeVisible();
  expect(await slide.locator('.innovations-card-image').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
  await expect(slide.getByText('Buy Now')).toHaveCount(0);
  await slide.getByRole('button',{name:'Explore the idea'}).click();
  await expect(slide.locator('.innovations-details')).toBeVisible();
  await expect(slide.locator('.innovations-details')).toContainText('Reality check');
  await expect(slide.locator('.qca-controls [data-action="follow"]')).toBeVisible();
  await expect(slide.locator('.qca-controls [data-action="collect"]')).toBeVisible();
  await expect(slide.locator('.qca-controls [data-action="share"]')).toBeVisible();
  await expect(slide.locator('.qca-controls [data-action="build"]')).toBeVisible();
  await root.getByRole('button',{name:'Next innovation'}).click();
  await expect(slide.locator('.innovations-title')).toHaveText('Perovskite Solar Cells');
  await expect(root.locator('.innovations-slide:not([hidden])')).toHaveCount(1);
  await root.getByRole('button',{name:'Show Solar Windows'}).click();
  await expect(slide.locator('.innovations-title')).toHaveText('Solar Windows');
  await root.getByRole('button',{name:'Previous innovation'}).click();
  await expect(slide.locator('.innovations-title')).toHaveText('Perovskite Solar Cells');
  const rect=await root.evaluate(el=>({x:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,screen:innerWidth}));
  expect(rect.x).toBeGreaterThanOrEqual(-2);
  expect(rect.right).toBeLessThanOrEqual(rect.screen+2);
 });
}
test('related research uses existing QuantaPhi search rather than fabricated live AI',async({page})=>{
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 const field=page.locator('#q');
 await page.locator('#innovationsCarousel .innovations-slide:not([hidden])').getByRole('button',{name:'Research related ideas'}).click();
 await expect(field).toHaveValue(/solar paint photovoltaic coating/i);
 await expect(page.locator('#innovationsStatus')).toContainText('Review sources');
 await expect(page.locator('#innovationsStage .innovations-slide')).toHaveCount(4);
});