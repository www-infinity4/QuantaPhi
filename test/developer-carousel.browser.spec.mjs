import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:393,height:844},isMobile:true,hasTouch:true});

for(const width of [320,360,393]){
 test('Developer creator cards remain usable at Android '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.goto(base+'/?card=mediaStarCreator',{waitUntil:'domcontentloaded'});
  const section=page.locator('#developerCarousel'),stage=section.locator('#developerCardStage');
  await expect(section.getByRole('heading',{name:/Developer · Build into the site/i})).toBeVisible();
  await expect(stage.locator('#mediaStarCreator .ms-creator-card')).toBeVisible({timeout:20000});
  await expect(section.locator('.developer-card-choice')).toHaveCount(5);
  await section.getByRole('button',{name:'Next developer card'}).click();
  await expect(section.locator('#developerCardNow')).toHaveText('Quick Card');
  const creator=stage.frameLocator('iframe[title="QuantaPhi original Quick Card publisher"]');
  await expect(creator.locator('#quickCardCreate input[name="title"]')).toBeVisible({timeout:12000});
  await creator.locator('input[name="title"]').fill('Vintage Radio Creator');
  await section.getByRole('button',{name:'501 Affiliates'}).click();
  await expect(stage.locator('#government501Affiliates .gov501-card')).toBeVisible({timeout:12000}).catch(async()=>{
   await expect(stage.locator('#government501Affiliates input[type="search"]')).toBeVisible();
  });
  await section.getByRole('button',{name:'Infinity Brands'}).click();
  await expect(stage.locator('#infinityAffiliates #iaBrandSearch')).toBeVisible({timeout:12000});
  await stage.locator('#iaBrandSearch').fill('Framework');
  await expect(stage.locator('.ia-brand-button',{hasText:'Framework Computers'})).toBeVisible();
  await section.getByRole('button',{name:'Code Phi / Create Phi'}).click();
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
 const stage=page.locator('#developerCardStage'),form=stage.frameLocator('iframe').locator('#quickCardCreate');
 await expect(form).toBeVisible({timeout:20000});
 await form.locator('[name="title"]').fill('Original Radio Workshop');
 await form.locator('[name="website"]').fill('https://example.org/radio');
 await form.locator('[name="description"]').fill('Original workshop with historical radio parts and verified sources.');
 await form.locator('[name="interactionRequest"]').fill('Search original repair parts and show official source links.');
 await stage.frameLocator('iframe').locator('#qcpPublish').click();
 await expect(stage.frameLocator('iframe').locator('#qcpResult')).toContainText('Card published');
 await expect(stage.frameLocator('iframe').locator('#qcpResult')).toContainText('Placement in the homepage rotation requires review');
 expect(attempts).toBe(1);
});
