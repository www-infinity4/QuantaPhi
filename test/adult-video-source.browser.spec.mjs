import {test,expect} from '@playwright/test';

const base='http://127.0.0.1:8799';
test.use({viewport:{width:360,height:800}});

test('ad-free adult-video source Quick Card hides its external link until an explicit per-visit 21+ action',async({page})=>{
 const outside=[];
 page.on('request',request=>{
  if(!request.url().startsWith(base+'/'))outside.push(request.url());
 });
 await page.goto(base+'/21plus-video-source.html',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('heading',{name:'21+ video source Quick Card'})).toBeVisible();
 const content=page.locator('#adultVideoContent');
 const link=page.locator('#adultVideoOpen');
 await expect(content).toBeHidden();
 await expect(link).not.toHaveAttribute('href',/./);
 await expect(page.locator('script[src*="googletagmanager"],script[src*="adsbygoogle"],iframe,video')).toHaveCount(0);
 await page.getByRole('button',{name:'I am 21+ · Show source'}).click();
 await expect(content).toBeVisible();
 await expect(link).toHaveAttribute('href','https://xgroovy.com/gifs/205466/filled-my-mouth-with-cum/');
 await expect(page.getByRole('button',{name:'Close 21+ source'})).toBeVisible();
 await page.getByRole('button',{name:'Close 21+ source'}).click();
 await expect(content).toBeHidden();
 await expect(link).not.toHaveAttribute('href',/./);
 await expect(page.getByRole('button',{name:'I am 21+ · Show source'})).toBeFocused();
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(content).toBeHidden();
 await expect(link).not.toHaveAttribute('href',/./);
 expect(outside).toEqual([]);
 const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
 expect(width.scroll).toBeLessThanOrEqual(width.viewport);
});

test('Android 21+ homepage portal has an accessible 48px+ target and readable text after acknowledgment',async({page})=>{
 await page.goto(base+'/?card=infinityAdultContentCard',{waitUntil:'domcontentloaded'});
 const card=page.locator('#oracleCardStage #infinityAdultContentCard');
 await expect(card).toBeVisible({timeout:20000});
 const portal=card.locator('.rac-source-portal');
 await expect(portal).toBeHidden();
 await card.getByRole('button',{name:'I am 21+ · Browse original websites'}).click();
 await expect(portal).toBeVisible();
 await expect(portal).toHaveAttribute('href','/21plus-video-source.html');
 const metrics=await portal.evaluate(el=>({font:Number.parseFloat(getComputedStyle(el).fontSize),height:el.getBoundingClientRect().height}));
 expect(metrics.font).toBeGreaterThanOrEqual(18);
 expect(metrics.height).toBeGreaterThanOrEqual(48);
 await card.getByRole('button',{name:'Close 21+ websites'}).click();
 await expect(portal).toBeHidden();
});
