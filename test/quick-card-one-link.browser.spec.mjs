import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:393,height:844},isMobile:true,hasTouch:true});
test('one website address sends safe draft through original moderated publisher',async({page})=>{
 let body=null,requests=0;
 await page.route('**/api/quick-cards',route=>{
   requests++;
   body=JSON.parse(route.request().postData());
   return route.fulfill({status:201,contentType:'application/json',
    body:JSON.stringify({ok:true,cardUrl:base+'/cards/bubbleyum-test-12345',status:'unlisted'})});
 });
 await page.goto(base+'/quick-card-builder.html');
 await expect(page.locator('details.qcp-advanced')).not.toHaveAttribute('open','');
 await page.locator('[name="website"]').fill('www.bubbleyum.com');
 await page.locator('#qcpPublish').click();
 await expect(page.locator('#qcpResult')).toContainText('Card published');
 expect(requests).toBe(1);
 expect(body.website).toBe('https://www.bubbleyum.com/');
 expect(body.title).toMatch(/Bubbleyum/);
 expect(body.kind).toBe('visit');
 expect(body.description.length).toBeGreaterThan(12);
 expect(body.image).toBe('');
});
test('insecure or local URL gives explicit failure without publishing',async({page})=>{
 let attempts=0;
 await page.route('**/api/quick-cards',route=>{attempts++;return route.abort();});
 await page.goto(base+'/quick-card-builder.html');
 await page.locator('[name="website"]').fill('http://127.0.0.1');
 await page.locator('#qcpPublish').click();
 await expect(page.locator('#qcpResult')).toContainText('valid public HTTPS website');
 expect(attempts).toBe(0);
 await expect(page.locator('#qcpPublish')).toBeEnabled();
});