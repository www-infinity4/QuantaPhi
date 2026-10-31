import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:390,height:844},reducedMotion:'reduce'});

test('profile is an early real card, completes once and stays editable in Settings',async({page})=>{
 await page.goto(base+'/?card=user-profile',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage #quantaProfileCard');
 await expect(card).toBeVisible({timeout:18000});
 await card.locator('input[name="displayName"]').fill('Example visitor');
 await card.locator('input[name="interest"][value="Music"]').check();
 await card.getByRole('button',{name:'Save profile'}).click();
 await expect(page.locator('#quantaProfileCard')).toBeHidden();
 await expect(page.locator('.oracle-profile-settings-link')).toBeVisible();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('quantaphi:profile-preferences:v1')));
 expect(saved.complete).toBe(true);expect(saved.interests).toContain('Music');
 await page.locator('.oracle-profile-settings-link').click();
 await expect(page).toHaveURL(/\/quanta-profile\.html$/);
 await expect(page.locator('#quantaProfileStandalone input[name="displayName"]')).toHaveValue('Example visitor');
});

test('following a working source card moves it to Following and unfollow restores Public',async({page})=>{
 await page.goto(base+'/?card=google',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#oracleCardStage .qcx-google-wordmark')).toBeVisible({timeout:18000});
 const follow=page.locator('#oracleCardFollow');
 await expect(follow).toBeVisible();
 await follow.click();
 await expect(page.locator('[data-oracle-feed="following"]')).toHaveAttribute('aria-selected','true');
 await expect(follow).toHaveText(/Following/);
 let state=await page.evaluate(()=>JSON.parse(localStorage.getItem('quanta:discovery:anonymous:v1')));
 expect(state.following).toContain('google');
 await page.locator('[data-oracle-feed="public"]').click();
 await expect(page.locator('#oracleCardChooser option[value="source-google"]')).toHaveCount(0);
 await page.locator('[data-oracle-feed="following"]').click();
 await expect(page.locator('#oracleCardStage .qcx-google-wordmark')).toBeVisible();
 await follow.click();
 state=await page.evaluate(()=>JSON.parse(localStorage.getItem('quanta:discovery:anonymous:v1')));
 expect(state.following).not.toContain('google');
 await page.locator('[data-oracle-feed="public"]').click();
 await expect(page.locator('#oracleCardChooser option[value="source-google"]')).toHaveCount(1);
});
