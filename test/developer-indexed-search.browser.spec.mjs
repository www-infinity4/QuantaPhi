import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:8799';
test.use({viewport:{width:360,height:820},isMobile:true,hasTouch:true});

const fixture=Array.from({length:33},(_,i)=>({
 id:'github-'+(7000+i),source:'GitHub',
 label:i===0?'Accessible Profile Workshop':i===1?'Avatar Profile Gallery':'Carousel Source '+(i-1),
 description:i<2?'User profile display avatar controls':'Interactive sliding picture viewer '+i,
 repo:'example-org/'+(i<2?'profile-ui-'+i:'carousel-ui-'+i),
 url:'https://github.com/example-org/'+(i<2?'profile-ui-'+i:'carousel-ui-'+i),
 image:'https://github.githubassets.com/favicons/favicon.svg',
 category:i<2?'profiles':'carousels',license:'MIT',licenseStatus:'review-license-before-reuse',
 stars:200-i,pushedAt:'2026-11-06'
}));
test.beforeEach(async({page})=>{
 await page.route('**/data/developer-source-catalog.json',route=>route.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify({
   schema_version:1,source:'GitHub REST API /search/repositories',
   status:'review-required',records:fixture.length,items:fixture
  })
 }));
});

test('browse the indexed GitHub catalog by topic and name without network scraping or endless arrow taps',async({page})=>{
 let remoteCalls=0;
 await page.route('https://api.github.com/search/repositories**',route=>{
  remoteCalls++;return route.abort();
 });
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 const area=page.locator('#developerCarousel'),indexed=area.locator('.devlib-indexed');
 await expect(indexed.locator('.devlib-index-count')).toContainText('33');
 await expect(indexed.locator('.devlib-index-result')).toHaveCount(8);
 await indexed.getByRole('combobox',{name:'Filter indexed developer cards by topic'}).selectOption('profiles');
 await expect(indexed.locator('.devlib-index-count')).toContainText('2 matches');
 await expect(indexed.locator('.devlib-index-result')).toHaveCount(2);
 await indexed.getByRole('searchbox',{name:'Search indexed developer cards'}).fill('avatar');
 await expect(indexed.locator('.devlib-index-count')).toContainText('2 matches');
 await indexed.locator('.devlib-index-result',{hasText:'Accessible Profile Workshop'}).click();
 await expect(area.locator('#developerCardNow')).toHaveText('Accessible Profile Workshop');
 const card=area.locator('.developer-resource-slide');
 await expect(card.locator('.developer-cover-title')).toHaveText('Accessible Profile Workshop');
 await card.getByRole('button',{name:/Work with this source/}).click();
 await expect(card.locator('.devlib-comparison')).toContainText('session-only profile UI exists');
 await card.locator('textarea').fill('Make it easy for people to update a public profile avatar');
 await card.getByRole('button',{name:'Preview safe layout'}).click();
 await expect(card.locator('.devlib-mock-profile')).toBeVisible();
 await area.getByRole('button',{name:'Previous developer card'}).click();
 await area.getByRole('button',{name:'Next developer card'}).click();
 await card.getByRole('button',{name:/Work with this source/}).click();
 await expect(card.locator('textarea')).toHaveValue('Make it easy for people to update a public profile avatar');
 expect(remoteCalls).toBe(0);
});

test('paged indexed list displays at most eight choices and opens late catalog cards at Android widths',async({page})=>{
 await page.setViewportSize({width:320,height:780});
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 const area=page.locator('#developerCarousel'),indexed=area.locator('.devlib-indexed');
 await expect(indexed.locator('.devlib-index-result')).toHaveCount(8);
 await indexed.getByRole('button',{name:'Next indexed results'}).click();
 await expect(indexed.locator('.devlib-index-result')).toHaveCount(8);
 await expect(indexed.locator('.devlib-index-count')).toContainText('9–16');
 await indexed.getByRole('button',{name:'Previous indexed results'}).click();
 await expect(indexed.locator('.devlib-index-count')).toContainText('1–8');
 await indexed.getByRole('combobox',{name:'Filter indexed developer cards by topic'}).selectOption('carousels');
 await expect(indexed.locator('.devlib-index-count')).toContainText('31 matches');
 await indexed.getByRole('button',{name:'Next indexed results'}).click();
 await indexed.getByRole('button',{name:'Next indexed results'}).click();
 await indexed.getByRole('button',{name:'Next indexed results'}).click();
 await expect(indexed.locator('.devlib-index-count')).toContainText('25–31');
 await indexed.locator('.devlib-index-result').last().click();
 await expect(area.locator('#developerCardNow')).toHaveText('Carousel Source 30');
 const bounds=await area.evaluate(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,width:innerWidth}));
 expect(bounds.left).toBeGreaterThanOrEqual(-1);
 expect(bounds.right).toBeLessThanOrEqual(bounds.width+1);
});
