import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:393,height:844},isMobile:true,hasTouch:true});

test('Official Google resources and a review-only visitor idea card join the existing carousel',async({page})=>{
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 const section=page.locator('#developerCarousel');
 await expect(section.locator('.developer-card-choice')).toHaveCount(5);
 await expect(section.locator('.devlib-category option')).toHaveCount(24);
 for(let i=0;i<5;i++)await section.getByRole('button',{name:'Next developer card'}).click();
 await expect(section.locator('#developerCardNow')).toHaveText('Propose a site improvement');
 const card=section.locator('.developer-resource-slide');
 await expect(card.locator('.developer-cover-image')).toBeVisible();
 await card.getByRole('button',{name:/Work with this source/}).click();
 await expect(card.locator('.devlib-editor')).toBeVisible();
 await card.locator('.devlib-topic').selectOption('profiles');
 await expect(card.locator('.devlib-comparison')).toContainText('Ordinary session-only profile UI exists');
 await card.locator('textarea').fill('Add an accessible public profile with display name, avatar choices and an edit button');
 await card.getByRole('button',{name:'Preview safe layout'}).click();
 await expect(card.locator('.devlib-mock-profile')).toBeVisible();
 const review=card.getByRole('link',{name:/Prepare owner-reviewed GitHub issue/});
 await expect(review).toBeVisible();
 const href=await review.getAttribute('href');
 const u=new URL(href);
 expect(u.pathname).toBe('/www-infinity4/QuantaPhi/issues/new');
 expect(u.searchParams.get('body')).toContain('Requires owner approval');
 await card.locator('textarea').fill('Put dick pics all over my page');
 await card.getByRole('button',{name:'Preview safe layout'}).click();
 await expect(review).toBeHidden();
 await expect(card.locator('.devlib-feedback')).toContainText('safety or privacy review');
});

test('Real GitHub results become individually navigable picture-first cards; no fake counts or copied code',async({page})=>{
 let calls=0;
 await page.route('https://api.github.com/search/repositories**',route=>{
  calls++;
  const url=new URL(route.request().url());
  expect(url.pathname).toBe('/search/repositories');
  expect(url.searchParams.get('q')).toContain('carousel');
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   total_count:2130,incomplete_results:false,
   items:[{id:443,full_name:'oss/example-carousel',name:'example-carousel',
    html_url:'https://github.com/oss/example-carousel',description:'Open-source sliding visual gallery',
    fork:false,archived:false,disabled:false,stargazers_count:120,pushed_at:'2026-10-04T00:00:00Z',
    owner:{avatar_url:'https://avatars.githubusercontent.com/u/1?v=4'},license:{spdx_id:'MIT'}},
   {id:444,full_name:'oss/slider',name:'slider',
    html_url:'https://github.com/oss/slider',description:'Accessible drag/swipe source example',
    fork:false,archived:false,disabled:false,stargazers_count:78,
    owner:{avatar_url:'https://avatars.githubusercontent.com/u/2?v=4'},license:null},
   {id:445,full_name:'bad/forged',name:'forged',
    html_url:'https://not-github.example/bad',owner:{avatar_url:'https://avatars.githubusercontent.com/u/2?v=4'}}
   ]})});
 });
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 const section=page.locator('#developerCarousel');
 await section.locator('.devlib-category').selectOption('carousels');
 await section.getByRole('button',{name:'Find source cards'}).click();
 await expect(section.locator('.devlib-source-status')).toContainText('Loaded 2 new original repositories');
 await expect(section.locator('.devlib-source-status')).toContainText('2,130 matching results');
 await expect(section.locator('#developerCardNow')).toHaveText('example-carousel');
 const active=section.locator('.developer-resource-slide');
 await expect(active.locator('.developer-cover-image')).toBeVisible();
 await expect(active.locator('.devlib-meta')).toContainText(['Source: GitHub','Rights: MIT','GitHub stars: 120']);
 await expect(active.getByRole('link',{name:'Inspect original source'})).toHaveAttribute('href','https://github.com/oss/example-carousel');
 await section.getByRole('button',{name:'Next developer card'}).click();
 await expect(section.locator('#developerCardNow')).toHaveText('slider');
 expect(calls).toBe(1);
});

test('rate-limited GitHub search shows a truthful unavailable state without fabricated resource cards',async({page})=>{
 await page.route('https://api.github.com/search/repositories**',route=>route.fulfill({status:429,body:'Rate limited'}));
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 const section=page.locator('#developerCarousel');
 await section.getByRole('button',{name:'Find source cards'}).click();
 await expect(section.locator('.devlib-source-status')).toContainText('GitHub search rate limit reached');
 await expect(section.locator('.devlib-more')).toBeHidden();
 await expect(section.locator('#developerCardNow')).toHaveText('Media Star');
});
