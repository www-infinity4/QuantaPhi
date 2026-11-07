import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:360,height:780}});
test('Fred is at the top of Android homepage and first Space opens on X in one tap',async({page})=>{
 await page.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():route.abort());
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 const free=page.locator('#fredSpacesQuickPlay');
 await expect(free).toBeVisible();
 await expect(free).toHaveAttribute('href','https://x.com/i/spaces/1OyKAjYPeXqGb');
 await expect(free).toHaveAttribute('target','_blank');
 await expect(page.locator('#fredSpacesQuickNext')).toBeVisible();
 const top=await page.evaluate(()=>{
  const search=document.querySelector('.search').getBoundingClientRect();
  const fred=document.getElementById('fredSpacesQuick').getBoundingClientRect();
  const news=document.querySelector('[aria-label="News Phi articles and latest headlines"]').getBoundingClientRect();
  return {searchBottom:search.bottom,fredTop:fred.top,fredBottom:fred.bottom,newsTop:news.top};
 });
 expect(top.fredTop).toBeGreaterThanOrEqual(top.searchBottom-3);
 expect(top.fredBottom).toBeLessThanOrEqual(top.newsTop+3);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(4);
});
test('next Fred Space opens the real Oracle card and never bypasses payment readiness',async({page})=>{
 const attempted=[];
 await page.route('**/*',route=>{
  const url=route.request().url();
  if(url.includes('/v1/spaces/unlock')&&route.request().method()==='POST')attempted.push(url);
  return url.startsWith(base+'/')?route.continue():route.abort();
 });
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#fredSpacesQuickNext')).toBeVisible();
 await page.locator('#fredSpacesQuickNext').click();
 const stage=page.locator('#oracleCardStage');
 await expect(stage).toHaveAttribute('data-switchboard-id','fredSpacesRadio',{timeout:20000});
 await expect(stage.getByText('Fred Krueger · @dotkrueger · X Spaces')).toBeVisible();
 const source=stage.locator('.fs-play');
 await expect(source).toHaveAttribute('href','https://x.com/i/spaces/1OyKAjYPeXqGb');
 await expect(source).toHaveAttribute('target','_blank');
 await expect(page.locator('#fredSpacesQuickStatus')).toContainText(/wallet|unlock|loading|paused/i);
 expect(attempted).toHaveLength(0);
});
