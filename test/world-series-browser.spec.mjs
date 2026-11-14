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
test('retired Cardone cards do not render on the homepage',async({page})=>{
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#cardoneCapitalOffer,#churchOfIAmCard')).toHaveCount(0);
 await expect(page.locator('#walmartShoppingCard')).toHaveCount(1);
});
