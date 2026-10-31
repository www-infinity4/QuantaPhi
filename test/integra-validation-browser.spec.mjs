import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:390,height:844}});
test('Integra card shows real designated Gmail but no fabricated account connection',async({page})=>{
 await page.goto(base+'/integra-validation.html',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('heading',{name:/Integra checks the wires/})).toBeVisible();
 await expect(page.locator('#ivMail')).toHaveText('quantaphi.integra.ai@gmail.com');
 await expect(page.locator('#ivMailStatus')).toContainText('not connected');
 await expect(page.locator('#ivSummary')).toContainText('evidence/connection checks remain open');
 await expect(page.locator('#ivJSON')).toHaveValue(/"connected": false/);
 await expect(page.getByRole('link',{name:/Open official Gmail sign-in/})).toHaveAttribute('href','https://mail.google.com/');
 await expect(page.getByRole('link',{name:/Bubbles account connections/})).toHaveAttribute('href','/bubbles-accounts.html');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
test('Unknown provider and supplied evidence never become connected or approved',async({page})=>{
 await page.goto(base+'/integra-validation.html',{waitUntil:'domcontentloaded'});
 await page.locator('#ivSource').fill('https://example.org/catalog');
 await page.locator('#ivEvidence').fill('https://github.com/example/project/pull/1');
 await page.locator('#ivNotes').fill('Claimed deployment without public proof');
 await page.getByRole('button',{name:'Run Integra review'}).click();
 await expect(page.locator('#ivSummary')).toContainText('Unmapped source');
 await expect(page.locator('#ivJSON')).toHaveValue(/"provider": null/);
 await expect(page.locator('#ivJSON')).toHaveValue(/"status": "needs-evidence"/);
 await expect(page.locator('#ivJSON')).toHaveValue(/"id": "deployment",[\s\S]*?"state": "needs-proof"/);
 await expect(page.locator('#ivOpen')).toHaveAttribute('href','https://example.org/catalog');
});
