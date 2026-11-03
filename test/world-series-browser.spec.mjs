import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:390,height:844}});
test('retired World Series report cards do not load on the homepage',async({page})=>{
 await page.goto(base+'/?card=mlb',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#googleTrendMlb')).toBeVisible();
 await expect(page.locator('#googleTrendMlb .ws-news')).toHaveCount(0);
 await expect(page.locator('#worldSeriesUpdateToast')).toHaveCount(0);
 await expect(page.locator('#oracleCardLive')).toHaveCount(0);
});
test('Cardone standalone property retains original media and Bubbles specialist',async({page})=>{
 await page.goto(base+'/cardone-capital.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#cardoneQuickActions .qca-toolbar')).toBeVisible({timeout:20000});
 const actions=page.locator('#cardoneQuickActions');
 for(const part of ['Star','Collect','Share','+1 Build'])
  await expect(actions.getByText(part,{exact:false}).first()).toBeVisible();
 await expect(page.getByRole('link',{name:/Explore the official property/})).toHaveAttribute('href',/cardonecapital\.com\/westshoresouth/);
 await expect(page.locator('script[data-bubble-role="specialist"]')).toHaveAttribute('src',/bubbles-embed\.js/);
});
