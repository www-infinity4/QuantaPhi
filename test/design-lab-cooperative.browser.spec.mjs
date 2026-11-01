import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
for(const width of [320,393]){
 test('cooperative shopping intent is usable at '+width+'px with honest no-order status',async({page})=>{
  await page.setViewportSize({width,height:820});
  await page.goto(base+'/design-lab/index.html',{waitUntil:'domcontentloaded'});
  const form=page.locator('#cooperativeIntentForm');
  await expect(form).toBeVisible();
  await expect(page.locator('#cooperativePlan')).toContainText('$1000.00');
  await expect(page.locator('#cooperativePlan')).toContainText('up to 4 different merchants');
  await form.locator('[name="recipientInterests"]').fill('painting, nature');
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('#cooperativePlan')).toContainText('Research source-backed ideas');
  await page.locator('#cooperativeResearch').click();
  await expect(page.locator('#chainIntent')).toHaveValue(/shop gift ideas painting nature/);
  await expect(page.locator('#chainStatus')).toContainText('Ready to check');
  await expect(page.locator('#cooperativeStatus')).toContainText('does not order anything');
  await form.locator('[name="purpose"]').selectOption('monthly-supplies');
  await form.locator('[name="budget"]').fill('10000.00');
  await form.locator('[name="itemCount"]').fill('100');
  await form.locator('[name="maxMerchants"]').fill('100');
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('#cooperativePlan')).toContainText('$10000.00');
  await expect(page.locator('#cooperativePlan')).toContainText('up to 100 different merchants');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
  expect(overflow).toBe(false);
 });
}
