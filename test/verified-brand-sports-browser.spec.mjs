import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:360,height:800}});
async function images(page){
 const image='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#1e6188"/></svg>';
 await page.route('https://www.google.com/s2/favicons**',r=>r.fulfill({contentType:'image/svg+xml',body:image}));
 await page.route('https://a.espncdn.com/i/teamlogos/nfl/**',r=>r.fulfill({contentType:'image/svg+xml',body:image}));
 await page.route('https://www.mlbstatic.com/team-logos/**',r=>r.fulfill({contentType:'image/svg+xml',body:image}));
}
test('NFL game shows two actual source marks, FOX destination and live-data disclosure',async({page})=>{
 await images(page);
 await page.goto(base+'/?card=packers-lions-2026',{waitUntil:'domcontentloaded'});
 const stage=page.locator('#oracleCardStage');
 await expect(stage.locator('[data-source-id="packers-lions-2026"]')).toBeVisible({timeout:20000});
 await expect(stage.locator('img.vbs-identity')).toHaveCount(2);
 await expect(stage.getByRole('link',{name:'FOX / FOX One viewing'})).toHaveAttribute('href',/fox.com\/sports/);
 await expect(stage.getByText(/3:25 PM Central/)).toBeVisible();
 await expect(stage.locator('.qca-search-input')).toHaveCount(0);
 await expect(stage.getByText(/no live game feed is claimed here/)).toBeVisible();
 expect(await stage.evaluate(node=>node.getBoundingClientRect().right<=innerWidth)).toBeTruthy();
});
test('World Series pitchers, actual coupons and medically sourced screening have separate cards',async({page})=>{
 await images(page);
 await page.goto(base+'/?card=world-series-pitchers-2026',{waitUntil:'domcontentloaded'});
 const stage=page.locator('#oracleCardStage');
 await expect(stage.getByText(/Robert Gasser vs Rays RHP Freddy Peralta/)).toBeVisible({timeout:20000});
 await page.locator('.oracle-card-library summary').click();
 await page.locator('#oracleCardChooser').selectOption('source-kohls-coupons');
 await expect(stage.locator('[data-source-id="kohls-coupons"]')).toBeVisible({timeout:10000});
 await expect(stage.locator('.vbs-terms')).toContainText('No fabricated coupons.');
 await expect(stage.getByRole('link',{name:'Current coupons and offers'})).toBeVisible();
 await page.locator('#oracleCardChooser').selectOption('source-colorectal-screening');
 await expect(stage.getByText(/General information, not personal medical advice/)).toBeVisible();
});
test('logo errors exclude a brand from public rotation, not synthetic replacement logos',async({page})=>{
 await images(page);
 await page.route('https://www.google.com/s2/favicons**',r=>r.abort());
 await page.goto(base+'/?card=packers-lions-2026',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#oracleCardStage [data-source-id="packers-lions-2026"]')).toBeVisible({timeout:20000});
 await expect(page.locator('#verifiedBrandSportsCards [data-source-id="hidden-valley-ranch"]')).toHaveCount(0,{timeout:15000});
});
