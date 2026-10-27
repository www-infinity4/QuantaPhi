import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:390,height:844}});
test('StarMaker study identifies authentic login and independent actions with missing account-data gate',async({page})=>{
 await page.goto(base+'/quick-card-wiring.html',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('heading',{name:'Quick Card Wiring Study'})).toBeVisible();
 await expect(page.locator('#qwsCurrent')).toContainText('StarMaker');
 await expect(page.locator('#qwsSignin')).toHaveAttribute('href','https://www.starmakerstudios.com/en/web-login');
 await expect(page.locator('#qwsJSON')).toHaveValue(/"accountData": "not-connected"/);
 await expect(page.getByText('Signing in to the original page does not give QuantaPhi read rights over personal content.')).toBeVisible();
 await expect(page.locator('#qwsFrame')).toBeHidden();
 const over=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
 expect(over).toBe(false);
});
test('Unknown site never gains StarMaker login, and builder prefill requires explicit user publish',async({page})=>{
 await page.goto(base+'/quick-card-wiring.html?website=https%3A%2F%2Fexample.org%2F',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#qwsCurrent')).toContainText('Unregistered public website');
 await expect(page.locator('#qwsSignin')).toBeHidden();
 await expect(page.locator('#qwsJSON')).toHaveValue(/"providerLogin": null/);
 await page.locator('#qwsPublish').click();
 await expect(page).toHaveURL(/quick-card-builder.html/);
 await expect(page.locator('input[name="website"]')).toHaveValue('https://example.org/');
 await expect(page.locator('#qcpPublish')).toBeEnabled();
 await expect(page.locator('#qcpResult')).toBeEmpty();
});
