import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:390,height:844}});
const fill=async(page,mode='interactive')=>{
 await page.goto(base+'/quick-card-builder.html',{waitUntil:'domcontentloaded'});
 await page.locator('input[name="title"]').fill('Vintage Radio Shop');
 await page.locator('input[name="website"]').fill('https://example.org/shop');
 await page.locator('textarea[name="description"]').fill('A complete original website for vintage radio products and spare parts.');
 await page.locator('textarea[name="interactionRequest"]').fill('Let the user choose an original vintage radio product and view its source.');
 await page.locator('#qcpPreviewMode').selectOption(mode);
 await page.route('**/api/quick-cards',route=>route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,cardUrl:'http://127.0.0.1:8799/cards/vintage-radio-shop-12345',slug:'vintage-radio-shop-12345'})}));
 await page.locator('#qcpPublish').click();
 await expect(page.locator('#qcpPreviewPublished')).toBeVisible();
};
test('default is original interactive Quick Card inside an accessible portrait popup',async({page})=>{
 await fill(page);
 await expect(page.locator('#qcpPreviewMode')).toHaveValue('interactive');
 await page.locator('#qcpPreviewPublished').click();
 const dialog=page.locator('.qpr-dialog');
 await expect(dialog).toBeVisible();
 await expect(dialog.locator('h2')).toContainText('Vintage Radio Shop');
 await expect(dialog.locator('iframe.qpr-frame')).toHaveAttribute('src',/\/cards\/vintage-radio-shop-12345\?preview=1/);
 await expect(dialog.getByText('Open full interactive card')).toHaveAttribute('href','http://127.0.0.1:8799/cards/vintage-radio-shop-12345');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await dialog.locator('.qpr-close').click();
 await expect(dialog).not.toBeVisible();
});
test('visual-first option uses user supplied raster and real action buttons, not fake site functionality',async({page})=>{
 await fill(page,'visual');
 await page.locator('#qcpPreviewPublished').click();
 const dialog=page.locator('.qpr-dialog');
 await expect(dialog).toBeVisible();
 await expect(dialog.locator('iframe')).toHaveCount(0);
 await expect(dialog.getByText('Open full interactive card')).toBeVisible();
 await expect(dialog.getByText('Official website')).toHaveAttribute('href','https://example.org/shop');
});
