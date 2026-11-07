import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:360,height:780}});
test('Fred radio button opens the real Oracle Media Star card with original X replay', async({page})=>{
  await page.route('**/*',route=>{
    const url=route.request().url();
    return url.startsWith(base+'/') ? route.continue() : route.abort();
  });
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  const launcher=page.locator('#fredSpacesQuickPlay');
  await expect(launcher).toBeVisible();
  await expect(launcher).toHaveAttribute('data-oracle-spotlight','fredSpacesRadio');
  await launcher.click();
  const stage=page.locator('#oracleCardStage');
  await expect(stage).toHaveAttribute('data-switchboard-id','fredSpacesRadio',{timeout:20000});
  await expect(stage.getByText('Fred Krueger · @dotkrueger · X Spaces')).toBeVisible();
  const replay=stage.locator('.fs-play');
  await expect(replay).toHaveAttribute('href','https://x.com/i/spaces/1OyKAjYPeXqGb');
  await expect(replay).toHaveAttribute('target','_blank');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(4);
});
