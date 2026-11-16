import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
for(const width of [320,360,393]){
 test('Power Chain bulk allocation is usable at '+width+'px without phantom checkout',async({page})=>{
  await page.setViewportSize({width,height:820});
  await page.goto(base+'/design-lab/index.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#bulkAllocationStatus')).toContainText('300 units fully allocated');
  await expect(page.locator('.bulk-table tbody tr')).toHaveCount(5);
  await expect(page.locator('.bulk-table tbody tr').first()).toContainText('60');
  await page.locator('select[name="buyers"]').selectOption('10');
  await page.locator('#bulkAllocatorForm button').click();
  await expect(page.locator('#bulkAllocationStatus')).toContainText('10 proposed buyers');
  await expect(page.locator('.bulk-table tbody tr')).toHaveCount(10);
  await expect(page.locator('.bulk-table tbody tr').first()).toContainText('30');
  await expect(page.locator('#bulkAllocationResults')).toContainText('0 orders');
  // Changing the available quantity must not leave a fixed '60 each' promise in the buyer selector.
  await expect(page.locator('select[name="buyers"] option[value="5"]')).toHaveText('5 buyers');
  await expect(page.locator('select[name="buyers"] option[value="10"]')).toHaveText('10 buyers');
  await page.locator('input[name="quantity"]').fill('7');
  await page.locator('select[name="buyers"]').selectOption('5');
  await page.locator('#bulkAllocatorForm button').click();
  await expect(page.locator('#bulkAllocationStatus')).toContainText('7 units fully allocated');
  expect((await page.locator('.bulk-table tbody tr td:nth-child(2)').allTextContents()).map(x=>Number(x.trim()))).toEqual([2,2,1,1,1]);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
  expect(overflow).toBe(false);
 });
}
