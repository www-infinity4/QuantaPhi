import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({isMobile:true,hasTouch:true});
const snippet='<div id="pi-demo">π music</div><script>document.getElementById("pi-demo").textContent="Pi Singer works"</script>';

for(const width of [320,360,393]){
 test('GPT HTML source previews safely in Android '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:820});
  await page.goto(base+'/gpt-html-implant.html',{waitUntil:'domcontentloaded'});
  await page.locator('#gptCode').fill(snippet);
  await page.locator('#gptPreview').click();
  const frame=page.locator('#gptPreviewFrame');
  await expect(frame).toBeVisible();
  await expect(frame).toHaveAttribute('sandbox','allow-scripts');
  await expect(page.frameLocator('#gptPreviewFrame').locator('#pi-demo')).toHaveText('Pi Singer works');
  await expect(page.locator('#gptStatus')).toContainText('isolated preview ready');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 });
}
test('paid GPT-built app handoff prefills existing real moderated publisher without charging',async({page})=>{
 await page.setViewportSize({width:360,height:820});
 await page.goto(base+'/gpt-html-implant.html',{waitUntil:'domcontentloaded'});
 await page.locator('#gptTitle').fill('Pioneer Music Studio');
 await page.locator('#gptWebsite').fill('https://example.org/studio.html');
 await page.locator('#gptMonetization').selectOption('paid');
 await page.locator('#gptPrice').fill('25');
 await page.locator('#gptPrepare').click();
 await expect(page).toHaveURL(/\/quick-card-builder\.html\?/);
 await expect(page.locator('input[name="title"]')).toHaveValue('Pioneer Music Studio');
 await expect(page.locator('input[name="website"]')).toHaveValue('https://example.org/studio.html');
 await expect(page.locator('#qcpMonetization')).toHaveValue('paid');
 await expect(page.locator('#qcpPriceStarCoins')).toHaveValue('25');
 let posts=0;
 await page.route('**/api/quick-cards/health',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,pricingDraftVersion:1,paidCheckoutReady:false})}));
 await page.route('**/api/quick-cards',route=>{if(route.request().method==='POST')posts++;return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,pricingMode:'paid',cardUrl:base+'/cards/pioneer-studio-12345'})})});
 await page.locator('#qcpPublish').click();
 await expect(page.locator('#qcpResult')).toContainText('locked preview');
 expect(posts).toBe(1);
});
test('old publisher cannot silently create free card when paid was requested',async({page})=>{
 await page.goto(base+'/quick-card-builder.html');
 await page.locator('input[name="title"]').fill('Paid GPT App');
 await page.locator('input[name="website"]').fill('https://example.org/app');
 await page.locator('textarea[name="description"]').fill('A complete original interactive application for curious visitors.');
 await page.locator('textarea[name="interactionRequest"]').fill('Launch the creator application after an approved paid access request.');
 await page.locator('#qcpMonetization').selectOption('paid');
 let posts=0;
 await page.route('**/api/quick-cards/health',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})}));
 await page.route('**/api/quick-cards',route=>{posts++;return route.abort()});
 await page.locator('#qcpPublish').click();
 await expect(page.locator('#qcpResult')).toContainText('paid-card draft publisher is not active');
 expect(posts).toBe(0);
});
