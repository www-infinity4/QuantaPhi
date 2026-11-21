import {test,expect} from '@playwright/test';
const BASE='http://127.0.0.1:8799';

test('wireless card stays readable and usable at Android widths',async({page})=>{
 for(const width of [320,360,393,720]){
  await page.setViewportSize({width,height:780});
  await page.goto(BASE+'/wireless/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#order-form')).toBeVisible();
  await expect(page.getByRole('button',{name:'Issue Build Order'})).toBeVisible();
  const overflows=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
  expect(overflows, 'No horizontal overflow at '+width+'px').toBeFalsy();
 }
});

test('wireless order fails closed when cloud API cannot verify a receipt',async({page})=>{
 await page.route('**/api/wireless/orders',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'Order storage unavailable'})}));
 await page.goto(BASE+'/wireless/',{waitUntil:'domcontentloaded'});
 await page.locator('input[name="city"]').fill('Oskaloosa');
 await page.locator('input[name="state"]').fill('IA');
 await page.locator('input[name="acceptedPlanningOnly"]').check();
 await page.getByRole('button',{name:'Issue Build Order'}).click();
 await expect(page.locator('#order-status')).toContainText('Request not confirmed');
 await expect(page.locator('#receipt')).toBeHidden();
});

test('verified API receipt renders planning status without fake activation',async({page})=>{
 await page.route('**/api/wireless/orders',route=>route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,id:'IW-1234567890ABCDEF1234',city:'Oskaloosa',state:'IA',phase:'request_recorded',events:[{kind:'request_received'}],serviceActive:false,coverageVerified:false})}));
 await page.goto(BASE+'/wireless/',{waitUntil:'domcontentloaded'});
 await page.locator('input[name="city"]').fill('Oskaloosa');
 await page.locator('input[name="state"]').fill('IA');
 await page.locator('input[name="acceptedPlanningOnly"]').check();
 await page.getByRole('button',{name:'Issue Build Order'}).click();
 await expect(page.locator('#receipt')).toContainText('Planning request recorded');
 await expect(page.locator('#receipt')).toContainText('No wireless service or tower was activated.');
 await expect(page.locator('#receipt')).not.toContainText('Your Internet is live');
});

test('homepage mixed Oracle deck includes image-first wireless controls',async({page})=>{
 await page.goto(BASE+'/',{waitUntil:'domcontentloaded'});
 const card=page.locator('#infinityWirelessCard');
 await expect(card).toHaveCount(1);
 await expect(card.locator('img.iw-cover')).toHaveAttribute('src','/wireless/switchboard.svg');
 await expect(card.locator('form#order-form')).toHaveCount(1);
 await expect(card.getByRole('button',{name:'Issue Build Order'})).toHaveCount(1);
 await expect(card.locator('iframe')).toHaveCount(0);
});
