import {test,expect} from '@playwright/test';
test.use({viewport:{width:393,height:852}});
test('Integra recommends the right business integration without claiming connection',async({page})=>{
 await page.goto('http://127.0.0.1:8799/source-quick-card.html?card=x',{waitUntil:'domcontentloaded'});
 const panel=page.locator('#sourceQuickCardDetail .qcx-integra-business');
 await expect(panel).toBeVisible();
 await panel.locator('summary').click();
 await expect(panel.getByText('This is a planning guide, not a connected business or Grok Bot account.',{exact:false})).toBeVisible();
 await expect(panel.getByText('Suggested tool:')).toBeVisible();
 await panel.getByLabel('Choose a business automation task').selectOption('crm');
 await expect(panel.getByText('HubSpot or Zoho official CRM API',{exact:false})).toBeVisible();
 await expect(panel.getByText('contact consent',{exact:false})).toBeVisible();
 await panel.getByLabel('Choose a business automation task').selectOption('browser');
 await expect(panel.getByText('TinyFish browser only as exception',{exact:false})).toBeVisible();
 await expect(panel.getByText('No data collected and no external action performed.',{exact:false})).toBeVisible();
 const right=await panel.evaluate(el=>el.getBoundingClientRect().right);
 expect(right).toBeLessThanOrEqual(394);
 await expect(page.locator('#sourceQuickCardDetail .qca-x-composer textarea')).toBeVisible();
});
