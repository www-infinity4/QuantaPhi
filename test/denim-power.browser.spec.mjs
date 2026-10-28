import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
const STORAGE='quanta:discovery:anonymous:v1';
test.use({viewport:{width:390,height:844}});

test('one Power tap follows six real denim cards and allows brand-level filtering',async({page})=>{
 await page.goto(base+'/design-lab/index.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#denimPowerGrid .dp-item')).toHaveCount(6);
 await expect(page.locator('#denimPowerCount')).toContainText('0 / 6 followed');
 await page.locator('#denimFollowAll').click();
 await expect(page.locator('#denimPowerCount')).toContainText('6 / 6 followed');
 await expect(page.locator('#denimPowerStatus')).toContainText('on this device');
 const local=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE);
 expect(local.following).toEqual(expect.arrayContaining(['levis-501-dark','levis-501-medium','pepe-brooke','pepe-vapour','guess-g11-light','guess-g11-dark']));
 expect(local.following).toHaveLength(6);
 await page.locator('#denimBrandFilter').selectOption({label:'GUESS JEANS'});
 await expect(page.locator('#denimPowerGrid .dp-item')).toHaveCount(2);
 await page.locator('#denimPowerGrid .dp-item').first().locator('.dp-follow').click();
 await expect(page.locator('#denimPowerCount')).toContainText('5 / 6 followed');
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#denimPowerCount')).toContainText('5 / 6 followed');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('Following carousel recognizes one-press denim actions without affecting other follows',async({page,context})=>{
 await page.goto(base+'/design-lab/index.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#denimPowerGrid .dp-item')).toHaveCount(6);
 await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({following:['durable-framework-computers'],counts:{'durable-framework-computers':3},viewed:{'durable-framework-computers':1}})),STORAGE);
 await page.locator('#denimFollowAll').click();
 const home=await context.newPage();
 await home.goto(base+'/?card=levis-501-dark',{waitUntil:'domcontentloaded'});
 await expect(home.locator('#oracleCardStage .qbp-product-card')).toBeVisible({timeout:20000});
 await home.locator('[data-oracle-feed="following"]').click();
 await expect(home.locator('#oracleCardChooser option[value="source-levis-501-dark"]')).toHaveCount(1);
 await expect(home.locator('#oracleCardChooser option[value="source-guess-g11-light"]')).toHaveCount(1);
 await expect(home.locator('#oracleCardChooser option[value="source-durable-framework-computers"]')).toHaveCount(1);
 await home.close();
 await page.locator('#denimUnfollowAll').click();
 await expect(page.locator('#denimPowerCount')).toContainText('0 / 6 followed');
 const local=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE);
 expect(local.following).toEqual(['durable-framework-computers']);
 expect(local.counts['durable-framework-computers']).toBe(3);
 expect(local.viewed['durable-framework-computers']).toBe(1);
});

test('native Power Chain carousel card can follow denim in one tap, without website clicks',async({page})=>{
 let browserJobs=0;
 await page.route('**/work/quick-card-browser',route=>{browserJobs++;return route.abort();});
 await page.goto(base+'/?card=power-chain',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage .lab-quick-card');
 await expect(card).toBeVisible({timeout:20000});
 const power=card.locator('.lab-card-category-go');
 await expect(power).toHaveText(/FOLLOW 6 DENIM CARDS/);
 await power.click();
 await expect(power).toContainText('ALL 6 DENIM CARDS FOLLOWED');
 await expect(card.locator('.lab-card-category')).toContainText('on this device');
 await expect(card.getByRole('link',{name:/Manage denim follows/})).toHaveAttribute('href','/design-lab/index.html#denimPower');
 const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE);
 expect(stored.following).toHaveLength(6);
 expect(browserJobs).toBe(0);
 await page.locator('[data-oracle-feed="following"]').click();
 await expect(page.locator('#oracleCardChooser option[value="source-levis-501-dark"]')).toHaveCount(1);
});
