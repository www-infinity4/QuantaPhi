import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:393,height:844},isMobile:true,hasTouch:true});

for(const width of [320,360,393]){
 test('Developer uses one artwork-led working Quick Card at Android '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  const section=page.locator('#developerCarousel'),stage=section.locator('#developerCardStage');
  await expect(section.getByRole('heading',{name:/Developer · Build into the site/i})).toBeVisible();
  await expect(section.locator('.developer-card-choice')).toHaveCount(5);
  const visible=stage.locator('.developer-slide:not([hidden])');
  await expect(visible.locator('.developer-cover-image')).toBeVisible();
  await expect(visible.locator('.developer-editor')).toBeHidden();
  await expect(visible.locator('.developer-cover-title')).toHaveText('Media Star');
  await expect(visible.locator('.developer-studio-toggle')).toHaveAttribute('aria-expanded','false');
  await visible.getByRole('button',{name:/Create Media Star · in this card/}).click();
  await expect(stage.locator('#mediaStarCreator .ms-creator-card')).toBeVisible({timeout:20000});
  await section.getByRole('button',{name:'Next developer card'}).click();
  await expect(section.locator('#developerCardNow')).toHaveText('Quick Card');
  await expect(visible.locator('.developer-editor')).toBeHidden();
  const creator=stage.frameLocator('iframe[title="QuantaPhi original Quick Card publisher"]');
  await visible.getByRole('button',{name:/Build Quick Card · in this card/}).click();
  await expect(creator.locator('#quickCardCreate input[name="title"]')).toBeVisible({timeout:18000});
  await creator.locator('input[name="title"]').fill('Vintage Radio Creator');
  await section.getByRole('button',{name:'501 Affiliates'}).click();
  await expect(visible.locator('.developer-cover-title')).toHaveText('501 Affiliates');
  await visible.getByRole('button',{name:/Explore resources · in this card/}).click();
  await expect(stage.locator('#government501Affiliates input[type="search"]')).toBeVisible({timeout:12000});
  await section.getByRole('button',{name:'Infinity Brands'}).click();
  await visible.getByRole('button',{name:/Explore brands · in this card/}).click();
  await expect(stage.locator('#infinityAffiliates #iaBrandSearch')).toBeVisible({timeout:12000});
  await stage.locator('#iaBrandSearch').fill('Framework');
  await expect(stage.locator('.ia-brand-button',{hasText:'Framework Computers'})).toBeVisible();
  await section.getByRole('button',{name:'Code Phi · Create Phi'}).click();
  await visible.getByRole('button',{name:/Build with Phi · in this card/}).click();
  await expect(stage.locator('#phiProjectActions')).toBeVisible();
  await section.getByRole('button',{name:'Quick Card'}).click();
  await expect(creator.locator('input[name="title"]')).toHaveValue('Vintage Radio Creator');
  const bounds=await section.evaluate(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,width:innerWidth}));
  expect(bounds.left).toBeGreaterThanOrEqual(-1);
  expect(bounds.right).toBeLessThanOrEqual(bounds.width+1);
 });
}

test('Developer Quick Card publishes only through the real publisher request flow; fixture verifies safe unlisted result',async({page})=>{
 let attempts=0;
 await page.route('**/api/quick-cards',route=>{
  attempts+=1;
  return route.fulfill({status:201,contentType:'application/json',
   body:JSON.stringify({ok:true,cardUrl:base+'/cards/developer-fixture-12345',slug:'developer-fixture-12345'})});
 });
 await page.goto(base+'/?card=quickCardBuilderInline',{waitUntil:'domcontentloaded'});
 const stage=page.locator('#developerCardStage'),form=stage.frameLocator('iframe[title="QuantaPhi original Quick Card publisher"]').locator('#quickCardCreate');
 await expect(stage.locator('.developer-cover-image')).toBeVisible();
 await expect(stage.locator('.developer-slide:not([hidden]) .developer-studio-toggle')).toHaveAttribute('aria-expanded','true');
 await expect(form).toBeVisible({timeout:20000});
 await form.locator('[name="title"]').fill('Original Radio Workshop');
 await form.locator('[name="website"]').fill('https://example.org/radio');
 await form.locator('[name="description"]').fill('Original workshop with historical radio parts and verified sources.');
 await form.locator('[name="interactionRequest"]').fill('Search original repair parts and show official source links.');
 await stage.frameLocator('iframe[title="QuantaPhi original Quick Card publisher"]').locator('#qcpPublish').click();
 await expect(stage.frameLocator('iframe[title="QuantaPhi original Quick Card publisher"]').locator('#qcpResult')).toContainText('Card published');
 await expect(stage.frameLocator('iframe[title="QuantaPhi original Quick Card publisher"]').locator('#qcpResult')).toContainText('Placement in the homepage rotation requires review');
 expect(attempts).toBe(1);
});
