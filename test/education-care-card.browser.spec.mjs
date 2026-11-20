import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
const mock='<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720"><rect width="960" height="720" fill="#e9e5f0"/></svg>';

for(const width of [320,360])test('school, daycare and babysitter photos rotate in the original Oracle card at '+width+'px',async({page})=>{
 await page.setViewportSize({width,height:800});
 await page.route('https://commons.wikimedia.org/wiki/Special:FilePath/**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:mock}));
 await page.goto(base+'/?card=educationCareQuickCard',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage #educationCareQuickCard');
 await expect(card).toBeVisible({timeout:20000});
 await expect(card.getByRole('heading',{name:'Schools, daycare & babysitting'})).toBeVisible();
 await expect(card.locator('.ec-counter')).toHaveText('1 of 4');
 await expect(card.locator('.ec-photo')).toHaveAttribute('src',/commons\.wikimedia\.org\/wiki\/Special:FilePath/);
 await expect(card.getByRole('link',{name:/Photo by/})).toHaveAttribute('href',/commons\.wikimedia\.org\/wiki\/File:/);
 await card.getByRole('button',{name:'Next photo'}).click();
 await expect(card.locator('.ec-counter')).toHaveText('2 of 4');
 await card.locator('#ecPhotoCategory').selectOption('daycare');
 await expect(card.locator('.ec-counter')).toHaveText('1 of 2');
 await card.getByRole('button',{name:'Next photo'}).click();
 await expect(card.locator('.ec-counter')).toHaveText('2 of 2');
 await card.locator('#ecPhotoCategory').selectOption('babysitting');
 await expect(card.locator('.ec-counter')).toHaveText('1 of 1');
 await expect(card.getByRole('button',{name:'Next photo'})).toBeDisabled();
 // Inspect the new widget, not unrelated legacy homepage modules: the
 // existing homepage may be wider than 320px even when this card fits.
 const metrics=await card.evaluate(el=>{
  const rect=el.getBoundingClientRect();
  const overflow=[...el.querySelectorAll('*')].filter(node=>{
   const child=node.getBoundingClientRect();
   return child.width>0&&(child.right>rect.right+1||child.left<rect.left-1);
  }).map(node=>node.tagName.toLowerCase()+'.'+String(node.className||''));
  return {
   width:rect.width,right:rect.right,left:rect.left,
   next:el.querySelector('.ec-button').getBoundingClientRect().height,
   viewport:innerWidth,
   overflow
  };
 });
 expect(metrics.width).toBeLessThanOrEqual(metrics.viewport);
 expect(metrics.left).toBeGreaterThanOrEqual(-1);
 expect(metrics.right).toBeLessThanOrEqual(metrics.viewport+1);
 expect(metrics.overflow).toEqual([]);
 expect(metrics.next).toBeGreaterThanOrEqual(48);
 await expect(card.getByText('These are visual examples, not verified local providers or child-care recommendations.',{exact:false})).toBeVisible();
});
